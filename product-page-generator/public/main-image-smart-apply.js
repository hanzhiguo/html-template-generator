/**
 * 智能应用模块
 * 负责智能布局应用、图片自动分类等功能
 */

(function() {
  'use strict';

  /**
   * 智能应用图片组到模板
   */
  function smartApplyToTemplate() {
    if (window.state.images.length === 0) { 
      window.showToast('没有可用的图片', true); 
      return; 
    }
    
    // 自动推断slotTypes：根据各类型组的数量智能分配
    const typeGroups = { scene: [], white: [], set: [], detail: [], handheld: [] };
    window.state.images.forEach((img, i) => {
      if (typeGroups[img.type]) typeGroups[img.type].push(i);
    });
    
    const availableTypes = Object.keys(typeGroups).filter(t => typeGroups[t].length > 0);
    if (availableTypes.length === 0) { 
      window.showToast('没有已分类的图片', true); 
      return; 
    }
    
    const templateCount = window.state.templateCount;
    window.initSlotTypes();
    
    if (availableTypes.length === 1) {
      // 只有一种类型，全部用该类型
      window.state.slotTypes = Array(templateCount).fill(availableTypes[0]);
    } else {
      // 多种类型：按默认策略分配（场景→白底→套装→细节）
      const priorityOrder = ['scene', 'white', 'handheld', 'set', 'detail'];
      let slotIdx = 0;
      for (const type of priorityOrder) {
        if (typeGroups[type].length > 0 && slotIdx < templateCount) {
          window.state.slotTypes[slotIdx++] = type;
        }
      }
    }
    
    window.applySlotTypes();
    const names = [...new Set(window.state.slotTypes)].map(t => 
      ({ scene: '场景图', white: '白底图', set: '套装图', detail: '细节图', handheld: '手持图' })[t] || t
    ).join('、');
    window.showToast(`智能分配：${names}`);
  }

  /**
   * 将图片缩小到指定最大边长，返回base64（不含前缀）
   */
  function resizeImageToBase64(img, maxSize = 500) {
    const canvas = document.createElement('canvas');
    let w = img.naturalWidth || img.width;
    let h = img.naturalHeight || img.height;
    const ratio = Math.min(maxSize / w, maxSize / h, 1);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    // 返回纯base64（去掉data:image/...;base64,前缀）
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    return dataUrl.split(',')[1];
  }

  /**
   * 自动分类所有未分类的图片（上传后自动调用）
   */
  async function autoClassifyImages() {
    const token = window.getToken();
    if (!token) { 
      window.showToast('未登录，使用本地 Ollama 分类...', false); 
    }
    
    if (window.state.images.length === 0) { 
      window.showToast('请先上传图片', true); 
      return; 
    }
    
    // 找出未分类的图片
    let toClassify = window.state.images
      .map((img, i) => ({ img, i }))
      .filter(item => !item.img.type);
    
    if (toClassify.length === 0) {
      window.showToast('所有图片已分类，无需重复分类');
      return;
    }
    
    window.showToast(`正在AI分类 ${toClassify.length} 张图片...`);
    
    try {
      // 缩小图片并转为base64
      const base64Images = toClassify.map(item => {
        // 使用原始图片（已加载完成），previewImg可能还未加载完成导致base64为空
        return resizeImageToBase64(item.img.imgOriginal || item.img.img || item.img, 500);
      });
      
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = 'Bearer ' + token;
      const res = await fetch('/api/image-classify', {
        method: 'POST',
        headers,
        body: JSON.stringify({ images: base64Images })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '分类失败');
      }
      
      const data = await res.json();
      
      if (data.success && data.results) {
        let classifiedCount = 0;
        data.results.forEach((result, idx) => {
          if (toClassify[idx] && result.type) {
            window.state.images[toClassify[idx].i].type = result.type;
            classifiedCount++;
          }
        });
        
        window.updateImageTypeStats();
        window.renderImageList();
        window.render();
        window.showToast(`已自动分类 ${classifiedCount} 张图片`);
      }
    } catch (e) {
      console.error('自动分类失败:', e);
      window.showToast('自动分类失败: ' + e.message, true);
    }
  }

  // 暴露到全局
  window.smartApplyToTemplate = smartApplyToTemplate;
  window.resizeImageToBase64 = resizeImageToBase64;
  window.autoClassifyImages = autoClassifyImages;

})();
