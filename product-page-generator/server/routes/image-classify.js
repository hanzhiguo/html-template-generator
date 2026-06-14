/**
 * 图片分类API路由
 * 使用AI视觉模型自动分类产品图片
 */
const express = require('express');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const config = require('../agent/config');
const OpenAI = require('openai');

const router = express.Router();

router.use(optionalAuth);

const CATEGORIES = ['场景图', '白底图', '套装图', '细节图'];
const CATEGORY_MAP = {
  '场景图': 'scene',
  '白底图': 'white',
  '套装图': 'set',
  '细节图': 'detail'
};

/**
 * POST /api/image-classify
 * 分类单张或多张图片
 * Body: { images: [base64 string array] }
 * Response: { results: [{ category: string, type: string, confidence: number }] }
 */
router.post('/', async (req, res) => {
    try {
        const { images } = req.body;

        if (!images || !Array.isArray(images) || images.length === 0) {
            return res.status(400).json({ error: '请提供至少一张图片' });
        }

        const selectedProvider = config.defaultProvider;
        const providerConfig = config.providers[selectedProvider];

        if (!providerConfig) {
            return res.status(400).json({ error: `未知的供应商: ${selectedProvider}` });
        }

        const client = new OpenAI({
            apiKey: providerConfig.apiKey || 'dummy',
            baseURL: providerConfig.baseUrl
        });

        let model = providerConfig.model;

        const results = [];

        // 逐张分类（避免单次请求图片过多）
        for (let i = 0; i < images.length; i++) {
            try {
                const content = [
                    {
                        type: 'text',
                        text: `这个图是以下图像类型中的哪一类？从以下选择中选一个：场景图、白底图、套装图、细节图。

定义：
- 场景图：产品在真实或模拟场景中使用的图片，有背景环境
- 白底图：产品在纯白背景上的图片，无其他背景
- 套装图：展示多个产品组合或套装的图片
- 细节图：展示产品局部细节、特写的图片

请只回复类型名称，不要回复其他内容。`
                    },
                    {
                        type: 'image_url',
                        image_url: {
                            url: `data:image/jpeg;base64,${images[i]}`,
                            detail: 'low'
                        }
                    }
                ];

                const response = await client.chat.completions.create({
                    model: model,
                    messages: [{ role: 'user', content }],
                    max_tokens: 20,
                    temperature: 0.1
                });

                const reply = response.choices[0]?.message?.content?.trim() || '';
                
                // 匹配分类
                let category = '场景图'; // 默认
                let type = 'scene';
                for (const cat of CATEGORIES) {
                    if (reply.includes(cat)) {
                        category = cat;
                        type = CATEGORY_MAP[cat];
                        break;
                    }
                }

                results.push({ category, type, raw: reply });
            } catch (err) {
                console.error(`分类第${i + 1}张图片失败:`, err.message);
                results.push({ category: '场景图', type: 'scene', raw: '分类失败', error: err.message });
            }
        }

        res.json({ success: true, results });
    } catch (err) {
        console.error('图片分类错误:', err);
        res.status(500).json({ error: '服务器错误' });
    }
});

module.exports = router;
