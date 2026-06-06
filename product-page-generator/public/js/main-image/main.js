import { S, setTemplateCount, setSlotImage } from './core/state.js';
import { initCanvas, render } from './core/canvas.js';
import { handleFiles, renderLibrary, renderSlotIndicators, selectAllLibrary, deselectAllLibrary, autoFill, clearSlots } from './features/image-manager.js';
import { exportImage, batchExport1toN, batchExportNtoN, batchExportCombine } from './utils/export.js';
import { showToast } from './utils/toast.js';

export function init() {
  initCanvas();
  setTemplateCount(1);
  bindEvents();
  renderSlotIndicators();
  render();
}

function bindEvents() {
  bindUpload();
  bindTemplate();
  bindPreset();
  bindText();
  bindImageSettings();
  bindSlotActions();
  bindExport();
  bindBatch();
  bindCanvasDrop();
}

function bindUpload() {
  const uploadZone = document.getElementById('uploadZone');
  const fileInput = document.getElementById('fileInput');

  if (uploadZone && fileInput) {
    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      handleFiles(e.dataTransfer.files);
    });
    fileInput.addEventListener('change', (e) => { handleFiles(e.target.files); e.target.value = ''; });
  }
}

function bindTemplate() {
  document.querySelectorAll('.template-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.template-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      setTemplateCount(parseInt(item.dataset.count));
      renderSlotIndicators();
      render();
    });
  });
}

function bindPreset() {
  document.querySelectorAll('.preset-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.preset-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      S.preset = item.dataset.preset;
      render();
    });
  });
}

function bindText() {
  const inputs = ['mainTitle', 'subTitle', 'titleColor', 'subtitleColor', 'bgColor', 'titleSize'];
  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        if (id === 'titleSize') S[id] = parseFloat(el.value) || 0;
        else S[id] = el.value;
        // 同步显示值
        const valEl = document.getElementById(id + 'Val');
        if (valEl) valEl.textContent = el.value;
        render();
      });
    }
  });

  const checkboxes = ['shadow', 'stroke', 'bold', 'textBg'];
  checkboxes.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', () => { S[id] = el.checked; render(); });
  });
}

function bindImageSettings() {
  ['imageGap', 'imageRadius'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        S[id] = parseFloat(el.value) || 0;
        const valEl = document.getElementById(id + 'Val');
        if (valEl) valEl.textContent = el.value;
        render();
      });
    }
  });
}

function bindSlotActions() {
  const autoFillBtn = document.getElementById('autoFillBtn');
  const clearSlotsBtn = document.getElementById('clearSlotsBtn');
  const selectAllBtn = document.getElementById('selectAllLibBtn');
  const deselectAllBtn = document.getElementById('deselectAllLibBtn');

  if (autoFillBtn) autoFillBtn.addEventListener('click', autoFill);
  if (clearSlotsBtn) clearSlotsBtn.addEventListener('click', clearSlots);
  if (selectAllBtn) selectAllBtn.addEventListener('click', selectAllLibrary);
  if (deselectAllBtn) deselectAllBtn.addEventListener('click', deselectAllLibrary);
}

function bindExport() {
  const exportPngBtn = document.getElementById('exportPngBtn');
  const exportJpgBtn = document.getElementById('exportJpgBtn');
  if (exportPngBtn) exportPngBtn.addEventListener('click', () => exportImage('png'));
  if (exportJpgBtn) exportJpgBtn.addEventListener('click', () => exportImage('jpg'));
}

function bindBatch() {
  const batch1toNBtn = document.getElementById('batch1toNBtn');
  const batchNtoNBtn = document.getElementById('batchNtoNBtn');
  const batchCombineBtn = document.getElementById('batchCombineBtn');
  const batchFormatEl = document.getElementById('batchFormat');

  function getBatchFormat() {
    return batchFormatEl ? batchFormatEl.value : 'png';
  }

  if (batch1toNBtn) {
    batch1toNBtn.addEventListener('click', () => {
      const ids = S.batchSelectedLibIds;
      if (ids.length === 0) { showToast('请先在素材库中选中图片', true); return; }
      batchExport1toN(ids, [1, 2, 4, 6, 9], getBatchFormat());
    });
  }

  if (batchNtoNBtn) {
    batchNtoNBtn.addEventListener('click', () => {
      const ids = S.batchSelectedLibIds;
      if (ids.length === 0) { showToast('请先在素材库中选中图片', true); return; }
      batchExportNtoN(ids, S.templateCount, getBatchFormat());
    });
  }

  if (batchCombineBtn) {
    batchCombineBtn.addEventListener('click', () => {
      const ids = S.batchSelectedLibIds;
      if (ids.length === 0) { showToast('请先在素材库中选中图片', true); return; }
      batchExportCombine(ids, S.templateCount, getBatchFormat());
    });
  }
}

// 画布区域也支持拖放
function bindCanvasDrop() {
  const canvasWrapper = document.getElementById('canvasWrapper');
  if (!canvasWrapper) return;

  canvasWrapper.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });

  canvasWrapper.addEventListener('drop', (e) => {
    e.preventDefault();
    const libId = parseInt(e.dataTransfer.getData('text/plain'));
    if (!libId) return;

    // 找到第一个空槽位
    const emptyIdx = S.slots.findIndex(s => !s.libraryId);
    if (emptyIdx !== -1) {
      setSlotImage(emptyIdx, libId);
    } else if (S.slots.length > 0) {
      // 替换最后一个
      setSlotImage(S.slots.length - 1, libId);
    }

    renderSlotIndicators();
    render();
  });
}

window.addEventListener('DOMContentLoaded', init);
