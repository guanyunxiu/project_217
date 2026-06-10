const pool = require('../config/db');
const { getRedis } = require('../config/redis');

exports.getHistory = async (req, res) => {
  try {
    const { room, before, limit = 30 } = req.query;
    const safeLimit = Math.min(parseInt(limit) || 30, 100);

    if (!room) {
      return res.status(400).json({ message: '缺少room参数' });
    }

    let query = 'SELECT id, room, user_id, username, content, type, created_at FROM chat_messages WHERE room = ?';
    const params = [room];

    if (before) {
      query += ' AND id < ?';
      params.push(parseInt(before));
    }

    query += ' ORDER BY id DESC LIMIT ?';
    params.push(safeLimit);

    const [rows] = await pool.query(query, params);
    rows.reverse();

    res.json({ messages: rows, hasMore: rows.length === safeLimit });
  } catch (err) {
    console.error('Get chat history error:', err);
    res.status(500).json({ message: '服务器错误' });
  }
};

exports.getOnlineUsers = async (req, res) => {
  try {
    const redis = getRedis();
    if (!redis) {
      return res.json({ users: [] });
    }

    const keys = await redis.keys('chat_online:*');
    if (keys.length === 0) {
      return res.json({ users: [] });
    }

    const users = [];
    for (const key of keys) {
      const data = await redis.get(key);
      if (data) {
        users.push(JSON.parse(data));
      }
    }

    res.json({ users });
  } catch (err) {
    console.error('Get online users error:', err);
    res.status(500).json({ message: '服务器错误' });
  }
};
