import { state } from '../core/state.js';
import { getCtx } from '../core/canvas.js';
import { wrapText } from '../utils/drawing.js';
import { drawImageCover } from './normal.js';

export function renderDetailMask2Style() {
  const bg = state.detailBgColor;
  const cardColor = state.detailCardColor;
  const titleColor = state.detailTitleColor;
  const textColor = state.detailTextColor;
  const title = state.detailTitle || 'DETAILS';
  const subtitle = state.detailSubtitle || 'THEME COPY';
  const text1Title = state.detailText1Title || '01.DETAILS';
  const text2Title = state.detailText2Title || '02.DETAILS';
  const text1Desc = state.detailText1Desc || '';
  const text2Desc = state.detailText2Desc || '';
  
  const c = getCtx();
  c.fillStyle = bg;
  c.fillRect(0, 0, 1024, 1024);
  
  const svgW = 995, svgH = 998;
  const scale = Math.min(1024 / svgW, 1024 / svgH);
  const offsetX = (1024 - svgW * scale) / 2;
  const offsetY = 0;
  
  function tx(x) { return x * scale + offsetX; }
  function ty(y) { return y * scale + offsetY; }
  
  c.font = 'bold 100px sans-serif';
  c.fillStyle = titleColor;
  c.textAlign = 'left';
  c.textBaseline = 'top';
  c.fillText(title, tx(38.999), ty(99.373));
  
  c.save();
  c.beginPath();
  c.moveTo(tx(522.55), ty(406.17));
  c.lineTo(tx(522.55), ty(194.14));
  c.lineTo(tx(190.39), ty(194.14));
  c.bezierCurveTo(tx(105.69), ty(194.14), tx(37.03), ty(262.8), tx(37.03), ty(347.5));
  c.lineTo(tx(37.03), ty(817.76));
  c.lineTo(tx(369.19), ty(817.76));
  c.bezierCurveTo(tx(410.01), ty(817.76), tx(447.1), ty(801.81), tx(474.58), ty(775.8));
  c.lineTo(tx(474.58), ty(517.58));
  c.bezierCurveTo(tx(474.58), ty(473.7), tx(493.01), ty(434.13), tx(522.55), ty(406.17));
  c.closePath();
  c.clip();
  
  if (state.images[0]) {
    drawImageCover(state.images[0], tx(0), ty(0), tx(svgW) - offsetX, ty(svgH) - offsetY);
  } else {
    c.fillStyle = cardColor;
    c.fillRect(tx(0), ty(0), tx(svgW), ty(svgH));
  }
  
  c.restore();
  
  c.beginPath();
  c.moveTo(tx(522.55), ty(406.17));
  c.lineTo(tx(522.55), ty(194.14));
  c.lineTo(tx(190.39), ty(194.14));
  c.bezierCurveTo(tx(105.69), ty(194.14), tx(37.03), ty(262.8), tx(37.03), ty(347.5));
  c.lineTo(tx(37.03), ty(817.76));
  c.lineTo(tx(369.19), ty(817.76));
  c.bezierCurveTo(tx(410.01), ty(817.76), tx(447.1), ty(801.81), tx(474.58), ty(775.8));
  c.lineTo(tx(474.58), ty(517.58));
  c.bezierCurveTo(tx(474.58), ty(473.7), tx(493.01), ty(434.13), tx(522.55), ty(406.17));
  c.closePath();
  c.strokeStyle = bg;
  c.lineWidth = 5 * scale;
  c.stroke();
  
  c.save();
  c.beginPath();
  c.moveTo(tx(627.94), ty(364.22));
  c.bezierCurveTo(tx(587.12), ty(364.22), tx(550.03), ty(380.17), tx(522.55), ty(406.17));
  c.bezierCurveTo(tx(493.01), ty(434.13), tx(474.58), ty(473.7), tx(474.58), ty(517.58));
  c.lineTo(tx(474.58), ty(775.8));
  c.lineTo(tx(474.58), ty(966.03));
  c.lineTo(tx(806.74), ty(966.03));
  c.bezierCurveTo(tx(891.44), ty(966.03), tx(960.1), ty(897.37), tx(960.1), ty(812.67));
  c.lineTo(tx(960.1), ty(364.22));
  c.lineTo(tx(627.94), ty(364.22));
  c.closePath();
  c.clip();
  
  if (state.images[1]) {
    drawImageCover(state.images[1], tx(0), ty(0), tx(svgW) - offsetX, ty(svgH) - offsetY);
  } else {
    c.fillStyle = cardColor;
    c.fillRect(tx(0), ty(0), tx(svgW), ty(svgH));
  }
  
  c.restore();
  
  c.beginPath();
  c.moveTo(tx(627.94), ty(364.22));
  c.bezierCurveTo(tx(587.12), ty(364.22), tx(550.03), ty(380.17), tx(522.55), ty(406.17));
  c.bezierCurveTo(tx(493.01), ty(434.13), tx(474.58), ty(473.7), tx(474.58), ty(517.58));
  c.lineTo(tx(474.58), ty(775.8));
  c.lineTo(tx(474.58), ty(966.03));
  c.lineTo(tx(806.74), ty(966.03));
  c.bezierCurveTo(tx(891.44), ty(966.03), tx(960.1), ty(897.37), tx(960.1), ty(812.67));
  c.lineTo(tx(960.1), ty(364.22));
  c.lineTo(tx(627.94), ty(364.22));
  c.closePath();
  c.strokeStyle = bg;
  c.lineWidth = 5 * scale;
  c.stroke();
  
  c.font = 'bold 42px sans-serif';
  c.fillStyle = textColor;
  c.textAlign = 'left';
  c.textBaseline = 'top';
  c.fillText(text1Title, tx(600.330), ty(216.122));
  
  c.font = '20px sans-serif';
  c.fillStyle = textColor;
  const lines1 = wrapText(c, text1Desc, 300);
  lines1.forEach((line, i) => {
    c.fillText(line, tx(602.085), ty(289.437) + i * 24);
  });
  
  c.font = 'bold 42px sans-serif';
  c.fillStyle = textColor;
  c.textAlign = 'left';
  c.textBaseline = 'top';
  c.fillText(text2Title, tx(82.110), ty(838.106));
  
  c.font = '20px sans-serif';
  c.fillStyle = textColor;
  const lines2 = wrapText(c, text2Desc, 320);
  lines2.forEach((line, i) => {
    c.fillText(line, tx(82.301), ty(911.430) + i * 24);
  });
}
