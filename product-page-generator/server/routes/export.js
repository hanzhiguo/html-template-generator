const express = require('express');
const { getDb } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// 导入CSV到数据库
router.post('/import/csv', (req, res) => {
  try {
    const db = getDb();
    const { products } = req.body;

    if (!products || !Array.isArray(products)) {
      return res.status(400).json({ error: '无效的数据格式' });
    }

    const results = { created: 0, updated: 0, errors: [] };

    // 按产品名称分组（使用中文列名）
    const productGroups = {};
    products.forEach(row => {
      const productName = row['产品名称'] || row.product_name;
      if (!productGroups[productName]) {
        productGroups[productName] = {
          sku: row['SKU'] || row.sku,
          name: productName,
          data: []
        };
      }
      productGroups[productName].data.push(row);
    });

    // 处理每个产品
    for (const [, group] of Object.entries(productGroups)) {
      try {
        // 检查产品是否存在
        let existing = db.get('SELECT id FROM products WHERE name = ? AND user_id = ?', [group.name, req.user.id]);
        let targetId;

        if (existing) {
          targetId = existing.id;
          results.updated++;
        } else {
          // 创建新产品
          const result = db.run(`
            INSERT INTO products (user_id, sku, name, status)
            VALUES (?, ?, ?, 'draft')
          `, [req.user.id, group.sku || null, group.name]);
          targetId = result.lastInsertRowid;
          results.created++;
        }

        // 清空旧数据
        db.run('DELETE FROM product_highlights WHERE product_id = ?', [targetId]);
        db.run('DELETE FROM product_specs WHERE product_id = ?', [targetId]);
        db.run('DELETE FROM product_accessories WHERE product_id = ?', [targetId]);
        db.run('DELETE FROM product_features WHERE product_id = ?', [targetId]);
        db.run('DELETE FROM product_dimensions WHERE product_id = ?', [targetId]);

        // 插入新数据（使用中文列名）
        group.data.forEach(row => {
          const category = row['数据类型'] || row.category;
          const item = row['项目'] || row.item;
          const value = row['值'] || row.value;

          switch (category) {
            case '核心卖点':
              db.run(`INSERT INTO product_highlights (product_id, highlight_key, highlight_value) VALUES (?, ?, ?)`,
                [targetId, item || '', value || '']);
              break;
            case '产品规格':
              db.run(`INSERT INTO product_specs (product_id, spec_label, spec_value) VALUES (?, ?, ?)`,
                [targetId, item || '', value || '']);
              break;
            case '包装清单':
              const qty = value && value.startsWith('x') ? parseInt(value.substring(1)) || 1 : 1;
              db.run(`INSERT INTO product_accessories (product_id, accessory_name, quantity) VALUES (?, ?, ?)`,
                [targetId, item || '', qty]);
              break;
            case '功能亮点':
              db.run(`INSERT INTO product_features (product_id, feature_title, description) VALUES (?, ?, ?)`,
                [targetId, item || '', value || '']);
              break;
            case '适配尺寸':
              db.run(`INSERT INTO product_dimensions (product_id, dim_label, dim_value) VALUES (?, ?, ?)`,
                [targetId, item || '', value || '']);
              break;
          }
        });
      } catch (err) {
        results.errors.push({ product: group.name, error: err.message });
      }
    }

    res.json({
      success: true,
      message: `导入完成: 新建 ${results.created} 个, 更新 ${results.updated} 个`,
      results
    });
  } catch (err) {
    console.error('导入CSV错误:', err);
    res.status(500).json({ error: '导入失败' });
  }
});

