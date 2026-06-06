import { S, getLibraryItem } from '../core/state.js';
import { RENDER_SZ, renderToCtx } from '../core/canvas.js';
import { showToast } from './toast.js';

// 单张导出
export function exportImage(format = 'png') {
  if (S.slots.every(s => !s.libraryId)) {
    showToast('请先添加图片', true);
    return;
  }

  const EXPORT_SZ = 1400;
  const SCALE = EXPORT_SZ / RENDER_SZ;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = EXPORT_SZ;
  tempCanvas.height = EXPORT_SZ;
  const tempCtx = tempCanvas.getContext('2d');

  if (format === 'jpg') {
    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, EXPORT_SZ, EXPORT_SZ);
  }

  tempCtx.save();
  tempCtx.scale(SCALE, SCALE);
  renderToCtx(tempCtx);
  tempCtx.restore();

  downloadCanvas(tempCanvas, `main-image-${Date.now()}.${format}`, format);
  showToast('导出成功！');
}

// 批量导出 - 一对多：1张图 → 多个模板
export function batchExport1toN(selectedLibIds, templateCounts, format = 'png') {
  if (selectedLibIds.length === 0) { showToast('请选择素材', true); return; }

  const EXPORT_SZ = 1400;
  const SCALE = EXPORT_SZ / RENDER_SZ;
  let count = 0;

  selectedLibIds.forEach(libId => {
    const item = getLibraryItem(libId);
    if (!item) return;

    templateCounts.forEach(tc => {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = EXPORT_SZ;
      tempCanvas.height = EXPORT_SZ;
      const tempCtx = tempCanvas.getContext('2d');

      if (format === 'jpg') {
        tempCtx.fillStyle = '#ffffff';
        tempCtx.fillRect(0, 0, EXPORT_SZ, EXPORT_SZ);
      }

      // 构建槽位：同一张图填满所有槽位
      const slots = [];
      for (let i = 0; i < tc; i++) {
        slots.push({ libraryId: libId, scale: 1, offsetX: 0, offsetY: 0 });
      }

      const origTC = S.templateCount;
      S.templateCount = tc;

      tempCtx.save();
      tempCtx.scale(SCALE, SCALE);
      renderToCtx(tempCtx, slots);
      tempCtx.restore();

      S.templateCount = origTC;

      const name = `${item.name.replace(/\.[^.]+$/, '')}_${tc}grid_${Date.now()}.${format}`;
      downloadCanvas(tempCanvas, name, format);
      count++;
    });
  });

  showToast(`批量导出 ${count} 张完成！`);
}

// 批量导出 - 多对多：多张图 → 每张一个模板
export function batchExportNtoN(selectedLibIds, templateCount, format = 'png') {
  if (selectedLibIds.length === 0) { showToast('请选择素材', true); return; }

  const EXPORT_SZ = 1400;
  const SCALE = EXPORT_SZ / RENDER_SZ;
  let count = 0;

  const origTC = S.templateCount;
  S.templateCount = templateCount;

  selectedLibIds.forEach(libId => {
    const item = getLibraryItem(libId);
    if (!item) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = EXPORT_SZ;
    tempCanvas.height = EXPORT_SZ;
    const tempCtx = tempCanvas.getContext('2d');

    if (format === 'jpg') {
      tempCtx.fillStyle = '#ffffff';
      tempCtx.fillRect(0, 0, EXPORT_SZ, EXPORT_SZ);
    }

    // 构建槽位：同一张图填满所有槽位
    const slots = [];
    for (let i = 0; i < templateCount; i++) {
      slots.push({ libraryId: libId, scale: 1, offsetX: 0, offsetY: 0 });
    }

    tempCtx.save();
    tempCtx.scale(SCALE, SCALE);
    renderToCtx(tempCtx, slots);
    tempCtx.restore();

    const name = `${item.name.replace(/\.[^.]+$/, '')}_${templateCount}grid_${Date.now()}.${format}`;
    downloadCanvas(tempCanvas, name, format);
    count++;
  });

  S.templateCount = origTC;
  showToast(`批量导出 ${count} 张完成！`);
}

// 批量导出 - 组合：多张图按顺序填充模板
export function batchExportCombine(selectedLibIds, templateCount, format = 'png') {
  if (selectedLibIds.length === 0) { showToast('请选择素材', true); return; }

  const EXPORT_SZ = 1400;
  const SCALE = EXPORT_SZ / RENDER_SZ;

  const origTC = S.templateCount;
  S.templateCount = templateCount;

  // 按顺序填充
  const slots = [];
  for (let i = 0; i < templateCount; i++) {
    const libId = selectedLibIds[i % selectedLibIds.length];
    slots.push({ libraryId: libId, scale: 1, offsetX: 0, offsetY: 0 });
  }

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = EXPORT_SZ;
  tempCanvas.height = EXPORT_SZ;
  const tempCtx = tempCanvas.getContext('2d');

  if (format === 'jpg') {
    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, EXPORT_SZ, EXPORT_SZ);
  }

  tempCtx.save();
  tempCtx.scale(SCALE, SCALE);
  renderToCtx(tempCtx, slots);
  tempCtx.restore();

  S.templateCount = origTC;

  const name = `combine_${templateCount}grid_${Date.now()}.${format}`;
  downloadCanvas(tempCanvas, name, format);
  showToast('组合导出完成！');
}

function downloadCanvas(canvas, filename, format) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL(format === 'jpg' ? 'image/jpeg' : 'image/png', 0.95);
  link.click();
}
