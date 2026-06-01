import { state } from '../core/state.js';
import { getCtx } from '../core/canvas.js';
import { roundRect, wrapText } from '../utils/drawing.js';
import { drawImageCover } from './normal.js';

export function renderCardMask2Style() {
  const bg = state.cardBgColor;
  const title = state.cardTitle || 'Original Color Presented';
  const subtitle = state.cardSubtitle || '';
  const titleColor = state.cardTitleColor;
  const subtitleColor = state.cardSubtitleColor;
  const radius = state.cardRadius * 2;
  
  const c = getCtx();
  c.fillStyle = bg;
  c.fillRect(0, 0, 1024, 1024);
  
  c.font = 'bold 36px sans-serif';
  c.fillStyle = titleColor;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(title, 512, 55);
  
  if (subtitle) {
    c.font = '18px sans-serif';
    c.fillStyle = subtitleColor;
    const subLines = wrapText(c, subtitle, 700);
    subLines.forEach((line, i) => {
      c.fillText(line, 512, 90 + i * 24);
    });
  }
  
  const cardW = 440;
  const cardH = 780;
  const gap = 40;
  const startX = (1024 - cardW * 2 - gap) / 2;
  const startY = 150;
  
  for (let i = 0; i < 2; i++) {
    const cx = startX + i * (cardW + gap);
    
    c.save();
    roundRect(c, cx, startY, cardW, cardH, radius);
    c.clip();
    
    c.fillStyle = '#d4d4d4';
    c.fillRect(cx, startY, cardW, cardH);
    
    if (state.images[i]) {
      drawImageCover(state.images[i], cx, startY, cardW, cardH);
    }
    
    c.restore();
    
    c.beginPath();
    roundRect(c, cx, startY, cardW, cardH, radius);
    c.strokeStyle = '#ffffff';
    c.lineWidth = 3;
    c.stroke();
  }
}
