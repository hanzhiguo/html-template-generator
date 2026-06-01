import { state } from './core/state.js';
import { initCanvas, render } from './core/canvas.js';
import { handleFiles, renderImageList, selectAllImages, deselectAllImages, applyBatchScale, resetBatchScale } from './features/image-manager.js';
import { initDragAndDrop } from './features/drag-drop.js';
import { saveTemplate, renderTemplateList } from './utils/storage.js';
import { exportImage } from './utils/export.js';
import { showToast } from './utils/toast.js';

export function init() {
  initCanvas();
  bindEvents();
  initDragAndDrop();
  render();
  renderTemplateList();
}

function bindEvents() {
  bindTemplateEvents();
  bindPresetEvents();
  bindTextEvents();
  bindImageEvents();
  bindExportEvents();
  bindMaskEvents();
}

function bindTemplateEvents() {
  document.querySelectorAll('.template-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.template-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      state.templateCount = parseInt(item.dataset.count);
      render();
    });
  });
}

function bindPresetEvents() {
  document.querySelectorAll('.preset-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.preset-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      state.preset = item.dataset.preset;
      render();
    });
  });
}

function bindTextEvents() {
  const textInputs = ['mainTitle', 'subTitle', 'titleColor', 'subtitleColor', 'bgColor', 'titleSize', 'imageGap', 'imageRadius'];
  
  textInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        if (id === 'titleSize' || id === 'imageGap' || id === 'imageRadius') {
          state[id] = parseFloat(el.value) || 0;
        } else {
          state[id] = el.value;
        }
        render();
      });
    }
  });
  
  const checkboxes = ['shadow', 'stroke', 'bold', 'textBg'];
  checkboxes.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', () => {
        state[id] = el.checked;
        render();
      });
    }
  });
}

function bindImageEvents() {
  const uploadZone = document.getElementById('uploadZone');
  const fileInput = document.getElementById('fileInput');
  
  if (uploadZone && fileInput) {
    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });
    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('dragover');
    });
    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      handleFiles(e.dataTransfer.files);
    });
    fileInput.addEventListener('change', (e) => {
      handleFiles(e.target.files);
      e.target.value = '';
    });
  }
  
  const selectAllBtn = document.getElementById('selectAllBtn');
  const deselectAllBtn = document.getElementById('deselectAllBtn');
  const applyBatchBtn = document.getElementById('applyBatchBtn');
  const resetBatchBtn = document.getElementById('resetBatchBtn');
  
  if (selectAllBtn) selectAllBtn.addEventListener('click', selectAllImages);
  if (deselectAllBtn) deselectAllBtn.addEventListener('click', deselectAllImages);
  if (applyBatchBtn) applyBatchBtn.addEventListener('click', applyBatchScale);
  if (resetBatchBtn) resetBatchBtn.addEventListener('click', resetBatchScale);
}

function bindExportEvents() {
  const exportPngBtn = document.getElementById('exportPngBtn');
  const exportJpgBtn = document.getElementById('exportJpgBtn');
  const saveTemplateBtn = document.getElementById('saveTemplateBtn');
  
  if (exportPngBtn) exportPngBtn.addEventListener('click', () => exportImage('png'));
  if (exportJpgBtn) exportJpgBtn.addEventListener('click', () => exportImage('jpg'));
  if (saveTemplateBtn) saveTemplateBtn.addEventListener('click', saveTemplate);
}

function bindMaskEvents() {
  const maskStyleSelect = document.getElementById('maskStyle');
  if (maskStyleSelect) {
    maskStyleSelect.addEventListener('change', () => {
      state.maskStyle = maskStyleSelect.value;
      render();
    });
  }
}

window.addEventListener('DOMContentLoaded', init);
