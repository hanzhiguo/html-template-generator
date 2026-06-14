/**
 * 导出设置模块
 * 负责导出设置弹窗、格式选择、质量控制等功能
 */

(function() {
  'use strict';

  // 当前导出格式（暴露到 window）
  window.currentExportFormat = 'png';

  /**
   * 打开设置弹窗
   */
  function openSettingsModal() {
    const modal = document.getElementById('settingsModal');
    modal.style.display = 'flex';
    // 同步当前设置到弹窗
    const modalSelect = document.getElementById('exportSizeSelectModal');
    if (modalSelect) modalSelect.value = window.state.exportSize;
  }

  /**
   * 关闭设置弹窗
   */
  function closeSettingsModal() {
    document.getElementById('settingsModal').style.display = 'none';
  }

  /**
   * 从弹窗更新导出尺寸
   */
  function updateExportSizeFromModal() {
    const select = document.getElementById('exportSizeSelectModal');
    window.state.exportSize = parseInt(select.value);
    // 更新导出按钮文本
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
      exportBtn.innerHTML = `<i data-lucide="camera" class="icon-inline"></i> 导出图片 (${window.state.exportSize}×${window.state.exportSize})`;
      if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [exportBtn] });
    }
    // 更新预览标题
    const previewTitle = document.getElementById('previewTitle');
    if (previewTitle) previewTitle.textContent = `输出尺寸: ${window.state.exportSize} × ${window.state.exportSize}`;
  }

  /**
   * 选择导出格式
   */
  function selectExportFormat(format, btn) {
    window.currentExportFormat = format;
    document.querySelectorAll('.export-format-btn').forEach(b => {
      b.style.borderColor = '#d1d5db';
      b.style.background = '#fff';
      b.style.color = '#374151';
    });
    btn.style.borderColor = '#3b82f6';
    btn.style.background = '#eff6ff';
    btn.style.color = '#1e40af';
    // JPG/WebP显示质量选项
    const qualityRow = document.getElementById('jpgQualityRow');
    qualityRow.style.display = (format === 'jpg' || format === 'webp') ? 'block' : 'none';
  }

  /**
   * 从弹窗导出图片
   */
  function exportFromModal() {
    closeSettingsModal();
    const quality = document.getElementById('exportQuality')?.value || 92;
    window.exportImage(window.currentExportFormat, parseInt(quality) / 100);
  }

  /**
   * 显示Toast提示
   */
  function showToast(message, isError = false) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'toast' + (isError ? ' error' : '');
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }

  // 暴露函数到全局
  window.openSettingsModal = openSettingsModal;
  window.closeSettingsModal = closeSettingsModal;
  window.updateExportSizeFromModal = updateExportSizeFromModal;
  window.selectExportFormat = selectExportFormat;
  window.exportFromModal = exportFromModal;
  window.showToast = showToast;

})();