// 导出所有产品数据为CSV
router.get('/csv', (req, res) => {
  try {
    const db = getDb();
    const products = db.all('SELECT * FROM products WHERE user_id = ? ORDER BY id', [req.user.id]);

    // CSV表头
    let csv = 'ID,SKU,产品名称,副标题,描述,价格,货币,主图,状态,创建时间\n';

    // 添加数据行
    products.forEach(p => {
      csv += [
        p.id,
        escapeCsv(p.sku),
        escapeCsv(p.name),
        escapeCsv(p.subtitle),
        escapeCsv(p.description),
        p.price || '',
        p.currency || 'USD',
        escapeCsv(p.main_image),
        p.status,
        p.created_at
      ].join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=products.csv');
    res.send('﻿' + csv); // BOM for Excel UTF-8
  } catch (err) {
    console.error('导出CSV错误:', err);
    res.status(500).json({ error: '导出失败' });
  }
});

// 导出5大类产品数据为详细CSV
router.get('/full/csv', (req, res) => {
  try {
    const db = getDb();
    const products = db.all('SELECT * FROM products WHERE user_id = ? ORDER BY id', [req.user.id]);

    // 收集所有数据
    const rows = [];

    products.forEach(p => {
      // 基础信息
      const highlights = db.all('SELECT * FROM product_highlights WHERE product_id = ?', [p.id]);
      const specs = db.all('SELECT * FROM product_specs WHERE product_id = ?', [p.id]);
      const accessories = db.all('SELECT * FROM product_accessories WHERE product_id = ?', [p.id]);
      const features = db.all('SELECT * FROM product_features WHERE product_id = ?', [p.id]);
      const dimensions = db.all('SELECT * FROM product_dimensions WHERE product_id = ?', [p.id]);

      // 核心卖点
      highlights.forEach((h, i) => {
        rows.push({
          product_id: p.id,
          sku: p.sku,
          product_name: p.name,
          category: '核心卖点',
          item: h.highlight_key,
          value: h.highlight_value
        });
      });

      // 产品规格
      specs.forEach((s, i) => {
        rows.push({
          product_id: p.id,
          sku: p.sku,
          product_name: p.name,
          category: '产品规格',
          item: s.spec_label,
          value: s.spec_value + (s.spec_unit ? ' ' + s.spec_unit : '')
        });
      });

      // 包装清单
      accessories.forEach((a, i) => {
        rows.push({
          product_id: p.id,
          sku: p.sku,
          product_name: p.name,
          category: '包装清单',
          item: a.accessory_name,
          value: a.quantity > 1 ? 'x' + a.quantity : ''
        });
      });

      // 功能亮点
      features.forEach((f, i) => {
        rows.push({
          product_id: p.id,
          sku: p.sku,
          product_name: p.name,
          category: '功能亮点',
          item: f.feature_title,
          value: f.description || f.feature_value || ''
        });
      });

      // 适配尺寸
      dimensions.forEach((d, i) => {
        rows.push({
          product_id: p.id,
          sku: p.sku,
          product_name: p.name,
          category: '适配尺寸',
          item: d.dim_label,
          value: d.dim_value + (d.dim_unit ? ' ' + d.dim_unit : '')
        });
      });
    });

    // 生成CSV
    let csv = '产品ID,SKU,产品名称,数据类型,项目,值\n';
    rows.forEach(r => {
      csv += [r.product_id, escapeCsv(r.sku), escapeCsv(r.product_name), r.category, escapeCsv(r.item), escapeCsv(r.value)].join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=products_full_data.csv');
    res.send('﻿' + csv);
  } catch (err) {
    console.error('导出详细CSV错误:', err);
    res.status(500).json({ error: '导出失败' });
  }
});

// 导出JSON格式
router.get('/json', (req, res) => {
  try {
    const db = getDb();
    const products = db.all('SELECT * FROM products WHERE user_id = ? ORDER BY id', [req.user.id]);

    const data = products.map(p => {
      return {
        ...p,
        highlights: db.all('SELECT * FROM product_highlights WHERE product_id = ?', [p.id]),
        specs: db.all('SELECT * FROM product_specs WHERE product_id = ?', [p.id]),
        accessories: db.all('SELECT * FROM product_accessories WHERE product_id = ?', [p.id]),
        features: db.all('SELECT * FROM product_features WHERE product_id = ?', [p.id]),
        dimensions: db.all('SELECT * FROM product_dimensions WHERE product_id = ?', [p.id])
      };
    });

    res.json({ products: data });
  } catch (err) {
    console.error('导出JSON错误:', err);
    res.status(500).json({ error: '导出失败' });
  }
});

function escapeCsv(str) {
  if (str === null || str === undefined) return '';
  str = String(str);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

module.exports = router;