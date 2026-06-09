const pool = require('../config/db');

exports.listBoards = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT b.*, u.username as created_by_name FROM boards b LEFT JOIN users u ON b.created_by = u.id ORDER BY b.created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error('List boards error:', err);
    res.status(500).json({ message: '服务器错误' });
  }
};

exports.createBoard = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: '板块名称不能为空' });
    }

    const [existing] = await pool.query('SELECT id FROM boards WHERE name = ?', [name]);
    if (existing.length > 0) {
      return res.status(409).json({ message: '板块名称已存在' });
    }

    const [result] = await pool.query(
      'INSERT INTO boards (name, description, created_by) VALUES (?, ?, ?)',
      [name, description || '', req.user.id]
    );

    res.status(201).json({
      message: '板块创建成功',
      board: { id: result.insertId, name, description: description || '', created_by: req.user.id }
    });
  } catch (err) {
    console.error('Create board error:', err);
    res.status(500).json({ message: '服务器错误' });
  }
};
