const express = require('express');
const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');
const fs = require('fs');

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

module.exports = router;
