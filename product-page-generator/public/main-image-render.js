/**
 * main-image-render.js
 * 主图渲染模块：布局计算、Canvas渲染、绘图工具函数、导出
 * 
 * 依赖全局变量：state, canvas, ctx, renderCtx, displayScale, RENDER_SZ, templates, presets, konvaStage
 * 依赖全局函数：getCtx, showToast, renderImageList, updateCircleOptions, updateBatchGroupDisplay
 */

// ========== 布局计算 ==========

function getCurrentLayouts() {
  const template = templates[state.templateCount];
  if (!template) return [];
  
  // 2图特殊样式
  if (state.templateCount === 2) {
    if (state.twoImageStyle === 'circle') {
      const size = state.circleSize;
      const margin = 50;
      let cx, cy;
      if (state.circlePosition === 'right') {
        cx = 1024 - margin - size / 2;
        cy = 1024 - margin - size / 2;
      } else {
        cx = margin + size / 2;
        cy = 1024 - margin - size / 2;
      }
      return [
        { x: 0, y: 0, w: 1024, h: 1024 },
        { x: cx - size / 2, y: cy - size / 2, w: size, h: size }
      ];
    }
    if (state.twoImageStyle === 'detail') {
      const svgW = 995, svgH = 998;
      const scale = Math.min(1024 / svgW, 1024 / svgH);
      const offsetX = (1024 - svgW * scale) / 2;
      function tx(x) { return x * scale + offsetX; }
      function ty(y) { return y * scale; }
      return [
        { x: tx(37.03), y: ty(194.14), w: tx(474.58) - tx(37.03), h: ty(817.76) - ty(194.14) },
        { x: tx(474.58), y: ty(364.22), w: tx(960.1) - tx(474.58), h: ty(966.03) - ty(364.22) }
      ];
    }
    if (state.twoImageStyle === 'card') {
      const cardW = 440, cardH = 780, gap = 40;
      const startX = (1024 - cardW * 2 - gap) / 2;
      const startY = 150;
      return [
        { x: startX, y: startY, w: cardW, h: cardH },
        { x: startX + cardW + gap, y: startY, w: cardW, h: cardH }
      ];
    }
  }
  
  // 4图特殊样式
  if (state.templateCount === 4) {
    if (state.maskStyle === 'irregular') {
      const cardW = 480, cardH = 400, gapY = 30, startY = 110;
      return [
        { x: 32, y: startY, w: cardW, h: cardH },
        { x: 512, y: startY, w: cardW, h: cardH },
        { x: 32, y: startY + cardH + gapY, w: cardW, h: cardH },
        { x: 512, y: startY + cardH + gapY, w: cardW, h: cardH }
      ];
    }
    if (state.maskStyle === 'useDisplay' && template.layoutsUseDisplay) {
      return template.layoutsUseDisplay;
    }
    if (state.maskStyle === 'mainDetail' && template.layoutsMainDetail) {
      return template.layoutsMainDetail;
    }
  }
  
  // 默认布局
  let layouts = template.layouts;
  if (state.templateCount === 5 && state.fiveImageStyle === 'big' && template.layoutsBig) {
    layouts = template.layoutsBig;
  } else if (state.templateCount === 6 && state.sixImageStyle === 'big' && template.layoutsBig) {
    layouts = template.layoutsBig;
  }
  return layouts;
}

function getImageIndexAtPosition(x, y) {
  const layouts = getCurrentLayouts();
  
  const gap = state.imageGap * 2;
  const adjustedLayouts = adjustLayoutsAvoidText(adjustLayoutsWithGap(layouts, gap));
  
  // 从后往前遍历，优先匹配上层小区域（如圆形副图覆盖在主图上方）
  for (let i = adjustedLayouts.length - 1; i >= 0; i--) {
    const layout = adjustedLayouts[i];
    if (x >= layout.x && x <= layout.x + layout.w &&
        y >= layout.y && y <= layout.y + layout.h) {
      return i;
    }
  }
  
  return -1;
}

function swapImages(index1, index2) {
  // 只交换图片的显示数据，不改变分类type
  const img1 = state.images[index1];
  const img2 = state.images[index2];
  
  // 交换除type以外的所有属性
  const tempImg = img1.img;
  const tempName = img1.name;
  const tempSrc = img1.src;
  const tempScale = img1.scale;
  const tempOffsetX = img1.offsetX;
  const tempOffsetY = img1.offsetY;
  const tempImgOriginal = img1.imgOriginal;
  const tempSrcOriginal = img1.srcOriginal;
  
  img1.img = img2.img;
  img1.name = img2.name;
  img1.src = img2.src;
  img1.scale = img2.scale;
  img1.offsetX = img2.offsetX;
  img1.offsetY = img2.offsetY;
  img1.imgOriginal = img2.imgOriginal;
  img1.srcOriginal = img2.srcOriginal;
  
  img2.img = tempImg;
  img2.name = tempName;
  img2.src = tempSrc;
  img2.scale = tempScale;
  img2.offsetX = tempOffsetX;
  img2.offsetY = tempOffsetY;
  img2.imgOriginal = tempImgOriginal;
  img2.srcOriginal = tempSrcOriginal;
  
  renderImageList();
  showToast(`已交换图片 ${index1 + 1} 和 ${index2 + 1} 的显示位置`);
}

function adjustLayoutsWithGap(layouts, gap) {
  if (gap === 0) return layouts;
  const halfGap = gap / 2;
  return layouts.map(l => ({ x: l.x + halfGap, y: l.y + halfGap, w: l.w - gap, h: l.h - gap }));
}

// 应用布局变换（已移除偏移/缩放/旋转/镜像功能）
function adjustLayoutsTransform(layouts) {
  return layouts;
}

// 遮罩避让文字：根据文字边界框缩小遮罩区域
function adjustLayoutsAvoidText(layouts) {
  if (!state.maskAvoidText || !state.textLayerVisible) return layouts;
  
  const textBBox = getTextBoundingBox();
  if (!textBBox) return layouts;
  
  const margin = state.maskAvoidMargin || 0;
  // 文字区域（含间距）
  const textRect = {
    x: textBBox.x - margin,
    y: textBBox.y - margin,
    w: textBBox.w + margin * 2,
    h: textBBox.h + margin * 2
  };
  
  return layouts.map(l => {
    // 检测遮罩与文字区域是否重叠
    const overlapX = l.x < textRect.x + textRect.w && l.x + l.w > textRect.x;
    const overlapY = l.y < textRect.y + textRect.h && l.y + l.h > textRect.y;
    
    if (!overlapX || !overlapY) return l; // 无重叠，不调整
    
    // 计算各方向的裁剪量
    let newX = l.x, newY = l.y, newW = l.w, newH = l.h;
    
    // 从上方裁剪（文字在遮罩上方）
    if (textRect.y <= l.y + l.h && textRect.y + textRect.h >= l.y) {
      // 文字在遮罩内部或部分重叠
      const overlapTop = textRect.y + textRect.h - l.y;
      const overlapBottom = l.y + l.h - textRect.y;
      const overlapLeft = textRect.x + textRect.w - l.x;
      const overlapRight = l.x + l.w - textRect.x;
      
      // 选择裁剪量最小的方向（最小侵入原则）
      const minOverlap = Math.min(overlapTop, overlapBottom, overlapLeft, overlapRight);
      
      if (minOverlap === overlapTop && overlapTop < l.h) {
        // 从上方裁剪
        newY = textRect.y + textRect.h;
        newH = l.y + l.h - newY;
      } else if (minOverlap === overlapBottom && overlapBottom < l.h) {
        // 从下方裁剪
        newH = textRect.y - l.y;
      } else if (minOverlap === overlapLeft && overlapLeft < l.w) {
        // 从左侧裁剪
        newX = textRect.x + textRect.w;
        newW = l.x + l.w - newX;
      } else if (minOverlap === overlapRight && overlapRight < l.w) {
        // 从右侧裁剪
        newW = textRect.x - l.x;
      }
    }
    
    // 确保遮罩不会变成负值
    if (newW < 20 || newH < 20) return l; // 太小则不避让
    
    return { x: newX, y: newY, w: newW, h: newH };
  });
}

// 变换单个坐标点（已移除变换功能）
function transformPoint(x, y) {
  return { x, y };
}

