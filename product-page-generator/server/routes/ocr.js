/**
 * OCR图片识别API路由
 * 使用AI模型识别图片中的文字内容
 */
const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const config = require('../agent/config');
const OpenAI = require('openai');

const router = express.Router();

router.use(authMiddleware);

/**
 * POST /api/ocr/recognize
 * 识别图片中的文字内容
 * Body: { images: [base64 string array], prompt?: string }
 */
router.post('/recognize', async (req, res) => {
    try {
        const { images, prompt } = req.body;

        if (!images || !Array.isArray(images) || images.length === 0) {
            return res.status(400).json({ error: '请提供至少一张图片' });
        }

        const selectedProvider = config.defaultProvider;
        const providerConfig = config.providers[selectedProvider];

        if (!providerConfig) {
            return res.status(400).json({ error: `未知的供应商: ${selectedProvider}` });
        }

        // 构建用户消息内容
        const content = [];

        // 添加文字说明
        const textPrompt = prompt || `请仔细分析这些产品图片，识别图片中的所有文字内容，包括：
1. 产品型号、名称、品牌
2. 规格参数、技术数据
3. 包装信息、配件清单
4. 尺寸、重量等物理参数
5. 其他任何可见的文字信息

请以markdown格式返回识别结果，结构化地整理每一张图片的内容，不要遗漏任何文字。`;

        content.push({
            type: 'text',
            text: textPrompt
        });

        // 添加图片
        for (const base64Image of images) {
            content.push({
                type: 'image_url',
                image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`,
                    detail: 'high'
                }
            });
        }

        // 创建AI客户端
        const client = new OpenAI({
            apiKey: providerConfig.apiKey || 'dummy',
            baseURL: providerConfig.baseUrl
        });

        // 根据供应商选择模型
        let model = providerConfig.model;
        // 如果是ollama且支持视觉，需要使用支持多模态的模型
        if (selectedProvider === 'ollama') {
            // Ollama视觉模型名称
            const visionModels = ['llava', 'llava:latest', 'llava:7b', 'moondream', 'moondream:latest', 'bakllava'];
            const availableModel = visionModels.find(m => model.includes(m) || m.includes(model.split(':')[0]));
            if (availableModel) {
                model = availableModel;
            }
        }

        // 发送请求到AI
        const response = await client.chat.completions.create({
            model: model,
            messages: [{
                role: 'user',
                content: content
            }],
            max_tokens: 4000
        });

        const ocrText = response.choices[0]?.message?.content || '未能识别到文字内容';

        res.json({
            success: true,
            content: ocrText,
            imageCount: images.length,
            provider: selectedProvider,
            model: model
        });

    } catch (error) {
        console.error('[OCR] 识别失败:', error);
        res.status(500).json({
            error: 'OCR识别失败: ' + error.message,
            details: error.stack
        });
    }
});

/**
 * POST /api/ocr/generate-product
 * 根据OCR结果生成产品信息
 * Body: { ocrText: string, productData?: object }
 */
router.post('/generate-product', async (req, res) => {
    try {
        const { ocrText, productData } = req.body;

        if (!ocrText) {
            return res.status(400).json({ error: '请提供OCR识别结果' });
        }

        const selectedProvider = config.defaultProvider;
        const providerConfig = config.providers[selectedProvider];

        // 构建提示词
        const prompt = `根据以下OCR识别结果，生成一个完整的产品信息JSON。如果某些字段无法从OCR结果中确定，请根据常识推断合理的值，但不要编造具体数据。

请只返回JSON格式，不要有其他内容。
JSON格式：
{
  "sku": "产品型号（如果没有可推断）",
  "name": "产品名称",
  "subtitle": "产品副标题/简短描述",
  "description": "产品详细描述",
  "price": 价格数字（如果无法确定可设为0）,
  "currency": "USD",
  "status": "draft",
  "highlights": [
    {"key": "核心卖点标题", "value": "卖点值"}
  ],
  "specs": [
    {"label": "规格名称", "value": "规格值", "unit": "单位"}
  ],
  "accessories": [
    {"name": "配件名称", "quantity": 数量}
  ],
  "features": [
    {"title": "功能标题", "description": "功能描述"}
  ],
  "dimensions": [
    {"label": "尺寸名称", "value": "尺寸值", "unit": "单位"}
  ]
}

以下是OCR识别结果：
${ocrText}

请生成JSON：`;

        // 创建AI客户端
        const client = new OpenAI({
            apiKey: providerConfig.apiKey || 'dummy',
            baseURL: providerConfig.baseUrl
        });

        const response = await client.chat.completions.create({
            model: providerConfig.model,
            messages: [{
                role: 'user',
                content: prompt
            }],
            max_tokens: 4000
        });

        let jsonText = response.choices[0]?.message?.content || '';

        // 清理markdown代码块
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        let productInfo;
        try {
            productInfo = JSON.parse(jsonText);
        } catch (parseError) {
            // 如果JSON解析失败，尝试提取JSON部分
            const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                productInfo = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('AI返回的不是有效的JSON格式');
            }
        }

        res.json({
            success: true,
            product: productInfo
        });

    } catch (error) {
        console.error('[OCR] 生成产品信息失败:', error);
        res.status(500).json({
            error: '生成产品信息失败: ' + error.message
        });
    }
});

module.exports = router;
