import { state } from '../core/state.js';
import { getCtx } from '../core/canvas.js';

export function drawLogo() {
  const maxSize = state.logoSize;
  const margin = state.logoMargin;
  const x = margin;
  const y = margin;
  
  if (state.logo.type === 'svg') {
    const coloredSvg = applySvgColor(state.logo.originalContent, state.logoColor);
    const svgBlob = new Blob([coloredSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);
    
    const img = new Image();
    img.onload = () => {
      const ratio = img.width / img.height;
      let drawW, drawH;
      if (ratio > 1) {
        drawW = maxSize;
        drawH = maxSize / ratio;
      } else {
        drawH = maxSize;
        drawW = maxSize * ratio;
      }
      getCtx().drawImage(img, x, y, drawW, drawH);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  } else if (state.logo.type === 'image' && state.logo.img) {
    const img = state.logo.img;
    const ratio = img.width / img.height;
    let drawW, drawH;
    if (ratio > 1) {
      drawW = maxSize;
      drawH = maxSize / ratio;
    } else {
      drawH = maxSize;
      drawW = maxSize * ratio;
    }
    getCtx().drawImage(img, x, y, drawW, drawH);
  }
}

function applySvgColor(svgContent, color) {
  return svgContent.replace(/fill="[^"]*"/g, `fill="${color}"`);
}
