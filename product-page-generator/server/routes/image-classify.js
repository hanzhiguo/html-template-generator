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

const CATEGORIES = ['场景图', '白底图', '套装图', '细节图', '手持图'];
const CATEGORY_MAP = {
  '场景图': 'scene',
  '白底图': 'white',
  '套装图': 'set',
  '细节图': 'detail',
  '手持图': 'handheld'
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

        // 图片分类需要视觉能力，使用支持vision的模型
        // gemma4 系列不支持图片识别，需切换到支持 vision 的模型
        let model = providerConfig.model;
        if (selectedProvider === 'ollama') {
            const nonVisionModels = ['gemma4:e4b', 'gemma4:26b', 'gemma3:4b', 'qwen2.5:0.5b', 'qwen3.6-27b:q3'];
            if (nonVisionModels.includes(model)) {
                model = 'qwen3.5:9b';
                console.log(`[image-classify] 模型 ${providerConfig.model} 不支持vision，切换到 ${model}`);
            }
        }

        console.log(`[image-classify] 使用模型: ${model}, baseURL: ${providerConfig.baseUrl}`);

        const results = [];

        // 逐张分类（避免单次请求图片过多）
        for (let i = 0; i < images.length; i++) {
            try {
                const base64Data = images[i];
                const imageSizeKB = Math.round(base64Data.length * 0.75 / 1024);
                console.log(`[image-classify] 第${i + 1}张图片 base64长度: ${base64Data.length}字符, 估算大小: ~${imageSizeKB}KB`);
                
                const content = [
                    {
                        type: 'text',
                        text: `# Role
你是一个电商数字化商品资产管理专家，精通商品图片的视觉特征分析与多模态分类。

# Task
请仔细观察并分析我提供给你的商品图片，根据各图片类型的设计规范和视觉特征，自动判定该图片属于以下 5 种分类中的哪一种：
1. 场景图 (Scenario/Lifestyle Image)
2. 白底图 (White Background/Studio Image)
3. 套装图 (Bundle/Set Image)
4. 细节图 (Detail/Close-up Image)
5. 手持图 (Handheld/In-use Image)

# Definition & Classification Rules (分类判别标准)
请严格根据以下核心特征进行归类：

- 【白底图】：
  * 核心特征：纯白色背景（或极浅的无缝中性灰底），没有任何环境杂物。
  * 主体展示：只有单个或一套商品主体本身，通常带有商品投影。
  * 目的：用于主图、SKU图或无背景干扰的纯产品展示。

- 【场景图】：
  * 核心特征：商品置于真实的生活场景、搭配好的摄影棚背景或美化过的虚拟3D场景中。
  * 伴随元素：有软装布景、道具（如花瓶、阳光、桌面纹理、户外风光等），强调氛围感和使用环境。

- 【套装图】：
  * 核心特征：画面中同时展示了多个相互关联的产品组合（如多件套、买A赠B、全系列全家福）。
  * 注意：如果套装图本身也是白底，优先归类为"套装图"；若套装图放在生活布景中，优先归类为"套装图"，并备注带有场景。

- 【细节图】：
  * 核心特征：极近距离的特写镜头（Macro/Close-up）。
  * 画面内容：聚焦于商品的局部（如：面料材质纹理、五金拉链、走线工艺、接口、产品Logo、说明文字等），放大展示微观品质。

- 【手持图】：
  * 核心特征：画面中必须出现"人手"或身体局部，正在拿着、握着或操作该商品。
  * 目的：通常用于展示商品的真实尺寸对比（比例尺效应）、便携性、或者第一人称视角的实际使用状态。

# Output Format (输出格式)
请只回复分类名称（场景图、白底图、套装图、细节图、手持图之一），不要回复其他任何内容。`
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
                    max_tokens: 500,
                    temperature: 0.1
                });

                const reply = response.choices[0]?.message?.content?.trim() || '';
                console.log(`[image-classify] 第${i + 1}张图片模型回复: "${reply}"`);
                
                // 匹配分类：精确匹配回复中的分类名称
                // 先尝试完整匹配（回复就是分类名），再尝试提取
                let category = null;
                let type = null;
                const cleanReply = reply.replace(/[\s【】\[\]:：]/g, '');
                for (const cat of CATEGORIES) {
                    if (cleanReply === cat || cleanReply.includes(cat)) {
                        category = cat;
                        type = CATEGORY_MAP[cat];
                        break;
                    }
                }
                // 未匹配到则默认场景图
                if (!category) {
                    category = '场景图';
                    type = 'scene';
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
