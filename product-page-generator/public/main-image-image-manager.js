/**
 * 图片管理模块
 * 负责图片上传、删除、排序、拖拽分类、多选调整等功能
 */

(function() {
  'use strict';

  // 预览图最大边长（预览canvas是1024，预览图不需要更大）
  const PREVIEW_MAX_SIZE = 1024;

  /**
   * 创建低分辨率预览版Image对象
   * @param {HTMLImageElement} originalImg 原始图片
   * @param {string} originalSrc 原始base64 src
   * @returns {{ previewImg: HTMLImageElement, previewSrc: string }}
   */
  function createPreviewImage(originalImg, originalSrc) {
    const w = originalImg.naturalWidth || originalImg.width;
    const h = originalImg.naturalHeight || originalImg.height;
    const maxDim = Math.max(w, h);

    // 如果原图本身就小于预览尺寸，直接用原图
    if (maxDim <= PREVIEW_MAX_SIZE) {
      return { previewImg: originalImg, previewSrc: originalSrc };
    }

    // 缩放到PREVIEW_MAX_SIZE
    const ratio = PREVIEW_MAX_SIZE / maxDim;
    const tw = Math.round(w * ratio);
    const th = Math.round(h * ratio);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = tw;
    tempCanvas.height = th;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(originalImg, 0, 0, tw, th);

    // PNG 图片保留透明通道，JPEG 压缩不透明图片
    const isPng = originalSrc && originalSrc.startsWith('data:image/png');
    const previewSrc = isPng
      ? tempCanvas.toDataURL('image/png')
      : tempCanvas.toDataURL('image/jpeg', 0.85);
    const previewImg = new Image();
    previewImg.src = previewSrc;

    return { previewImg, previewSrc };
  }

  /**
   * 处理文件上传
   */
  function handleFiles(files) {
    const filesToProcess = Array.from(files);
    let processedCount = 0;
    
    filesToProcess.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // 创建低分辨率预览版本
          const { previewImg, previewSrc } = createPreviewImage(img, e.target.result);

          window.state.images.push({ 
            src: previewSrc,        // 低分辨率src，用于缩略图列表
            img: previewImg,        // 低分辨率Image，用于预览canvas渲染
            imgOriginal: img,       // 原始Image，用于导出
            srcOriginal: e.target.result, // 原始base64，用于导出
            name: file.name,
            type: null,  // 上传时不区分类型，由AI自动分类
            scale: 1,
            offsetX: 0,
            offsetY: 0
          });
          document.getElementById('imageCount').textContent = window.state.images.length;
          window.updateImageTypeStats();
          renderImageList();
          window.render();
          
          processedCount++;
          if (processedCount === filesToProcess.length) {
            // 首次上传图片时自动分类，后续上传不再自动分类（避免卡顿）
            if (!window.state.classifiedOnce) {
              window.state.classifiedOnce = true;
              window.autoClassifyImages();
            } else {
              // 后续上传只对未分类图片分类
              const unclassified = window.state.images.filter(img => !img.type).length;
              if (unclassified > 0) {
                window.autoClassifyImages();
              }
            }
          }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * 渲染图片列表
   */
  function renderImageList() {
    const types = ['scene', 'white', 'set', 'detail', null];
    const typeFullNames = { scene: '场景图', white: '白底图', set: '套装图', detail: '细节图' };
    
    // 按类型分组渲染
    types.forEach(type => {
      const listId = type ? `${type}List` : 'untypedList';
      const groupId = type ? `${type}Group` : 'untypedGroup';
      const countId = type ? `${type}Count` : 'untypedCount';
      
      const list = document.getElementById(listId);
      const group = document.getElementById(groupId);
      const countEl = document.getElementById(countId);
      
      if (!list || !group) return;
      
      // 筛选该类型的图片
      const typeImages = window.state.images.map((img, i) => ({ img, i })).filter(item => item.img.type === type);
      
      // 更新计数
      if (countEl) countEl.textContent = typeImages.length;
      
      // 始终显示所有分类（即使为空，方便拖入）
      group.style.display = 'block';
      
      // 渲染图片缩略图
      list.innerHTML = typeImages.map(({ img, i }) => {
        const isSelected = window.state.multiSelectedIndices.includes(i);
        return `
        <div class="image-item ${isSelected ? 'selected' : ''}"
             data-image-index="${i}"
             onclick="onImageListClick(${i}, event)"
             draggable="true"
             style="${window.state.batchMode ? 'padding-bottom:28px;' : ''}">
          <input type="checkbox" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation(); toggleImageSelect(${i}, event)" title="选择/取消选择">
          <img src="${img.src}" alt="" draggable="false">
          <span class="order">${i + 1}</span>
          ${window.state.batchMode ? `<div style="position:absolute;bottom:2px;left:2px;right:2px;display:flex;gap:2px;z-index:3;">
            <span style="flex:1;background:#6366f1;color:white;font-size:8px;padding:2px;border-radius:2px;text-align:center;">${window.TYPE_NAMES[img.type] || '未分类'}</span>
          </div>` : ''}
          <button class="delete-btn" onclick="event.stopPropagation(); deleteImage(${i})">×</button>
        </div>
      `}).join('');
    });
    
    // 绑定drop zone事件（每次渲染后重新绑定）
    bindDropZoneEvents();
    
    // 绑定缩略图拖拽事件（事件委托）
    const imageListByType = document.getElementById('imageListByType');
    if (imageListByType && !imageListByType._dragBound) {
      imageListByType._dragBound = true;
      imageListByType.addEventListener('dragstart', (e) => {
        const item = e.target.closest('.image-item');
        if (!item) return;
        const index = parseInt(item.dataset.imageIndex);
        if (isNaN(index)) return;
        
        let dragIndices = [index];
        if (window.state.multiSelectedIndices.includes(index) && window.state.multiSelectedIndices.length > 1) {
          dragIndices = [...window.state.multiSelectedIndices];
        }
        e.dataTransfer.setData('text/plain', JSON.stringify(dragIndices));
        e.dataTransfer.effectAllowed = 'move';
      });
    }
  }

  /**
   * 绑定分类拖拽区域事件
   */
  function bindDropZoneEvents() {
    document.querySelectorAll('.drop-zone').forEach(zone => {
      const targetType = zone.dataset.type;
      
      zone.ondragover = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        zone.classList.add('drag-over');
      };
      zone.ondragleave = (e) => {
        // 只在真正离开zone时移除样式
        if (!zone.contains(e.relatedTarget)) {
          zone.classList.remove('drag-over');
        }
      };
      zone.ondrop = (e) => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        handleTypeDrop(e, targetType);
      };
    });
    
    // header也作为drop target
    document.querySelectorAll('.image-type-header[data-type]').forEach(header => {
      const targetType = header.dataset.type;
      const row = header.nextElementSibling;
      
      header.ondragover = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (row) row.classList.add('drag-over');
      };
      header.ondragleave = (e) => {
        if (row && !row.contains(e.relatedTarget) && e.relatedTarget !== row) {
          row.classList.remove('drag-over');
        }
      };
      header.ondrop = (e) => {
        e.preventDefault();
        if (row) row.classList.remove('drag-over');
        handleTypeDrop(e, targetType);
      };
    });
  }

  /**
   * 拖拽放置到分类区域
   */
  function handleTypeDrop(event, targetType) {
    // 移除所有drag-over样式
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    
    try {
      const dragIndices = JSON.parse(event.dataTransfer.getData('text/plain'));
      if (!Array.isArray(dragIndices)) return;
      
      // 检测是否拖拽到了某个缩略图上（用于同分类内排序）
      const dropTarget = event.target.closest('.image-item');
      const dropTargetIndex = dropTarget ? parseInt(dropTarget.dataset.imageIndex) : -1;
      
      let needReorder = false;
      let reorderTargetIdx = -1;
      
      // 如果拖拽目标在同分类内，执行排序
      if (dropTargetIndex >= 0 && window.state.images[dropTargetIndex] && window.state.images[dropTargetIndex].type === (targetType || null)) {
        // 检查是否所有拖拽图片都在同一分类
        const allSameType = dragIndices.every(idx => window.state.images[idx] && window.state.images[idx].type === (targetType || null));
        if (allSameType && dragIndices.length > 0) {
          reorderTargetIdx = dropTargetIndex;
          needReorder = true;
        }
      }
      
      if (needReorder) {
        // 同分类内排序：将拖拽图片移到目标位置
        const targetImg = window.state.images[reorderTargetIdx];
        const dragImgs = dragIndices.map(idx => window.state.images[idx]);
        
        // 从数组中移除拖拽图片（从后往前删避免索引偏移）
        const sortedIndices = [...dragIndices].sort((a, b) => b - a);
        sortedIndices.forEach(idx => window.state.images.splice(idx, 1));
        
        // 找到目标位置的新索引
        let newTargetIdx = window.state.images.indexOf(targetImg);
        if (newTargetIdx === -1) newTargetIdx = window.state.images.length;
        
        // 插入拖拽图片到目标位置
        dragImgs.forEach((img, i) => {
          window.state.images.splice(newTargetIdx + i, 0, img);
        });
        
        window.updateImageTypeStats();
        renderImageList();
        // 重新按slotTypes分配，确保类型与位置对应
        window.applySlotTypes();
        if (window.state.batchMode) window.renderBatchTypeSettings();
        window.showToast('图片顺序已调整');
        return;
      }
      
      // 跨分类拖拽：改变图片分类
      let changed = 0;
      dragIndices.forEach(idx => {
        if (idx >= 0 && idx < window.state.images.length && window.state.images[idx].type !== (targetType || null)) {
          window.state.images[idx].type = targetType || null;
          changed++;
        }
      });
      
      if (changed > 0) {
        window.updateImageTypeStats();
        renderImageList();
        window.applySlotTypes();
        if (window.state.batchMode) window.renderBatchTypeSettings();
        const typeName = targetType ? ({ scene: '场景图', white: '白底图', set: '套装图', detail: '细节图' })[targetType] : '未分类';
        window.showToast(`已将 ${changed} 张图片移至${typeName}`);
      }
    } catch (e) {
      // ignore
    }
  }

  /**
   * 图片列表点击（支持Ctrl/Cmd多选、Shift范围选）
   */
  function onImageListClick(index, event) {
    if (event && (event.ctrlKey || event.metaKey)) {
      // Ctrl/Cmd+点击：切换选中
      const idx = window.state.multiSelectedIndices.indexOf(index);
      if (idx > -1) {
        window.state.multiSelectedIndices.splice(idx, 1);
        if (window.state.multiSelectedIndices.length === 0) {
          window.state.multiSelectedIndices = [index];
        }
      } else {
        window.state.multiSelectedIndices.push(index);
      }
      setActiveImage(window.state.multiSelectedIndices[window.state.multiSelectedIndices.length - 1]);
    } else if (event && event.shiftKey) {
      // Shift+点击：范围选择（从上次活跃图片到当前图片）
      const lastIdx = window.state.activeImageIndex;
      if (lastIdx >= 0 && lastIdx !== index) {
        const start = Math.min(lastIdx, index);
        const end = Math.max(lastIdx, index);
        for (let i = start; i <= end; i++) {
          if (!window.state.multiSelectedIndices.includes(i)) {
            window.state.multiSelectedIndices.push(i);
          }
        }
      } else {
        if (!window.state.multiSelectedIndices.includes(index)) {
          window.state.multiSelectedIndices.push(index);
        }
      }
      setActiveImage(index);
    } else {
      // 普通点击：清除多选，设为活跃
      window.state.multiSelectedIndices = [index];
      setActiveImage(index);
    }
    updateImageAdjustPanelForMulti();
    renderImageList();
    window.render();
  }

  /**
   * 复选框切换选中
   */
  function toggleImageSelect(index, event) {
    const idx = window.state.multiSelectedIndices.indexOf(index);
    if (idx > -1 && window.state.multiSelectedIndices.length > 1) {
      // 取消选中
      window.state.multiSelectedIndices.splice(idx, 1);
    } else if (idx === -1) {
      // 添加选中
      window.state.multiSelectedIndices.push(index);
    }
    if (window.state.multiSelectedIndices.length > 0) {
      setActiveImage(window.state.multiSelectedIndices[window.state.multiSelectedIndices.length - 1]);
    }
    updateImageAdjustPanelForMulti();
    renderImageList();
    window.render();
  }

  /**
   * 按类型全选图片
   * @param {string|null} type 图片类型：'scene', 'white', 'set', 'detail', null(未分类)
   */
  function selectAllOfType(type) {
    // 找到该类型的所有图片索引
    const indices = window.state.images
      .map((img, i) => ({ img, i }))
      .filter(item => item.img.type === type)
      .map(item => item.i);

    if (indices.length === 0) {
      window.showToast('该类型没有图片', true);
      return;
    }

    // 检查是否已经全选了该类型
    const alreadySelected = indices.every(i => window.state.multiSelectedIndices.includes(i));

    if (alreadySelected && window.state.multiSelectedIndices.length === indices.length) {
      // 已经全选且只有该类型，则取消全选
      window.state.multiSelectedIndices = [];
      window.showToast('已取消全选');
    } else {
      // 全选该类型
      window.state.multiSelectedIndices = indices;
      const typeNames = { scene: '场景图', white: '白底图', set: '套装图', detail: '细节图' };
      window.showToast(`已全选 ${typeNames[type] || '未分类'} 组 (${indices.length}张)`);
    }

    if (window.state.multiSelectedIndices.length > 0) {
      setActiveImage(window.state.multiSelectedIndices[window.state.multiSelectedIndices.length - 1]);
    }
    updateImageAdjustPanelForMulti();
    renderImageList();
    window.render();
  }

  /**
   * 多选时更新调整面板标题
   */
  function updateImageAdjustPanelForMulti() {
    const count = window.state.multiSelectedIndices.length;
    if (count > 1) {
      document.getElementById('adjustImageName').textContent = `(已选${count}张)`;
    }
  }

  /**
   * 设置活跃图片
   */
  function setActiveImage(index) {
    if (index < 0 || index >= window.state.images.length) {
      window.state.activeImageIndex = -1;
      document.getElementById('imageAdjustPanel').style.display = 'none';
      return;
    }
    window.state.activeImageIndex = index;
    // 如果该图片不在多选列表中，将其设为唯一选中
    if (!window.state.multiSelectedIndices.includes(index)) {
      window.state.multiSelectedIndices = [index];
    }
    const img = window.state.images[index];
    const panel = document.getElementById('imageAdjustPanel');
    panel.style.display = 'block';
    
    document.getElementById('adjustImageName').textContent = `(${index + 1}/${window.state.images.length} ${img.name || ''})`;
    document.getElementById('imgScaleValue').value = Math.round(img.scale * 100);
    document.getElementById('imgScaleDisplay').value = Math.round(img.scale * 100);
    document.getElementById('imgOffsetX').value = img.offsetX || 0;
    document.getElementById('imgOffsetXDisplay').value = img.offsetX || 0;
    document.getElementById('imgOffsetY').value = img.offsetY || 0;
    document.getElementById('imgOffsetYDisplay').value = img.offsetY || 0;
    
    window.render();
  }

  /**
   * 图片调整面板变化时
   */
  function onImageAdjust() {
    const idx = window.state.activeImageIndex;
    if (idx < 0 || idx >= window.state.images.length) return;

    const scaleRange = document.getElementById('imgScaleValue');
    const scaleNum = document.getElementById('imgScaleDisplay');
    const offsetXRange = document.getElementById('imgOffsetX');
    const offsetXNum = document.getElementById('imgOffsetXDisplay');
    const offsetYRange = document.getElementById('imgOffsetY');
    const offsetYNum = document.getElementById('imgOffsetYDisplay');

    // 判断哪个输入框触发了变化，以该输入框的值为准同步到另一个
    let scale, offsetX, offsetY;

    if (document.activeElement === scaleNum) {
      scale = (parseInt(scaleNum.value) || 100) / 100;
      scaleRange.value = Math.round(scale * 100);
    } else {
      scale = (parseInt(scaleRange.value) || 100) / 100;
      scaleNum.value = Math.round(scale * 100);
    }

    if (document.activeElement === offsetXNum) {
      offsetX = parseInt(offsetXNum.value) || 0;
      offsetXRange.value = offsetX;
    } else {
      offsetX = parseInt(offsetXRange.value) || 0;
      offsetXNum.value = offsetX;
    }

    if (document.activeElement === offsetYNum) {
      offsetY = parseInt(offsetYNum.value) || 0;
      offsetYRange.value = offsetY;
    } else {
      offsetY = parseInt(offsetYRange.value) || 0;
      offsetYNum.value = offsetY;
    }

    // 如果多选，调整所有选中图片
    if (window.state.multiSelectedIndices.length > 1) {
      window.state.multiSelectedIndices.forEach(i => {
        if (i < window.state.images.length) {
          window.state.images[i].scale = Math.max(0.1, Math.min(3, scale));
          window.state.images[i].offsetX = offsetX;
          window.state.images[i].offsetY = offsetY;
        }
      });
    } else {
      window.state.images[idx].scale = Math.max(0.1, Math.min(3, scale));
      window.state.images[idx].offsetX = offsetX;
      window.state.images[idx].offsetY = offsetY;
    }
    
    renderImageList();
    window.render();
  }

  /**
   * 重置当前图片调整
   */
  function resetActiveImageAdjust() {
    if (window.state.multiSelectedIndices.length > 1) {
      window.state.multiSelectedIndices.forEach(idx => {
        if (idx < window.state.images.length) {
          window.state.images[idx].scale = 1;
          window.state.images[idx].offsetX = 0;
          window.state.images[idx].offsetY = 0;
        }
      });
    } else {
      const idx = window.state.activeImageIndex;
      if (idx < 0 || idx >= window.state.images.length) return;
      window.state.images[idx].scale = 1;
      window.state.images[idx].offsetX = 0;
      window.state.images[idx].offsetY = 0;
    }
    setActiveImage(window.state.activeImageIndex);
  }

  /**
   * 应用当前图片的调整到所有图片
   */
  function applyAdjustToAll() {
    const idx = window.state.activeImageIndex;
    if (idx < 0 || idx >= window.state.images.length) return;
    const src = window.state.images[idx];
    window.state.images.forEach(img => {
      img.scale = src.scale;
      img.offsetX = src.offsetX;
      img.offsetY = src.offsetY;
    });
    renderImageList();
    window.render();
    window.showToast('已应用到全部图片');
  }

  /**
   * 删除图片
   */
  function deleteImage(index) {
    const deletedType = window.state.images[index]?.type;
    window.state.images.splice(index, 1);
    // 清理多选索引
    window.state.multiSelectedIndices = window.state.multiSelectedIndices
      .filter(i => i !== index)
      .map(i => i > index ? i - 1 : i);
    if (window.state.activeImageIndex === index) {
      window.state.activeImageIndex = -1;
      document.getElementById('imageAdjustPanel').style.display = 'none';
    } else if (window.state.activeImageIndex > index) {
      window.state.activeImageIndex--;
    }
    document.getElementById('imageCount').textContent = window.state.images.length;
    window.updateImageTypeStats();
    renderImageList();
    // 重新按slotTypes分配图片，确保同类型图片优先填充
    window.applySlotTypes();
    if (window.state.batchMode) window.renderBatchTypeSettings();
  }

  /**
   * 获取Token
   */
  function getToken() {
    return window.app?.token || localStorage.getItem('token');
  }

  // 暴露到全局
  window.handleFiles = handleFiles;
  window.renderImageList = renderImageList;
  window.bindDropZoneEvents = bindDropZoneEvents;
  window.handleTypeDrop = handleTypeDrop;
  window.onImageListClick = onImageListClick;
  window.toggleImageSelect = toggleImageSelect;
  window.selectAllOfType = selectAllOfType;
  window.updateImageAdjustPanelForMulti = updateImageAdjustPanelForMulti;
  window.setActiveImage = setActiveImage;
  window.onImageAdjust = onImageAdjust;
  window.resetActiveImageAdjust = resetActiveImageAdjust;
  window.applyAdjustToAll = applyAdjustToAll;
  window.deleteImage = deleteImage;
  window.getToken = getToken;

})();
