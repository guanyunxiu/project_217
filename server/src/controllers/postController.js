const pool = require('../config/db');
const { parseMentions } = require('../utils/mention');

exports.listPosts = async (req, res) => {
  try {
    const { board_id, page = 1, pageSize = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    let whereClause = '';
    let params = [];

    if (board_id) {
      whereClause = 'WHERE p.board_id = ?';
      params.push(board_id);
    }

    const countParams = [...params];
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM posts p ${whereClause}`,
      countParams
    );

    const [rows] = await pool.query(
      `SELECT p.*, u.username, b.name as board_name 
       FROM posts p 
       LEFT JOIN users u ON p.user_id = u.id 
       LEFT JOIN boards b ON p.board_id = b.id 
       ${whereClause}
       ORDER BY p.created_at DESC 
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      posts: rows,
      total: countResult[0].total,
      page: parseInt(page),
      pageSize: limit,
      totalPages: Math.ceil(countResult[0].total / limit)
    });
  } catch (err) {
    console.error('List posts error:', err);
    res.status(500).json({ message: '服务器错误' });
  }
};

exports.getPost = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT p.*, u.username, b.name as board_name 
       FROM posts p 
       LEFT JOIN users u ON p.user_id = u.id 
       LEFT JOIN boards b ON p.board_id = b.id 
       WHERE p.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: '帖子不存在' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Get post error:', err);
    res.status(500).json({ message: '服务器错误' });
  }
};

exports.createPost = async (req, res) => {
  try {
    const { title, content, board_id } = req.body;

    if (!title || !content || !board_id) {
      return res.status(400).json({ message: '标题、正文和板块不能为空' });
    }

    const [boardRows] = await pool.query('SELECT id FROM boards WHERE id = ?', [board_id]);
    if (boardRows.length === 0) {
      return res.status(400).json({ message: '板块不存在' });
    }

    const [result] = await pool.query(
      'INSERT INTO posts (title, content, board_id, user_id) VALUES (?, ?, ?, ?)',
      [title, content, board_id, req.user.id]
    );

    const mentionedUsers = parseMentions(content);
    if (mentionedUsers.length > 0) {
      const { createNotifications } = require('../utils/mention');
      await createNotifications(mentionedUsers, req.user.id, 'post_mention', `在帖子「${title}」中提及了你`, result.insertId);
    }

    const io = require('../app').getIO();
    if (io) {
      mentionedUsers.forEach(username => {
        io.to(`user_${username}`).emit('notification', {
          type: 'post_mention',
          content: `${req.user.username}在帖子「${title}」中提及了你`,
          related_id: result.insertId
        });
      });
    }

    res.status(201).json({
      message: '帖子发布成功',
      post: { id: result.insertId, title, content, board_id, user_id: req.user.id }
    });
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ message: '服务器错误' });
  }
};
