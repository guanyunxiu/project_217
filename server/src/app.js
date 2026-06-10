const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { initRedis, getRedis } = require('./config/redis');
const pool = require('./config/db');
const initDatabase = require('./models/initDb');
const { PORT } = require('./config');

const authRoutes = require('./routes/auth');
const boardRoutes = require('./routes/boards');
const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');
const notificationRoutes = require('./routes/notifications');
const chatRoutes = require('./routes/chat');
const pmRoutes = require('./routes/privateMessages');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.set('io', io);
app.getIO = function() {
  return io;
};

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/private-messages', pmRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      const { JWT_SECRET } = require('./config');
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.user = decoded;
      socket.join(`user_${decoded.username}`);
    } catch (err) {
      // ignore invalid token, still allow connection
    }
  }
  next();
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  if (socket.user) {
    socket.join(`user_${socket.user.username}`);

    const redis = getRedis();
    if (redis) {
      redis.set(`chat_online:${socket.user.id}`, JSON.stringify({
        id: socket.user.id,
        username: socket.user.username
      })).catch(() => {});
    }

    io.emit('chat:user_online', { id: socket.user.id, username: socket.user.username });

    socket.on('chat:join', (room) => {
      socket.join(`chat_${room}`);
      console.log(`User ${socket.user.username} joined chat room: ${room}`);
    });

    socket.on('chat:leave', (room) => {
      socket.leave(`chat_${room}`);
      console.log(`User ${socket.user.username} left chat room: ${room}`);
    });

    socket.on('chat:message', async (data) => {
      if (!data.room || !data.content) return;

      const content = String(data.content).trim();
      if (content.length === 0 || content.length > 2000) return;

      const msgType = data.type === 'emoji' ? 'emoji' : 'text';

      try {
        const [result] = await pool.query(
          'INSERT INTO chat_messages (room, user_id, username, content, type) VALUES (?, ?, ?, ?, ?)',
          [data.room, socket.user.id, socket.user.username, content, msgType]
        );

        const message = {
          id: result.insertId,
          room: data.room,
          userId: socket.user.id,
          username: socket.user.username,
          content,
          type: msgType,
          createdAt: new Date().toISOString()
        };

        io.to(`chat_${data.room}`).emit('chat:message', message);
      } catch (err) {
        console.error('Save chat message error:', err);
      }
    });

    socket.on('private:message', async (data) => {
      if (!data.receiver_id || !data.content) return;
      const content = String(data.content).trim();
      if (content.length === 0 || content.length > 2000) return;

      try {
        const [userRows] = await pool.query('SELECT id, username FROM users WHERE id = ?', [data.receiver_id]);
        if (userRows.length === 0) return;

        const [result] = await pool.query(
          'INSERT INTO private_messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
          [socket.user.id, data.receiver_id, content]
        );

        const message = {
          id: result.insertId,
          sender_id: socket.user.id,
          receiver_id: data.receiver_id,
          sender_username: socket.user.username,
          content,
          is_read: 0,
          created_at: new Date().toISOString()
        };

        io.to(`user_${userRows[0].username}`).emit('private:message', message);
        socket.emit('private:message', message);

        await pool.query(
          'INSERT INTO notifications (user_id, from_user_id, type, content, related_id) VALUES (?, ?, ?, ?, ?)',
          [data.receiver_id, socket.user.id, 'private_message', `${socket.user.username}给你发送了私信`, null]
        );

        io.to(`user_${userRows[0].username}`).emit('notification', {
          type: 'private_message',
          content: `${socket.user.username}给你发送了私信`
        });
      } catch (err) {
        console.error('Private message error:', err);
      }
    });

    socket.on('private:typing', (data) => {
      if (!data.receiver_id) return;
      (async () => {
        try {
          const [userRows] = await pool.query('SELECT username FROM users WHERE id = ?', [data.receiver_id]);
          if (userRows.length > 0) {
            io.to(`user_${userRows[0].username}`).emit('private:typing', {
              sender_id: socket.user.id,
              sender_username: socket.user.username
            });
          }
        } catch (err) {
          // ignore
        }
      })();
    });
  }

  socket.on('disconnect', async () => {
    console.log('Client disconnected:', socket.id);

    if (socket.user) {
      const redis = getRedis();
      if (redis) {
        await redis.del(`chat_online:${socket.user.id}`).catch(() => {});
      }
      io.emit('chat:user_offline', { id: socket.user.id, username: socket.user.username });
    }
  });
});

async function start() {
  try {
    await initDatabase();
    await initRedis();

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

module.exports = app;
start();
