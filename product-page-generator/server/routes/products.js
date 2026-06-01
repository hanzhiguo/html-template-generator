const express = require('express');
const { getDb } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// 获取产品列表
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { status, category_id, search } = req.query;

    let query = 'SELECT * FROM products WHERE user_id = ?';
    const params = [req.user.id];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (category_id) {
      query += ' AND category_id = ?';
      params.push(category_id);
    }

    if (search) {
      query += ' AND (name LIKE ? OR sku LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC';

    const products = db.all(query, params);

    res.json({ products });
  } catch (err) {
    console.error('获取产品列表错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取单个产品
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const product = db.get('SELECT * FROM products WHERE id = ? AND user_id = ?', [id, req.user.id]);

    if (!product) {
      return res.status(404).json({ error: '产品不存在' });
    }

    // 5大表数据
    const highlights = db.all('SELECT * FROM product_highlights WHERE product_id = ?', [id]);
    const specs = db.all('SELECT * FROM product_specs WHERE product_id = ?', [id]);
    const accessories = db.all('SELECT * FROM product_accessories WHERE product_id = ?', [id]);
    const features = db.all('SELECT * FROM product_features WHERE product_id = ?', [id]);
    const dimensions = db.all('SELECT * FROM product_dimensions WHERE product_id = ?', [id]);

    res.json({
      product: {
        ...product,
        highlights, specs, accessories, features, dimensions
      }
    });
  } catch (err) {
    console.error('获取产品错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 创建产品
router.post('/', (req, res) => {
  try {
    const db = getDb();
    const {
      sku, name, subtitle, description, price, currency,
      main_image, dimension_image, category_id, template_id, status
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: '产品名称不能为空' });
    }

    const result = db.run(`
      INSERT INTO products (user_id, sku, name, subtitle, description, price, currency,
                          main_image, dimension_image, category_id, template_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      req.user.id, sku || null, name, subtitle || null, description || null,
      price || null, currency || 'USD', main_image || null, dimension_image || null,
      category_id || null, template_id || null, status || 'draft'
    ]);

    const productId = result.lastInsertRowid;

    // 处理快速特性
    if (req.body.quickFeatures && Array.isArray(req.body.quickFeatures)) {
      req.body.quickFeatures.forEach((f, index) => {
        db.run(`
          INSERT INTO product_quick_features (product_id, icon_svg, text_line1, text_line2, sort_order)
          VALUES (?, ?, ?, ?, ?)
        `, [productId, f.icon_svg || null, f.text_line1 || '', f.text_line2 || '', index]);
      });
    }

    // 处理功能卡片
    if (req.body.featureCards && Array.isArray(req.body.featureCards)) {
      req.body.featureCards.forEach((c, index) => {
        db.run(`
          INSERT INTO product_feature_cards (product_id, icon_emoji, title, description, sort_order)
          VALUES (?, ?, ?, ?, ?)
        `, [productId, c.icon_emoji || null, c.title || '', c.description || '', index]);
      });
    }

    // 处理规格参数
    if (req.body.specifications && Array.isArray(req.body.specifications)) {
      req.body.specifications.forEach((s, index) => {
        db.run(`
          INSERT INTO product_specifications (product_id, spec_label, spec_value, sort_order)
          VALUES (?, ?, ?, ?)
        `, [productId, s.spec_label || '', s.spec_value || '', index]);
      });
    }

    // 处理图片
    if (req.body.images && Array.isArray(req.body.images)) {
      req.body.images.forEach((img, index) => {
        db.run(`
          INSERT INTO product_images (product_id, image_type, image_url, alt_text, sort_order)
          VALUES (?, ?, ?, ?, ?)
        `, [productId, img.image_type || 'detail', img.image_url || '', img.alt_text || '', index]);
      });
    }

    // 处理文档
    if (req.body.documents && Array.isArray(req.body.documents)) {
      req.body.documents.forEach((doc, index) => {
        db.run(`
          INSERT INTO product_documents (product_id, doc_type, title, file_path, sort_order)
          VALUES (?, ?, ?, ?, ?)
        `, [productId, doc.doc_type || 'other', doc.title || '', doc.file_path || '', index]);
      });
    }

    const newProduct = db.get('SELECT * FROM products WHERE id = ?', [productId]);

    res.status(201).json({
      message: '产品创建成功',
      product: newProduct
    });
  } catch (err) {
    console.error('创建产品错误:', err);
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'SKU已存在' });
    }
    res.status(500).json({ error: '服务器错误' });
  }
});

// 更新产品
router.put('/:id', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const existing = db.get('SELECT * FROM products WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (!existing) {
      return res.status(404).json({ error: '产品不存在' });
    }

    const {
      sku, name, subtitle, description, price, currency,
      main_image, dimension_image, category_id, template_id, status
    } = req.body;

    db.run(`
      UPDATE products SET
        sku = COALESCE(?, sku),
        name = COALESCE(?, name),
        subtitle = ?,
        description = ?,
        price = ?,
        currency = COALESCE(?, currency),
        main_image = ?,
        dimension_image = ?,
        category_id = ?,
        template_id = ?,
        status = COALESCE(?, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `, [
      sku, name, subtitle || null, description || null, price,
      currency, main_image || null, dimension_image || null,
      category_id, template_id, status, id, req.user.id
    ]);

    // 更新快速特性
    if (req.body.quickFeatures !== undefined) {
      db.run('DELETE FROM product_quick_features WHERE product_id = ?', [id]);
      if (Array.isArray(req.body.quickFeatures)) {
        req.body.quickFeatures.forEach((f, index) => {
          db.run(`
            INSERT INTO product_quick_features (product_id, icon_svg, text_line1, text_line2, sort_order)
            VALUES (?, ?, ?, ?, ?)
          `, [id, f.icon_svg || null, f.text_line1 || '', f.text_line2 || '', index]);
        });
      }
    }

    // 更新功能卡片
    if (req.body.featureCards !== undefined) {
      db.run('DELETE FROM product_feature_cards WHERE product_id = ?', [id]);
      if (Array.isArray(req.body.featureCards)) {
        req.body.featureCards.forEach((c, index) => {
          db.run(`
            INSERT INTO product_feature_cards (product_id, icon_emoji, title, description, sort_order)
            VALUES (?, ?, ?, ?, ?)
          `, [id, c.icon_emoji || null, c.title || '', c.description || '', index]);
        });
      }
    }

    // 更新规格参数
    if (req.body.specifications !== undefined) {
      db.run('DELETE FROM product_specifications WHERE product_id = ?', [id]);
      if (Array.isArray(req.body.specifications)) {
        req.body.specifications.forEach((s, index) => {
          db.run(`
            INSERT INTO product_specifications (product_id, spec_label, spec_value, sort_order)
            VALUES (?, ?, ?, ?)
          `, [id, s.spec_label || '', s.spec_value || '', index]);
        });
      }
    }

    // 更新图片
    if (req.body.images !== undefined) {
      db.run('DELETE FROM product_images WHERE product_id = ?', [id]);
      if (Array.isArray(req.body.images)) {
        req.body.images.forEach((img, index) => {
          db.run(`
            INSERT INTO product_images (product_id, image_type, image_url, alt_text, sort_order)
            VALUES (?, ?, ?, ?, ?)
          `, [id, img.image_type || 'detail', img.image_url || '', img.alt_text || '', index]);
        });
      }
    }

    // 更新文档
    if (req.body.documents !== undefined) {
      db.run('DELETE FROM product_documents WHERE product_id = ?', [id]);
      if (Array.isArray(req.body.documents)) {
        req.body.documents.forEach((doc, index) => {
          db.run(`
            INSERT INTO product_documents (product_id, doc_type, title, file_path, sort_order)
            VALUES (?, ?, ?, ?, ?)
          `, [id, doc.doc_type || 'other', doc.title || '', doc.file_path || '', index]);
        });
      }
    }

    const updatedProduct = db.get('SELECT * FROM products WHERE id = ?', [id]);

    res.json({
      message: '产品更新成功',
      product: updatedProduct
    });
  } catch (err) {
    console.error('更新产品错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 删除产品
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    db.run('DELETE FROM products WHERE id = ? AND user_id = ?', [id, req.user.id]);

    res.json({ message: '产品删除成功' });
  } catch (err) {
    console.error('删除产品错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ==================== 5大产品数据表 CRUD ====================

// 核心卖点
router.post('/:productId/highlights', (req, res) => {
  try {
    const db = getDb();
    const { productId } = req.params;
    const { highlight_key, highlight_value } = req.body;

    const product = db.get('SELECT id FROM products WHERE id = ? AND user_id = ?', [productId, req.user.id]);
    if (!product) return res.status(404).json({ error: '产品不存在' });

    const result = db.run(`INSERT INTO product_highlights (product_id, highlight_key, highlight_value) VALUES (?, ?, ?)`,
      [productId, highlight_key || '', highlight_value || '']);

    res.status(201).json({ id: result.lastInsertRowid, message: '添加成功' });
  } catch (err) {
    console.error('添加核心卖点错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.put('/:productId/highlights/:id', (req, res) => {
  try {
    const db = getDb();
    const { productId, id } = req.params;
    const { highlight_key, highlight_value } = req.body;

    db.run(`UPDATE product_highlights SET highlight_key = ?, highlight_value = ? WHERE id = ? AND product_id = ?`,
      [highlight_key || '', highlight_value || '', id, productId]);

    res.json({ message: '更新成功' });
  } catch (err) {
    console.error('更新核心卖点错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.delete('/:productId/highlights/:id', (req, res) => {
  try {
    const db = getDb();
    const { productId, id } = req.params;
    db.run('DELETE FROM product_highlights WHERE id = ? AND product_id = ?', [id, productId]);
    res.json({ message: '删除成功' });
  } catch (err) {
    console.error('删除核心卖点错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 产品规格
router.post('/:productId/specs', (req, res) => {
  try {
    const db = getDb();
    const { productId } = req.params;
    const { spec_label, spec_value, spec_unit } = req.body;

    const product = db.get('SELECT id FROM products WHERE id = ? AND user_id = ?', [productId, req.user.id]);
    if (!product) return res.status(404).json({ error: '产品不存在' });

    const result = db.run(`INSERT INTO product_specs (product_id, spec_label, spec_value, spec_unit) VALUES (?, ?, ?, ?)`,
      [productId, spec_label || '', spec_value || '', spec_unit || '']);

    res.status(201).json({ id: result.lastInsertRowid, message: '添加成功' });
  } catch (err) {
    console.error('添加产品规格错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.put('/:productId/specs/:id', (req, res) => {
  try {
    const db = getDb();
    const { productId, id } = req.params;
    const { spec_label, spec_value, spec_unit } = req.body;

    db.run(`UPDATE product_specs SET spec_label = ?, spec_value = ?, spec_unit = ? WHERE id = ? AND product_id = ?`,
      [spec_label || '', spec_value || '', spec_unit || '', id, productId]);

    res.json({ message: '更新成功' });
  } catch (err) {
    console.error('更新产品规格错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.delete('/:productId/specs/:id', (req, res) => {
  try {
    const db = getDb();
    const { productId, id } = req.params;
    db.run('DELETE FROM product_specs WHERE id = ? AND product_id = ?', [id, productId]);
    res.json({ message: '删除成功' });
  } catch (err) {
    console.error('删除产品规格错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 包装清单
router.post('/:productId/accessories', (req, res) => {
  try {
    const db = getDb();
    const { productId } = req.params;
    const { accessory_name, quantity } = req.body;

    const product = db.get('SELECT id FROM products WHERE id = ? AND user_id = ?', [productId, req.user.id]);
    if (!product) return res.status(404).json({ error: '产品不存在' });

    const result = db.run(`INSERT INTO product_accessories (product_id, accessory_name, quantity) VALUES (?, ?, ?)`,
      [productId, accessory_name || '', quantity || 1]);

    res.status(201).json({ id: result.lastInsertRowid, message: '添加成功' });
  } catch (err) {
    console.error('添加包装清单错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.put('/:productId/accessories/:id', (req, res) => {
  try {
    const db = getDb();
    const { productId, id } = req.params;
    const { accessory_name, quantity } = req.body;

    db.run(`UPDATE product_accessories SET accessory_name = ?, quantity = ? WHERE id = ? AND product_id = ?`,
      [accessory_name || '', quantity || 1, id, productId]);

    res.json({ message: '更新成功' });
  } catch (err) {
    console.error('更新包装清单错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.delete('/:productId/accessories/:id', (req, res) => {
  try {
    const db = getDb();
    const { productId, id } = req.params;
    db.run('DELETE FROM product_accessories WHERE id = ? AND product_id = ?', [id, productId]);
    res.json({ message: '删除成功' });
  } catch (err) {
    console.error('删除包装清单错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 功能亮点
router.post('/:productId/features', (req, res) => {
  try {
    const db = getDb();
    const { productId } = req.params;
    const { icon_emoji, feature_title, description, feature_value } = req.body;

    const product = db.get('SELECT id FROM products WHERE id = ? AND user_id = ?', [productId, req.user.id]);
    if (!product) return res.status(404).json({ error: '产品不存在' });

    const result = db.run(`INSERT INTO product_features (product_id, icon_emoji, feature_title, description, feature_value) VALUES (?, ?, ?, ?, ?)`,
      [productId, icon_emoji || '', feature_title || '', description || '', feature_value || '']);

    res.status(201).json({ id: result.lastInsertRowid, message: '添加成功' });
  } catch (err) {
    console.error('添加功能亮点错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.put('/:productId/features/:id', (req, res) => {
  try {
    const db = getDb();
    const { productId, id } = req.params;
    const { icon_emoji, feature_title, description, feature_value } = req.body;

    db.run(`UPDATE product_features SET icon_emoji = ?, feature_title = ?, description = ?, feature_value = ? WHERE id = ? AND product_id = ?`,
      [icon_emoji || '', feature_title || '', description || '', feature_value || '', id, productId]);

    res.json({ message: '更新成功' });
  } catch (err) {
    console.error('更新功能亮点错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.delete('/:productId/features/:id', (req, res) => {
  try {
    const db = getDb();
    const { productId, id } = req.params;
    db.run('DELETE FROM product_features WHERE id = ? AND product_id = ?', [id, productId]);
    res.json({ message: '删除成功' });
  } catch (err) {
    console.error('删除功能亮点错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 适配尺寸
router.post('/:productId/dimensions', (req, res) => {
  try {
    const db = getDb();
    const { productId } = req.params;
    const { dim_label, dim_value, dim_unit } = req.body;

    const product = db.get('SELECT id FROM products WHERE id = ? AND user_id = ?', [productId, req.user.id]);
    if (!product) return res.status(404).json({ error: '产品不存在' });

    const result = db.run(`INSERT INTO product_dimensions (product_id, dim_label, dim_value, dim_unit) VALUES (?, ?, ?, ?)`,
      [productId, dim_label || '', dim_value || '', dim_unit || '']);

    res.status(201).json({ id: result.lastInsertRowid, message: '添加成功' });
  } catch (err) {
    console.error('添加适配尺寸错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.put('/:productId/dimensions/:id', (req, res) => {
  try {
    const db = getDb();
    const { productId, id } = req.params;
    const { dim_label, dim_value, dim_unit } = req.body;

    db.run(`UPDATE product_dimensions SET dim_label = ?, dim_value = ?, dim_unit = ? WHERE id = ? AND product_id = ?`,
      [dim_label || '', dim_value || '', dim_unit || '', id, productId]);

    res.json({ message: '更新成功' });
  } catch (err) {
    console.error('更新适配尺寸错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.delete('/:productId/dimensions/:id', (req, res) => {
  try {
    const db = getDb();
    const { productId, id } = req.params;
    db.run('DELETE FROM product_dimensions WHERE id = ? AND product_id = ?', [id, productId]);
    res.json({ message: '删除成功' });
  } catch (err) {
    console.error('删除适配尺寸错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;