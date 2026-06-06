const express = require('express');
const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');
const fs = require('fs');
const { searchMdFiles, generateMainImageContent } = require('../agent/tools/executor');

const router = express.Router();

const CANVAS_SIZE = 1024;

let chineseFontRegistered = false;
function registerChineseFont() {
  if (chineseFontRegistered) return;
  
  const fontPaths = [
    'C:/Windows/Fonts/simhei.ttf',
    'C:/Windows/Fonts/simfang.ttf',
    'C:/Windows/Fonts/simsunb.ttf',
    'C:/Windows/Fonts/msyh.ttc',
    'C:/Windows/Fonts/simsun.ttc'
  ];
  
  for (const fontPath of fontPaths) {
    if (fs.existsSync(fontPath)) {
      try {
        registerFont(fontPath, { family: 'ChineseFont' });
        chineseFontRegistered = true;
        console.log(`Registered Chinese font: ${fontPath}`);
        break;
      } catch (err) {
        console.log(`Failed to register ${fontPath}:`, err.message);
      }
    }
  }
  
  if (!chineseFontRegistered) {
    console.warn('No Chinese font found, text may not render correctly');
  }
}

registerChineseFont();

const templates = {
  1: { layouts: [{ x: 0, y: 0, w: 1024, h: 1024 }] },
  2: { layouts: [{ x: 0, y: 0, w: 512, h: 1024 }, { x: 512, y: 0, w: 512, h: 1024 }] },
  3: { layouts: [{ x: 0, y: 0, w: 1024, h: 512 }, { x: 0, y: 512, w: 512, h: 512 }, { x: 512, y: 512, w: 512, h: 512 }] },
  4: { layouts: [{ x: 0, y: 0, w: 512, h: 512 }, { x: 512, y: 0, w: 512, h: 512 }, { x: 0, y: 512, w: 512, h: 512 }, { x: 512, y: 512, w: 512, h: 512 }] },
  5: { layouts: [{ x: 0, y: 0, w: 682, h: 512 }, { x: 682, y: 0, w: 342, h: 512 }, { x: 0, y: 512, w: 342, h: 512 }, { x: 342, y: 512, w: 342, h: 512 }, { x: 684, y: 512, w: 340, h: 512 }] },
  6: { layouts: [{ x: 0, y: 0, w: 342, h: 512 }, { x: 342, y: 0, w: 340, h: 512 }, { x: 682, y: 0, w: 342, h: 512 }, { x: 0, y: 512, w: 342, h: 512 }, { x: 342, y: 512, w: 340, h: 512 }, { x: 682, y: 512, w: 342, h: 512 }] },
  7: { layouts: [{ x: 0, y: 0, w: 512, h: 512 }, { x: 512, y: 0, w: 512, h: 512 }, { x: 0, y: 512, w: 342, h: 256 }, { x: 342, y: 512, w: 340, h: 256 }, { x: 682, y: 512, w: 342, h: 256 }, { x: 0, y: 768, w: 342, h: 256 }, { x: 342, y: 768, w: 682, h: 256 }] },
  8: { layouts: [{ x: 0, y: 0, w: 512, h: 512 }, { x: 512, y: 0, w: 512, h: 512 }, { x: 0, y: 512, w: 256, h: 256 }, { x: 256, y: 512, w: 256, h: 256 }, { x: 512, y: 512, w: 256, h: 256 }, { x: 768, y: 512, w: 256, h: 256 }, { x: 0, y: 768, w: 512, h: 256 }, { x: 512, y: 768, w: 512, h: 256 }] },
  9: { layouts: [{ x: 0, y: 0, w: 342, h: 342 }, { x: 342, y: 0, w: 340, h: 342 }, { x: 682, y: 0, w: 342, h: 342 }, { x: 0, y: 342, w: 342, h: 340 }, { x: 342, y: 342, w: 340, h: 340 }, { x: 682, y: 342, w: 342, h: 340 }, { x: 0, y: 682, w: 342, h: 342 }, { x: 342, y: 682, w: 340, h: 342 }, { x: 682, y: 682, w: 342, h: 342 }] }
};

