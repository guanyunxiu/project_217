const pool = require('../config/db');

exports.listNotifications = async (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM notifications WHERE user_id = ?',
      [req.user.id]
    );

    const [unreadResult] = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );

    const [rows] = await pool.query(
      `SELECT n.*, u.username as from_username 
       FROM notifications n 
       LEFT JOIN users u ON n.from_user_id = u.id 
       WHERE n.user_id = ? 
       ORDER BY n.created_at DESC 
       LIMIT ? OFFSET ?`,
      [req.user.id, limit, offset]
    );

    res.json({
      notifications: rows,
      total: countResult[0].total,
      unreadCount: unreadResult[0].count,
      page: parseInt(page),
      pageSize: limit
    });
  } catch (err) {
    console.error('List notifications error:', err);
    res.status(500).json({ message: '服务器错误' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      'SELECT * FROM notifications WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: '通知不存在' });
    }

    await pool.query('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);

    res.json({ message: '已标记为已读' });
  } catch (err) {
    console.error('Mark as read error:', err);
    res.status(500).json({ message: '服务器错误' });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );

    res.json({ message: '已全部标记为已读' });
  } catch (err) {
    console.error('Mark all as read error:', err);
    res.status(500).json({ message: '服务器错误' });
  }
};
