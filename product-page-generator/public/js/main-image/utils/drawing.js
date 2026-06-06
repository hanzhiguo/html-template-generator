export function roundRect(ctx, x, y, w, h, r) {
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

export function adjustLayoutsWithGap(layouts, gap) {
  if (gap === 0) return layouts;
  const halfGap = gap / 2;
  return layouts.map(l => ({ x: l.x + halfGap, y: l.y + halfGap, w: l.w - gap, h: l.h - gap }));
}

export function wrapText(ctx, text, maxWidth) {
  if (!text) return [];
  const lines = [];
  let currentLine = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const testLine = currentLine + ch;
    if (ctx.measureText(testLine).width > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = ch;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [text];
}
