/**
 * Slot类型管理模块
 * 负责模板位置的图片类型分配、应用、菜单显示等功能
 */

(function() {
  'use strict';

  /**
   * 初始化slotTypes，为每个模板位置分配默认类型
   */
  function initSlotTypes() {
    const count = window.state.templateCount;
    // 默认分配策略：位置0=场景图，位置1=白底图，位置2=套装图，其余=细节图
    const defaultTypes = ['scene', 'white', 'set', 'detail'];
    while (window.state.slotTypes.length < count) {
      const idx = window.state.slotTypes.length;
      window.state.slotTypes.push(idx < defaultTypes.length ? defaultTypes[idx] : 'detail');
    }
    window.state.slotTypes = window.state.slotTypes.slice(0, count);
  }

  /**
   * 设置某个位置的图片类型，并立即应用
   */
  function setSlotType(slotIndex, type) {
    if (slotIndex < 0 || slotIndex >= window.state.templateCount) return;
    window.state.slotTypes[slotIndex] = type;
    applySlotTypes();
  }

  /**
   * 根据 slotTypes 将对应类型组的图片分配到各位置（核心函数）
   */
  function applySlotTypes() {
    const templateCount = window.state.templateCount;
    initSlotTypes();
    
    // 按类型分组索引
    const typeGroups = { scene: [], white: [], set: [], detail: [], untyped: [] };
    window.state.images.forEach((img, i) => {
      const t = img.type;
      if (typeGroups[t]) typeGroups[t].push(i);
      else typeGroups.untyped.push(i);
    });
    
    // 为每个slot分配图片索引
    const assigned = [];  // assigned[slotIndex] = imageIndex
    const usedIndices = new Set();
    
    for (let i = 0; i < templateCount; i++) {
      const slotType = window.state.slotTypes[i];
      let found = -1;
      
      // 优先从slotType对应的组取
      if (slotType && typeGroups[slotType]) {
        for (const idx of typeGroups[slotType]) {
          if (!usedIndices.has(idx)) { found = idx; break; }
        }
      }
      
      // 没找到则按优先级从其他组取
      if (found === -1) {
        for (const type of ['scene', 'white', 'set', 'detail', 'untyped']) {
          for (const idx of typeGroups[type]) {
            if (!usedIndices.has(idx)) { found = idx; break; }
          }
          if (found !== -1) break;
        }
      }
      
      if (found !== -1) {
        assigned.push(found);
        usedIndices.add(found);
      }
    }
    
    if (assigned.length === 0) { 
      window.renderImageList(); 
      window.render(); 
      return; 
    }
    
    // 将分配的图片移到前N个位置（保留图片的type不变）
    const newImages = [...window.state.images];
    for (let i = 0; i < assigned.length; i++) {
      const sourceIdx = assigned[i];
      const targetIdx = i;
      if (sourceIdx === targetIdx) continue;
      
      // 找到source在newImages中的当前位置
      let currentPos = -1;
      for (let j = 0; j < newImages.length; j++) {
        if (window.state.images[sourceIdx] === newImages[j]) { currentPos = j; break; }
      }
      if (currentPos !== -1 && currentPos !== targetIdx) {
        const temp = newImages[targetIdx];
        newImages[targetIdx] = newImages[currentPos];
        newImages[currentPos] = temp;
      }
    }
    
    window.state.images = newImages;
    updateImageTypeStats();
    window.renderImageList();
    window.render();
  }

  /**
   * 在预览区点击图片时弹出类型选择菜单
   */
  function showSlotTypeMenu(slotIndex, mouseEvent) {
    // 移除已有菜单
    const existing = document.getElementById('slotTypeMenu');
    if (existing) existing.remove();
    
    const typeOptions = [
      { type: 'scene', label: '🏞 场景图', color: '#10b981' },
      { type: 'white', label: '⬜ 白底图', color: '#6b7280' },
      { type: 'set',   label: '📦 套装图', color: '#8b5cf6' },
      { type: 'detail',label: '🔍 细节图', color: '#f59e0b' }
    ];
    
    const currentType = window.state.slotTypes[slotIndex];
    
    const menu = document.createElement('div');
    menu.id = 'slotTypeMenu';
    menu.style.cssText = `position:fixed;z-index:10000;background:#fff;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.15);padding:6px;min-width:120px;`;
    menu.style.left = mouseEvent.clientX + 'px';
    menu.style.top = mouseEvent.clientY + 'px';
    
    const title = document.createElement('div');
    title.style.cssText = 'font-size:11px;color:#9ca3af;padding:4px 8px;font-weight:600;';
    title.textContent = `位置 ${slotIndex + 1} 使用图片类型`;
    menu.appendChild(title);
    
    typeOptions.forEach(opt => {
      const btn = document.createElement('div');
      btn.style.cssText = `padding:6px 10px;border-radius:4px;cursor:pointer;font-size:12px;display:flex;align-items:center;gap:6px;transition:background 0.15s;`;
      if (opt.type === currentType) {
        btn.style.background = '#eff6ff';
        btn.style.fontWeight = '600';
      }
      btn.innerHTML = `<span style="width:8px;height:8px;border-radius:50%;background:${opt.color};flex-shrink:0;"></span>${opt.label}${opt.type === currentType ? ' ✓' : ''}`;
      btn.addEventListener('mouseenter', () => { btn.style.background = '#f3f4f6'; });
      btn.addEventListener('mouseleave', () => { btn.style.background = opt.type === currentType ? '#eff6ff' : ''; });
      btn.addEventListener('click', () => {
        setSlotType(slotIndex, opt.type);
        menu.remove();
        window.showToast(`位置 ${slotIndex + 1} 已设为${opt.label}`);
      });
      menu.appendChild(btn);
    });
    
    document.body.appendChild(menu);
    
    // 点击其他地方关闭菜单
    const closeMenu = (e) => {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('mousedown', closeMenu);
      }
    };
    setTimeout(() => document.addEventListener('mousedown', closeMenu), 10);
  }

  /**
   * 更新图片类型统计
   */
  function updateImageTypeStats() {
    const counts = { scene: 0, white: 0, set: 0, detail: 0 };
    window.state.images.forEach(img => {
      const t = img.type;
      if (counts[t] !== undefined) counts[t]++;
    });
    
    document.getElementById('sceneCount').textContent = counts.scene;
    document.getElementById('whiteCount').textContent = counts.white;
    document.getElementById('setCount').textContent = counts.set;
    document.getElementById('detailCount').textContent = counts.detail;
    
    // 更新 imageTypes 索引
    window.state.imageTypes = { scene: [], white: [], set: [], detail: [] };
    window.state.images.forEach((img, i) => {
      const t = img.type;
      if (window.state.imageTypes[t]) window.state.imageTypes[t].push(i);
    });
    
    // 批量模式时同步更新设置面板
    if (window.state.batchMode) window.renderBatchTypeSettings();
  }

  /**
   * 循环切换图片类型
   */
  function cycleImageType(index) {
    const types = ['scene', 'white', 'set', 'detail', null];
    const img = window.state.images[index];
    if (!img) return;
    const currentIdx = types.indexOf(img.type);
    img.type = types[(currentIdx + 1) % types.length];
    updateImageTypeStats();
    window.renderImageList();
    window.render();
  }

  /**
   * 将某个类型的图片组应用到模板位置
   */
  function applyTypeGroupToTemplate(type) {
    const typeCount = window.state.images.filter(img => img.type === type).length;
    if (typeCount === 0) { 
      window.showToast('该类型没有图片', true); 
      return; 
    }
    
    // 所有位置都设为该类型
    window.state.slotTypes = Array(window.state.templateCount).fill(type);
    applySlotTypes();
    const name = { scene: '场景图', white: '白底图', set: '套装图', detail: '细节图' }[type];
    window.showToast(`已将所有位置设为${name}`);
  }

  // 暴露到全局
  window.initSlotTypes = initSlotTypes;
  window.setSlotType = setSlotType;
  window.applySlotTypes = applySlotTypes;
  window.showSlotTypeMenu = showSlotTypeMenu;
  window.updateImageTypeStats = updateImageTypeStats;
  window.cycleImageType = cycleImageType;
  window.applyTypeGroupToTemplate = applyTypeGroupToTemplate;

})();
