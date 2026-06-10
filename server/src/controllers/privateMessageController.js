const pool = require('../config/db');

exports.getConversations = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT pm.*, u.username as other_username, u.id as other_user_id,
       (SELECT COUNT(*) FROM private_messages WHERE receiver_id = ? AND is_read = 0) as total_unread
       FROM private_messages pm
       JOIN users u ON u.id = CASE WHEN pm.sender_id = ? THEN pm.receiver_id ELSE pm.sender_id END
       WHERE pm.id IN (
         SELECT MAX(id) FROM private_messages
         WHERE sender_id = ? OR receiver_id = ?
         GROUP BY CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END
       )
       ORDER BY pm.created_at DESC`,
      [req.user.id, req.user.id, req.user.id, req.user.id, req.user.id]
    );
    res.json({ conversations: rows, totalUnread: rows.length > 0 ? rows[0].total_unread : 0 });
  } catch (err) {
    console.error('Get conversations error:', err);
    res.status(500).json({ message: '获取会话列表失败' });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { before, limit = 30 } = req.query;
    const safeLimit = Math.min(parseInt(limit) || 30, 100);
    const otherUserId = parseInt(req.params.userId);

    let query = `SELECT pm.*, u.username as sender_username
      FROM private_messages pm
      JOIN users u ON pm.sender_id = u.id
      WHERE (pm.sender_id = ? AND pm.receiver_id = ?) OR (pm.sender_id = ? AND pm.receiver_id = ?)`;
    const params = [req.user.id, otherUserId, otherUserId, req.user.id];

    if (before) {
      query += ' AND pm.id < ?';
      params.push(parseInt(before));
    }
    query += ' ORDER BY pm.id DESC LIMIT ?';
    params.push(safeLimit);

    const [rows] = await pool.query(query, params);
    rows.reverse();

    await pool.query(
      'UPDATE private_messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0',
      [otherUserId, req.user.id]
    );

    res.json({ messages: rows, hasMore: rows.length === safeLimit });
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ message: '获取消息失败' });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { receiver_id, content } = req.body;
    if (!receiver_id || !content) return res.status(400).json({ message: '接收者和内容不能为空' });

    const [userRows] = await pool.query('SELECT id, username FROM users WHERE id = ?', [receiver_id]);
    if (userRows.length === 0) return res.status(400).json({ message: '用户不存在' });

    const [result] = await pool.query(
      'INSERT INTO private_messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
      [req.user.id, receiver_id, content.trim()]
    );

    const message = {
      id: result.insertId,
      sender_id: req.user.id,
      receiver_id,
      sender_username: req.user.username,
      content: content.trim(),
      is_read: 0,
      created_at: new Date().toISOString()
    };

    await pool.query(
      'INSERT INTO notifications (user_id, from_user_id, type, content, related_id) VALUES (?, ?, ?, ?, ?)',
      [receiver_id, req.user.id, 'private_message', `${req.user.username}给你发送了私信`, null]
    );

    const io = require('../app').getIO();
    if (io) {
      io.to(`user_${userRows[0].username}`).emit('private:message', message);
      io.to(`user_${userRows[0].username}`).emit('notification', {
        type: 'private_message',
        content: `${req.user.username}给你发送了私信`
      });
    }

    res.status(201).json({ message: '发送成功', pm: message });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ message: '发送失败' });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT COUNT(*) as count FROM private_messages WHERE receiver_id = ? AND is_read = 0',
      [req.user.id]
    );
    res.json({ unreadCount: rows[0].count });
  } catch (err) {
    console.error('Get unread count error:', err);
    res.status(500).json({ message: '获取未读数失败' });
  }
};
