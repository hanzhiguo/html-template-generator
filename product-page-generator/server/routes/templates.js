const express = require('express');
const fs = require('fs');
const path = require('path');
const { getDb } = require('../db/init');

const router = express.Router();

// 获取模板列表
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const templates = db.all('SELECT id, name, slug, primary_color, accent_color, description FROM templates ORDER BY id');

    res.json({ templates });
  } catch (err) {
    console.error('获取模板列表错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取单个模板内容
router.get('/:slug', (req, res) => {
  try {
    const { slug } = req.params;
    const db = getDb();

    const template = db.get('SELECT * FROM templates WHERE slug = ?', [slug]);
    if (!template) {
      return res.status(404).json({ error: '模板不存在' });
    }

    const templatePath = template.template_path
      ? path.join(__dirname, '..', 'templates', template.template_path)
      : path.join(__dirname, '..', 'templates', `product-${slug}.html`);

    let templateContent = '';
    if (fs.existsSync(templatePath)) {
      templateContent = fs.readFileSync(templatePath, 'utf-8');
    }

    res.json({
      template: { ...template, content: templateContent }
    });
  } catch (err) {
    console.error('获取模板内容错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;