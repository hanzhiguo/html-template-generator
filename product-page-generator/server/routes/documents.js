const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const DOCUMENT_TYPES = ['pdf', 'video', 'manual', 'spec', 'other'];
const ALLOWED_MIMES = {
  'application/pdf': '.pdf',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/x-msvideo': '.avi',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'text/plain': '.txt'
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const productId = req.params.productId || 'temp';
    const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'products', productId, 'documents');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const productId = req.params.productId || 'temp';
    const ext = path.extname(file.originalname) || '.bin';
    const timestamp = Date.now();
    const safeName = file.originalname.replace(ext, '').replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_');
    cb(null, `${productId}_${safeName}_${timestamp}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.pdf', '.mp4', '.webm', '.avi', '.doc', '.docx', '.xls', '.xlsx', '.txt'];
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件格式: ${ext}，支持 PDF/MP4/WebM/AVI/DOC/DOCX/XLS/XLSX/TXT`));
    }
  }
});

router.post('/:productId/upload', authMiddleware, (req, res) => {
  try {
    const { productId } = req.params;
    const db = getDb();

    const product = db.get('SELECT id, name FROM products WHERE id = ? AND user_id = ?', [productId, req.user.id]);
    if (!product) {
      return res.status(404).json({ error: '产品不存在' });
    }

    upload.single('document')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: '请选择文件' });
      }

      const filePath = `/uploads/products/${productId}/documents/${req.file.filename}`;
      const docType = req.body.doc_type || 'other';
      const title = req.body.title || req.file.originalname;
      const mimeType = req.file.mimetype;
      const fileSize = req.file.size;

      const result = db.run(
        `INSERT INTO product_documents (product_id, doc_type, title, file_path, file_size, mime_type, link_type, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, 'upload', ?)`,
        [productId, docType, title, filePath, fileSize, mimeType, req.body.sort_order || 0]
      );

      res.status(201).json({
        id: result.lastInsertRowid,
        title,
        doc_type: docType,
        file_path: filePath,
        file_size: fileSize,
        mime_type: mimeType,
        message: '文档上传成功'
      });
    });
  } catch (err) {
    console.error('上传文档错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/:productId/link', authMiddleware, (req, res) => {
  try {
    const { productId } = req.params;
    const db = getDb();

    const product = db.get('SELECT id FROM products WHERE id = ? AND user_id = ?', [productId, req.user.id]);
    if (!product) {
      return res.status(404).json({ error: '产品不存在' });
    }

    const { title, doc_type, file_path, file_size, mime_type } = req.body;

    if (!title || !file_path) {
      return res.status(400).json({ error: '标题和文件路径不能为空' });
    }

    let linkType = 'local';
    if (file_path.startsWith('http://') || file_path.startsWith('https://')) {
      linkType = 'external';
    } else if (file_path.startsWith('/uploads/')) {
      linkType = 'upload';
    }

    const result = db.run(
      `INSERT INTO product_documents (product_id, doc_type, title, file_path, file_size, mime_type, link_type, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [productId, doc_type || 'other', title, file_path, file_size || 0, mime_type || '', linkType, req.body.sort_order || 0]
    );

    res.status(201).json({
      id: result.lastInsertRowid,
      title,
      doc_type: doc_type || 'other',
      file_path,
      link_type: linkType,
      message: '文档链接添加成功'
    });
  } catch (err) {
    console.error('链接文档错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/:productId/documents', (req, res) => {
  try {
    const db = getDb();
    const { productId } = req.params;
    const { type } = req.query;

    let sql = 'SELECT * FROM product_documents WHERE product_id = ?';
    const params = [productId];

    if (type) {
      sql += ' AND doc_type = ?';
      params.push(type);
    }

    sql += ' ORDER BY sort_order ASC, id ASC';

    const documents = db.all(sql, params);

    res.json({ documents });
  } catch (err) {
    console.error('获取文档列表错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.put('/:productId/documents/:docId', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const { productId, docId } = req.params;
    const { title, doc_type, sort_order } = req.body;

    db.run(
      `UPDATE product_documents SET
        title = COALESCE(?, title),
        doc_type = COALESCE(?, doc_type),
        sort_order = COALESCE(?, sort_order)
       WHERE id = ? AND product_id = ?`,
      [title, doc_type, sort_order, docId, productId]
    );

    res.json({ message: '更新成功' });
  } catch (err) {
    console.error('更新文档错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.delete('/:productId/documents/:docId', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const { productId, docId } = req.params;

    const doc = db.get('SELECT file_path, link_type FROM product_documents WHERE id = ? AND product_id = ?', [docId, productId]);

    if (doc) {
      if (doc.link_type === 'upload' && doc.file_path && !doc.file_path.startsWith('http')) {
        const filePath = path.join(__dirname, '..', '..', 'public', doc.file_path);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      db.run('DELETE FROM product_documents WHERE id = ? AND product_id = ?', [docId, productId]);
    }

    res.json({ message: '删除成功' });
  } catch (err) {
    console.error('删除文档错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/:productId/attachments/all', (req, res) => {
  try {
    const db = getDb();
    const { productId } = req.params;

    const images = db.all(
      "SELECT id, 'image' as type, image_type as subtype, image_url as url, alt_text as title, NULL as file_size, NULL as mime_type, sort_order FROM product_images WHERE product_id = ? ORDER BY sort_order ASC, id ASC",
      [productId]
    );

    const documents = db.all(
      'SELECT id, doc_type as subtype, file_path as url, title, file_size, mime_type, sort_order FROM product_documents WHERE product_id = ? ORDER BY sort_order ASC, id ASC',
      [productId]
    );

    const attachments = [
      ...images.map(i => ({ ...i, category: 'image' })),
      ...documents.map(d => ({ ...d, category: 'document' }))
    ];

    attachments.sort((a, b) => a.sort_order - b.sort_order);

    res.json({ attachments, images, documents });
  } catch (err) {
    console.error('获取附件列表错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;