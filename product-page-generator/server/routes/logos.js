const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const LOGOS_DIR = path.join(__dirname, '..', '..', 'public', 'uploads', 'logos');

// 确保LOGO目录存在
if (!fs.existsSync(LOGOS_DIR)) {
  fs.mkdirSync(LOGOS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, LOGOS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    cb(null, `logo_${timestamp}_${random}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 JPG/PNG/GIF/WEBP/SVG 格式'));
    }
  }
});

router.use(authMiddleware);

// 获取LOGO列表
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const logos = db.all(
      'SELECT id, name, file_url, file_type, width, height, created_at FROM logo_assets WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ logos });
  } catch (err) {
    console.error('获取LOGO列表错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 上传LOGO
router.post('/', (req, res) => {
  upload.single('logo')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: '请选择LOGO文件' });
    }

    try {
      const db = getDb();
      const name = req.body.name || path.basename(req.file.originalname, path.extname(req.file.originalname));
      const fileUrl = `/uploads/logos/${req.file.filename}`;
      const fileType = req.file.mimetype === 'image/svg+xml' ? 'svg' : 'image';

      // 获取图片尺寸（不依赖image-size，前端可以自行获取）
      let width = 0, height = 0;

      const result = db.run(
        'INSERT INTO logo_assets (user_id, name, file_url, file_type, width, height) VALUES (?, ?, ?, ?, ?, ?)',
        [req.user.id, name, fileUrl, fileType, width, height]
      );

      res.status(201).json({
        id: result.lastInsertRowid,
        name,
        file_url: fileUrl,
        file_type: fileType,
        width,
        height,
        message: 'LOGO上传成功'
      });
    } catch (err) {
      console.error('保存LOGO错误:', err);
      // 删除已上传的文件
      try { fs.unlinkSync(req.file.path); } catch (e) {}
      res.status(500).json({ error: '服务器错误' });
    }
  });
});

// 删除LOGO
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const logo = db.get('SELECT * FROM logo_assets WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);

    if (!logo) {
      return res.status(404).json({ error: 'LOGO不存在' });
    }

    // 删除文件
    const filePath = path.join(__dirname, '..', '..', 'public', logo.file_url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    db.run('DELETE FROM logo_assets WHERE id = ?', [req.params.id]);
    res.json({ message: '删除成功' });
  } catch (err) {
    console.error('删除LOGO错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 更新LOGO名称
router.put('/:id', (req, res) => {
  try {
    const db = getDb();
    const logo = db.get('SELECT * FROM logo_assets WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);

    if (!logo) {
      return res.status(404).json({ error: 'LOGO不存在' });
    }

    const { name } = req.body;
    if (name) {
      db.run('UPDATE logo_assets SET name = ? WHERE id = ?', [name, req.params.id]);
    }

    res.json({ message: '更新成功' });
  } catch (err) {
    console.error('更新LOGO错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
