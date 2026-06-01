const express = require('express');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const { renderHTML, getProductFullData } = require('../services/renderer');

const router = express.Router();

// 预览HTML（可选登录）
router.get('/preview/:productId', optionalAuth, async (req, res) => {
  try {
    const { productId } = req.params;
    const { template } = req.query;

    // 优先使用登录用户的ID，否则使用默认用户ID=1
    const userId = req.user?.id || 1;

    let productData;
    try {
      productData = getProductFullData(productId, userId);
    } catch (err) {
      return res.status(404).json({ error: err.message });
    }

    const html = renderHTML(productData, template || productData.template?.slug);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('预览错误:', err);
    res.status(500).json({ error: '预览失败: ' + err.message });
  }
});

// 以下路由需要登录
router.use(authMiddleware);

// 生成HTML页面
router.post('/', async (req, res) => {
  try {
    const { productId, template } = req.body;

    if (!productId) {
      return res.status(400).json({ error: '产品ID不能为空' });
    }

    const userId = req.user.id;

    let productData;
    try {
      productData = getProductFullData(productId, userId);
    } catch (err) {
      return res.status(404).json({ error: err.message });
    }

    const html = renderHTML(productData, template || productData.template?.slug);

    res.json({
      success: true,
      html,
      product: productData.product,
      template: productData.template
    });
  } catch (err) {
    console.error('生成HTML错误:', err);
    res.status(500).json({ error: '生成失败: ' + err.message });
  }
});

module.exports = router;