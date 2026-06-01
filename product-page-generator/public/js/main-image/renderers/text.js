import { state } from '../core/state.js';
import { presets } from '../config/presets.js';
import { getCtx } from '../core/canvas.js';

export function drawText() {
  const preset = presets[state.preset];
  const titleSize = state.titleSize;
  const subtitleSize = Math.max(16, Math.floor(titleSize * 0.5));
  
  const c = getCtx();
  c.save();
  
  c.font = `${state.bold ? 'bold' : 'normal'} ${titleSize}px sans-serif`;
  const titleWidth = c.measureText(state.mainTitle || '').width;
  c.font = `normal ${subtitleSize}px sans-serif`;
  const subtitleWidth = c.measureText(state.subTitle || '').width;
  const maxTextWidth = Math.max(titleWidth, subtitleWidth);
  
  const textHeight = (state.mainTitle ? titleSize : 0) + (state.subTitle ? subtitleSize + 10 : 0);
  const padding = 30;
  
  let bgX = preset.textAlign === 'center' ? preset.textX - maxTextWidth / 2 - padding :
            preset.textAlign === 'right' ? preset.textX - maxTextWidth - padding :
            preset.textX - padding;
  let bgY = preset.textVAlign === 'center' ? preset.textY - textHeight / 2 - padding :
            preset.textVAlign === 'bottom' ? preset.textY - textHeight - padding :
            preset.textY - padding;
  let bgW = maxTextWidth + padding * 2;
  let bgH = textHeight + padding * 2;
  
  if (state.textBg) {
    c.fillStyle = 'rgba(0,0,0,0.5)';
    roundRect(c, bgX, bgY, bgW, bgH, 16);
    c.fill();
  }
  
  if (state.shadow) {
    c.shadowColor = 'rgba(0,0,0,0.5)';
    c.shadowBlur = 10;
    c.shadowOffsetX = 2;
    c.shadowOffsetY = 2;
  }
  
  c.textAlign = preset.textAlign;
  c.textBaseline = preset.textVAlign === 'top' ? 'top' : preset.textVAlign === 'bottom' ? 'bottom' : 'middle';
  
  let currentY = preset.textVAlign === 'center' ? preset.textY - (state.subTitle ? subtitleSize / 2 + 5 : 0) :
                 preset.textVAlign === 'bottom' ? preset.textY - (state.subTitle ? subtitleSize + 10 : 0) :
                 preset.textY;
  
  if (state.mainTitle) {
    c.font = `${state.bold ? 'bold' : 'normal'} ${titleSize}px sans-serif`;
    if (state.stroke) { c.strokeStyle = 'rgba(0,0,0,0.8)'; c.lineWidth = 3; c.strokeText(state.mainTitle, preset.textX, currentY); }
    c.fillStyle = state.titleColor;
    c.fillText(state.mainTitle, preset.textX, currentY);
    currentY += titleSize + 10;
  }
  
  if (state.subTitle) {
    c.font = `normal ${subtitleSize}px sans-serif`;
    if (state.stroke) { c.strokeStyle = 'rgba(0,0,0,0.8)'; c.lineWidth = 2; c.strokeText(state.subTitle, preset.textX, currentY); }
    c.fillStyle = state.subtitleColor;
    c.fillText(state.subTitle, preset.textX, currentY);
  }
  
  c.restore();
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
}
