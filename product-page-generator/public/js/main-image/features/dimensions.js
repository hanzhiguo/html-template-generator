import { state } from '../core/state.js';
import { getCtx, getDisplayScale } from '../core/canvas.js';

export function drawDimensionsOnCanvas() {
  const c = getCtx();
  const displayScale = getDisplayScale();
  
  state.dimensions.forEach(d => {
    const x1 = d.x1 / displayScale;
    const y1 = d.y1 / displayScale;
    const x2 = d.x2 / displayScale;
    const y2 = d.y2 / displayScale;
    const lw = (d.lineWidth || 2) / displayScale;
    const fs = (d.fontSize || 16) / displayScale;
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
    const text = d.value + d.unit;
    c.font = `bold ${fs}px sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const tw = c.measureText(text).width;
    const pad12 = 12 / displayScale;
    const pad10 = 10 / displayScale;
    const pad6 = 6 / displayScale;
    const pad3 = 3 / displayScale;
    const offsetY = -(fs + pad12);
    
    const textBg = d.textBg || 'white';
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
  });
}
