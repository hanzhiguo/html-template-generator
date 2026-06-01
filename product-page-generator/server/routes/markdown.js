const express = require('express');
const fs = require('fs');
const path = require('path');
const { getDb, saveDatabase } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');
const { parseMarkdownFile, convertToDbFormat } = require('../services/markdown');

const router = express.Router();

router.use(authMiddleware);

// 上传并解析MD文档
router.post('/upload', (req, res) => {
  try {
    const { productId, mdContent } = req.body;
    const db = getDb();

    if (!productId) {
      return res.status(400).json({ error: '产品ID不能为空' });
    }

    const product = db.get('SELECT * FROM products WHERE id = ? AND user_id = ?', [productId, req.user.id]);
    if (!product) {
      return res.status(404).json({ error: '产品不存在' });
    }

    let parsedData;
    if (mdContent) {
      const markdown = require('../services/markdown');
      parsedData = markdown.parseProductMarkdown(mdContent);
    } else if (product.md_document_path && fs.existsSync(product.md_document_path)) {
      parsedData = parseMarkdownFile(product.md_document_path);
    } else {
      return res.status(400).json({ error: '请提供MD内容或绑定MD文件路径' });
    }

    const dbFormat = convertToDbFormat(parsedData);

    // 更新产品基本信息
    db.run(`
      UPDATE products SET
        name = COALESCE(?, name),
        subtitle = ?,
        description = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `, [
      dbFormat.name || product.name,
      dbFormat.subtitle,
      dbFormat.description,
      productId,
      req.user.id
    ]);

    // 1. 更新核心卖点
    if (dbFormat.highlights.length > 0) {
      db.run('DELETE FROM product_highlights WHERE product_id = ?', [productId]);
      dbFormat.highlights.forEach((h, index) => {
        db.run(`
          INSERT INTO product_highlights (product_id, highlight_key, highlight_value, icon_svg, sort_order)
          VALUES (?, ?, ?, ?, ?)
        `, [productId, h.highlight_key, h.highlight_value || null, h.icon_svg || null, index]);
      });
    }

    // 2. 更新产品规格
    if (dbFormat.specs.length > 0) {
      db.run('DELETE FROM product_specs WHERE product_id = ?', [productId]);
      dbFormat.specs.forEach((s, index) => {
        db.run(`
          INSERT INTO product_specs (product_id, spec_label, spec_value, spec_unit, spec_group, sort_order)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [productId, s.spec_label, s.spec_value, s.spec_unit || null, s.spec_group || 'general', index]);
      });
    }

    // 3. 更新包装清单
    if (dbFormat.accessories.length > 0) {
      db.run('DELETE FROM product_accessories WHERE product_id = ?', [productId]);
      dbFormat.accessories.forEach((a, index) => {
        db.run(`
          INSERT INTO product_accessories (product_id, accessory_name, quantity, is_included, sort_order)
          VALUES (?, ?, ?, ?, ?)
        `, [productId, a.accessory_name, a.quantity || 1, 1, index]);
      });
    }

    // 4. 更新功能亮点
    if (dbFormat.features.length > 0) {
      db.run('DELETE FROM product_features WHERE product_id = ?', [productId]);
      dbFormat.features.forEach((f, index) => {
        db.run(`
          INSERT INTO product_features (product_id, feature_title, feature_value, icon_emoji, description, sort_order)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [productId, f.feature_title, f.feature_value || null, f.icon_emoji || null, f.description || null, index]);
      });
    }

    // 5. 更新适配尺寸
    if (dbFormat.dimensions.length > 0) {
      db.run('DELETE FROM product_dimensions WHERE product_id = ?', [productId]);
      dbFormat.dimensions.forEach((d, index) => {
        db.run(`
          INSERT INTO product_dimensions (product_id, dim_label, dim_value, dim_unit, dim_category, sort_order)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [productId, d.dim_label, d.dim_value, d.dim_unit || null, d.dim_category || 'dimensions', index]);
      });
    }

    saveDatabase();

    res.json({
      success: true,
      message: 'MD文档解析并更新成功',
      data: {
        name: dbFormat.name,
        highlightsCount: dbFormat.highlights.length,
        specsCount: dbFormat.specs.length,
        accessoriesCount: dbFormat.accessories.length,
        featuresCount: dbFormat.features.length,
        dimensionsCount: dbFormat.dimensions.length
      }
    });
  } catch (err) {
    console.error('解析MD文档错误:', err);
    res.status(500).json({ error: '解析失败: ' + err.message });
  }
});

// 绑定MD文件路径
router.post('/bind', (req, res) => {
  try {
    const { productId, filePath } = req.body;
    const db = getDb();

    if (!productId || !filePath) {
      return res.status(400).json({ error: '产品ID和文件路径不能为空' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(400).json({ error: 'MD文件不存在' });
    }

    const result = db.run(`
      UPDATE products SET
        md_document_path = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `, [filePath, productId, req.user.id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: '产品不存在' });
    }

    saveDatabase();

    try {
      const parsed = parseMarkdownFile(filePath);
      const dbFormat = convertToDbFormat(parsed);

      // 更新产品数据
      db.run(`
        UPDATE products SET
          name = COALESCE(?, name),
          subtitle = ?,
          description = ?
        WHERE id = ? AND user_id = ?
      `, [dbFormat.name, dbFormat.subtitle, dbFormat.description, productId, req.user.id]);

      // 清除并插入新数据
      db.run('DELETE FROM product_highlights WHERE product_id = ?', [productId]);
      db.run('DELETE FROM product_specs WHERE product_id = ?', [productId]);
      db.run('DELETE FROM product_accessories WHERE product_id = ?', [productId]);
      db.run('DELETE FROM product_features WHERE product_id = ?', [productId]);
      db.run('DELETE FROM product_dimensions WHERE product_id = ?', [productId]);

      dbFormat.highlights.forEach((h, i) => {
        db.run(`INSERT INTO product_highlights (product_id, highlight_key, highlight_value, icon_svg, sort_order) VALUES (?, ?, ?, ?, ?)`,
          [productId, h.highlight_key, h.highlight_value || null, h.icon_svg || null, i]);
      });

      dbFormat.specs.forEach((s, i) => {
        db.run(`INSERT INTO product_specs (product_id, spec_label, spec_value, spec_unit, spec_group, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
          [productId, s.spec_label, s.spec_value, s.spec_unit || null, s.spec_group || 'general', i]);
      });

      dbFormat.accessories.forEach((a, i) => {
        db.run(`INSERT INTO product_accessories (product_id, accessory_name, quantity, is_included, sort_order) VALUES (?, ?, ?, ?, ?)`,
          [productId, a.accessory_name, a.quantity || 1, 1, i]);
      });

      dbFormat.features.forEach((f, i) => {
        db.run(`INSERT INTO product_features (product_id, feature_title, feature_value, icon_emoji, description, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
          [productId, f.feature_title, f.feature_value || null, f.icon_emoji || null, f.description || null, i]);
      });

      dbFormat.dimensions.forEach((d, i) => {
        db.run(`INSERT INTO product_dimensions (product_id, dim_label, dim_value, dim_unit, dim_category, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
          [productId, d.dim_label, d.dim_value, d.dim_unit || null, d.dim_category || 'dimensions', i]);
      });

      saveDatabase();

      res.json({
        success: true,
        message: 'MD文件已绑定并解析',
        data: {
          name: dbFormat.name,
          highlightsCount: dbFormat.highlights.length,
          specsCount: dbFormat.specs.length,
          accessoriesCount: dbFormat.accessories.length,
          featuresCount: dbFormat.features.length,
          dimensionsCount: dbFormat.dimensions.length
        }
      });
    } catch (parseErr) {
      res.json({
        success: true,
        message: 'MD文件路径已绑定，但解析失败: ' + parseErr.message,
        data: { filePath }
      });
    }
  } catch (err) {
    console.error('绑定MD文件错误:', err);
    res.status(500).json({ error: '绑定失败: ' + err.message });
  }
});

// 预览MD解析结果
router.post('/preview', (req, res) => {
  try {
    const { mdContent } = req.body;
    if (!mdContent) {
      return res.status(400).json({ error: '请提供MD内容' });
    }

    const markdown = require('../services/markdown');
    const parsed = markdown.parseProductMarkdown(mdContent);
    const dbFormat = convertToDbFormat(parsed);

    res.json({
      success: true,
      parsed: parsed,
      dbFormat: dbFormat
    });
  } catch (err) {
    console.error('预览MD错误:', err);
    res.status(500).json({ error: '预览失败: ' + err.message });
  }
});

module.exports = router;