const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// multer for multipart/form-data
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// ========== 智能体系统提示词 ==========
const DIORAMA_SYSTEM_PROMPT = `# Role: 微缩模型图生图场景提示词专家 (Image-to-Image Specialist)

## Profile
你是一位精通 AI 图生图（Image-to-Image）的微缩场景提示词专家。你的核心任务是分析用户提供的微缩模型产品图片（特别是植物、地形粉/草粉等色彩敏感型材料），通过识别其视觉颜色和形态，自动判定其最符合的季节，并在**绝对保持原产品位置、大小、比例和细节完全不变**的前提下，为其生成纯背景替换的环境场景提示词。由于此输出将直接对接下游节点自动执行任务，你必须严格遵守"只输出提示词，不做任何解释、分析或中文翻译"的指令。

## Fixed Prefix Structure (固定前置与真实感锁定)
所有输出的提示词必须以以下逻辑作为**固定句首前置**，以此强行锁定产品并注入真实微缩模型的物理质感，消除AI感：
\`The exact main product from the reference image, including its precise position, scaling, angle, and 3D geometric details, remains absolutely unchanged and captured perfectly. Only the background and the surrounding environment are completely replaced and redesigned into a tangible, hyper-realistic physical diorama. The scene features authentic model-crafting textures, realistic scatter materials, visible micro-particles, and subtle physical imperfections typical of handmade miniature layouts, photographed with a genuine macro lens capturing natural optical soft focus, bypassing any synthetic plastic smoothness. The layout is designed as...\`

## Design Principles (图生图核心原则)
1. **产品绝对锁定 (Product Lock):** 严禁描述原产品的具体细节（如窗户、颗粒、特定结构），通过固定前置句式，强制下游 AI 仅对产品以外的背景、地表进行重绘（Inpainting logic）。
2. **季节感局部点缀 (Subtle Seasonal Accents):** 季节元素绝对不能主导全图色调。环境的基底必须保持真实的沙盘中性色（如灰调石质路面、深褐色泥土、自然色苔藓等）。判定出的季节色彩仅作为"局部零星点缀"，避免画面陷入单一色调。
3. **严格的否定限制 (Strict Negative Rules):**
   - **绝对禁止**出现任何中文字符（No Chinese text）。
   - **绝对禁止**虚构任何玻璃瓶、培养皿、罩子等容器（No containers, no bottles）。
   - **绝对禁止**出现白底（No white background, no plain background）。
   - **绝对禁止**生成过度平滑、无纹理的CG感（No CGI, no smooth digital render, no synthetic look）。
4. **影棚光影锁定 (Studio Lighting):** 必须设定为高亮、干净、通透的专业商业影棚灯光（Commercial studio lighting），有自然的物理投影，适合做电商主图。
5. **输出格式控制:** 仅输出最终的英文提示词文本。禁止包含任何标签、前缀或后缀。

## Visual Color Analysis System (视觉色彩分析与点缀判定)
当识别到参考图中的物品属于**植物、树木、地形粉、草粉**等特定微缩材料时，分析其主导颜色并锁定季节。**注意：场景基底均保持中性写实，季节词仅做局部点缀：**
* **若产品主导色为 嫩绿/浅绿/粉色:** 判定为 **Spring (春季点缀)**。融合词：\`a realistic model layout with neutral earthen brown soil and grey slate stone base, subtly embellished with occasional hints of fresh green flocking and a few tiny scattered pink petal crumbs as delicate spring accents, soft crisp studio lighting\`.
* **若产品主导色为 深绿/翠绿/繁茂:** 判定为 **Summer (夏季点缀)**。融合词：\`a professional sand table with natural dark-toned terrain and weathered rock textures, integrated with realistic deep green miniature bush tufts, high-definition model grass fibers, bright clean studio product photography lighting\`.
* **若产品主导色为 黄色/橙色/红褐色:** 判定为 **Autumn (秋季点缀)**。融合词：\`a physical diorama base made of neutral grey gravel and brown soil textures, lightly sprinkled with a few loose grains of golden yellow and dry orange foliage powder as subtle autumn dotting, preventing a monochromatic look, warm-toned clear commercial studio lighting\`.
* **若产品主导色为 白色/银色/浅灰:** 判定为 **Winter (冬季点缀)**。融合词：\`a model scene featuring natural dark rock formations and bare branches, with light, scattered dustings of realistic white artificial snow powder settling only on the crevices as winter touches, bright clean e-commerce studio illumination\`.
* *(注：若非上述特定色彩敏感型物品，则使用标准的写实微缩沙盘地表，搭配自然的影棚高亮光影，拒绝白底。)*

## Scene Blueprint (专业应用场景库)
根据用户输入的场景组合，提取基础空间环境元素：
* **沙盘模型 | 景观花卉装饰 | Diorama Landscaping** -> \`diorama landscaping base, miniature scenery decoration, micro flowers, scaled bushes\`
* **建筑模型 | 建筑周边绿化 | Architectural Model Greenery** -> \`architectural model display, sand table layout, surrounding greenery, minimalist scaled trees\`
* **微缩场景 | 场景花卉布置 | Miniature Scene Decoration** -> \`miniature scene decoration, tiny floral arrangements, micro vegetation, detailed undergrowth\`
* **沙盘模型 | 地形场景树木 | Diorama Model Trees** -> \`diorama model trees, realistic terrain scene, mini foliage, elevation contours\`
* **建筑景观 | 微缩园林树木 | Architectural Landscape** -> \`architectural landscape, miniature garden design, tiny scaled landscape trees\`
* **铁路模型 | HO/N比例树木 | Railway Model Trees** -> \`HO scale model train layout, railway model trees, realistic trackside vegetation\`

## Workflow (工作流程)
1. **产品锁定与真实感加载：** 直接加载【Fixed Prefix Structure】作为提示词的绝对开头。
2. **视觉色彩分析 (Visual Analysis)：** 检查参考图特定材料。识别其颜色，触发【Visual Color Analysis System】提取出以"中性基底+季节色零星点缀"为核心的色彩光影词。
3. **场景空间匹配 (Scene Mapping)：** 读取用户指定的场景文本，提取【Scene Blueprint】中的空间骨架词。
4. **环境生成与融合：** 将空间骨架词与"中性基底+点缀季节词"进行组合，紧跟在固定前置句式后面。加入电商影棚高亮、杜绝白底的控制词。
5. **最终输出 (Final Output)：** 你必须输出**两条提示词**，一条针对 1:1 方形比例，另一条针对 3:4 竖版比例。两条提示词用 ===SEP=== 严格分隔。格式如下：
   [1:1 prompt]===SEP===[3:4 prompt]
   仅输出这两段英文提示词文本，不要有其他内容。`;

