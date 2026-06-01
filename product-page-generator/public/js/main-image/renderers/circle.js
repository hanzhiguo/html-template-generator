import { state } from '../core/state.js';
import { getCtx } from '../core/canvas.js';
import { roundRect } from '../utils/drawing.js';

export function renderCircleStyle() {
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
  
  let cx, cy;
  if (state.circlePosition === 'right') {
    cx = 1024 - margin - size / 2;
    cy = 1024 - margin - size / 2;
  } else {
    cx = margin + size / 2;
    cy = 1024 - margin - size / 2;
  }
  
  c.save();
  c.beginPath();
  c.arc(cx, cy, size / 2, 0, Math.PI * 2);
  c.clip();
  
  if (state.images[1]) {
    drawImageCoverInCircle(state.images[1], cx - size / 2, cy - size / 2, size, size);
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
  c.arc(cx, cy, size / 2, 0, Math.PI * 2);
  c.strokeStyle = state.circleBorderColor;
  c.lineWidth = borderWidth;
  c.stroke();
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

function drawImageCoverInCircle(imgObj, x, y, w, h) {
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
  c.drawImage(img, 0, 0, img.width, img.height, drawX, drawY, drawW, drawH);
}
