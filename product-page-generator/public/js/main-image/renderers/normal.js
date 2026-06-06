import { S, getLibraryItem } from '../core/state.js';
import { templates } from '../config/templates.js';
import { getCtx } from '../core/canvas.js';
import { roundRect, adjustLayoutsWithGap } from '../utils/drawing.js';

export function renderNormalStyle() {
  const template = templates[S.templateCount];
  if (!template) return;

  const layouts = template.layouts;
  const gap = S.imageGap * 2;
  const adjustedLayouts = adjustLayoutsWithGap(layouts, gap);

  adjustedLayouts.forEach((layout, i) => {
    const slot = S.slots[i];
    if (slot && slot.libraryId) {
      const item = getLibraryItem(slot.libraryId);
      if (item) {
        drawImageCover(item.img, layout.x, layout.y, layout.w, layout.h, slot.scale, slot.offsetX, slot.offsetY);
        return;
      }
    }
    // 空槽位
    const c = getCtx();
    c.fillStyle = '#e5e7eb';
    if (S.imageRadius > 0) {
      roundRect(c, layout.x, layout.y, layout.w, layout.h, S.imageRadius * 2);
      c.fill();
    } else {
      c.fillRect(layout.x, layout.y, layout.w, layout.h);
    }
    c.fillStyle = '#9ca3af';
    c.font = 'bold 32px sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(`${i + 1}`, layout.x + layout.w / 2, layout.y + layout.h / 2);
  });
}

export function drawImageCover(img, x, y, w, h, scale = 1, offsetX = 0, offsetY = 0) {
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

  const drawX = x + (w - drawW) / 2 - offsetX;
  const drawY = y + (h - drawH) / 2 - offsetY;

  const c = getCtx();
  c.save();
  if (S.imageRadius > 0) {
    roundRect(c, x, y, w, h, S.imageRadius * 2);
    c.clip();
  } else {
    c.beginPath();
    c.rect(x, y, w, h);
    c.clip();
  }

  c.drawImage(img, 0, 0, img.width, img.height, drawX, drawY, drawW, drawH);
  c.restore();
}