const textPositions = {
  topLeft: { align: 'left', baseline: 'top', x: 60, y: 80 },
  top: { align: 'center', baseline: 'top', x: 512, y: 80 },
  topRight: { align: 'right', baseline: 'top', x: 964, y: 80 },
  left: { align: 'left', baseline: 'middle', x: 60, y: 512 },
  center: { align: 'center', baseline: 'middle', x: 512, y: 512 },
  right: { align: 'right', baseline: 'middle', x: 964, y: 512 },
  bottomLeft: { align: 'left', baseline: 'bottom', x: 60, y: 950 },
  bottom: { align: 'center', baseline: 'bottom', x: 512, y: 950 },
  bottomRight: { align: 'right', baseline: 'bottom', x: 964, y: 950 }
};

async function loadImageFromSource(source) {
  if (source.startsWith('data:')) {
    return await loadImage(source);
  } else if (source.startsWith('http')) {
    const response = await fetch(source);
    const buffer = await response.buffer();
    return await loadImage(buffer);
  } else {
    return await loadImage(Buffer.from(source, 'base64'));
  }
}

function drawImageCover(ctx, img, x, y, w, h) {
  const imgRatio = img.width / img.height;
  const canvasRatio = w / h;
  let sx, sy, sw, sh;
  
  if (imgRatio > canvasRatio) {
    sh = img.height;
    sw = sh * canvasRatio;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    sw = img.width;
    sh = sw / canvasRatio;
    sx = 0;
    sy = (img.height - sh) / 2;
  }
  
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function drawCircleImage(ctx, img, cx, cy, radius) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  
  const size = radius * 2;
  drawImageCover(ctx, img, cx - radius, cy - radius, size, size);
  ctx.restore();
}

function drawText(ctx, config) {
  const { mainTitle, subTitle, position, mainColor, subColor, size, shadow, stroke, bold } = config;
  const pos = textPositions[position] || textPositions.center;
  
  ctx.textAlign = pos.align;
  ctx.textBaseline = pos.baseline;
  
  const fontWeight = bold ? 'bold' : 'normal';
  const mainSize = size;
  const subSize = Math.round(size * 0.5);
  const fontFamily = chineseFontRegistered ? 'ChineseFont' : 'sans-serif';
  
  const lineHeight = mainSize * 1.3;
  let startY = pos.y;
  
  if (pos.baseline === 'middle' && subTitle) {
    startY = pos.y - lineHeight / 2;
  } else if (pos.baseline === 'bottom' && subTitle) {
    startY = pos.y - lineHeight;
  }
  
  if (mainTitle) {
    ctx.font = `${fontWeight} ${mainSize}px ${fontFamily}`;
    
    if (shadow) {
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
    }
    
    if (stroke) {
      ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.lineWidth = 3;
      ctx.strokeText(mainTitle, pos.x, startY);
    }
    
    ctx.fillStyle = mainColor;
    ctx.fillText(mainTitle, pos.x, startY);
    ctx.shadowColor = 'transparent';
  }
  
  if (subTitle) {
    ctx.font = `${fontWeight} ${subSize}px ${fontFamily}`;
    const subY = mainTitle ? startY + lineHeight : startY;
    
    if (shadow) {
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
    }
    
    if (stroke) {
      ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.lineWidth = 2;
      ctx.strokeText(subTitle, pos.x, subY);
    }
    
    ctx.fillStyle = subColor;
    ctx.fillText(subTitle, pos.x, subY);
  }
}

async function drawLogo(ctx, logoConfig) {
  if (!logoConfig || !logoConfig.image) return;
  
  const { image, color, size, margin } = logoConfig;
  const img = await loadImageFromSource(image);
  
  const ratio = img.width / img.height;
  let drawW, drawH;
  
  if (ratio > 1) {
    drawW = size;
    drawH = size / ratio;
  } else {
    drawH = size;
    drawW = size * ratio;
  }
  
  ctx.drawImage(img, margin, margin, drawW, drawH);
}

