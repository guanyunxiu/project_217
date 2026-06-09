const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { initRedis } = require('./config/redis');
const initDatabase = require('./models/initDb');
const { PORT } = require('./config');

const authRoutes = require('./routes/auth');
const boardRoutes = require('./routes/boards');
const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');
const notificationRoutes = require('./routes/notifications');

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
    console.log(`User ${socket.user.username} joined their notification room`);
  }

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
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
