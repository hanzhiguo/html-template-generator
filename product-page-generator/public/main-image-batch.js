/**
 * 批量生成模块
 * 负责批量模式的切换、类型设置、图片渲染、导出等功能
 */

(function() {
  'use strict';

  // 类型常量
  const TYPE_NAMES = { scene: '场景图', white: '白底图', set: '套装图', detail: '细节图', handheld: '手持图' };
  const TYPE_ICONS = { scene: 'image', white: 'square', set: 'package', detail: 'search', handheld: 'hand' };
  const ALL_TYPES = ['scene', 'white', 'set', 'detail', 'handheld'];

  /**
   * 切换批量模式
   */
  function toggleBatchMode() {
    // 批量模式始终开启，此函数保留兼容
    renderBatchTypeSettings();
    window.renderImageList();
  }

  /**
   * 在类别内移动图片顺序
   */
  function moveImageInType(imgIndex, direction) {
    // 找到同类型的图片索引列表
    const sameType = window.state.images
      .map((img, i) => ({ img, i }))
      .filter(item => item.img.type === window.state.images[imgIndex].type);
    
    const posInGroup = sameType.findIndex(item => item.i === imgIndex);
    if (posInGroup < 0) return;
    
    const newPos = posInGroup + direction;
    if (newPos < 0 || newPos >= sameType.length) return;
    
    // 交换在state.images中的位置
    const idxA = sameType[posInGroup].i;
    const idxB = sameType[newPos].i;
    const temp = window.state.images[idxA];
    window.state.images[idxA] = window.state.images[idxB];
    window.state.images[idxB] = temp;
    
    window.updateImageTypeStats();
    window.renderImageList();
    window.render();
    renderBatchTypeSettings();
  }

  /**
   * 渲染批量类型设置
   */
  function renderBatchTypeSettings() {
    const container = document.getElementById('batchTypeSettings');
    if (!container) return;
    
    // 基于当前模板的slotTypes计算
    window.initSlotTypes();
    const slotTypes = window.state.slotTypes;
    const templateCount = window.state.templateCount;
    
    // 统计每个slot类型需要的图片数量和可用数量
    const slotTypeCounts = {};
    slotTypes.forEach(t => {
      slotTypeCounts[t] = (slotTypeCounts[t] || 0) + 1;
    });
    
    // 计算生成数量：取所有slot类型中可用图片数的最小值
    // 如果某类型只有1张，则该类型固定；多张则循环
    let genCount = 1;
    let slotInfo = [];
    
    for (let i = 0; i < templateCount; i++) {
      const type = slotTypes[i];
      const available = window.state.images.filter(img => img.type === type);
      const untyped = window.state.images.filter(img => !img.type);
      const total = available.length + (untyped.length > 0 ? 1 : 0); // 未分类可作为后备
      slotInfo.push({ slot: i, type, available: available.length, total });
      if (available.length > genCount) genCount = available.length;
    }
    
    // 如果没有图片，生成数量为0
    const hasImages = window.state.images.length > 0;
    if (!hasImages) genCount = 0;
    
    let html = `<div style="font-size:10px;color:#6b7280;margin-bottom:6px;">当前模板: ${templateCount}图布局</div>`;
    
    // 显示每个slot的类型和可用图片数
    slotInfo.forEach(info => {
      const typeName = TYPE_NAMES[info.type] || info.type;
      const typeIcon = TYPE_ICONS[info.type] || 'image';
      const color = info.available > 0 ? '#059669' : '#dc2626';
      html += `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:3px 6px;border-radius:4px;background:#fafafa;border:1px solid #e5e7eb;margin-bottom:3px;">
        <span style="font-size:11px;display:flex;align-items:center;gap:3px;"><i data-lucide="${typeIcon}" style="width:12px;height:12px;"></i> 位置${info.slot + 1}: ${typeName}</span>
        <span style="font-size:10px;color:${color};">${info.available}张可用</span>
      </div>`;
    });
    
    // 未分类图片提示
    const untyped = window.state.images.filter(img => !img.type);
    if (untyped.length > 0) {
      html += `<div style="padding:3px 6px;border-radius:4px;background:#fffbeb;border:1px solid #fde68a;margin-bottom:3px;">
        <span style="font-size:10px;color:#92400e;"><i data-lucide="clipboard-list" style="width:11px;height:11px;vertical-align:-1px;"></i> ${untyped.length}张未分类图片不会参与生成</span>
      </div>`;
    }
    
    html += `<div style="font-size:9px;color:#6b7280;margin-top:4px;">按图片顺序对应生成：第1张→第1组，第2张→第2组...<br>拖拽图片可调整顺序和分类</div>`;
    
    container.innerHTML = html;
    if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [container] });
    
    // 更新生成数量
    const batchCount = document.getElementById('batchCount');
    const batchExportBtn = document.getElementById('batchExportBtn');
    batchCount.textContent = genCount;
    if (batchExportBtn) batchExportBtn.disabled = genCount === 0;
  }

  /**
   * 执行批量生成
   */
  async function executeBatchGenerate() {
    // 基于当前模板的slotTypes计算生成数量
    window.initSlotTypes();
    const slotTypes = window.state.slotTypes;
    const templateCount = window.state.templateCount;
    
    // 按类型分组图片
    const typeImageLists = {};
    ALL_TYPES.forEach(type => {
      typeImageLists[type] = window.state.images.filter(img => img.type === type);
    });
    
    // 计算生成数量：所有slot类型中可用图片数的最大值
    let genCount = 0;
    for (let i = 0; i < templateCount; i++) {
      const type = slotTypes[i];
      const available = typeImageLists[type] || [];
      if (available.length > genCount) genCount = available.length;
    }
    
    if (genCount === 0) {
      window.showToast('没有可用图片，请先上传并分类', true);
      return;
    }
    
    // === 收集当前预览中每个slot位置的图片调整数据 ===
    // 用于后续批量导出时复用这些调整数据
    const slotAdjustData = {};
    for (let i = 0; i < templateCount; i++) {
      const type = slotTypes[i];
      // 找到当前预览中该slot位置对应的图片
      const currentSlotImg = window.state.images.find(img => img.type === type);
      if (currentSlotImg) {
        slotAdjustData[type] = {
          scale: currentSlotImg.scale || 1,
          offsetX: currentSlotImg.offsetX || 0,
          offsetY: currentSlotImg.offsetY || 0
        };
      }
    }
    
    const progressEl = document.getElementById('batchProgress');
    const progressBar = document.getElementById('batchProgressBar');
    const progressText = document.getElementById('batchProgressText');
    const resultsEl = document.getElementById('batchResults');
    const resultsList = document.getElementById('batchResultsList');
    const genBtn = document.getElementById('batchExportBtn');
    
    genBtn.disabled = true;
    genBtn.textContent = '⏳ 生成中...';
    progressEl.style.display = 'block';
    resultsEl.style.display = 'none';
    resultsList.innerHTML = '';
    window.state.batchResults = [];
    
    const exportSize = parseInt(window.state.exportSize) || 1400;
    
    for (let r = 0; r < genCount; r++) {
      // 构建当前批次的图片列表：按slotTypes顺序，每个slot取对应类型的第r张
      // 同时复用当前预览中该类型的调整数据
      const batchImages = [];
      for (let i = 0; i < templateCount; i++) {
        const type = slotTypes[i];
        const imgs = typeImageLists[type] || [];
        if (imgs.length > 0) {
          const imgObj = imgs[r % imgs.length];
          // 复用当前预览中该类型的调整数据
          const adjustData = slotAdjustData[type];
          if (adjustData) {
            batchImages.push({
              ...imgObj,
              scale: adjustData.scale,
              offsetX: adjustData.offsetX,
              offsetY: adjustData.offsetY
            });
          } else {
            batchImages.push(imgObj);
          }
        }
      }
      
      if (batchImages.length === 0) continue;
      
      // 更新进度
      const progress = Math.round(((r + 1) / genCount) * 100);
      progressBar.style.width = progress + '%';
      progressText.textContent = `正在生成 ${r + 1}/${genCount}...`;
      
      // 渲染当前批次（JPG格式）
      const dataUrl = await renderBatchImage(batchImages, exportSize, 'image/jpeg', 0.92);
      window.state.batchResults.push(dataUrl);
      
      // 自动下载JPG
      const link = document.createElement('a');
      link.download = `batch_${String(r + 1).padStart(String(genCount).length, '0')}.jpg`;
      link.href = dataUrl;
      link.click();
      
      // 等待一下避免下载被浏览器拦截
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 显示缩略图
      const thumb = document.createElement('img');
      thumb.src = dataUrl;
      thumb.style.cssText = 'width:48px;height:48px;border-radius:4px;border:1px solid #d1d5db;object-fit:cover;cursor:pointer;';
      thumb.title = `第 ${r + 1} 张 (已下载)`;
      resultsList.appendChild(thumb);
    }
    
    progressText.textContent = `完成！共生成并下载 ${genCount} 张JPG图片`;
    resultsEl.style.display = 'block';
    genBtn.innerHTML = '<i data-lucide="refresh-cw" class="icon-inline"></i> 批量导出';
    genBtn.disabled = false;
    window.showToast(`批量生成完成，已下载 ${genCount} 张JPG`);
  }

  /**
   * 渲染批量图片
   */
  function renderBatchImage(batchImageObjs, exportSize, format, quality) {
    return new Promise((resolve) => {
      const EXPORT_SZ = exportSize;
      const SCALE = EXPORT_SZ / 1024;
      
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = EXPORT_SZ;
      tempCanvas.height = EXPORT_SZ;
      const tempCtx = tempCanvas.getContext('2d');
      
      // JPG不支持透明，先填充白色背景
      if (format === 'image/jpeg') {
        tempCtx.fillStyle = '#ffffff';
        tempCtx.fillRect(0, 0, EXPORT_SZ, EXPORT_SZ);
      }
      
      const origImages = [...window.state.images];
      const origDisplayScale = window.displayScale;
      const origDimensions = window.state.dimensions;
      const origRenderCtx = window._renderCtx;
      
      window.state.images = batchImageObjs;
      window._renderCtx = tempCtx;
      
      tempCtx.save();
      tempCtx.scale(SCALE, SCALE);
      
      window.state.dimensions = origDimensions.map(d => ({
        ...d,
        x1: d.x1,
        y1: d.y1,
        x2: d.x2,
        y2: d.y2
      }));
      window.displayScale = 1;
      
      try {
        window.render();
      } catch (e) {
        console.error('Batch render error:', e);
      }
      
      tempCtx.restore();
      window._renderCtx = origRenderCtx;
      window.state.images = origImages;
      window.state.dimensions = origDimensions;
      window.displayScale = origDisplayScale;
      
      resolve(tempCanvas.toDataURL(format || 'image/png', quality || 1));
    });
  }

  /**
   * 下载单个批量图片
   */
  function downloadSingleBatch(dataUrl, index) {
    const link = document.createElement('a');
    link.download = `batch_${index}.jpg`;
    link.href = dataUrl;
    link.click();
  }

  /**
   * 下载所有批量图片
   */
  function downloadAllBatch() {
    window.state.batchResults.forEach((dataUrl, i) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.download = `batch_${i + 1}.jpg`;
        link.href = dataUrl;
        link.click();
      }, i * 200);
    });
    window.showToast(`开始下载 ${window.state.batchResults.length} 张JPG图片`);
  }

  // 暴露到全局
  window.TYPE_NAMES = TYPE_NAMES;
  window.TYPE_ICONS = TYPE_ICONS;
  window.ALL_TYPES = ALL_TYPES;
  window.toggleBatchMode = toggleBatchMode;
  window.moveImageInType = moveImageInType;
  window.renderBatchTypeSettings = renderBatchTypeSettings;
  window.executeBatchGenerate = executeBatchGenerate;
  window.renderBatchImage = renderBatchImage;
  window.downloadSingleBatch = downloadSingleBatch;
  window.downloadAllBatch = downloadAllBatch;

})();
