const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { JWT_SECRET } = require('../config');

exports.register = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码不能为空' });
    }

    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({ message: '用户名长度应在3-50之间' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: '密码长度不能少于6位' });
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(409).json({ message: '用户名已存在' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, hashedPassword, 'user']
    );

    const token = jwt.sign(
      { id: result.insertId, username, role: 'user' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: '注册成功',
      token,
      user: { id: result.insertId, username, role: 'user' }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: '服务器错误' });
  }
};

exports.getUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const [rows] = await pool.query('SELECT id, username, role, created_at FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ message: '服务器错误' });
  }
};

exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length === 0) {
      return res.json({ users: [] });
    }
    const [rows] = await pool.query(
      'SELECT id, username, role, created_at FROM users WHERE username LIKE ? LIMIT 10',
      [`%${q.trim()}%`]
    );
    res.json({ users: rows });
  } catch (err) {
    console.error('Search users error:', err);
    res.status(500).json({ message: '服务器错误' });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码不能为空' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: '登录成功',
      token,
      user: { id: user.id, username: user.username, role: user.role }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: '服务器错误' });
  }
};
