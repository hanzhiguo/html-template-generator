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

export function wrapText(ctx, text, maxWidth) {
  if (!text) return [''];
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  words.forEach(word => {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });
  lines.push(currentLine);
  return lines;
}

export function adjustLayoutsWithGap(layouts, gap) {
  if (gap === 0) return layouts;
  const halfGap = gap / 2;
  return layouts.map(l => ({ x: l.x + halfGap, y: l.y + halfGap, w: l.w - gap, h: l.h - gap }));
}

export function drawIrregularPathTL(ctx, x, y, w, h) {
  const r = 30;
  const curveSize = 80;
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - curveSize, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + curveSize);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + curveSize, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - curveSize);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

export function drawIrregularPathTR(ctx, x, y, w, h) {
  const r = 30;
  const curveSize = 80;
  ctx.moveTo(x + curveSize, y);
  ctx.quadraticCurveTo(x, y, x, y + curveSize);
  ctx.lineTo(x, y + h - r);
  ctx.quadraticCurveTo(x, y + h, x + r, y + h);
  ctx.lineTo(x + w - r, y + h);
  ctx.quadraticCurveTo(x + w, y + h, x + w, y + h - r);
  ctx.lineTo(x + w, y + curveSize);
  ctx.quadraticCurveTo(x + w, y, x + w - curveSize, y);
}

export function drawIrregularPathBL(ctx, x, y, w, h) {
  const r = 30;
  const curveSize = 80;
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - curveSize, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + curveSize);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + curveSize, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - curveSize);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

export function drawIrregularPathBR(ctx, x, y, w, h) {
  const r = 30;
  const curveSize = 80;
  ctx.moveTo(x + curveSize, y);
  ctx.quadraticCurveTo(x, y, x, y + curveSize);
  ctx.lineTo(x, y + h - r);
  ctx.quadraticCurveTo(x, y + h, x + r, y + h);
  ctx.lineTo(x + w - r, y + h);
  ctx.quadraticCurveTo(x + w, y + h, x + w, y + h - r);
  ctx.lineTo(x + w, y + curveSize);
  ctx.quadraticCurveTo(x + w, y, x + w - curveSize, y);
}
