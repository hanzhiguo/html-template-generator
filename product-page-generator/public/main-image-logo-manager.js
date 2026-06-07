/**
 * LOGO管理模块
 * 负责LOGO的上传、预览、删除、素材库管理等功能
 */

(function() {
  'use strict';

  // ========== LOGO素材库常量 ==========
  const LOGO_LIB_KEY = 'mainImage_logoLibrary';
  const LOGO_ACTIVE_KEY = 'mainImage_activeLogoId';

  /**
   * 处理LOGO上传
   */
  function handleLogoUpload(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const isSvg = file.name.toLowerCase().endsWith('.svg');
      const logoName = file.name.replace(/\.[^.]+$/, '');
      
      if (isSvg) {
        let svgContent = content;
        if (content.startsWith('data:image/svg+xml')) {
          svgContent = decodeURIComponent(content.split(',')[1]);
        }
        // SVG用base64 data URI存储，确保兼容性
        const svgBase64 = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgContent)));
        addLogoToLib(logoName, 'svg', svgBase64);
      } else {
        // 图片已经是base64 data URI
        addLogoToLib(logoName, 'image', content);
      }
    };
    
    if (file.name.toLowerCase().endsWith('.svg')) {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }
  }

  /**
   * 更新LOGO预览
   */
  function updateLogoPreview() {
    const uploadZone = document.getElementById('logoUploadZone');
    const settings = document.getElementById('logoSettings');
    
    if (window.state.logo) {
      if (window.state.logo.type === 'svg') {
        const coloredSvg = window.applySvgColor(window.state.logo.content, window.state.logoColor);
        const blob = new Blob([coloredSvg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        uploadZone.innerHTML = `<img src="${url}" alt="logo" style="width:100%;height:100%;object-fit:contain;">`;
      } else {
        uploadZone.innerHTML = `<img src="${window.state.logo.src}" alt="logo" style="width:100%;height:100%;object-fit:contain;">`;
      }
      settings.style.display = 'block';
    } else {
      uploadZone.innerHTML = '<span id="logoPreviewText">+ 上传LOGO</span>';
      settings.style.display = 'none';
    }
  }

  /**
   * 移除LOGO
   */
  function removeLogo() {
    window.state.logo = null;
    setActiveLogoId(null);
    document.getElementById('logoInput').value = '';
    updateLogoPreview();
    renderLogoLibrary(getLogoLib(), null);
    window.render();
  }

  /**
   * LOGO层可见性切换
   */
  function toggleLogoLayer(visible) {
    window.state.logoLayerVisible = visible;
    const status = document.getElementById('logoLayerStatus');
    if (status) {
      status.textContent = visible ? '可见' : '已隐藏';
      status.className = 'toggle-status ' + (visible ? 'visible' : 'hidden');
    }
    const eyeBtn = document.getElementById('tabEyeLogo');
    if (eyeBtn) {
      if (visible) { eyeBtn.textContent = '👁'; eyeBtn.classList.remove('hidden-layer'); }
      else { eyeBtn.textContent = '👁‍🗨️'; eyeBtn.classList.add('hidden-layer'); }
    }
    window.render();
  }

  /**
   * 获取LOGO库
   */
  function getLogoLib() {
    try {
      return JSON.parse(localStorage.getItem(LOGO_LIB_KEY) || '[]');
    } catch { return []; }
  }

  /**
   * 保存LOGO库
   */
  function saveLogoLib(lib) {
    localStorage.setItem(LOGO_LIB_KEY, JSON.stringify(lib));
  }

  /**
   * 获取活跃LOGO ID
   */
  function getActiveLogoId() {
    return localStorage.getItem(LOGO_ACTIVE_KEY) || null;
  }

  /**
   * 设置活跃LOGO ID
   */
  function setActiveLogoId(id) {
    if (id) {
      localStorage.setItem(LOGO_ACTIVE_KEY, id);
    } else {
      localStorage.removeItem(LOGO_ACTIVE_KEY);
    }
  }

  /**
   * 加载LOGO素材库
   */
  function loadLogoLibrary() {
    const lib = getLogoLib();
    const activeId = getActiveLogoId();
    renderLogoLibrary(lib, activeId);
    
    // 如果有激活的LOGO，自动应用
    if (activeId) {
      const activeLogo = lib.find(l => l.id === activeId);
      if (activeLogo) {
        applyLogoData(activeLogo);
      } else {
        // 激活的LOGO已被删除，清除
        setActiveLogoId(null);
      }
    }
  }

  /**
   * 渲染LOGO素材库
   */
  function renderLogoLibrary(lib, activeId) {
    const container = document.getElementById('logoLibrary');
    const countEl = document.getElementById('logoLibCount');
    const activeNameEl = document.getElementById('activeLogoName');
    if (!container) return;
    
    if (countEl) countEl.textContent = `(${lib.length})`;
    
    if (activeNameEl) {
      const active = lib.find(l => l.id === activeId);
      activeNameEl.textContent = active ? `当前: ${active.name}` : '';
    }
    
    if (lib.length === 0) {
      container.innerHTML = '<div style="width:100%;text-align:center;color:#9ca3af;font-size:11px;padding:10px 0;">暂无LOGO，请上传</div>';
      return;
    }
    
    container.innerHTML = lib.map(logo => {
      const isActive = logo.id === activeId;
      const border = isActive ? '2px solid #3b82f6' : '2px solid #e5e7eb';
      const bg = isActive ? '#eff6ff' : '#fff';
      const thumbSrc = logo.type === 'svg' ? logo.data : logo.data;
      return `
        <div class="logo-lib-item" data-id="${logo.id}" 
             title="${isActive ? '点击取消使用' : '点击使用此LOGO'}" 
             style="width:52px;height:52px;border:${border};border-radius:6px;cursor:pointer;overflow:hidden;display:flex;align-items:center;justify-content:center;background:${bg};position:relative;transition:all 0.2s;">
          ${isActive ? '<div style="position:absolute;top:2px;left:2px;width:14px;height:14px;background:#3b82f6;border-radius:50%;display:flex;align-items:center;justify-content:center;"><span style="color:#fff;font-size:9px;">✓</span></div>' : ''}
          <img src="${thumbSrc}" alt="${logo.name}" style="max-width:85%;max-height:85%;object-fit:contain;">
          <div class="logo-del-btn" data-id="${logo.id}" 
               style="position:absolute;top:-2px;right:-2px;width:16px;height:16px;background:#ef4444;color:#fff;border-radius:50%;font-size:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;opacity:0;transition:opacity 0.2s;">×</div>
        </div>
      `;
    }).join('');
    
    // 绑定事件
    container.querySelectorAll('.logo-lib-item').forEach(item => {
      // 点击选择/取消
      item.addEventListener('click', (e) => {
        if (e.target.closest('.logo-del-btn')) return;
        const id = item.dataset.id;
        const currentActive = getActiveLogoId();
        if (currentActive === id) {
          // 取消选择
          setActiveLogoId(null);
          window.state.logo = null;
          updateLogoPreview();
          window.render();
          renderLogoLibrary(getLogoLib(), null);
        } else {
          // 选择此LOGO
          setActiveLogoId(id);
          const lib = getLogoLib();
          const logo = lib.find(l => l.id === id);
          if (logo) applyLogoData(logo);
          renderLogoLibrary(lib, id);
        }
      });
      // 鼠标悬停显示删除
      item.addEventListener('mouseenter', () => {
        const del = item.querySelector('.logo-del-btn');
        if (del) del.style.opacity = '1';
      });
      item.addEventListener('mouseleave', () => {
        const del = item.querySelector('.logo-del-btn');
        if (del) del.style.opacity = '0';
      });
    });
    
    // 删除按钮
    container.querySelectorAll('.logo-del-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        deleteLogoFromLib(id);
      });
    });
  }

  /**
   * 应用LOGO数据到state
   */
  function applyLogoData(logo) {
    if (logo.type === 'svg') {
      // 从data URI中提取SVG文本
      let svgContent = logo.data;
      if (logo.data.startsWith('data:image/svg+xml,')) {
        svgContent = decodeURIComponent(logo.data.split(',').slice(1).join(','));
      }
      window.state.logo = {
        type: 'svg',
        content: svgContent,
        originalContent: svgContent
      };
    } else {
      const img = new Image();
      img.onload = () => {
        window.state.logo = {
          type: 'image',
          img: img,
          src: logo.data
        };
        window.state.logoLayerVisible = true;
        syncLogoLayerUI();
        updateLogoPreview();
        window.render();
      };
      img.src = logo.data;
      return; // 异步加载，render在onload中调用
    }
    window.state.logoLayerVisible = true;
    syncLogoLayerUI();
    updateLogoPreview();
    window.render();
  }

  /**
   * 上传LOGO后自动保存到素材库
   */
  function addLogoToLib(name, type, data) {
    const lib = getLogoLib();
    const id = 'logo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const logo = { id, name, type, data, createdAt: Date.now() };
    lib.push(logo);
    saveLogoLib(lib);
    
    // 自动选中新上传的LOGO
    setActiveLogoId(id);
    applyLogoData(logo);
    renderLogoLibrary(lib, id);
    window.showToast('LOGO已保存到素材库');
  }

  /**
   * 从素材库删除LOGO
   */
  function deleteLogoFromLib(id) {
    let lib = getLogoLib();
    lib = lib.filter(l => l.id !== id);
    saveLogoLib(lib);
    
    // 如果删除的是当前激活的，清除
    if (getActiveLogoId() === id) {
      setActiveLogoId(null);
      window.state.logo = null;
      updateLogoPreview();
      window.render();
    }
    
    renderLogoLibrary(lib, getActiveLogoId());
    window.showToast('LOGO已删除');
  }

  /**
   * 同步LOGO层可见性UI
   */
  function syncLogoLayerUI() {
    const el = document.getElementById('logoLayerVisible');
    const status = document.getElementById('logoLayerStatus');
    if (el) el.checked = window.state.logoLayerVisible;
    if (status) {
      status.textContent = window.state.logoLayerVisible ? '可见' : '已隐藏';
      status.className = 'toggle-status ' + (window.state.logoLayerVisible ? 'visible' : 'hidden');
    }
  }

  // 暴露到全局
  window.handleLogoUpload = handleLogoUpload;
  window.updateLogoPreview = updateLogoPreview;
  window.removeLogo = removeLogo;
  window.toggleLogoLayer = toggleLogoLayer;
  window.getLogoLib = getLogoLib;
  window.saveLogoLib = saveLogoLib;
  window.getActiveLogoId = getActiveLogoId;
  window.setActiveLogoId = setActiveLogoId;
  window.loadLogoLibrary = loadLogoLibrary;
  window.renderLogoLibrary = renderLogoLibrary;
  window.applyLogoData = applyLogoData;
  window.addLogoToLib = addLogoToLib;
  window.deleteLogoFromLib = deleteLogoFromLib;
  window.syncLogoLayerUI = syncLogoLayerUI;

})();
