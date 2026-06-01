/**
 * 图片识别与产品生成路由
 * 3步流程：
 * 1. 识别图片文字
 * 2. 生成产品数据
 * 3. 创建产品入库
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const { AIAgent } = require('../agent');
const { recognizeImageText } = require('../services/image-recognizer');
const { getDb } = require('../db/init');

// 配置上传
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

/**
 * Step 1: 识别图片文字
 * POST /api/image-to-product/recognize
 */
router.post('/recognize', upload.array('images', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: '请上传至少一张图片' });
    }

    const results = [];

    for (const file of req.files) {
      const base64 = file.buffer.toString('base64');
      try {
        const text = await recognizeImageText(base64);
        results.push({
          filename: file.originalname,
          success: true,
          text: text
        });
      } catch (error) {
        results.push({
          filename: file.originalname,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      total: req.files.length,
      results: results
    });
  } catch (error) {
    console.error('[ImageToProduct] recognize error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Step 2: 生成产品数据
 * POST /api/image-to-product/generate
 * 根据识别出的文字，生成产品JSON数据
 */
router.post('/generate', async (req, res) => {
  try {
    const { recognizedTexts, images } = req.body;

    if (!recognizedTexts || !Array.isArray(recognizedTexts)) {
      return res.status(400).json({ error: '缺少识别文字数据' });
    }

    // 产品生成示例格式（从用户提供的示例提取）
    const exampleFormat = `
示例产品格式（请严格按照此格式返回JSON）：

## 核心卖点
* **卖点名称 - 卖点值**

## 产品规格
* **规格名**: 规格值 单位

## 产品清单
* 配件名称（数量）

## 功能亮点
* **功能标题**: 功能描述

## 适配尺寸
* **尺寸名**: 尺寸值 单位

## 产品信息
- 名称: 产品名称
- SKU: 产品型号（如有）
- 描述: 产品描述（如有）
`;

    const prompt = `你是一个产品信息提取专家。请根据以下从产品图片中识别出的文字，提取并整理成完整的产品信息。

## 识别到的文字内容：
${recognizedTexts.map((r, i) => `【图片${i + 1}】\n${r.text || r}`).join('\n\n')}

## 请严格按照以下JSON格式返回产品信息（不要添加任何其他文字说明）：
{
  "name": "产品名称",
  "sku": "产品型号（如没有则留空）",
  "subtitle": "产品副标题（如没有则留空）",
  "description": "产品描述（如没有则留空）",
  "highlights": [
    {"key": "卖点名称", "value": "卖点值"}
  ],
  "specs": [
    {"label": "规格名", "value": "规格值", "unit": "单位"}
  ],
  "accessories": [
    {"name": "配件名称", "quantity": 数量}
  ],
  "features": [
    {"title": "功能标题", "description": "功能描述"}
  ],
  "dimensions": [
    {"label": "尺寸名", "value": "尺寸值", "unit": "单位"}
  ]
}

请确保：
1. 所有字段都填写，即使某些信息图片中没有，也根据常识合理推断
2. highlights 至少3条
3. specs 至少5条
4. accessories 至少3条
5. features 至少2条
6. dimensions 至少2条
7. 只返回JSON，不要有任何其他文字`;

    const agent = new AIAgent({
      userId: req.user?.id || 1,
      images: images || null
    });

    const result = await agent.chat(prompt);

    // 尝试从结果中提取JSON
    let productData = null;
    const content = result.message || result.content;

    // 尝试解析JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        productData = JSON.parse(jsonMatch[0]);
      } catch (e) {
        // 尝试清理JSON后重试
        try {
          const cleanedJson = jsonMatch[0]
            .replace(/[\u0000-\u001F]+/g, '')
            .replace(/,\s*([}\]])/g, '$1');
          productData = JSON.parse(cleanedJson);
        } catch (e2) {
          console.error('[ImageToProduct] JSON parse error:', e2.message);
        }
      }
    }

    if (!productData) {
      return res.status(400).json({
        error: '无法从AI响应中提取产品JSON',
        rawResponse: content
      });
    }

    // 保存图片base64供下一步使用
    const sessionId = Date.now().toString(36);
    const tempData = {
      productData,
      images,
      recognizedTexts,
      createdAt: new Date().toISOString()
    };

    res.json({
      success: true,
      sessionId,
      productData,
      message: '产品信息生成成功，请确认后创建'
    });
  } catch (error) {
    console.error('[ImageToProduct] generate error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Step 3: 创建产品到数据库
 * POST /api/image-to-product/create
 */
router.post('/create', async (req, res) => {
  try {
    const { productData, images } = req.body;

    if (!productData || !productData.name) {
      return res.status(400).json({ error: '缺少产品数据' });
    }

    const { run, get } = getDb();

    // 检查SKU是否已存在
    if (productData.sku) {
      const existing = get('SELECT id FROM products WHERE sku = ?', [productData.sku]);
      if (existing) {
        return res.status(400).json({
          error: `SKU "${productData.sku}" 已存在`,
          existing_id: existing.id
        });
      }
    }

    // 插入产品主表
    const result = run(`
      INSERT INTO products (user_id, sku, name, subtitle, description, price, currency, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      req.user?.id || 1,
      productData.sku || null,
      productData.name,
      productData.subtitle || null,
      productData.description || null,
      productData.price || null,
      productData.currency || 'USD',
      'draft'
    ]);

    // 获取插入的产品ID
    const { all } = getDb();
    const lastProducts = all('SELECT id FROM products ORDER BY id DESC LIMIT 1');
    const productId = lastProducts[0]?.id;

    if (!productId) {
      throw new Error('无法获取新插入产品的ID');
    }

    // 插入5大表数据
    const dataSummary = { highlights: 0, specs: 0, accessories: 0, features: 0, dimensions: 0 };

    // 1. 核心卖点
    if (productData.highlights && Array.isArray(productData.highlights)) {
      productData.highlights.forEach((h, index) => {
        if (h.key || h.value) {
          run(`
            INSERT INTO product_highlights (product_id, highlight_key, highlight_value, sort_order)
            VALUES (?, ?, ?, ?)
          `, [productId, h.key || '', h.value || '', index]);
          dataSummary.highlights++;
        }
      });
    }

    // 2. 产品规格
    if (productData.specs && Array.isArray(productData.specs)) {
      productData.specs.forEach((s, index) => {
        if (s.label || s.value) {
          run(`
            INSERT INTO product_specs (product_id, spec_label, spec_value, spec_unit, spec_group, sort_order)
            VALUES (?, ?, ?, ?, '规格', ?)
          `, [productId, s.label || '', s.value || '', s.unit || '', index]);
          dataSummary.specs++;
        }
      });
    }

    // 3. 包装清单
    if (productData.accessories && Array.isArray(productData.accessories)) {
      productData.accessories.forEach((a, index) => {
        if (a.name) {
          run(`
            INSERT INTO product_accessories (product_id, accessory_name, quantity, is_included, sort_order)
            VALUES (?, ?, ?, 1, ?)
          `, [productId, a.name, a.quantity || 1, index]);
          dataSummary.accessories++;
        }
      });
    }

    // 4. 功能亮点
    if (productData.features && Array.isArray(productData.features)) {
      productData.features.forEach((f, index) => {
        if (f.title) {
          run(`
            INSERT INTO product_features (product_id, feature_title, description, sort_order)
            VALUES (?, ?, ?, ?)
          `, [productId, f.title, f.description || '', index]);
          dataSummary.features++;
        }
      });
    }

    // 5. 适配尺寸
    if (productData.dimensions && Array.isArray(productData.dimensions)) {
      productData.dimensions.forEach((d, index) => {
        if (d.label || d.value) {
          run(`
            INSERT INTO product_dimensions (product_id, dim_label, dim_value, dim_unit, sort_order)
            VALUES (?, ?, ?, ?, ?)
          `, [productId, d.label || '', d.value || '', d.unit || '', index]);
          dataSummary.dimensions++;
        }
      });
    }

    // 上传并绑定图片
    let imagesSummary = { uploaded: 0, failed: 0 };
    if (images && Array.isArray(images) && images.length > 0) {
      const uploadDir = path.join(__dirname, '../../public/uploads/products', productId.toString());
      await fs.mkdir(uploadDir, { recursive: true });

      for (let i = 0; i < images.length; i++) {
        try {
          // 解码base64
          const base64Data = images[i].replace(/^data:image\/\w+;base64,/, '');
          const imageBuffer = Buffer.from(base64Data, 'base64');

          // 生成文件名
          const ext = images[i].match(/^data:image\/(\w+);base64,/)?.[1] || 'jpg';
          const filename = `img_${Date.now()}_${i + 1}.${ext}`;
          const filepath = path.join(uploadDir, filename);

          await fs.writeFile(filepath, imageBuffer);

          // 插入数据库
          const imageType = i === 0 ? 'main' : 'detail';
          run(`
            INSERT INTO product_images (product_id, image_type, image_url, alt_text, sort_order)
            VALUES (?, ?, ?, ?, ?)
          `, [productId, imageType, `/uploads/products/${productId}/${filename}`, `产品图片 ${i + 1}`, i]);

          imagesSummary.uploaded++;
        } catch (imgError) {
          console.error('[ImageToProduct] upload image error:', imgError);
          imagesSummary.failed++;
        }
      }
    }

    res.json({
      success: true,
      productId,
      sku: productData.sku,
      name: productData.name,
      data_created: dataSummary,
      images_summary: imagesSummary,
      message: `产品创建成功！\n` +
        `- 产品ID: ${productId}\n` +
        `- 产品名称: ${productData.name}\n` +
        `- SKU: ${productData.sku || '未设置'}\n` +
        `- 核心卖点: ${dataSummary.highlights}条\n` +
        `- 产品规格: ${dataSummary.specs}条\n` +
        `- 包装清单: ${dataSummary.accessories}条\n` +
        `- 功能亮点: ${dataSummary.features}条\n` +
        `- 适配尺寸: ${dataSummary.dimensions}条\n` +
        `- 上传图片: ${imagesSummary.uploaded}张\n\n` +
        `数据已保存到数据库！`
    });
  } catch (error) {
    console.error('[ImageToProduct] create error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;