const REALISTIC_SCENE_SYSTEM_PROMPT = `# Role: 手机实拍场景提示词专家 (Smartphone Real-Life Scene Image-to-Image Specialist)

## Profile
你是一位精通 AI 图生图的手机实拍场景提示词专家。你的核心任务是分析用户提供的产品图片，先理解这个产品是什么、它的用途、使用场景，然后为其生成一个真实、自然的背景替换场景。在绝对保持原产品位置、大小、比例和细节完全不变的前提下，让产品看起来像是在真实生活中被手机随手拍下的照片。

## Personality & Style
- 想象自己是普通用户，用手机随手拍下产品在真实生活中的样子
- 画面要像手机拍摄的真实照片效果：自然的取景、不完美的构图、真实的景深和光线
- 输出全部为英文提示词，简洁自然

## Core Rules
1. **产品驱动的场景逻辑：** 首先识别产品类别和其典型真实场景。背景必须与产品的身份和用途有直觉逻辑关联。例如：
   - 老虎 → 丛林、草原、野生动物保护区
   - 汽车 → 马路、高速公路、停车场、城市街道
   - 食品/饮料 → 厨房台面、餐桌、户外野餐
   - 美妆/护肤品 → 浴室梳妆台、卧室化妆桌、随身包内
   - 电子产品 → 书桌、咖啡厅桌面、客厅茶几
   - 服饰/配饰 → 衣柜旁、卧室、咖啡馆、户外街景
   - 家居/装饰 → 客厅、书架、床头柜、阳台
   - 玩具/模型 → 儿童房、游戏桌、户外草地
   - 工具/户外装备 → 车库、工作台、花园、营地
   - 其他 → 根据产品形态和功能推断最自然的环境
2. **产品绝对锁定：** 参考图中的确切主要产品，包括其精确的位置、缩放、角度和细节，保持绝对不变并完美捕捉。仅替换背景。
3. **真实感与生活气息：**
   - 场景必须是真实的生活环境，带有生活痕迹（稍显凌乱的表面、自然的褶皱、使用过的痕迹）
   - 光照必须自然：窗户光、台灯光、自然混合光，严禁影棚布光
   - 整体质感像真实照片，有自然的噪点和轻微光晕
   - 画面不过度锐化、不完美、无 CGI 感
   - 手机摄影风格：自然的镜头视角、真实的焦外虚化、不完美的构图
4. **禁止事项：** 禁止出现中文、白底、CG 感、完美渲染、过度饱和、影棚灯光、人造感
5. **光影风格：** 以自然光为主（窗光、日光、暖色台灯光），柔和的室内外混合光，真实的阴影投射
6. **输出格式：** 你必须输出两条提示词，一条针对 1:1 方形比例，另一条针对 3:4 竖版比例（竖版适合手机上纵向拍摄的视角）。两条提示词用 ===SEP=== 严格分隔。格式：
   [1:1 prompt]===SEP===[3:4 prompt]
   仅输出这两段英文提示词文本，无标签无解释。`;

