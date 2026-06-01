const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'products');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 使用产品ID和图片类型命名: {productId}_{imageType}_{timestamp}.{ext}
    const productId = req.params.productId || 'temp';
    const imageType = req.body.image_type || 'main';
    const ext = path.extname(file.originalname);
    const timestamp = Date.now();
    cb(null, `${productId}_${imageType}_${timestamp}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 JPG/PNG/GIF/WEBP 格式图片'));
    }
  }
});

// 上传单张图片
router.post('/:productId/images', authMiddleware, (req, res) => {
  try {
    const { productId } = req.params;
    const db = getDb();

    // 验证产品归属
    const product = db.get('SELECT id FROM products WHERE id = ? AND user_id = ?', [productId, req.user.id]);
    if (!product) {
      return res.status(404).json({ error: '产品不存在' });
    }

    upload.single('image')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: '请选择图片文件' });
      }

      const imageUrl = `/uploads/products/${req.file.filename}`;
      const imageType = req.body.image_type || 'main';
      const altText = req.body.alt_text || '';

      const result = db.run(
        'INSERT INTO product_images (product_id, image_type, image_url, alt_text, sort_order) VALUES (?, ?, ?, ?, ?)',
        [productId, imageType, imageUrl, altText, req.body.sort_order || 0]
      );

      res.status(201).json({
        id: result.lastInsertRowid,
        image_url: imageUrl,
        message: '图片上传成功'
      });
    });
  } catch (err) {
    console.error('上传图片错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 批量上传图片（支持命名规则: {sku}_{位置}.{ext}）
router.post('/:productId/images/batch', authMiddleware, (req, res) => {
  try {
    const { productId } = req.params;
    const db = getDb();

    const product = db.get('SELECT id, sku FROM products WHERE id = ? AND user_id = ?', [productId, req.user.id]);
    if (!product) {
      return res.status(404).json({ error: '产品不存在' });
    }

    upload.array('images', 20)(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: '请选择图片文件' });
      }

      const results = [];
      const imageTypeMap = {
        'main': 'main',
        'main_image': 'main',
        'detail': 'detail',
        'detail_image': 'detail',
        'dimension': 'dimension',
        'dimension_image': 'dimension',
        'gallery': 'gallery',
        'banner': 'banner'
      };

      req.files.forEach((file, index) => {
        // 从文件名解析图片类型: prod-s004_main_xxx.jpg
        const filename = path.basename(file.filename, path.extname(file.filename));
        const parts = filename.split('_');
        let imageType = 'detail';

        // 尝试从文件名第二部分获取类型
        if (parts.length >= 2) {
          const typePart = parts[1].toLowerCase();
          imageType = imageTypeMap[typePart] || typePart;
        }

        // 如果文件名包含SKU，优先匹配
        if (product.sku && file.originalname.toLowerCase().includes(product.sku.toLowerCase())) {
          if (parts.length >= 2) {
            imageType = imageTypeMap[parts[1].toLowerCase()] || imageType;
          }
        }

        const imageUrl = `/uploads/products/${file.filename}`;
        const result = db.run(
          'INSERT INTO product_images (product_id, image_type, image_url, alt_text, sort_order) VALUES (?, ?, ?, ?, ?)',
          [productId, imageType, imageUrl, `图片 ${index + 1}`, index]
        );

        results.push({
          id: result.lastInsertRowid,
          filename: file.filename,
          image_type: imageType,
          image_url: imageUrl
        });
      });

      res.status(201).json({
        message: `成功上传 ${results.length} 张图片`,
        images: results
      });
    });
  } catch (err) {
    console.error('批量上传图片错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取产品图片列表
router.get('/:productId/images', (req, res) => {
  try {
    const db = getDb();
    const { productId } = req.params;
    const { type } = req.query;

    let sql = 'SELECT * FROM product_images WHERE product_id = ?';
    const params = [productId];

    if (type) {
      sql += ' AND image_type = ?';
      params.push(type);
    }

    sql += ' ORDER BY sort_order ASC, id ASC';

    const images = db.all(sql, params);

    res.json({ images });
  } catch (err) {
    console.error('获取图片列表错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 更新图片信息
router.put('/:productId/images/:imageId', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const { productId, imageId } = req.params;
    const { image_type, alt_text, sort_order } = req.body;

    const product = db.get('SELECT id FROM products WHERE id = ? AND user_id = ?', [productId, req.user.id]);
    if (!product) {
      return res.status(404).json({ error: '产品不存在或无权限' });
    }

    const existingImage = db.get('SELECT id FROM product_images WHERE id = ? AND product_id = ?', [imageId, productId]);
    if (!existingImage) {
      return res.status(404).json({ error: '图片不存在' });
    }

    const result = db.run(
      `UPDATE product_images SET
        image_type = COALESCE(?, image_type),
        alt_text = ?,
        sort_order = ?
       WHERE id = ? AND product_id = ?`,
      [image_type, alt_text || '', sort_order || 0, imageId, productId]
    );

    if (result.changes > 0) {
      res.json({ message: '更新成功', image_type });
    } else {
      res.status(400).json({ error: '更新失败，数据未改变' });
    }
  } catch (err) {
    console.error('更新图片错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 删除图片
router.delete('/:productId/images/:imageId', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const { productId, imageId } = req.params;

    // 获取图片信息用于删除文件
    const image = db.get('SELECT image_url FROM product_images WHERE id = ? AND product_id = ?', [imageId, productId]);

    if (image) {
      // 删除文件
      const filePath = path.join(__dirname, '..', '..', 'public', image.image_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      db.run('DELETE FROM product_images WHERE id = ? AND product_id = ?', [imageId, productId]);
    }

    res.json({ message: '删除成功' });
  } catch (err) {
    console.error('删除图片错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 根据SKU自动绑定图片（扫描upload目录，按命名规则匹配）
router.post('/bind-by-naming', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'products');

    if (!fs.existsSync(uploadDir)) {
      return res.json({ message: '上传目录不存在', bound: 0 });
    }

    const files = fs.readdirSync(uploadDir).filter(f =>
      /\.(jpg|jpeg|png|gif|webp)$/i.test(f)
    );

    // 获取所有产品SKU
    const products = db.all('SELECT id, sku, name FROM products WHERE user_id = ?', [req.user.id]);
    const productMap = {};
    products.forEach(p => {
      if (p.sku) productMap[p.sku.toLowerCase()] = p;
    });

    const imageTypeMap = {
      'main': 'main', 'hero': 'main', 'primary': 'main',
      'detail': 'detail', 'gallery': 'detail',
      'dimension': 'dimension', 'dim': 'dimension', 'size': 'dimension',
      'banner': 'banner', 'thumb': 'thumbnail'
    };

    let boundCount = 0;
    const results = [];

    files.forEach(filename => {
      const ext = path.extname(filename);
      const nameWithoutExt = path.basename(filename, ext).toLowerCase();

      // 解析: {sku}_{type}_{可选后缀} 或 {sku}_{可选后缀}_{type}
      let sku = null;
      let imageType = 'detail';

      // 方法1: SKU_type_timestamp 格式
      const parts1 = nameWithoutExt.split('_');
      if (parts1.length >= 2) {
        // 检查第一部分是否是已知SKU
        const possibleSku = parts1[0];
        if (productMap[possibleSku]) {
          sku = possibleSku;
          const typePart = parts1[1];
          imageType = imageTypeMap[typePart] || typePart;
        }
      }

      if (!sku) {
        results.push({ filename, status: '未匹配到产品' });
        return;
      }

      const product = productMap[sku];
      const imageUrl = `/uploads/products/${filename}`;

      // 检查是否已存在
      const existing = db.get('SELECT id FROM product_images WHERE product_id = ? AND image_url = ?', [product.id, imageUrl]);
      if (existing) {
        results.push({ filename, status: '已存在，跳过' });
        return;
      }

      const result = db.run(
        'INSERT INTO product_images (product_id, image_type, image_url, alt_text, sort_order) VALUES (?, ?, ?, ?, ?)',
        [product.id, imageType, imageUrl, filename, 0]
      );

      boundCount++;
      results.push({
        filename,
        product: product.name,
        product_id: product.id,
        image_type: imageType,
        status: '绑定成功'
      });
    });

    res.json({
      message: `扫描完成，绑定 ${boundCount} 张图片`,
      total_files: files.length,
      bound: boundCount,
      details: results
    });
  } catch (err) {
    console.error('自动绑定图片错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;