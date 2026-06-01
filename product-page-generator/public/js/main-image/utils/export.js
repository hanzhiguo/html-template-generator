import { state } from '../core/state.js';
import { RENDER_SZ, render, getCtx, setDisplayScale } from '../core/canvas.js';
import { showToast } from './toast.js';

export function exportImage(format = 'png') {
  console.log('开始导出...', format);
  
  if (state.images.length === 0) { 
    showToast('请先上传图片', true); 
    return; 
  }
  
  console.log('图片数量:', state.images.length);
  
  const EXPORT_SZ = 1400;
  const SCALE = EXPORT_SZ / RENDER_SZ;
  
  console.log('导出尺寸:', EXPORT_SZ, '缩放比例:', SCALE);
  
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = EXPORT_SZ; 
  tempCanvas.height = EXPORT_SZ;
  const tempCtx = tempCanvas.getContext('2d');
  
  if (format === 'jpg') {
    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, EXPORT_SZ, EXPORT_SZ);
  }
  
  const origDisplayScale = 1;
  setDisplayScale(1);
  
  const renderCtxBackup = window.renderCtx;
  window.renderCtx = tempCtx;
  
  tempCtx.save();
  tempCtx.scale(SCALE, SCALE);
  
  try {
    console.log('开始渲染...');
    render();
    console.log('渲染完成');
  } catch (e) {
    console.error('Export error:', e);
    showToast('导出失败: ' + e.message, true);
    window.renderCtx = renderCtxBackup;
    setDisplayScale(origDisplayScale);
    return;
  }
  
  tempCtx.restore();
  window.renderCtx = renderCtxBackup;
  setDisplayScale(origDisplayScale);
  
  console.log('生成下载链接...');
  const link = document.createElement('a');
  link.download = `main-image-${Date.now()}.${format}`;
  link.href = tempCanvas.toDataURL(format === 'jpg' ? 'image/jpeg' : 'image/png', 0.95);
  
  console.log('触发下载...');
  link.click();
  
  showToast('导出成功！');
  console.log('导出完成');
}
