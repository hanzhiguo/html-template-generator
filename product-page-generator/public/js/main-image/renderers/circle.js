import { S, getLibraryItem } from '../core/state.js';
import { getCtx } from '../core/canvas.js';
import { drawImageCover } from './normal.js';

export function renderCircleStyle() {
  const c = getCtx();

  // 主图
  const slot0 = S.slots[0];
  if (slot0 && slot0.libraryId) {
    const item = getLibraryItem(slot0.libraryId);
    if (item) drawImageCover(item.img, 0, 0, 1024, 1024, slot0.scale, slot0.offsetX, slot0.offsetY);
  } else {
    c.fillStyle = '#e5e7eb';
    c.fillRect(0, 0, 1024, 1024);
    c.fillStyle = '#9ca3af';
    c.font = 'bold 48px sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('主图', 512, 512);
  }

  // 圆形副图
  const size = S.circleSize || 300;
  const margin = 50;
  const borderWidth = S.circleBorderWidth || 8;
  const position = S.circlePosition || 'right';

  let cx, cy;
  if (position === 'right') {
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

  const slot1 = S.slots[1];
  if (slot1 && slot1.libraryId) {
    const item = getLibraryItem(slot1.libraryId);
    if (item) {
      const img = item.img;
      const scale = slot1.scale || 1;
      const imgRatio = img.width / img.height;
      let drawW = size, drawH = size;
      if (imgRatio > 1) drawH = size / imgRatio;
      else drawW = size * imgRatio;
      drawW *= scale; drawH *= scale;
      c.drawImage(img, cx - drawW / 2 - (slot1.offsetX || 0), cy - drawH / 2 - (slot1.offsetY || 0), drawW, drawH);
    }
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
  c.strokeStyle = S.circleBorderColor || '#ffffff';
  c.lineWidth = borderWidth;
  c.stroke();
}
