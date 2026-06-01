const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/init');

const router = express.Router();

// 用户注册
router.post('/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({ error: '用户名长度需要在3-50个字符之间' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度至少6个字符' });
    }

    const db = getDb();

    const existingUser = db.get('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return res.status(400).json({ error: '用户名已存在' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const result = db.run(`
      INSERT INTO users (username, password_hash, email, role)
      VALUES (?, ?, ?, 'user')
    `, [username, passwordHash, email || null]);

    const userId = result.lastInsertRowid;

    const token = jwt.sign(
      { id: userId, username, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: '注册成功',
      token,
      user: { id: userId, username, email, role: 'user' }
    });
  } catch (err) {
    console.error('注册错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 用户登录
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    const db = getDb();
    const user = db.get('SELECT * FROM users WHERE username = ?', [username]);

    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: '登录成功',
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('登录错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 验证令牌有效性
router.get('/verify', (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const db = getDb();
    const user = db.get('SELECT id, username, email, role FROM users WHERE id = ?', [decoded.id]);

    if (!user) {
      return res.status(401).json({ error: '用户不存在' });
    }

    res.json({ user });
  } catch (err) {
    return res.status(401).json({ error: '无效或过期的令牌' });
  }
});

// 获取当前用户信息
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const db = getDb();
    const user = db.get('SELECT id, username, email, role, created_at FROM users WHERE id = ?', [decoded.id]);

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json({ user });
  } catch (err) {
    return res.status(401).json({ error: '无效或过期的令牌' });
  }
});

module.exports = router;