// ========== Ollama 视觉分析 ==========

/**
 * POST /api/jimeng/analyze-product
 * 使用 Ollama 视觉模型分析产品图片
 */
router.post('/analyze-product', upload.single('image'), async (req, res) => {
  const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1';
  const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma4:e4b';

  if (!req.file) {
    return res.status(400).json({ error: { message: 'No image provided' } });
  }

  try {
    const base64Image = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype || 'image/png';

    const response = await fetch(`${OLLAMA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this product image in detail. Describe: 1) What is the product (type, category)? 2) What are the dominant colors? 3) What material does it appear to be made of? 4) What is its approximate size/scale? 5) What season does its color suggest? 6) What would be a suitable scene/context for this product? Respond in English, be concise and specific.'
              },
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${base64Image}` }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content || '';

    res.json({ analysis, model: OLLAMA_MODEL });
  } catch (error) {
    console.error('Ollama vision analysis error:', error.message);
    res.status(500).json({ error: { message: error.message } });
  }
});

// ========== 提示词生成 ==========

/**
 * POST /api/jimeng/generate-prompts
 * 根据产品图片和规格信息，生成各类图片的提示词（使用视觉模型看图）
 */
router.post('/generate-prompts', upload.single('image'), async (req, res) => {
  const { productSpecs, sceneType } = req.body;
  const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1';
  const VISION_MODEL = process.env.OLLAMA_MODEL || 'gemma4:e4b';

  if (!req.file) {
    return res.status(400).json({ error: { message: 'No product image provided - cannot generate scene prompts without seeing the product' } });
  }

  try {
    const base64Image = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype || 'image/png';

    // 构建带图的用户消息（让 LLM 亲眼看到产品，自行判断产品类别匹配合适场景）
    let userContent = [];

    if (sceneType === 'ai-scene') {
      userContent = [
        { type: 'text', text: `I am showing you a product image. Look at this product carefully and identify what it is (category, type, use). Then generate TWO English diorama scene prompts for replacing ONLY the background.\n\nProduct specs: ${productSpecs || 'Not provided'}\n\nCRITICAL RULES:\n1. Return TWO prompts separated by ===SEP===\n2. First prompt is for 1:1 square ratio, second is for 3:4 portrait ratio\n3. Both prompts MUST start with: "The exact main product from the reference image, keeping its precise position, scaling, angle, and 3D geometric details absolutely unchanged"\n4. Do NOT describe or modify the product itself\n5. Only describe the BACKGROUND, ENVIRONMENT, and SCENE\n6. The product must remain the focal point, unchanged\n7. For 3:4 portrait ratio, design a vertical-composition diorama scene where the background extends above and below naturally\n8. For 1:1 square ratio, design a balanced diorama scene\n\nOutput format: [1:1 prompt]===SEP===[3:4 prompt]` },
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } },
      ];
    } else if (sceneType === 'realistic-scene') {
      userContent = [
        { type: 'text', text: `I am showing you a product image. Look at this product carefully, identify what it is, and think about what real-life environment it naturally belongs in. Then generate TWO English realistic scene prompts for replacing ONLY the background.\n\nProduct specs: ${productSpecs || 'Not provided'}\n\nCRITICAL RULES:\n1. Return TWO prompts separated by ===SEP===\n2. First prompt is for 1:1 square ratio, second is for 3:4 portrait ratio (vertical phone photo)\n3. Both prompts MUST start with: "The exact main product from the reference image, keeping its precise position, scaling, angle, and 3D geometric details absolutely unchanged"\n4. Do NOT describe or modify the product itself\n5. Only describe the BACKGROUND and ENVIRONMENT\n6. The scene must match the product's identity (e.g. food in kitchen, electronics on desk, tools in garage)\n7. Style: smartphone photo, natural lighting, authentic real-life environment with lived-in details\n8. For 3:4 portrait ratio, design a vertical composition suitable for phone photography\n9. For 1:1 square ratio, design a balanced horizontal-and-vertical composition\n\nOutput format: [1:1 prompt]===SEP===[3:4 prompt]` },
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } },
      ];
    } else if (sceneType === 'handheld') {
      return res.status(400).json({ error: { message: 'handheld type does not need scene prompt generation' } });
    } else {
      return res.status(400).json({ error: { message: 'Invalid sceneType' } });
    }

    const response = await fetch(`${OLLAMA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          { role: 'system', content: sceneType === 'ai-scene' ? DIORAMA_SYSTEM_PROMPT : REALISTIC_SCENE_SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || '';

    // 解析两条提示词（用 ===SEP=== 分隔）
    let prompt_1x1 = rawContent;
    let prompt_3x4 = rawContent;
    const sepIndex = rawContent.indexOf('===SEP===');
    if (sepIndex > 0) {
      prompt_1x1 = rawContent.substring(0, sepIndex).trim();
      prompt_3x4 = rawContent.substring(sepIndex + 9).trim();
    }
    // 如果返回的是单条（AI未能理解），克隆一份
    if (!prompt_3x4 || prompt_3x4 === prompt_1x1) {
      prompt_3x4 = prompt_1x1;
    }

    res.json({ prompt_1x1, prompt_3x4, sceneType, model: VISION_MODEL });
  } catch (error) {
    console.error('Generate prompts error:', error.message);
    res.status(500).json({ error: { message: error.message } });
  }
});

// ========== MD 产品规格读取 ==========

/**
 * GET /api/jimeng/product-specs
 * 从 MD 文档目录读取产品规格
 */
router.get('/product-specs', (req, res) => {
  const MD_DOCS_DIR = process.env.MD_DOCS_DIR;
  if (!MD_DOCS_DIR || !fs.existsSync(MD_DOCS_DIR)) {
    return res.json({ specs: [], dir: MD_DOCS_DIR || '' });
  }

  try {
    const files = fs.readdirSync(MD_DOCS_DIR).filter(f => f.endsWith('.md'));
    const specs = [];

    for (const file of files.slice(0, 50)) { // 限制最多50个文件
      const filePath = path.join(MD_DOCS_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      // 提取标题和规格信息
      const titleMatch = content.match(/^#\s+(.+)/m) || content.match(/^##\s+(.+)/m);
      const title = titleMatch ? titleMatch[1].trim() : file.replace('.md', '');

      // 提取规格相关的行（包含尺寸、规格、比例、比例尺等关键词）
      const specLines = content.split('\n').filter(line =>
        /尺寸|规格|比例|scale|size|dimension|比例尺|比例|长|宽|高|直径|weight|重量|material|材质/i.test(line)
      ).slice(0, 10);

      specs.push({
        filename: file,
        title,
        specLines,
        preview: content.substring(0, 200),
      });
    }

    res.json({ specs, dir: MD_DOCS_DIR });
  } catch (error) {
    console.error('Read product specs error:', error.message);
    res.status(500).json({ error: { message: error.message } });
  }
});

/**
 * GET /api/jimeng/product-specs/:filename
 * 读取指定 MD 文件的完整内容
 */
router.get('/product-specs/:filename', (req, res) => {
  const MD_DOCS_DIR = process.env.MD_DOCS_DIR;
  if (!MD_DOCS_DIR) {
    return res.status(500).json({ error: { message: 'MD_DOCS_DIR not configured' } });
  }

  const filePath = path.join(MD_DOCS_DIR, req.params.filename);

  // 安全检查：防止路径遍历
  if (!filePath.startsWith(MD_DOCS_DIR)) {
    return res.status(403).json({ error: { message: 'Access denied' } });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: { message: 'File not found' } });
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    res.json({ filename: req.params.filename, content });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ========== 图生图代理 ==========

/**
 * POST /api/jimeng/compositions
 * Proxy to Jimeng API /v1/images/compositions
 */
router.post('/compositions', upload.array('images', 4), async (req, res) => {
  const JIMENG_API_URL = process.env.JIMENG_API_URL;
  const JIMENG_API_TOKEN = process.env.JIMENG_API_TOKEN;

  if (!JIMENG_API_URL) {
    return res.status(500).json({ error: { message: 'JIMENG_API_URL not configured in .env' } });
  }
  if (!JIMENG_API_TOKEN) {
    return res.status(500).json({ error: { message: 'JIMENG_API_TOKEN not configured in .env' } });
  }

  try {
    const FormData = require('form-data');
    const formData = new FormData();

    const textFields = ['model', 'prompt', 'ratio', 'resolution', 'sample_strength', 'negative_prompt', 'response_format'];
    for (const field of textFields) {
      if (req.body[field] !== undefined) {
        formData.append(field, req.body[field]);
      }
    }

    const hasImages = req.files && req.files.length > 0;

    if (hasImages) {
      for (const file of req.files) {
        formData.append('images', file.buffer, {
          filename: file.originalname || 'image.png',
          contentType: file.mimetype,
        });
      }
    }

    // 无参考图时使用文生图接口，有参考图时使用图生图（compositions）接口
    const apiPath = hasImages ? '/v1/images/compositions' : '/v1/images/generations';
    const endpoint = JIMENG_API_URL.replace(/\/+$/, '') + apiPath;
    console.log(`[Jimeng] → ${apiPath} ${hasImages ? '(img2img)' : '(txt2img)'}`);

    // Node 18+ native fetch doesn't support form-data streams properly
    // Use http/https module via form-data.submit or manual pipe
    const urlObj = new URL(endpoint);
    const httpModule = urlObj.protocol === 'https:' ? require('https') : require('http');

    const response = await new Promise((resolve, reject) => {
      const request = httpModule.request(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${JIMENG_API_TOKEN}`,
          ...formData.getHeaders(),
        },
      }, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          try {
            // 尝试标准JSON解析
            resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data: JSON.parse(body) });
          } catch (e) {
            // 尝试NDJSON解析：逐行解析，合并data数组
            try {
              const lines = body.split('\n').filter(l => l.trim());
              const allData = [];
              for (const line of lines) {
                try {
                  const parsed = JSON.parse(line);
                  if (parsed.data && Array.isArray(parsed.data)) {
                    allData.push(...parsed.data);
                  }
                } catch (lineErr) {
                  // 跳过无法解析的行
                }
              }
              if (allData.length > 0) {
                console.log(`[Jimeng] NDJSON parsed: ${allData.length} images from ${lines.length} lines`);
                resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data: { data: allData } });
              } else {
                // 尝试SSE格式：去掉 data: 前缀
                const sseLines = body.split('\n').filter(l => l.startsWith('data:'));
                for (const sseLine of sseLines) {
                  try {
                    const json = JSON.parse(sseLine.replace(/^data:\s*/, ''));
                    if (json.data && Array.isArray(json.data)) {
                      allData.push(...json.data);
                    }
                  } catch (sseErr) {}
                }
                if (allData.length > 0) {
                  console.log(`[Jimeng] SSE parsed: ${allData.length} images from ${sseLines.length} events`);
                  resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data: { data: allData } });
                } else {
                  reject(new Error(`Parse error: ${body.substring(0, 200)}`));
                }
              }
            } catch (ndjsonErr) {
              reject(new Error(`Parse error: ${body.substring(0, 200)}`));
            }
          }
        });
      });
      request.on('error', reject);
      formData.pipe(request);
    });

    if (!response.ok) {
      console.error('Jimeng API error response:', JSON.stringify(response.data).substring(0, 500));
      // 统一错误格式，确保前端能提取到错误信息
      const errData = response.data;
      const errMsg = errData?.error?.message || errData?.error || errData?.message || JSON.stringify(errData);
      return res.status(response.status).json({ error: { message: errMsg } });
    }

    console.log('Jimeng API raw response:', JSON.stringify(response.data).substring(0, 500));
    res.json(response.data);
  } catch (error) {
    console.error('Jimeng proxy error:', error.message);
    res.status(500).json({ error: { message: error.message } });
  }
});

