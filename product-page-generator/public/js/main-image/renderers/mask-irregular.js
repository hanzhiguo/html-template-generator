import { state } from '../core/state.js';
import { getCtx } from '../core/canvas.js';
import { drawIrregularPathTL, drawIrregularPathTR, drawIrregularPathBL, drawIrregularPathBR } from '../utils/drawing.js';
import { drawImageCover } from './normal.js';

export function renderIrregularMask4Style() {
  const bg = state.maskBgColor;
  const cardColor = state.maskCardColor;
  const numberBg = state.maskNumberBg;
  const textColor = state.maskTextColor;
  const title = state.maskTitle || 'EASY TO USE';
  const texts = state.maskTexts || ['Step 1', 'Step 2', 'Step 3', 'Step 4'];
  
  const c = getCtx();
  c.fillStyle = bg;
  c.fillRect(0, 0, 1024, 1024);
  
  c.font = 'bold 56px sans-serif';
  c.fillStyle = textColor;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(title, 512, 55);
  
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
    c.save();
    
    c.beginPath();
    if (i === 0) {
      drawIrregularPathTL(c, pos.x, pos.y, cardW, cardH);
    } else if (i === 1) {
      drawIrregularPathTR(c, pos.x, pos.y, cardW, cardH);
    } else if (i === 2) {
      drawIrregularPathBL(c, pos.x, pos.y, cardW, cardH);
    } else {
      drawIrregularPathBR(c, pos.x, pos.y, cardW, cardH);
    }
    c.closePath();
    c.clip();
    
    c.fillStyle = cardColor;
    c.fillRect(pos.x, pos.y, cardW, cardH);
    
    if (state.images[i]) {
      drawImageCover(state.images[i], pos.x, pos.y, cardW, cardH);
    }
    
    c.restore();
    
    c.beginPath();
    if (i === 0) {
      drawIrregularPathTL(c, pos.x, pos.y, cardW, cardH);
    } else if (i === 1) {
      drawIrregularPathTR(c, pos.x, pos.y, cardW, cardH);
    } else if (i === 2) {
      drawIrregularPathBL(c, pos.x, pos.y, cardW, cardH);
    } else {
      drawIrregularPathBR(c, pos.x, pos.y, cardW, cardH);
    }
    c.closePath();
    c.strokeStyle = bg;
    c.lineWidth = 8;
    c.stroke();
    
    const numPos = [
      { x: pos.x + 40, y: pos.y + 40 },
      { x: pos.x + cardW - 40, y: pos.y + 40 },
      { x: pos.x + 40, y: pos.y + cardH - 40 },
      { x: pos.x + cardW - 40, y: pos.y + cardH - 40 }
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
    c.textAlign = i < 2 ? 'left' : 'left';
    c.textBaseline = 'bottom';
    const textX = i % 2 === 0 ? pos.x + 20 : pos.x + 20;
    const textY = pos.y + cardH - 15;
    c.fillText(texts[i] || '', textX, textY);
  });
}
