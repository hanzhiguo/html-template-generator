import { state } from './state.js';
import { templates } from '../config/templates.js';
import { presets } from '../config/presets.js';
import { renderNormalStyle } from '../renderers/normal.js';
import { renderCircleStyle } from '../renderers/circle.js';
import { renderIrregularMask4Style } from '../renderers/mask-irregular.js';
import { renderDetailMask2Style } from '../renderers/mask-detail.js';
import { renderCardMask2Style } from '../renderers/mask-card.js';
import { drawText } from '../renderers/text.js';
import { drawLogo } from '../renderers/logo.js';
import { drawDimensionsOnCanvas } from '../features/dimensions.js';
import { drawDragIndicator } from '../features/drag-drop.js';

export const RENDER_SZ = 1024;
export let displayScale = 1;
export let renderCtx = null;

let canvas = null;
let ctx = null;

export function initCanvas() {
  canvas = document.getElementById('previewCanvas');
  ctx = canvas.getContext('2d');
  return { canvas, ctx };
}

export function getCanvas() {
  return canvas;
}

export function getCtx() {
  return renderCtx || ctx;
}

export function setDisplayScale(scale) {
  displayScale = scale;
}

export function getDisplayScale() {
  return displayScale;
}

export function render() {
  const targetCtx = getCtx();
  targetCtx.fillStyle = state.bgColor;
  targetCtx.fillRect(0, 0, 1024, 1024);
  
  switch (state.maskStyle) {
    case 'mask4':
      renderIrregularMask4Style();
      break;
    case 'detail2':
      renderDetailMask2Style();
      break;
    case 'card2':
      renderCardMask2Style();
      break;
    case 'circle':
      renderCircleStyle();
      break;
    default:
      renderNormalStyle();
  }
  
  if (state.mainTitle || state.subTitle) { drawText(); }
  
  if (state.logo) { drawLogo(); }
  
  if (state.dimEnabled && state.dimensions.length > 0) { drawDimensionsOnCanvas(); }
  
  if (state.dragState.isDragging) { drawDragIndicator(); }
}

export { templates, presets };
