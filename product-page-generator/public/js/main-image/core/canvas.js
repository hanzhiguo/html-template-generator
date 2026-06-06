import { S } from './state.js';
import { renderNormalStyle } from '../renderers/normal.js';
import { renderCircleStyle } from '../renderers/circle.js';
import { drawText } from '../renderers/text.js';

export const RENDER_SZ = 1024;
let canvas = null;
let ctx = null;
let _renderCtx = null;

export function initCanvas() {
  canvas = document.getElementById('previewCanvas');
  ctx = canvas.getContext('2d');
  return { canvas, ctx };
}

export function getCanvas() { return canvas; }
export function getCtx() { return _renderCtx || ctx; }

export function render() {
  const c = getCtx();
  c.fillStyle = S.bgColor;
  c.fillRect(0, 0, 1024, 1024);

  switch (S.maskStyle) {
    case 'circle':
      renderCircleStyle();
      break;
    default:
      renderNormalStyle();
  }

  if (S.mainTitle || S.subTitle) drawText();
}

// 渲染到指定ctx（用于批量导出）
export function renderToCtx(targetCtx, slotsOverride) {
  const origSlots = S.slots;
  if (slotsOverride) S.slots = slotsOverride;
  const origCtx = _renderCtx;
  _renderCtx = targetCtx;
  try { render(); } catch (e) { console.error('renderToCtx error:', e); }
  _renderCtx = origCtx;
  if (slotsOverride) S.slots = origSlots;
}