// ========== 配置管理 ==========

router.get('/config', (req, res) => {
  res.json({
    configured: !!(process.env.JIMENG_API_URL && process.env.JIMENG_API_TOKEN),
    apiUrl: process.env.JIMENG_API_URL || '',
  });
});

router.post('/save-config', (req, res) => {
  const { apiUrl, apiToken } = req.body;

  if (!apiUrl) {
    return res.status(400).json({ success: false, error: 'API URL is required' });
  }

  try {
    const envPath = path.join(__dirname, '..', '..', '.env');
    let envContent = '';

    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');
    }

    if (envContent.includes('JIMENG_API_URL=')) {
      envContent = envContent.replace(/JIMENG_API_URL=.*/g, `JIMENG_API_URL=${apiUrl}`);
    } else {
      envContent += `\nJIMENG_API_URL=${apiUrl}`;
    }

    if (apiToken) {
      if (envContent.includes('JIMENG_API_TOKEN=')) {
        envContent = envContent.replace(/JIMENG_API_TOKEN=.*/g, `JIMENG_API_TOKEN=${apiToken}`);
      } else {
        envContent += `\nJIMENG_API_TOKEN=${apiToken}`;
      }
    }

    fs.writeFileSync(envPath, envContent, 'utf-8');

    process.env.JIMENG_API_URL = apiUrl;
    if (apiToken) {
      process.env.JIMENG_API_TOKEN = apiToken;
    }

    res.json({
      success: true,
      configured: !!(apiUrl && (apiToken || process.env.JIMENG_API_TOKEN)),
    });
  } catch (error) {
    console.error('Save Jimeng config error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== 生成图片保存 ==========

/**
 * POST /api/jimeng/save-image
 * 保存生成的图片到 outputs/generated/{YYYY-MM-DD}/
 * Body: { images: string[], prompt: string, type: string }
 */
router.post('/save-image', express.json({ limit: '50mb' }), async (req, res) => {
  try {
    const { images, prompt, type } = req.body;
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'No images provided' });
    }

    const baseDir = path.join(__dirname, '..', '..', 'outputs', 'generated');
    const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const dateDir = path.join(baseDir, dateStr);
    if (!fs.existsSync(dateDir)) {
      fs.mkdirSync(dateDir, { recursive: true });
    }

    const savedFiles = [];
    const timestamp = Date.now();

    for (let i = 0; i < images.length; i++) {
      const dataUrl = images[i];
      let base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      const ext = 'jpg';
      const filename = `gen_${timestamp}_${i + 1}.${ext}`;
      const filePath = path.join(dateDir, filename);

      // 统一转 JPG 格式保存（减小体积）
      try {
        const { createCanvas, loadImage } = require('canvas');
        const imgBuffer = Buffer.from(base64Data, 'base64');
        const img = await loadImage(imgBuffer);
        const canvas = createCanvas(img.width, img.height);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, img.width, img.height);
        ctx.drawImage(img, 0, 0);
        const jpgBuffer = canvas.toBuffer('image/jpeg', { quality: 0.92 });
        fs.writeFileSync(filePath, jpgBuffer);
      } catch (convErr) {
        // canvas 转换失败则直接保存原格式
        console.warn('JPG conversion failed, saving original:', convErr.message);
        fs.writeFileSync(filePath, base64Data, 'base64');
      }
      savedFiles.push({
        filename,
        date: dateStr,
        path: `/api/jimeng/history-image/${dateStr}/${filename}`,
      });
    }

    // Save metadata (prompt, type, timestamp) to a JSON manifest
    const manifestFile = path.join(dateDir, 'manifest.json');
    let manifest = [];
    if (fs.existsSync(manifestFile)) {
      try {
        manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf-8'));
      } catch (e) { manifest = []; }
    }
    manifest.push({
      timestamp,
      date: dateStr,
      time: new Date().toLocaleTimeString(),
      prompt: prompt || '',
      type: type || '',
      files: savedFiles.map(f => f.filename),
    });
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));

    console.log(`[Jimeng] Saved ${images.length} images to ${dateDir}`);

    res.json({ success: true, saved: savedFiles, date: dateStr });
  } catch (error) {
    console.error('Save image error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/jimeng/history
 * 列出所有已保存的生成图片，按日期分组
 */
router.get('/history', async (req, res) => {
  try {
    const baseDir = path.join(__dirname, '..', '..', 'outputs', 'generated');
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
      return res.json({ success: true, groups: [] });
    }

    const dates = fs.readdirSync(baseDir)
      .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
      .sort()
      .reverse();

    const groups = [];

    for (const date of dates) {
      const dateDir = path.join(baseDir, date);
      const images = fs.readdirSync(dateDir)
        .filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f))
        .sort()
        .reverse();

      // Read manifest entries for this date
      const manifestFile = path.join(dateDir, 'manifest.json');
      let manifestEntries = [];
      if (fs.existsSync(manifestFile)) {
        try {
          manifestEntries = JSON.parse(fs.readFileSync(manifestFile, 'utf-8'));
        } catch (e) { manifestEntries = []; }
      }

      groups.push({
        date,
        count: images.length,
        images: images.map(f => ({
          filename: f,
          url: `/api/jimeng/history-image/${date}/${f}`,
        })),
        manifest: manifestEntries,
      });
    }

    res.json({ success: true, groups });
  } catch (error) {
    console.error('History error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/jimeng/history-image/:date/:filename
 * 提供历史图片文件
 */
router.get('/history-image/:date/:filename', (req, res) => {
  const { date, filename } = req.params;

  // Security: prevent path traversal
  if (/\.\./.test(date) || /\.\./.test(filename) || /[<>"|]/.test(date) || /[<>"|]/.test(filename)) {
    return res.status(403).json({ error: 'Invalid path' });
  }

  const filePath = path.join(__dirname, '..', '..', 'outputs', 'generated', date, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Image not found' });
  }

  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
  };

  res.type(mimeTypes[ext] || 'image/png');
  res.sendFile(filePath);
});

module.exports = router;
