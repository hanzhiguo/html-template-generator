import { S } from '../core/state.js';
import { presets } from '../config/presets.js';
import { getCtx } from '../core/canvas.js';
import { roundRect, wrapText } from '../utils/drawing.js';

export function drawText() {
  const preset = presets[S.preset];
  const titleSize = S.titleSize;
  const subtitleSize = Math.max(16, Math.floor(titleSize * 0.5));
  const c = getCtx();
  c.save();

  const maxWidth = preset.textAlign === 'center' ? 900 :
                   preset.textAlign === 'right' ? preset.textX - 60 :
                   1024 - preset.textX - 60;

  c.font = `${S.bold ? 'bold' : 'normal'} ${titleSize}px sans-serif`;
  const titleLines = wrapText(c, S.mainTitle || '', maxWidth);
  c.font = `normal ${subtitleSize}px sans-serif`;
  const subtitleLines = wrapText(c, S.subTitle || '', maxWidth);

  let maxLineWidth = 0;
  c.font = `${S.bold ? 'bold' : 'normal'} ${titleSize}px sans-serif`;
  titleLines.forEach(line => { maxLineWidth = Math.max(maxLineWidth, c.measureText(line).width); });
  c.font = `normal ${subtitleSize}px sans-serif`;
  subtitleLines.forEach(line => { maxLineWidth = Math.max(maxLineWidth, c.measureText(line).width); });

  const lineHeight = titleSize;
  const subtitleLineHeight = subtitleSize;
  const titleTotalH = titleLines.length > 0 ? titleLines.length * lineHeight + (titleLines.length - 1) * 4 : 0;
  const subtitleTotalH = subtitleLines.length > 0 ? subtitleLines.length * subtitleLineHeight + (subtitleLines.length - 1) * 4 + (titleLines.length > 0 ? 10 : 0) : 0;
  const textHeight = titleTotalH + subtitleTotalH;
  const padding = 30;

  if (S.textBg) {
    let bgX = preset.textAlign === 'center' ? preset.textX - maxLineWidth / 2 - padding :
              preset.textAlign === 'right' ? preset.textX - maxLineWidth - padding :
              preset.textX - padding;
    let bgY = preset.textVAlign === 'center' ? preset.textY - textHeight / 2 - padding :
              preset.textVAlign === 'bottom' ? preset.textY - textHeight - padding :
              preset.textY - padding;
    c.fillStyle = 'rgba(0,0,0,0.5)';
    roundRect(c, bgX, bgY, maxLineWidth + padding * 2, textHeight + padding * 2, 16);
    c.fill();
  }

  if (S.shadow) {
    c.shadowColor = 'rgba(0,0,0,0.5)';
    c.shadowBlur = 10;
    c.shadowOffsetX = 2;
    c.shadowOffsetY = 2;
  }

  c.textAlign = preset.textAlign;
  c.textBaseline = 'top';

  let currentY = preset.textVAlign === 'center' ? preset.textY - textHeight / 2 :
                 preset.textVAlign === 'bottom' ? preset.textY - textHeight :
                 preset.textY;

  if (titleLines.length > 0) {
    c.font = `${S.bold ? 'bold' : 'normal'} ${titleSize}px sans-serif`;
    titleLines.forEach((line) => {
      if (S.stroke) { c.strokeStyle = 'rgba(0,0,0,0.8)'; c.lineWidth = 3; c.strokeText(line, preset.textX, currentY); }
      c.fillStyle = S.titleColor;
      c.fillText(line, preset.textX, currentY);
      currentY += lineHeight + 4;
    });
    currentY += 6;
  }

  if (subtitleLines.length > 0) {
    c.font = `normal ${subtitleSize}px sans-serif`;
    subtitleLines.forEach((line) => {
      if (S.stroke) { c.strokeStyle = 'rgba(0,0,0,0.8)'; c.lineWidth = 2; c.strokeText(line, preset.textX, currentY); }
      c.fillStyle = S.subtitleColor;
      c.fillText(line, preset.textX, currentY);
      currentY += subtitleLineHeight + 4;
    });
  }

  c.restore();
}