// 变换尺寸（已移除变换功能）
function transformSize(w, h) {
  return { w, h };
}

// 应用布局偏移/缩放到canvas上下文（已移除变换功能）
function applyLayoutOffsetScale(ctx) {
  // 无变换
  return false;
}

// 恢复canvas上下文（已移除变换功能）
function restoreLayoutOffsetScale(ctx) {
  // 无变换
}

// ========== 绘图工具函数 ==========

function drawImageWithEffects(imgObj, x, y, w, h) {
  drawImageCover(imgObj, x, y, w, h);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawImageCover(imgObj, x, y, w, h) {
  // 导出时使用原始分辨率图片，预览时使用低分辨率图片
  const isExport = !!window._renderCtx;
  const img = (isExport && imgObj.imgOriginal) ? imgObj.imgOriginal : (imgObj.img || imgObj);
  const scale = imgObj.scale || 1;
  const offsetX = imgObj.offsetX || 0;
  const offsetY = imgObj.offsetY || 0;
  
  const imgRatio = img.width / img.height;
  const areaRatio = w / h;
  
  let drawW, drawH;
  if (imgRatio > areaRatio) {
    drawH = h;
    drawW = drawH * imgRatio;
  } else {
    drawW = w;
    drawH = drawW / imgRatio;
  }
  
  drawW *= scale;
  drawH *= scale;
  
  let drawX = x + (w - drawW) / 2 - offsetX;
  let drawY = y + (h - drawH) / 2 - offsetY;
  
  const c = getCtx();
  c.save();
  if (state.imageRadius > 0) {
    roundRect(c, x, y, w, h, state.imageRadius * 2);
    c.clip();
  } else {
    c.beginPath();
    c.rect(x, y, w, h);
    c.clip();
  }
  
  c.drawImage(img, 0, 0, img.width, img.height, drawX, drawY, drawW, drawH);
  
  if (state.imageRadius > 0) {
    c.strokeStyle = 'rgba(0,0,0,0.05)';
    c.lineWidth = 1;
    c.stroke();
  }
  
  c.restore();
}

function drawImageCoverInCircle(imgObj, x, y, w, h) {
  // 导出时使用原始分辨率图片，预览时使用低分辨率图片
  const isExport = !!window._renderCtx;
  const img = (isExport && imgObj.imgOriginal) ? imgObj.imgOriginal : (imgObj.img || imgObj);
  const scale = imgObj.scale || 1;
  const offsetX = imgObj.offsetX || 0;
  const offsetY = imgObj.offsetY || 0;
  
  const imgRatio = img.width / img.height;
  const areaRatio = w / h;
  
  let drawW, drawH;
  if (imgRatio > areaRatio) {
    drawH = h;
    drawW = drawH * imgRatio;
  } else {
    drawW = w;
    drawH = drawW / imgRatio;
  }
  
  drawW *= scale;
  drawH *= scale;
  
  let drawX = x + (w - drawW) / 2 - offsetX;
  let drawY = y + (h - drawH) / 2 - offsetY;
  
  getCtx().drawImage(img, 0, 0, img.width, img.height, drawX, drawY, drawW, drawH);
}

// ========== 文字渲染 ==========

function wrapText(ctx, text, maxWidth) {
  if (!text) return [];
  const lines = [];
  let currentLine = '';
  
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const testLine = currentLine + ch;
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = ch;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  
  return lines.length > 0 ? lines : [text];
}

function wrapTextByWords(ctx, text, maxWidth) {
  if (!text) return [''];
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  words.forEach(word => {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });
  if (currentLine) lines.push(currentLine);
  return lines.length ? lines : [''];
}

// ========== 文字边界框计算（供交互层使用） ==========

function getTextBoundingBox() {
  if (!state.mainTitle && !state.subTitle) return null;
  
  let textX, textY, textAlign, textVAlign;
  if (state.customTextPos) {
    textX = state.customTextPos.x;
    textY = state.customTextPos.y;
    textAlign = state.customTextPos.textAlign || 'center';
    textVAlign = state.customTextPos.textVAlign || 'top';
  } else {
    const preset = presets[state.preset];
    textX = preset.textX;
    textY = preset.textY;
    textAlign = preset.textAlign;
    textVAlign = preset.textVAlign;
  }
  
  const titleSize = state.titleSize;
  const subtitleSize = Math.max(16, Math.floor(titleSize * 0.5));
  const maxWidth = textAlign === 'center' ? 900 :
                   textAlign === 'right' ? textX - 60 :
                   1024 - textX - 60;
  
  const mainFontStyle = state.mainTitleItalic ? 'italic' : 'normal';
  const mainFontWeight = state.mainTitleWeight;
  const subFontStyle = state.subTitleItalic ? 'italic' : 'normal';
  const subFontWeight = state.subTitleWeight;
  
  const mainFontStr = `${mainFontStyle} ${mainFontWeight} ${titleSize}px ${state.mainTitleFont}`;
  const subFontStr = `${subFontStyle} ${subFontWeight} ${subtitleSize}px ${state.subTitleFont}`;
  
  const c = getCtx();
  c.font = mainFontStr;
  const titleLines = wrapText(c, state.mainTitle || '', maxWidth);
  c.font = subFontStr;
  const subtitleLines = wrapText(c, state.subTitle || '', maxWidth);
  
  let maxLineWidth = 0;
  c.font = mainFontStr;
  titleLines.forEach(line => {
    const w = c.measureText(line).width;
    if (w > maxLineWidth) maxLineWidth = w;
  });
  c.font = subFontStr;
  subtitleLines.forEach(line => {
    const w = c.measureText(line).width;
    if (w > maxLineWidth) maxLineWidth = w;
  });
  
  const lineHeight = titleSize;
  const subtitleLineHeight = subtitleSize;
  const titleTotalH = titleLines.length > 0 ? titleLines.length * lineHeight + (titleLines.length - 1) * 4 : 0;
  const subtitleTotalH = subtitleLines.length > 0 ? subtitleLines.length * subtitleLineHeight + (subtitleLines.length - 1) * 4 + (titleLines.length > 0 ? 10 : 0) : 0;
  const textHeight = titleTotalH + subtitleTotalH;
  const padding = 30;
  
  let bgX = textAlign === 'center' ? textX - maxLineWidth / 2 - padding :
            textAlign === 'right' ? textX - maxLineWidth - padding :
            textX - padding;
  let bgY = textVAlign === 'center' ? textY - textHeight / 2 - padding :
            textVAlign === 'bottom' ? textY - textHeight - padding :
            textY - padding;
  let bgW = maxLineWidth + padding * 2;
  let bgH = textHeight + padding * 2;
  
  return { x: bgX, y: bgY, w: bgW, h: bgH, textX, textY, textAlign, textVAlign };
}

// 获取8个缩放控制点位置
function getTextResizeHandles(bb, handleSize) {
  if (!bb) return [];
  const { x, y, w, h } = bb;
  return [
    { x: x,         y: y,         cursor: 'nwse-resize', pos: 'tl' },
    { x: x + w/2,   y: y,         cursor: 'ns-resize',   pos: 'tc' },
    { x: x + w,     y: y,         cursor: 'nesw-resize', pos: 'tr' },
    { x: x,         y: y + h/2,   cursor: 'ew-resize',   pos: 'ml' },
    { x: x + w,     y: y + h/2,   cursor: 'ew-resize',   pos: 'mr' },
    { x: x,         y: y + h,     cursor: 'nesw-resize', pos: 'bl' },
    { x: x + w/2,   y: y + h,     cursor: 'ns-resize',   pos: 'bc' },
    { x: x + w,     y: y + h,     cursor: 'nwse-resize', pos: 'br' },
  ];
}

function drawText() {
  // 支持自定义点击位置
  let textX, textY, textAlign, textVAlign;
  if (state.customTextPos) {
    textX = state.customTextPos.x;
    textY = state.customTextPos.y;
    textAlign = state.customTextPos.textAlign || 'center';
    textVAlign = state.customTextPos.textVAlign || 'top';
  } else {
    const preset = presets[state.preset];
    textX = preset.textX;
    textY = preset.textY;
    textAlign = preset.textAlign;
    textVAlign = preset.textVAlign;
  }
  const titleSize = state.titleSize;
  const subtitleSize = Math.max(16, Math.floor(titleSize * 0.5));
  const c = getCtx();
  c.save();
  
  const maxWidth = textAlign === 'center' ? 900 :
                   textAlign === 'right' ? textX - 60 :
                   1024 - textX - 60;
  
  // 构建字体字符串
  const mainFontStyle = state.mainTitleItalic ? 'italic' : 'normal';
  const mainFontWeight = state.mainTitleWeight;
  const subFontStyle = state.subTitleItalic ? 'italic' : 'normal';
  const subFontWeight = state.subTitleWeight;
  
  const mainFontStr = `${mainFontStyle} ${mainFontWeight} ${titleSize}px ${state.mainTitleFont}`;
  const subFontStr = `${subFontStyle} ${subFontWeight} ${subtitleSize}px ${state.subTitleFont}`;
  
  c.font = mainFontStr;
  const titleLines = wrapText(c, state.mainTitle || '', maxWidth);
  c.font = subFontStr;
  const subtitleLines = wrapText(c, state.subTitle || '', maxWidth);
  
  let maxLineWidth = 0;
  c.font = mainFontStr;
  titleLines.forEach(line => {
    const w = c.measureText(line).width;
    if (w > maxLineWidth) maxLineWidth = w;
  });
  c.font = subFontStr;
  subtitleLines.forEach(line => {
    const w = c.measureText(line).width;
    if (w > maxLineWidth) maxLineWidth = w;
  });
  
  const lineHeight = titleSize;
  const subtitleLineHeight = subtitleSize;
  const titleTotalH = titleLines.length > 0 ? titleLines.length * lineHeight + (titleLines.length - 1) * 4 : 0;
  const subtitleTotalH = subtitleLines.length > 0 ? subtitleLines.length * subtitleLineHeight + (subtitleLines.length - 1) * 4 + (titleLines.length > 0 ? 10 : 0) : 0;
  const textHeight = titleTotalH + subtitleTotalH;
  const padding = 30;
  
  let bgX = textAlign === 'center' ? textX - maxLineWidth / 2 - padding :
            textAlign === 'right' ? textX - maxLineWidth - padding :
            textX - padding;
  let bgY = textVAlign === 'center' ? textY - textHeight / 2 - padding :
            textVAlign === 'bottom' ? textY - textHeight - padding :
            textY - padding;
  let bgW = maxLineWidth + padding * 2;
  let bgH = textHeight + padding * 2;
  
  const bgRadius = state.textBgRadius || 16;
  
  if (state.textBg) {
    c.fillStyle = state.textBgColor || 'rgba(0,0,0,0.5)';
    roundRect(c, bgX, bgY, bgW, bgH, bgRadius);
    c.fill();
  }
  
  if (state.shadow) {
    c.shadowColor = 'rgba(0,0,0,0.5)';
    c.shadowBlur = 10;
    c.shadowOffsetX = 2;
    c.shadowOffsetY = 2;
  }
  
  c.textAlign = textAlign;
  c.textBaseline = 'top';
  
  let currentY = textVAlign === 'center' ? textY - textHeight / 2 :
                 textVAlign === 'bottom' ? textY - textHeight :
                 textY;
  
  if (titleLines.length > 0) {
    c.font = mainFontStr;
    titleLines.forEach((line, i) => {
      if (state.stroke) { c.strokeStyle = 'rgba(0,0,0,0.8)'; c.lineWidth = 3; c.strokeText(line, textX, currentY); }
      c.fillStyle = state.titleColor;
      c.fillText(line, textX, currentY);
      currentY += lineHeight + 4;
    });
    currentY += 6;
  }
  
  if (subtitleLines.length > 0) {
    c.font = subFontStr;
    subtitleLines.forEach((line) => {
      if (state.stroke) { c.strokeStyle = 'rgba(0,0,0,0.8)'; c.lineWidth = 2; c.strokeText(line, textX, currentY); }
      c.fillStyle = state.subtitleColor;
      c.fillText(line, textX, currentY);
      currentY += subtitleLineHeight + 4;
    });
  }
  
  c.restore();
}

// ========== Logo 绘制 ==========

function applySvgColor(svgContent, color) {
  return svgContent.replace(/fill="[^"]*"/g, `fill="${color}"`)
                   .replace(/stroke="[^"]*"/g, `stroke="${color}"`)
                   .replace(/style="[^"]*fill:[^"]*"/g, `style="fill:${color}"`)
                   .replace(/style="[^"]*stroke:[^"]*"/g, `style="stroke:${color}"`);
}

function drawLogo() {
  const maxSize = state.logoSize;
  const margin = state.logoMargin;
  const x = margin;
  const y = margin;
  
  if (state.logo.type === 'svg') {
    const coloredSvg = applySvgColor(state.logo.originalContent, state.logoColor);
    const svgBlob = new Blob([coloredSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);
    
    const img = new Image();
    img.onload = () => {
      const ratio = img.width / img.height;
      let drawW, drawH;
      if (ratio > 1) {
        drawW = maxSize;
        drawH = maxSize / ratio;
      } else {
        drawH = maxSize;
        drawW = maxSize * ratio;
      }
      getCtx().drawImage(img, x, y, drawW, drawH);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  } else if (state.logo.type === 'image' && state.logo.img) {
    const img = state.logo.img;
    const ratio = img.width / img.height;
    let drawW, drawH;
    if (ratio > 1) {
      drawW = maxSize;
      drawH = maxSize / ratio;
    } else {
      drawH = maxSize;
      drawW = maxSize * ratio;
    }
    getCtx().drawImage(img, x, y, drawW, drawH);
  }
}

// ========== 数量文字绘制 ==========

function drawNumberText() {
  if (!state.numberText || !state.numberTextVisible) return;

  const c = getCtx();
  c.save();

  const fontSize = state.numberTextSize;
  const fontStyle = state.numberTextItalic ? 'italic' : 'normal';
  const fontWeight = state.numberTextWeight;
  const fontStr = `${fontStyle} ${fontWeight} ${fontSize}px ${state.numberTextFont}`;

  c.font = fontStr;
  c.textAlign = 'right';
  c.textBaseline = 'top';

  // 阴影
  if (state.shadow) {
    c.shadowColor = 'rgba(0,0,0,0.5)';
    c.shadowBlur = 8;
    c.shadowOffsetX = 2;
    c.shadowOffsetY = 2;
  }

  // 描边
  if (state.stroke) {
    c.strokeStyle = 'rgba(0,0,0,0.8)';
    c.lineWidth = 2;
    c.strokeText(state.numberText, state.numberTextX, state.numberTextY);
  }

  c.fillStyle = state.numberTextColor;
  c.fillText(state.numberText, state.numberTextX, state.numberTextY);

  c.restore();
}

// 获取数量文字的边界框（用于拖拽）
function getNumberTextBBox() {
  if (!state.numberText || !state.numberTextVisible) return null;

  const c = getCtx();
  const fontSize = state.numberTextSize;
  const fontStyle = state.numberTextItalic ? 'italic' : 'normal';
  const fontWeight = state.numberTextWeight;
  const fontStr = `${fontStyle} ${fontWeight} ${fontSize}px ${state.numberTextFont}`;

  c.font = fontStr;
  const textWidth = c.measureText(state.numberText).width;
  const padding = 10;

  return {
    x: state.numberTextX - textWidth - padding,
    y: state.numberTextY - padding,
    w: textWidth + padding * 2,
    h: fontSize + padding * 2
  };
}

// ========== 尺寸标注 Canvas 绘制 ==========

function drawDimensionsOnCanvas() {
  const c = getCtx();
  state.dimensions.forEach(d => {
    const x1 = d.x1;
    const y1 = d.y1;
    const x2 = d.x2;
    const y2 = d.y2;
    const lw = (d.lineWidth || 2);
    const fs = (d.fontSize || 16);
    const endStyle = d.endStyle || 'arrow';
    
    c.strokeStyle = d.lineColor;
    c.fillStyle = d.lineColor;
    c.lineWidth = lw;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.stroke();
    
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx*dx + dy*dy);
    const ux = dx / len, uy = dy / len;
    const px = -uy, py = ux;
    
    if (endStyle === 'arrow') {
      const arrowSize = Math.max(8, lw * 4);
      
      function drawArrow(cx, cy, dir) {
        const ax = cx - ux * arrowSize * dir;
        const ay = cy - uy * arrowSize * dir;
        c.beginPath();
        c.moveTo(ax + px * arrowSize/2, ay + py * arrowSize/2);
        c.lineTo(cx, cy);
        c.lineTo(ax - px * arrowSize/2, ay - py * arrowSize/2);
        c.stroke();
      }
      drawArrow(x1, y1, -1);
      drawArrow(x2, y2, 1);
    } else if (endStyle === 'line') {
      // 带横线的工程制图风格
      const lineLen = Math.max(12, fs * 0.8); // 横线长度
      const gap = Math.max(4, lw * 2); // 横线与端点的间隙
      
      // 在两端绘制横线（垂直于箭头方向）
      c.beginPath();
      // 起点横线
      const lx1_start = x1 - px * lineLen/2 + ux * gap;
      const ly1_start = y1 - py * lineLen/2 + uy * gap;
      const lx1_end = x1 + px * lineLen/2 + ux * gap;
      const ly1_end = y1 + py * lineLen/2 + uy * gap;
      c.moveTo(lx1_start, ly1_start);
      c.lineTo(lx1_end, ly1_end);
      // 终点横线
      const lx2_start = x2 - px * lineLen/2 - ux * gap;
      const ly2_start = y2 - py * lineLen/2 - uy * gap;
      const lx2_end = x2 + px * lineLen/2 - ux * gap;
      const ly2_end = y2 + py * lineLen/2 - uy * gap;
      c.moveTo(lx2_start, ly2_start);
      c.lineTo(lx2_end, ly2_end);
      c.stroke();
    } else {
      const dotR = Math.max(4, lw * 2);
      c.beginPath();
      c.arc(x1, y1, dotR, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.arc(x2, y2, dotR, 0, Math.PI * 2);
      c.fill();
    }
    
    const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
    
    // 文字绘制
    const textBg = d.textBg || 'white';
    const pad12 = 12;
    const pad10 = 10;
    const pad6 = 6;
    const pad3 = 3;
    const offsetY = -(fs + pad12);
    
    // 格式化双单位文本
    const numVal = parseFloat(d.value);
    let cmVal, inchVal;
    
    if (!isNaN(numVal)) {
      const CM_TO_INCH = 1 / 2.54;
      const INCH_TO_CM = 2.54;
      const MM_TO_CM = 0.1;
      const MM_TO_INCH = 1 / 25.4;
      
      switch (d.unit) {
        case 'cm':
          cmVal = numVal; inchVal = numVal * CM_TO_INCH; break;
        case 'in':
          cmVal = numVal * INCH_TO_CM; inchVal = numVal; break;
        case 'mm':
          cmVal = numVal * MM_TO_CM; inchVal = numVal * MM_TO_INCH; break;
        default:
          cmVal = null; inchVal = null;
      }
    }
    
    if (cmVal !== null) {
      // 双行显示：数值+单位分离，单位首字母对齐，保留1位小数
      const cmStr = cmVal.toFixed(1);
      const inchStr = inchVal.toFixed(1);
      
      c.font = `bold ${fs}px sans-serif`;
      c.textAlign = 'left';
      c.textBaseline = 'middle';
      
      const numW1 = c.measureText(cmStr).width;
      const numW2 = c.measureText(inchStr).width;
      const unitW1 = c.measureText('cm').width;
      const unitW2 = c.measureText('inch').width;
      
      const maxNumW = Math.max(numW1, numW2);
      const unitGap = fs * 0.2;
      const totalW = maxNumW + unitGap + Math.max(unitW1, unitW2);
      const bW = totalW + pad10;
      const bH = fs * 2 + pad6 + 4;
      
      // 绘制背景
      if (textBg === 'white') {
        c.fillStyle = 'rgba(255,255,255,0.88)';
        c.beginPath();
        const bx = midX - bW/2, by = midY + offsetY - bH/2;
        c.moveTo(bx + pad3, by);
        c.lineTo(bx + bW - pad3, by);
        c.quadraticCurveTo(bx + bW, by, bx + bW, by + pad3);
        c.lineTo(bx + bW, by + bH - pad3);
        c.quadraticCurveTo(bx + bW, by + bH, bx + bW - pad3, by + bH);
        c.lineTo(bx + pad3, by + bH);
        c.quadraticCurveTo(bx, by + bH, bx, by + bH - pad3);
        c.lineTo(bx, by + pad3);
        c.quadraticCurveTo(bx, by, bx + pad3, by);
        c.closePath();
        c.fill();
      }
      
      const leftEdge = midX - totalW/2;
      const unitStartX = leftEdge + maxNumW + unitGap;
      
      // 第一行：厘米
      const line1Y = midY + offsetY - fs/2 - 2;
      c.fillStyle = '#e53935';
      c.fillText(cmStr, leftEdge + maxNumW - numW1, line1Y);
      c.fillStyle = '#333333';
      c.fillText('cm', unitStartX, line1Y);
      
      // 第二行：英寸
      const line2Y = midY + offsetY + fs/2 + 2;
      c.fillStyle = '#e53935';
      c.fillText(inchStr, leftEdge + maxNumW - numW2, line2Y);
      c.fillStyle = '#333333';
      c.fillText('inch', unitStartX, line2Y);
      
    } else {
      // 其他样式：原有单行文字
      const text = formatDualUnitText(d.value, d.unit);
      c.font = `bold ${fs}px sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      const tw = c.measureText(text).width;
      const bW = tw + pad10, bH = fs + pad6;
      
      if (textBg === 'white') {
        c.fillStyle = 'rgba(255,255,255,0.88)';
        c.beginPath();
        const bx = midX - bW/2, by = midY + offsetY - bH/2;
        c.moveTo(bx + pad3, by);
        c.lineTo(bx + bW - pad3, by);
        c.quadraticCurveTo(bx + bW, by, bx + bW, by + pad3);
        c.lineTo(bx + bW, by + bH - pad3);
        c.quadraticCurveTo(bx + bW, by + bH, bx + bW - pad3, by + bH);
        c.lineTo(bx + pad3, by + bH);
        c.quadraticCurveTo(bx, by + bH, bx, by + bH - pad3);
        c.lineTo(bx, by + pad3);
        c.quadraticCurveTo(bx, by, bx + pad3, by);
        c.closePath();
        c.fill();
      }
      
      c.fillStyle = d.textColor;
      c.fillText(text, midX, midY + offsetY);
    }
  });
}

function formatDualUnitText(value, unit) {
  const numVal = parseFloat(value);
  if (isNaN(numVal)) return value + unit;
  
  const CM_TO_INCH = 1 / 2.54;
  const INCH_TO_CM = 2.54;
  const MM_TO_CM = 0.1;
  const MM_TO_INCH = 1 / 25.4;
  
  let cmVal, inchVal;
  
  switch (unit) {
    case 'cm':
      cmVal = numVal;
      inchVal = numVal * CM_TO_INCH;
      break;
    case 'in':
      cmVal = numVal * INCH_TO_CM;
      inchVal = numVal;
      break;
    case 'mm':
      cmVal = numVal * MM_TO_CM;
      inchVal = numVal * MM_TO_INCH;
      break;
    default:
      return value + unit;
  }
  
  const cmStr = cmVal % 1 === 0 ? cmVal.toString() : cmVal.toFixed(1);
  const inchStr = inchVal % 1 === 0 ? inchVal.toString() : inchVal.toFixed(1);
  
  return `${cmStr}cm / ${inchStr}in`;
}

// ========== 拖拽指示器 ==========

function drawDragIndicator() {
  if (!state.dragState.isDragging || state.dragState.dropIndex === -1) return;
  
  const layouts = getCurrentLayouts();
  
  const gap = state.imageGap * 2;
  const adjustedLayouts = adjustLayoutsAvoidText(adjustLayoutsWithGap(layouts, gap));
  const layout = adjustedLayouts[state.dragState.dropIndex];
  
  if (!layout) return;
  
  const c = getCtx();
  c.save();
  c.strokeStyle = '#3b82f6';
  c.lineWidth = 4;
  c.setLineDash([10, 5]);
  c.strokeRect(layout.x + 2, layout.y + 2, layout.w - 4, layout.h - 4);
  c.restore();
}

// 绘制每个位置的slotType标记
// 绘制活跃图片选中框
function drawActiveImageIndicator(imageIndex) {
  const layouts = getCurrentLayouts();
  const gap = state.imageGap * 2;
  const adjustedLayouts = adjustLayoutsAvoidText(adjustLayoutsWithGap(layouts, gap));
  const layout = adjustedLayouts[imageIndex];
  if (!layout) return;
  
  const c = getCtx();
  c.save();
  c.strokeStyle = '#f59e0b';
  c.lineWidth = 3;
  c.setLineDash([8, 4]);
  c.strokeRect(layout.x + 1, layout.y + 1, layout.w - 2, layout.h - 2);
  c.setLineDash([]);
  
  // 四角标记
  const cornerSize = 12;
  c.strokeStyle = '#f59e0b';
  c.lineWidth = 3;
  c.beginPath(); c.moveTo(layout.x, layout.y + cornerSize); c.lineTo(layout.x, layout.y); c.lineTo(layout.x + cornerSize, layout.y); c.stroke();
  c.beginPath(); c.moveTo(layout.x + layout.w - cornerSize, layout.y); c.lineTo(layout.x + layout.w, layout.y); c.lineTo(layout.x + layout.w, layout.y + cornerSize); c.stroke();
  c.beginPath(); c.moveTo(layout.x, layout.y + layout.h - cornerSize); c.lineTo(layout.x, layout.y + layout.h); c.lineTo(layout.x + cornerSize, layout.y + layout.h); c.stroke();
  c.beginPath(); c.moveTo(layout.x + layout.w - cornerSize, layout.y + layout.h); c.lineTo(layout.x + layout.w, layout.y + layout.h); c.lineTo(layout.x + layout.w, layout.y + layout.h - cornerSize); c.stroke();
  
  c.restore();
}

// 绘制每个位置的slotType标记（在拖拽指示器之后定义）
function drawSlotTypeLabels() {
  const layouts = getCurrentLayouts();
  const gap = state.imageGap * 2;
  const adjustedLayouts = adjustLayoutsAvoidText(adjustLayoutsWithGap(layouts, gap));
  
  const typeLabels = { scene: '场景', white: '白底', set: '套装', detail: '细节' };
  const typeColors = { scene: '#10b981', white: '#6b7280', set: '#8b5cf6', detail: '#f59e0b' };
  
  const c = getCtx();
  c.save();
  
  adjustedLayouts.forEach((layout, i) => {
    if (i >= state.slotTypes.length) return;
    const slotType = state.slotTypes[i];
    if (!slotType || !typeLabels[slotType]) return;
    
    const label = typeLabels[slotType];
    const color = typeColors[slotType];
    
    // 在位置左上角绘制小标签
    c.font = 'bold 18px sans-serif';
    const textW = c.measureText(label).width;
    const padX = 6, padY = 3;
    const tagW = textW + padX * 2;
    const tagH = 18 + padY * 2;
    
    // 背景
    c.fillStyle = color;
    c.globalAlpha = 0.85;
    roundRect(c, layout.x + 4, layout.y + 4, tagW, tagH, 4);
    c.fill();
    
    // 文字
    c.globalAlpha = 1;
    c.fillStyle = '#ffffff';
    c.textAlign = 'left';
    c.textBaseline = 'top';
    c.fillText(label, layout.x + 4 + padX, layout.y + 4 + padY);
  });
  
  c.restore();
}

// ========== 主渲染函数 ==========

function render() {
  const targetCtx = getCtx();
  targetCtx.fillStyle = state.bgColor;
  targetCtx.fillRect(0, 0, 1024, 1024);
  
  // 旋转/镜像已整合到 adjustLayoutsTransform/transformPoint 中，只变换遮罩，不变换图片
  
  if (state.templateCount === 2 && state.twoImageStyle === 'circle') {
    renderCircleStyle();
  } else if (state.templateCount === 2 && state.twoImageStyle === 'detail') {
    renderDetailMask2Style();
  } else if (state.templateCount === 2 && state.twoImageStyle === 'card') {
    renderCardMask2Style();
  } else if (state.templateCount === 4 && state.maskStyle === 'irregular') {
    renderIrregularMask4Style();
  } else if (state.templateCount === 4 && state.maskStyle === 'useDisplay') {
    renderUseDisplayStyle();
  } else if (state.templateCount === 4 && state.maskStyle === 'mainDetail') {
    renderMainDetail4Style();
  } else {
    renderNormalStyle();
  }
  
  // 叠加涂抹遮罩层（在文字/LOGO之前，这样涂抹不会遮住文字）
  if (typeof compositeMaskCanvas === 'function') { compositeMaskCanvas(targetCtx); }
  
  if (state.textLayerVisible && (state.mainTitle || state.subTitle)) { drawText(); }
  
  // 绘制数量文字
  drawNumberText();
  
  // 绘制数量文字选中框（仅预览时显示）
  if (!window._renderCtx && state.numberTextVisible && state.numberText) {
    const nbb = getNumberTextBBox();
    if (nbb) {
      const c = getCtx();
      c.save();
      c.strokeStyle = '#8b5cf6';
      c.lineWidth = 1.5;
      c.setLineDash([4, 3]);
      c.strokeRect(nbb.x, nbb.y, nbb.w, nbb.h);
      c.setLineDash([]);
      c.restore();
    }
  }
  
  // 绘制文字选中框和控制点（仅预览时显示，导出时不显示）
  if (!window._renderCtx && state.textLayerVisible && (state.mainTitle || state.subTitle)) {
    const bb = getTextBoundingBox();
    if (bb) {
      const c = getCtx();
      c.save();
      
      // 选中框
      c.strokeStyle = '#3b82f6';
      c.lineWidth = 2;
      c.setLineDash([6, 4]);
      c.strokeRect(bb.x, bb.y, bb.w, bb.h);
      c.setLineDash([]);
      
      // 8个控制点
      const handleSize = 8;
      const handles = getTextResizeHandles(bb, handleSize);
      handles.forEach(h => {
        c.fillStyle = '#ffffff';
        c.strokeStyle = '#3b82f6';
        c.lineWidth = 2;
        c.fillRect(h.x - handleSize/2, h.y - handleSize/2, handleSize, handleSize);
        c.strokeRect(h.x - handleSize/2, h.y - handleSize/2, handleSize, handleSize);
      });
      
      c.restore();
    }
  }
  
  if (state.logoLayerVisible && state.logo) { drawLogo(); }
  
  if (state.dimLayerVisible && state.dimensions.length > 0 && (!konvaStage || window._renderCtx)) { drawDimensionsOnCanvas(); }
  
  // 以下UI元素（拖拽指示器、slotType标签、选中框）已使用 adjustLayoutsTransform，自动跟随遮罩变换
  
  if (state.dragState.isDragging) { drawDragIndicator(); }
  
  // 绘制每个位置的slotType标记
  if (!window._renderCtx && state.slotTypes && state.slotTypes.length > 0) {
    drawSlotTypeLabels();
  }
  
  // 绘制活跃图片选中框（仅预览时显示）
  if (!window._renderCtx && state.multiSelectedIndices && state.multiSelectedIndices.length > 0) {
    state.multiSelectedIndices.forEach(idx => {
      if (idx >= 0 && idx < state.templateCount) {
        drawActiveImageIndicator(idx);
      }
    });
  }
}

// ========== 各样式渲染函数 ==========

function renderNormalStyle() {
  const template = templates[state.templateCount];
  if (!template) return;
  
  let layouts = template.layouts;
  
  if (state.templateCount === 5 && state.fiveImageStyle === 'big' && template.layoutsBig) {
    layouts = template.layoutsBig;
  } else if (state.templateCount === 6 && state.sixImageStyle === 'big' && template.layoutsBig) {
    layouts = template.layoutsBig;
  }
  
  const gap = state.imageGap * 2;
  const originalLayouts = adjustLayoutsWithGap(layouts, gap);
  const avoidedLayouts = adjustLayoutsAvoidText(originalLayouts);
  const hasAvoid = originalLayouts !== avoidedLayouts;
  
  const c = getCtx();
  originalLayouts.forEach((origLayout, i) => {
    const maskLayout = hasAvoid ? avoidedLayouts[i] : origLayout;
    
    if (state.images[i]) {
      c.save();
      // 用避让后的布局做遮罩裁剪
      if (hasAvoid || state.imageRadius > 0) {
        if (state.imageRadius > 0) {
          c.beginPath();
          roundRect(c, maskLayout.x, maskLayout.y, maskLayout.w, maskLayout.h, state.imageRadius * 2);
          c.clip();
        } else {
          c.beginPath();
          c.rect(maskLayout.x, maskLayout.y, maskLayout.w, maskLayout.h);
          c.clip();
        }
      }
      // 用原始布局绘制图片（不变形）
      drawImageWithEffects(state.images[i], origLayout.x, origLayout.y, origLayout.w, origLayout.h);
      c.restore();
    } else {
      c.fillStyle = '#e5e7eb';
      if (state.imageRadius > 0) { roundRect(c, maskLayout.x, maskLayout.y, maskLayout.w, maskLayout.h, state.imageRadius * 2); } else { c.fillRect(maskLayout.x, maskLayout.y, maskLayout.w, maskLayout.h); }
      c.fillStyle = '#9ca3af';
      c.font = 'bold 32px sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(`${i + 1}`, maskLayout.x + maskLayout.w / 2, maskLayout.y + maskLayout.h / 2);
    }
  });
}

function renderCircleStyle() {
  const c = getCtx();
  
  if (state.images[0]) {
    drawImageCover(state.images[0], 0, 0, 1024, 1024);
  } else {
    c.fillStyle = '#e5e7eb';
    c.fillRect(0, 0, 1024, 1024);
    c.fillStyle = '#9ca3af';
    c.font = 'bold 48px sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('主图', 512, 512);
  }
  
  const size = state.circleSize;
  const margin = 50;
  const borderWidth = state.circleBorderWidth;
  
  let origCx, origCy;
  if (state.circlePosition === 'right') {
    origCx = 1024 - margin - size / 2;
    origCy = 1024 - margin - size / 2;
  } else {
    origCx = margin + size / 2;
    origCy = 1024 - margin - size / 2;
  }
  
  // 应用布局偏移/缩放到圆形位置
  const tp = transformPoint(origCx, origCy);
  const ts = transformSize(size, size);
  const cx = tp.x;
  const cy = tp.y;
  const newSize = ts.w; // 缩放后的圆形尺寸
  
  c.save();
  c.beginPath();
  c.arc(cx, cy, newSize / 2, 0, Math.PI * 2);
  c.clip();
  
  if (state.images[1]) {
    drawImageCoverInCircle(state.images[1], cx - newSize / 2, cy - newSize / 2, newSize, newSize);
  } else {
    c.fillStyle = '#d1d5db';
    c.fill();
    c.fillStyle = '#9ca3af';
    c.font = 'bold 32px sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('副图', cx, cy);
  }
  
  c.restore();
  
  c.beginPath();
  c.arc(cx, cy, newSize / 2, 0, Math.PI * 2);
  c.strokeStyle = state.circleBorderColor;
  c.lineWidth = borderWidth;
  c.stroke();
}

function renderDetailMask2Style() {
  const bg = state.detailBgColor;
  const cardColor = state.detailCardColor;
  const titleColor = state.detailTitleColor;
  const textColor = state.detailTextColor;
  const title = state.detailTitle || 'DETAILS';
  const subtitle = state.detailSubtitle || 'THEME COPY';
  const text1Title = state.detailText1Title || '01.DETAILS';
  const text2Title = state.detailText2Title || '02.DETAILS';
  const text1Desc = state.detailText1Desc || '';
  const text2Desc = state.detailText2Desc || '';
  
  const c = getCtx();
  c.fillStyle = bg;
  c.fillRect(0, 0, 1024, 1024);
  
  const svgW = 995, svgH = 998;
  const scale = Math.min(1024 / svgW, 1024 / svgH);
  const offsetX = (1024 - svgW * scale) / 2;
  const offsetY = 0;
  
  // 原始坐标（用于图片绘制）
  function tx(x) { return x * scale + offsetX; }
  function ty(y) { return y * scale + offsetY; }
  // 变换后坐标（用于遮罩/边框）- 使用 transformPoint 包含所有变换
  function mx(x) { return transformPoint(tx(x), ty(x)).x; }
  function my(y) { return transformPoint(tx(y), ty(y)).y; }
  
  c.font = 'bold 100px sans-serif';
  c.fillStyle = titleColor;
  c.textAlign = 'left';
  c.textBaseline = 'top';
  c.fillText(title, mx(38.999), my(99.373));
  
  // 左侧遮罩（图2）
  c.save();
  c.beginPath();
  c.moveTo(mx(522.55), my(406.17));
  c.lineTo(mx(522.55), my(194.14));
  c.lineTo(mx(190.39), my(194.14));
  c.bezierCurveTo(mx(105.69), my(194.14), mx(37.03), my(262.8), mx(37.03), my(347.5));
  c.lineTo(mx(37.03), my(817.76));
  c.lineTo(mx(369.19), my(817.76));
  c.bezierCurveTo(mx(410.01), my(817.76), mx(447.1), my(801.81), mx(474.58), my(775.8));
  c.lineTo(mx(474.58), my(517.58));
  c.bezierCurveTo(mx(474.58), my(473.7), mx(493.01), my(434.13), mx(522.55), my(406.17));
  c.closePath();
  c.clip();
  
  if (state.images[0]) {
    drawImageCover(state.images[0], tx(0), ty(0), tx(svgW) - offsetX, ty(svgH) - offsetY);
  } else {
    c.fillStyle = cardColor;
    c.fillRect(tx(0), ty(0), tx(svgW), ty(svgH));
  }
  
  c.restore();
  
  c.beginPath();
  c.moveTo(mx(522.55), my(406.17));
  c.lineTo(mx(522.55), my(194.14));
  c.lineTo(mx(190.39), my(194.14));
  c.bezierCurveTo(mx(105.69), my(194.14), mx(37.03), my(262.8), mx(37.03), my(347.5));
  c.lineTo(mx(37.03), my(817.76));
  c.lineTo(mx(369.19), my(817.76));
  c.bezierCurveTo(mx(410.01), my(817.76), mx(447.1), my(801.81), mx(474.58), my(775.8));
  c.lineTo(mx(474.58), my(517.58));
  c.bezierCurveTo(mx(474.58), my(473.7), mx(493.01), my(434.13), mx(522.55), my(406.17));
  c.closePath();
  c.strokeStyle = bg;
  c.lineWidth = 5 * scale;
  c.stroke();
  
  // 右侧遮罩（图1）
  c.save();
  c.beginPath();
  c.moveTo(mx(627.94), my(364.22));
  c.bezierCurveTo(mx(587.12), my(364.22), mx(550.03), my(380.17), mx(522.55), my(406.17));
  c.bezierCurveTo(mx(493.01), my(434.13), mx(474.58), my(473.7), mx(474.58), my(517.58));
  c.lineTo(mx(474.58), my(775.8));
  c.lineTo(mx(474.58), my(966.03));
  c.lineTo(mx(806.74), my(966.03));
  c.bezierCurveTo(mx(891.44), my(966.03), mx(960.1), my(897.37), mx(960.1), my(812.67));
  c.lineTo(mx(960.1), my(364.22));
  c.lineTo(mx(627.94), my(364.22));
  c.closePath();
  c.clip();
  
  if (state.images[1]) {
    drawImageCover(state.images[1], tx(0), ty(0), tx(svgW) - offsetX, ty(svgH) - offsetY);
  } else {
    c.fillStyle = cardColor;
    c.fillRect(tx(0), ty(0), tx(svgW), ty(svgH));
  }
  
  c.restore();
  
  c.beginPath();
  c.moveTo(mx(627.94), my(364.22));
  c.bezierCurveTo(mx(587.12), my(364.22), mx(550.03), my(380.17), mx(522.55), my(406.17));
  c.bezierCurveTo(mx(493.01), my(434.13), mx(474.58), my(473.7), mx(474.58), my(517.58));
  c.lineTo(mx(474.58), my(775.8));
  c.lineTo(mx(474.58), my(966.03));
  c.lineTo(mx(806.74), my(966.03));
  c.bezierCurveTo(mx(891.44), my(966.03), mx(960.1), my(897.37), mx(960.1), my(812.67));
  c.lineTo(mx(960.1), my(364.22));
  c.lineTo(mx(627.94), my(364.22));
  c.closePath();
  c.strokeStyle = bg;
  c.lineWidth = 5 * scale;
  c.stroke();
  
  c.font = 'bold 42px sans-serif';
  c.fillStyle = textColor;
  c.textAlign = 'left';
  c.textBaseline = 'top';
  c.fillText(text1Title, mx(600.330), my(216.122));
  
  c.font = '20px sans-serif';
  c.fillStyle = textColor;
  const lines1 = wrapTextByWords(c, text1Desc, 300);
  lines1.forEach((line, i) => {
    c.fillText(line, mx(602.085), my(289.437) + i * 24);
  });
  
  c.font = 'bold 42px sans-serif';
  c.fillStyle = textColor;
  c.textAlign = 'left';
  c.textBaseline = 'top';
  c.fillText(text2Title, mx(82.110), my(838.106));
  
  c.font = '20px sans-serif';
  c.fillStyle = textColor;
  const lines2 = wrapTextByWords(c, text2Desc, 320);
  lines2.forEach((line, i) => {
    c.fillText(line, mx(82.301), my(911.430) + i * 24);
  });
}

function renderCardMask2Style() {
  const bg = state.cardBgColor;
  const title = state.cardTitle || 'Original Color Presented';
  const subtitle = state.cardSubtitle || '';
  const titleColor = state.cardTitleColor;
  const subtitleColor = state.cardSubtitleColor;
  const radius = state.cardRadius * 2;
  
  const c = getCtx();
  c.fillStyle = bg;
  c.fillRect(0, 0, 1024, 1024);
  
  // 使用 transformPoint/transformSize 包含所有变换
  function mx(x) { return transformPoint(x, 0).x; }
  function my(y) { return transformPoint(0, y).y; }
  function mw(w) { return transformSize(w, 0).w; }
  function mh(h) { return transformSize(0, h).h; }
  
  c.font = 'bold 36px sans-serif';
  c.fillStyle = titleColor;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(title, mx(512), my(55));
  
  if (subtitle) {
    c.font = '18px sans-serif';
    c.fillStyle = subtitleColor;
    const subLines = wrapTextByWords(c, subtitle, 700);
    subLines.forEach((line, i) => {
      c.fillText(line, mx(512), my(90) + i * 24);
    });
  }
  
  const cardW = 440;
  const cardH = 780;
  const gap = 40;
  const startX = (1024 - cardW * 2 - gap) / 2;
  const startY = 150;
  
  for (let i = 0; i < 2; i++) {
    const origCx = startX + i * (cardW + gap);
    const maskCx = mx(origCx);
    const maskCy = my(startY);
    const maskW = mw(cardW);
    const maskH = mh(cardH);
    
    c.save();
    roundRect(c, maskCx, maskCy, maskW, maskH, radius);
    c.clip();
    
    c.fillStyle = '#d4d4d4';
    c.fillRect(maskCx, maskCy, maskW, maskH);
    
    if (state.images[i]) {
      // 用原始坐标绘制图片（不变形）
      drawImageCover(state.images[i], origCx, startY, cardW, cardH);
    }
    
    c.restore();
    
    c.beginPath();
    roundRect(c, maskCx, maskCy, maskW, maskH, radius);
    c.strokeStyle = '#ffffff';
    c.lineWidth = 3;
    c.stroke();
  }
}

function renderIrregularMask4Style() {
  const bg = state.maskBgColor;
  const cardColor = state.maskCardColor;
  const numberBg = state.maskNumberBg;
  const textColor = state.maskTextColor;
  const title = state.maskTitle || 'EASY TO USE';
  const texts = state.maskTexts || ['Step 1', 'Step 2', 'Step 3', 'Step 4'];
  
  const c = getCtx();
  c.fillStyle = bg;
  c.fillRect(0, 0, 1024, 1024);
  
  // 使用 transformPoint/transformSize 包含所有变换
  function mx(x) { return transformPoint(x, 0).x; }
  function my(y) { return transformPoint(0, y).y; }
  function mw(w) { return transformSize(w, 0).w; }
  function mh(h) { return transformSize(0, h).h; }
  
  c.font = 'bold 56px sans-serif';
  c.fillStyle = textColor;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(title, mx(512), my(55));
  
  const cardW = 480;
  const cardH = 400;
  const gapX = 32;
  const gapY = 30;
  const startY = 110;
  
  const positions = [
    { x: 32, y: startY },
    { x: 512, y: startY },
    { x: 32, y: startY + cardH + gapY },
    { x: 512, y: startY + cardH + gapY }
  ];
  
  positions.forEach((pos, i) => {
    const maskX = mx(pos.x);
    const maskY = my(pos.y);
    const maskW = mw(cardW);
    const maskH = mh(cardH);
    
    c.save();
    
    c.beginPath();
    if (i === 0) {
      drawIrregularPathTL(c, maskX, maskY, maskW, maskH);
    } else if (i === 1) {
      drawIrregularPathTR(c, maskX, maskY, maskW, maskH);
    } else if (i === 2) {
      drawIrregularPathBL(c, maskX, maskY, maskW, maskH);
    } else {
      drawIrregularPathBR(c, maskX, maskY, maskW, maskH);
    }
    c.closePath();
    c.clip();
    
    c.fillStyle = cardColor;
    c.fillRect(maskX, maskY, maskW, maskH);
    
    if (state.images[i]) {
      // 用原始坐标绘制图片（不变形）
      drawImageCover(state.images[i], pos.x, pos.y, cardW, cardH);
    }
    
    c.restore();
    
    c.beginPath();
    if (i === 0) {
      drawIrregularPathTL(c, maskX, maskY, maskW, maskH);
    } else if (i === 1) {
      drawIrregularPathTR(c, maskX, maskY, maskW, maskH);
    } else if (i === 2) {
      drawIrregularPathBL(c, maskX, maskY, maskW, maskH);
    } else {
      drawIrregularPathBR(c, maskX, maskY, maskW, maskH);
    }
    c.closePath();
    c.strokeStyle = bg;
    c.lineWidth = 8;
    c.stroke();
    
    const numPos = [
      { x: maskX + mw(40), y: maskY + mh(40) },
      { x: maskX + maskW - mw(40), y: maskY + mh(40) },
      { x: maskX + mw(40), y: maskY + maskH - mh(40) },
      { x: maskX + maskW - mw(40), y: maskY + maskH - mh(40) }
    ];
    
    c.beginPath();
    c.arc(numPos[i].x, numPos[i].y, 28, 0, Math.PI * 2);
    c.fillStyle = numberBg;
    c.fill();
    c.strokeStyle = '#ffffff';
    c.lineWidth = 2;
    c.stroke();
    
    c.font = 'bold 24px sans-serif';
    c.fillStyle = textColor;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText((i + 1).toString(), numPos[i].x, numPos[i].y);
    
    c.font = 'bold 18px sans-serif';
    c.fillStyle = textColor;
    c.textAlign = 'left';
    c.textBaseline = 'bottom';
    const textX = maskX + mw(20);
    const textY = maskY + maskH - mh(15);
    c.fillText(texts[i] || '', textX, textY);
  });
}

function drawIrregularPathTL(ctx, x, y, w, h) {
  const r = 30;
  const curveSize = 80;
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - curveSize, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + curveSize);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + curveSize, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - curveSize);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

function drawIrregularPathTR(ctx, x, y, w, h) {
  const r = 30;
  const curveSize = 80;
  ctx.moveTo(x + curveSize, y);
  ctx.quadraticCurveTo(x, y, x, y + curveSize);
  ctx.lineTo(x, y + h - r);
  ctx.quadraticCurveTo(x, y + h, x + r, y + h);
  ctx.lineTo(x + w - r, y + h);
  ctx.quadraticCurveTo(x + w, y + h, x + w, y + h - r);
  ctx.lineTo(x + w, y + curveSize);
  ctx.quadraticCurveTo(x + w, y, x + w - curveSize, y);
}

function drawIrregularPathBL(ctx, x, y, w, h) {
  const r = 30;
  const curveSize = 80;
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - curveSize, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + curveSize);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + curveSize, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - curveSize);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

function drawIrregularPathBR(ctx, x, y, w, h) {
  const r = 30;
  const curveSize = 80;
  ctx.moveTo(x + curveSize, y);
  ctx.quadraticCurveTo(x, y, x, y + curveSize);
  ctx.lineTo(x, y + h - r);
  ctx.quadraticCurveTo(x, y + h, x + r, y + h);
  ctx.lineTo(x + w - r, y + h);
  ctx.quadraticCurveTo(x + w, y + h, x + w, y + h - r);
  ctx.lineTo(x + w, y + curveSize);
  ctx.quadraticCurveTo(x + w, y, x + w - curveSize, y);
}

function renderUseDisplayStyle() {
  const template = templates[4];
  if (!template || !template.layoutsUseDisplay) return;
  
  const c = getCtx();
  
  const title = state.useDisplayTitle || 'Use Display';
  const bgColor = state.useDisplayBgColor || '#f5f0e1';
  const cardBgColor = state.useDisplayCardBg || '#e8e3d4';
  const titleColor = state.useDisplayTitleColor || '#333333';
  const borderColor = state.useDisplayBorderColor || '#d4c9a8';
  
  c.fillStyle = bgColor;
  c.fillRect(0, 0, 1024, 1024);
  
  c.font = 'bold 48px sans-serif';
  c.fillStyle = titleColor;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(title, 512, 50);
  
  const layouts = template.layoutsUseDisplay;
  const gap = state.imageGap * 2;
  const originalLayouts = adjustLayoutsWithGap(layouts, gap);
  const avoidedLayouts = adjustLayoutsAvoidText(originalLayouts);
  const hasAvoid = originalLayouts !== avoidedLayouts;
  
  originalLayouts.forEach((origLayout, i) => {
    const maskLayout = hasAvoid ? avoidedLayouts[i] : origLayout;
    c.save();
    // 用避让后的布局做遮罩
    roundRect(c, maskLayout.x, maskLayout.y, maskLayout.w, maskLayout.h, 12);
    c.fillStyle = cardBgColor;
    c.fill();
    c.strokeStyle = borderColor;
    c.lineWidth = 2;
    c.stroke();
    c.clip();
    
    if (state.images[i]) {
      // 用原始布局绘制图片（不变形）
      drawImageCover(state.images[i], origLayout.x, origLayout.y, origLayout.w, origLayout.h);
    } else {
      c.fillStyle = '#d4cfc0';
      c.fillRect(maskLayout.x, maskLayout.y, maskLayout.w, maskLayout.h);
      c.fillStyle = '#a09a88';
      c.font = '24px sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('📷', maskLayout.x + maskLayout.w / 2, maskLayout.y + maskLayout.h / 2);
    }
    
    c.restore();
    
    roundRect(c, maskLayout.x, maskLayout.y, maskLayout.w, maskLayout.h, 12);
    c.strokeStyle = borderColor;
    c.lineWidth = 2;
    c.stroke();
  });
}

function renderMainDetail4Style() {
  const template = templates[4];
  if (!template || !template.layoutsMainDetail) return;
  
  const c = getCtx();
  
  const bgColor = state.mainDetailBgColor || '#f5f5f5';
  const mainRadius = state.mainDetailMainRadius || 16;
  const detailRadius = state.mainDetailDetailRadius || 12;
  const mainBorderColor = state.mainDetailMainBorder || '#e0e0e0';
  const detailBorderColor = state.mainDetailDetailBorder || '#e0e0e0';
  
  c.fillStyle = bgColor;
  c.fillRect(0, 0, 1024, 1024);
  
  const layouts = template.layoutsMainDetail;
  const gap = state.imageGap * 2;
  const originalLayouts = adjustLayoutsWithGap(layouts, gap);
  const avoidedLayouts = adjustLayoutsAvoidText(originalLayouts);
  const hasAvoid = originalLayouts !== avoidedLayouts;
  
  originalLayouts.forEach((origLayout, i) => {
    const maskLayout = hasAvoid ? avoidedLayouts[i] : origLayout;
    c.save();
    
    if (i === 0) {
      roundRect(c, maskLayout.x, maskLayout.y, maskLayout.w, maskLayout.h, mainRadius);
      c.fillStyle = '#ffffff';
      c.fill();
      c.strokeStyle = mainBorderColor;
      c.lineWidth = 2;
      c.stroke();
    } else {
      roundRect(c, maskLayout.x, maskLayout.y, maskLayout.w, maskLayout.h, detailRadius);
      c.fillStyle = '#ffffff';
      c.fill();
      c.strokeStyle = detailBorderColor;
      c.lineWidth = 1.5;
      c.stroke();
    }
    
    c.clip();
    
    if (state.images[i]) {
      // 用原始布局绘制图片（不变形）
      drawImageCover(state.images[i], origLayout.x, origLayout.y, origLayout.w, origLayout.h);
    } else {
      c.fillStyle = '#eeeeee';
      c.fillRect(maskLayout.x, maskLayout.y, maskLayout.w, maskLayout.h);
      c.fillStyle = '#bbbbbb';
      c.font = i === 0 ? 'bold 28px sans-serif' : '20px sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('📷', maskLayout.x + maskLayout.w / 2, maskLayout.y + maskLayout.h / 2);
    }
    
    c.restore();
    
    if (i === 0) {
      roundRect(c, maskLayout.x, maskLayout.y, maskLayout.w, maskLayout.h, mainRadius);
      c.strokeStyle = mainBorderColor;
      c.lineWidth = 2;
      c.stroke();
    } else {
      roundRect(c, maskLayout.x, maskLayout.y, maskLayout.w, maskLayout.h, detailRadius);
      c.strokeStyle = detailBorderColor;
      c.lineWidth = 1.5;
      c.stroke();
    }
  });
}

// ========== 导出 ==========

function exportImage(format = 'png', quality = 0.95) {
  console.log('开始导出...', format);
  
  if (state.images.length === 0) { 
    showToast('请先上传图片', true); 
    return; 
  }
  
  console.log('图片数量:', state.images.length);
  
  const EXPORT_SZ = state.exportSize;
  const SCALE = EXPORT_SZ / RENDER_SZ;
  
  console.log('导出尺寸:', EXPORT_SZ, '缩放比例:', SCALE);
  
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = EXPORT_SZ; 
  tempCanvas.height = EXPORT_SZ;
  const tempCtx = tempCanvas.getContext('2d');
  
  if (format === 'jpg' || format === 'webp') {
    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, EXPORT_SZ, EXPORT_SZ);
  }
  
  const origDisplayScale = displayScale;
  const origDimensions = state.dimensions;
  window._renderCtx = tempCtx;
  
  tempCtx.save();
  tempCtx.scale(SCALE, SCALE);
  
  state.dimensions = origDimensions.map(d => ({
    ...d,
    x1: d.x1,
    y1: d.y1,
    x2: d.x2,
    y2: d.y2
  }));
  displayScale = 1;
  
  try {
    console.log('开始渲染...');
    render();
    console.log('渲染完成');
  } catch (e) {
    console.error('Export error:', e);
    showToast('导出失败: ' + e.message, true);
    window._renderCtx = null;
    state.dimensions = origDimensions;
    displayScale = origDisplayScale;
    return;
  }
  
  tempCtx.restore();
  window._renderCtx = null;
  state.dimensions = origDimensions;
  displayScale = origDisplayScale;
  
  console.log('生成下载链接...');
  const link = document.createElement('a');
  link.download = `main-image-${Date.now()}.${format}`;
  const mimeType = format === 'jpg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
  link.href = tempCanvas.toDataURL(mimeType, quality);
  
  console.log('触发下载...');
  link.click();
  
  showToast('导出成功！');
  console.log('导出完成');
}

function updateExportSize() {
  // 兼容旧调用，优先从弹窗select读取
  const select = document.getElementById('exportSizeSelectModal') || document.getElementById('exportSizeSelect');
  if (select) state.exportSize = parseInt(select.value);
  
  // 更新导出按钮文本
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) {
    exportBtn.innerHTML = `<i data-lucide="camera" class="icon-inline"></i> 导出图片 (${state.exportSize}×${state.exportSize})`;
    if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [exportBtn] });
  }
  
  // 更新预览标题
  const previewTitle = document.getElementById('previewTitle');
  if (previewTitle) {
    previewTitle.textContent = `输出尺寸: ${state.exportSize} × ${state.exportSize}`;
  }
}
