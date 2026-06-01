import { state } from '../core/state.js';
import { templates } from '../config/templates.js';
import { getCtx } from '../core/canvas.js';
import { adjustLayoutsWithGap } from '../utils/drawing.js';

export function drawDragIndicator() {
  if (!state.dragState.isDragging || state.dragState.dropIndex === -1) return;
  
  const template = templates[state.templateCount];
  if (!template) return;
  
  let layouts = template.layouts;
  
  if (state.templateCount === 5 && state.fiveImageStyle === 'big' && template.layoutsBig) {
    layouts = template.layoutsBig;
  } else if (state.templateCount === 6 && state.sixImageStyle === 'big' && template.layoutsBig) {
    layouts = template.layoutsBig;
  }
  
  const gap = state.imageGap * 2;
  const adjustedLayouts = adjustLayoutsWithGap(layouts, gap);
  const layout = adjustedLayouts[state.dragState.dropIndex];
  
  if (!layout) return;
  
  const c = getCtx();
  c.save();
  c.strokeStyle = '#3b82f6';
  c.lineWidth = 4;
  c.setLineDash([10, 5]);
  c.strokeRect(layout.x + 2, layout.y + 2, layout.w - 4, layout.h - 4);
  c.restore();
}

export function initDragAndDrop() {
  const dragOverlay = document.getElementById('dragOverlay');
  if (!dragOverlay) return;
  
  dragOverlay.addEventListener('dragover', (e) => {
    e.preventDefault();
    const rect = dragOverlay.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const dropIndex = getImageIndexAtPosition(x, y);
    if (dropIndex !== -1 && dropIndex !== state.dragState.dropIndex) {
      state.dragState.dropIndex = dropIndex;
    }
  });
  
  dragOverlay.addEventListener('drop', (e) => {
    e.preventDefault();
    if (state.dragState.dragIndex !== -1 && state.dragState.dropIndex !== -1) {
      swapImages(state.dragState.dragIndex, state.dragState.dropIndex);
    }
    state.dragState.isDragging = false;
    state.dragState.dragIndex = -1;
    state.dragState.dropIndex = -1;
  });
}

function getImageIndexAtPosition(x, y) {
  const template = templates[state.templateCount];
  if (!template) return -1;
  
  let layouts = template.layouts;
  if (state.templateCount === 5 && state.fiveImageStyle === 'big' && template.layoutsBig) {
    layouts = template.layoutsBig;
  } else if (state.templateCount === 6 && state.sixImageStyle === 'big' && template.layoutsBig) {
    layouts = template.layoutsBig;
  }
  
  const gap = state.imageGap * 2;
  const adjustedLayouts = adjustLayoutsWithGap(layouts, gap);
  const scale = 720 / 1024;
  
  for (let i = 0; i < adjustedLayouts.length; i++) {
    const l = adjustedLayouts[i];
    if (x >= l.x * scale && x <= (l.x + l.w) * scale &&
        y >= l.y * scale && y <= (l.y + l.h) * scale) {
      return i;
    }
  }
  return -1;
}

function swapImages(index1, index2) {
  const temp = state.images[index1];
  state.images[index1] = state.images[index2];
  state.images[index2] = temp;
}