router.post('/generate', async (req, res) => {
  try {
    const { template, images, logo, text, background, circleStyle, outputFormat } = req.body;
    
    const canvas = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = background || '#f5f5f5';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    const imageCount = template?.count || 1;
    const templateStyle = template?.style || 'split';
    
    if (imageCount === 2 && templateStyle === 'circle') {
      if (images && images[0]) {
        const img = await loadImageFromSource(images[0]);
        drawImageCover(ctx, img, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
      }
      
      if (images && images[1]) {
        const img = await loadImageFromSource(images[1]);
        const circleSize = circleStyle?.size || 300;
        const margin = 50;
        const radius = circleSize / 2;
        
        let cx, cy;
        if (circleStyle?.position === 'left') {
          cx = margin + radius;
          cy = CANVAS_SIZE - margin - radius;
        } else {
          cx = CANVAS_SIZE - margin - radius;
          cy = CANVAS_SIZE - margin - radius;
        }
        
        drawCircleImage(ctx, img, cx, cy, radius);
        
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = circleStyle?.borderColor || '#ffffff';
        ctx.lineWidth = circleStyle?.borderWidth || 8;
        ctx.stroke();
      }
    } else {
      const layout = templates[imageCount];
      if (!layout) {
        return res.status(400).json({ error: 'Invalid template count' });
      }
      
      for (let i = 0; i < layout.layouts.length; i++) {
        const l = layout.layouts[i];
        if (images && images[i]) {
          const img = await loadImageFromSource(images[i]);
          drawImageCover(ctx, img, l.x, l.y, l.w, l.h);
        }
      }
    }
    
    if (text && (text.mainTitle || text.subTitle)) {
      drawText(ctx, {
        mainTitle: text.mainTitle || '',
        subTitle: text.subTitle || '',
        position: text.position || 'center',
        mainColor: text.mainColor || '#ffffff',
        subColor: text.subColor || '#ffffff',
        size: text.size || 48,
        shadow: text.shadow !== false,
        stroke: text.stroke === true,
        bold: text.bold !== false
      });
    }
    
    if (logo) {
      await drawLogo(ctx, logo);
    }
    
    const format = outputFormat === 'jpg' ? 'image/jpeg' : 'image/png';
    const buffer = canvas.toBuffer(format);
    const base64 = buffer.toString('base64');
    
    res.json({
      success: true,
      image: `data:${format};base64,${base64}`,
      format: outputFormat || 'png',
      size: {
        width: CANVAS_SIZE,
        height: CANVAS_SIZE
      }
    });
    
  } catch (err) {
    console.error('Main image generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 文案生成接口 - 优先结构化解析文档，可选AI优化
router.post('/copywriting', async (req, res) => {
  try {
    const { productName, productInfo, language = 'zh', aiOptimize = false } = req.body;
    
    if (!productName) {
      return res.status(400).json({ error: '请提供产品名称' });
    }
    
    // 1. 从知识库搜索产品文档
    const searchResult = await searchMdFiles(productName, true, false);
    
    let productData = null;
    let matchedFiles = [];

    if (searchResult.success && searchResult.results && searchResult.results.length > 0) {
      matchedFiles = searchResult.results.map(r => ({
        file_name: r.file_name,
        product_id: r.product_id,
        product_name: r.parsed?.product_name || '',
        product_name_en: r.parsed?.product_name_en || '',
        match_type: r.match_type
      }));

      const match = searchResult.results[0];
      productData = match.parsed;

      // 如果有product_id，尝试获取更完整的数据（仅补充规格/尺寸，不覆盖卖点）
      if (match.product_id) {
        try {
          const fullData = await generateMainImageContent(match.product_id, 'professional', language);
          if (fullData.success) {
            // 只补充文档中没有的字段，卖点始终以文档为准
            if (!productData.product_name && fullData.product_name) productData.product_name = fullData.product_name;
            if (!productData.description && fullData.main_image_params?.subTitle) productData.description = fullData.main_image_params.subTitle;
            // 补充规格和尺寸数据（用不同字段名避免覆盖）
            if (fullData.specs_data?.length) productData.specs_data = fullData.specs_data;
            if (fullData.dimension_data?.length) productData.dimension_data = fullData.dimension_data;
          }
        } catch (e) {
          // 忽略，使用parsed数据
        }
      }
    }
    
    // 2. 优先结构化解析文档卖点
    const structuredCopy = extractCopyFromDoc(productData, language);
    
    // 如果不要求AI优化，或没有AI配置，直接返回结构化数据
    if (!aiOptimize) {
      return res.json({
        success: true,
        copyList: structuredCopy.copyList,
        copyListEn: structuredCopy.copyListEn,
        language,
        source: structuredCopy.source,
        productData: productData ? {
          product_name: productData.product_name || '',
          product_name_en: productData.product_name_en || '',
          material: productData.material || '',
          material_en: productData.material_en || '',
          process: productData.process || '',
          process_en: productData.process_en || '',
          description: productData.description || '',
          description_en: productData.description_en || ''
        } : null,
        matchedFiles
      });
    }
    
    // 3. AI优化模式：基于文档数据让AI优化文案
    const config = require('../agent/config');
    const selectedProvider = config.defaultProvider;
    const providerConfig = config.providers[selectedProvider];
    
    if (!providerConfig) {
      return res.json({
        success: true,
        copyList: structuredCopy.copyList,
        copyListEn: structuredCopy.copyListEn,
        language,
        source: structuredCopy.source,
        productData: productData ? {
          product_name: productData.product_name || '',
          product_name_en: productData.product_name_en || '',
          material: productData.material || '',
          material_en: productData.material_en || '',
          process: productData.process || '',
          process_en: productData.process_en || '',
          description: productData.description || '',
          description_en: productData.description_en || ''
        } : null,
        matchedFiles
      });
    }
    
    const OpenAI = require('openai');
    const client = new OpenAI({
      apiKey: providerConfig.apiKey || 'dummy',
      baseURL: providerConfig.baseUrl
    });
    
    // 构建上下文
    let contextSection = '';
    if (productData) {
      const spZh = productData.selling_points || [];
      const spEn = productData.selling_points_en || [];
      contextSection = `\n\n产品文档数据:\n- 产品名: ${productData.product_name || productName}\n- 英文名: ${productData.product_name_en || ''}\n- 材质: ${productData.material || ''} / ${productData.material_en || ''}\n- 工艺: ${productData.process || ''} / ${productData.process_en || ''}\n- 中文卖点: ${spZh.map(s => s.title + '—' + s.description).join('; ')}\n- 英文卖点: ${spEn.map(s => s.title + ' - ' + s.description).join('; ')}\n- 描述: ${productData.description || ''}`;
    } else if (productInfo) {
      contextSection = `\n\n产品信息: ${productInfo}`;
    }
    
    const prompt = `你是专业的电商产品文案专家。根据产品信息优化卖点文案，生成中英文各6组，每组包含大标题和副标题。
${contextSection}

要求:
1. 中文：大标题简洁有力（2-6字），副标题为短句（4-12字）
2. 英文：Main title concise (2-5 words), subtitle short phrase (3-8 words)
3. 文案要突出产品核心卖点，适合主图展示
4. 风格多样：品质感、科技感、性价比、生活方式、专业信赖、创新设计等
5. 返回JSON格式:
{
  "zh": [{"title": "大标题", "subtitle": "副标题"}, ...],
  "en": [{"title": "Main Title", "subtitle": "Subtitle"}, ...]
}
6. 只返回JSON，不要其他内容`;

    const completion = await client.chat.completions.create({
      model: providerConfig.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1500,
      temperature: 0.8
    });
    
    const text = completion.choices[0].message.content.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        const copyList = (parsed.zh || []).map(item => ({ title: item.title || '', subtitle: item.subtitle || '' }));
        const copyListEn = (parsed.en || []).map(item => ({ title: item.title || '', subtitle: item.subtitle || '' }));
        res.json({
          success: true,
          copyList: copyList.length > 0 ? copyList : structuredCopy.copyList,
          copyListEn: copyListEn.length > 0 ? copyListEn : structuredCopy.copyListEn,
          language,
          source: productData ? 'document+ai' : 'ai',
          productData: productData ? {
            product_name: productData.product_name || '',
            product_name_en: productData.product_name_en || '',
            material: productData.material || '',
            material_en: productData.material_en || '',
            process: productData.process || '',
            process_en: productData.process_en || '',
            description: productData.description || '',
            description_en: productData.description_en || ''
          } : null,
          matchedFiles
        });
      } catch (parseErr) {
        console.warn('AI返回JSON解析失败，使用结构化数据:', parseErr.message);
        res.json({
          success: true,
          copyList: structuredCopy.copyList,
          copyListEn: structuredCopy.copyListEn,
          language,
          source: structuredCopy.source,
          productData: productData ? {
            product_name: productData.product_name || '',
            product_name_en: productData.product_name_en || '',
            material: productData.material || '',
            material_en: productData.material_en || '',
            process: productData.process || '',
            process_en: productData.process_en || '',
            description: productData.description || '',
            description_en: productData.description_en || ''
          } : null,
          matchedFiles
        });
      }
    } else {
      res.json({
        success: true,
        copyList: structuredCopy.copyList,
        copyListEn: structuredCopy.copyListEn,
        language,
        source: structuredCopy.source,
        productData: productData ? {
          product_name: productData.product_name || '',
          product_name_en: productData.product_name_en || '',
          material: productData.material || '',
          material_en: productData.material_en || '',
          process: productData.process || '',
          process_en: productData.process_en || '',
          description: productData.description || '',
          description_en: productData.description_en || ''
        } : null,
        matchedFiles
      });
    }
  } catch (err) {
    console.error('文案生成错误:', err);
    res.status(500).json({ error: err.message || '文案生成失败' });
  }
});

// 从文档数据直接提取中英文文案（结构化解析，不依赖AI）
function extractCopyFromDoc(productData, language) {
  const copyList = [];
  const copyListEn = [];
  
  if (productData) {
    // 中文卖点
    if (productData.selling_points && productData.selling_points.length > 0) {
      productData.selling_points.forEach(sp => {
        const title = typeof sp === 'object' ? (sp.title || '') : sp;
        const subtitle = typeof sp === 'object' ? (sp.description || '') : '';
        if (title) {
          copyList.push({ title, subtitle: subtitle || title });
        }
      });
    }
    
    // 英文卖点
    if (productData.selling_points_en && productData.selling_points_en.length > 0) {
      productData.selling_points_en.forEach(sp => {
        const title = typeof sp === 'object' ? (sp.title || '') : sp;
        const subtitle = typeof sp === 'object' ? (sp.description || '') : '';
        if (title) {
          copyListEn.push({ title, subtitle: subtitle || title });
        }
      });
    }
  }
  
  const source = copyList.length > 0 ? 'document' : 'default';
  
  // 补充默认文案
  const defaultsZh = [
    { title: '品质之选', subtitle: '精工制造 品质保证' },
    { title: '专业级性能', subtitle: '高效稳定 耐用可靠' },
    { title: '智能便捷', subtitle: '操作简单 轻松上手' },
    { title: '创新设计', subtitle: '时尚外观 实用功能' },
    { title: '超高性价比', subtitle: '优质平价 物超所值' },
    { title: '热销爆款', subtitle: '万人好评 值得信赖' }
  ];
  const defaultsEn = [
    { title: 'Premium Quality', subtitle: 'Crafted with excellence' },
    { title: 'Professional Grade', subtitle: 'Reliable performance' },
    { title: 'Smart Design', subtitle: 'Easy to use' },
    { title: 'Innovative', subtitle: 'Modern & practical' },
    { title: 'Best Value', subtitle: 'Quality at great price' },
    { title: 'Best Seller', subtitle: 'Trusted by thousands' }
  ];
  
  while (copyList.length < 6) {
    copyList.push(defaultsZh[copyList.length % defaultsZh.length]);
  }
  while (copyListEn.length < 6) {
    copyListEn.push(defaultsEn[copyListEn.length % defaultsEn.length]);
  }
  
  return { copyList: copyList.slice(0, 6), copyListEn: copyListEn.slice(0, 6), source };
}

module.exports = router;
