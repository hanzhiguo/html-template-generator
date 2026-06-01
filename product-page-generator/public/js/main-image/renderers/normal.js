import { state } from '../core/state.js';
import { templates } from '../config/templates.js';
import { getCtx } from '../core/canvas.js';
import { roundRect, adjustLayoutsWithGap } from '../utils/drawing.js';

export function renderNormalStyle() {
  const template = templates[state.templateCount];
  if (!template) return;
  
  let layouts = template.layouts;
  
  if (state.templateCount === 5 && state.fiveImageStyle === 'big' && template.layoutsBig) {
    layouts = template.layoutsBig;
  } else if (state.templateCount === 6 && state.sixImageStyle === 'big' && template.layoutsBig) {
    layouts = template.layoutsBig;
  }
  
  const gap = state.imageGap * 2;
  const adjustedLayouts = adjustLayoutsWithGap(layouts, gap);
  
  adjustedLayouts.forEach((layout, i) => {
    if (state.images[i]) {
      drawImageWithEffects(state.images[i], layout.x, layout.y, layout.w, layout.h);
    } else {
      const c = getCtx();
      c.fillStyle = '#e5e7eb';
      if (state.imageRadius > 0) { roundRect(c, layout.x, layout.y, layout.w, layout.h, state.imageRadius * 2); } else { c.fillRect(layout.x, layout.y, layout.w, layout.h); }
      c.fillStyle = '#9ca3af';
      c.font = 'bold 32px sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(`${i + 1}`, layout.x + layout.w / 2, layout.y + layout.h / 2);
    }
  });
}

function drawImageWithEffects(imgObj, x, y, w, h) {
  drawImageCover(imgObj, x, y, w, h);
}

function drawImageCover(imgObj, x, y, w, h) {
  const img = imgObj.img || imgObj;
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
