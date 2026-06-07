/**
 * UI状态同步模块
 * 负责UI控件与state对象的同步、Tab切换、折叠面板、层可见性等功能
 */

(function() {
  'use strict';

  /**
   * 清除自定义文字位置
   */
  function clearCustomTextPos() {
    window.state.customTextPos = null;
    document.getElementById('clearCustomPosBtn') && (document.getElementById('clearCustomPosBtn').style.display = 'none');
    // 恢复当前预设的高亮
    document.querySelectorAll('.preset-item').forEach(i => {
      i.classList.toggle('active', i.dataset.preset === window.state.preset);
    });
    window.render();
  }

  /**
   * Tab 切换
   */
  function switchSidebarTab(tabName) {
    // 更新 Tab 按钮状态
    document.querySelectorAll('.sidebar-tab').forEach(tab => {
      const isActive = tab.getAttribute('onclick').includes("'" + tabName + "'");
      tab.classList.toggle('active', isActive);
    });
    // 更新 Tab 内容显示
    document.querySelectorAll('.sidebar-tab-content').forEach(content => {
      content.classList.toggle('active', content.id === 'tab-' + tabName);
    });
    
    // 根据Tab调整交互层优先级
    const dragOverlay = document.getElementById('dragOverlay');
    const konvaOverlay = document.getElementById('konvaOverlay');
    
    if (tabName === 'dim' && window.state && window.state.dimEnabled) {
      // 标注Tab + 标注启用：Konva层优先
      if (dragOverlay) dragOverlay.style.pointerEvents = 'none';
      if (konvaOverlay) konvaOverlay.style.pointerEvents = 'auto';
    } else {
      // 其他Tab：dragOverlay优先（支持文字/图片交互）
      if (dragOverlay) dragOverlay.style.pointerEvents = 'auto';
      if (konvaOverlay && window.state && window.state.dimEnabled) {
        // 标注启用但不在标注Tab时，Konva层降低优先级但仍可见
        konvaOverlay.style.pointerEvents = 'none';
      }
    }
  }

  /**
   * 折叠面板切换
   */
  function toggleCollapsible(header) {
    header.classList.toggle('collapsed');
    const body = header.nextElementSibling;
    if (body.classList.contains('collapsed')) {
      body.classList.remove('collapsed');
      body.style.maxHeight = 'none';
    } else {
      // 先设为当前高度，再折叠
      body.style.maxHeight = body.scrollHeight + 'px';
      requestAnimationFrame(() => {
        body.classList.add('collapsed');
      });
    }
  }

  /**
   * 文字层可见性切换
   */
  function toggleTextLayer(visible) {
    window.state.textLayerVisible = visible;
    const status = document.getElementById('textLayerStatus');
    if (status) {
      status.textContent = visible ? '可见' : '已隐藏';
      status.className = 'toggle-status ' + (visible ? 'visible' : 'hidden');
    }
    // 同步Tab眼睛按钮状态
    const eyeBtn = document.getElementById('tabEyeText');
    if (eyeBtn) {
      if (visible) { eyeBtn.textContent = '👁'; eyeBtn.classList.remove('hidden-layer'); }
      else { eyeBtn.textContent = '👁‍🗨️'; eyeBtn.classList.add('hidden-layer'); }
    }
    window.render();
  }

  /**
   * 标注层可见性切换
   */
  function toggleDimLayer(visible) {
    window.state.dimLayerVisible = visible;
    const status = document.getElementById('dimLayerStatus');
    if (status) {
      status.textContent = visible ? '可见' : '已隐藏';
      status.className = 'toggle-status ' + (visible ? 'visible' : 'hidden');
    }
    // 标注Tab眼睛按钮现在控制dimEnabled，不在此同步
    // 同步Konva覆盖层的可见性
    const konvaOverlay = document.getElementById('konvaOverlay');
    if (konvaOverlay) {
      konvaOverlay.style.display = visible && document.getElementById('dimToggle')?.checked ? '' : 'none';
    }
  }

  /**
   * 从state同步UI控件值
   */
  function updateUIFromState() {
    const state = window.state;
    
    const presetEl = document.getElementById('preset');
    const mainTitleEl = document.getElementById('mainTitle');
    const subTitleEl = document.getElementById('subTitle');
    const titleColorEl = document.getElementById('titleColor');
    const subtitleColorEl = document.getElementById('subtitleColor');
    const bgColorEl = document.getElementById('bgColor');
    const titleSizeEl = document.getElementById('titleSize');
    const shadowEl = document.getElementById('shadow');
    const strokeEl = document.getElementById('stroke');
    const boldEl = document.getElementById('bold');
    const textBgEl = document.getElementById('textBg');
    const imageGapEl = document.getElementById('imageGap');
    const imageRadiusEl = document.getElementById('imageRadius');
    
    if (presetEl) presetEl.value = state.preset;
    if (mainTitleEl) mainTitleEl.value = state.mainTitle;
    if (subTitleEl) subTitleEl.value = state.subTitle;
    if (titleColorEl) titleColorEl.value = state.titleColor;
    if (subtitleColorEl) subtitleColorEl.value = state.subtitleColor;
    if (bgColorEl) bgColorEl.value = state.bgColor;
    if (titleSizeEl) titleSizeEl.value = state.titleSize;
    
    const mainTitleFontEl = document.getElementById('mainTitleFont');
    const subTitleFontEl = document.getElementById('subTitleFont');
    const mainTitleWeightEl = document.getElementById('mainTitleWeight');
    const subTitleWeightEl = document.getElementById('subTitleWeight');
    const mainTitleItalicEl = document.getElementById('mainTitleItalic');
    const subTitleItalicEl = document.getElementById('subTitleItalic');
    if (mainTitleFontEl) mainTitleFontEl.value = state.mainTitleFont;
    if (subTitleFontEl) subTitleFontEl.value = state.subTitleFont;
    if (mainTitleWeightEl) mainTitleWeightEl.value = state.mainTitleWeight;
    if (subTitleWeightEl) subTitleWeightEl.value = state.subTitleWeight;
    if (mainTitleItalicEl) mainTitleItalicEl.checked = state.mainTitleItalic;
    if (subTitleItalicEl) subTitleItalicEl.checked = state.subTitleItalic;
    
    if (shadowEl) shadowEl.checked = state.shadow;
    if (strokeEl) strokeEl.checked = state.stroke;
    if (boldEl) boldEl.checked = state.bold;
    if (textBgEl) textBgEl.checked = state.textBg;
    
    // 同步文字背景颜色控件
    const rgbMatch = (state.textBgColor || '').match(/rgba?\((\d+),(\d+),(\d+),([\d.]+)\)/);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1]).toString(16).padStart(2,'0');
      const g = parseInt(rgbMatch[2]).toString(16).padStart(2,'0');
      const b = parseInt(rgbMatch[3]).toString(16).padStart(2,'0');
      document.getElementById('textBgColorPicker').value = '#' + r + g + b;
      document.getElementById('textBgOpacity').value = Math.round(parseFloat(rgbMatch[4]) * 100);
      document.getElementById('textBgOpacityVal').textContent = Math.round(parseFloat(rgbMatch[4]) * 100) + '%';
    }
    
    // 同步文字背景控件状态
    if (typeof window.updateBgControlOpacity === 'function') window.updateBgControlOpacity();
    
    // 同步文字背景圆角
    if (document.getElementById('textBgRadius')) {
      document.getElementById('textBgRadius').value = state.textBgRadius;
      document.getElementById('textBgRadiusVal').textContent = state.textBgRadius + 'px';
    }
    
    if (imageGapEl) imageGapEl.value = state.imageGap;
    if (imageRadiusEl) imageRadiusEl.value = state.imageRadius;
    
    // 同步背景色块预览
    const bgBlock = document.getElementById('bgColorBlock');
    if (bgBlock) bgBlock.style.background = state.bgColor;
    
    // 同步子样式面板（背景色/间距/圆角）
    const subBgColorEl = document.getElementById('subBgColor');
    const subImageGapEl = document.getElementById('subImageGap');
    const subImageRadiusEl = document.getElementById('subImageRadius');
    if (subBgColorEl) subBgColorEl.value = state.bgColor;
    if (subImageGapEl) {
      subImageGapEl.value = state.imageGap;
      const gapValEl = document.getElementById('subImageGapVal');
      if (gapValEl) gapValEl.textContent = state.imageGap + 'px';
    }
    if (subImageRadiusEl) {
      subImageRadiusEl.value = state.imageRadius;
      const radiusValEl = document.getElementById('subImageRadiusVal');
      if (radiusValEl) radiusValEl.textContent = state.imageRadius + 'px';
    }
    
    // 同步文字层可见性
    const textLayerVisibleEl = document.getElementById('textLayerVisible');
    const textLayerStatusEl = document.getElementById('textLayerStatus');
    if (textLayerVisibleEl) textLayerVisibleEl.checked = state.textLayerVisible;
    if (textLayerStatusEl) {
      textLayerStatusEl.textContent = state.textLayerVisible ? '可见' : '已隐藏';
      textLayerStatusEl.className = 'toggle-status ' + (state.textLayerVisible ? 'visible' : 'hidden');
    }
    
    // 同步LOGO层可见性
    const logoLayerVisibleEl = document.getElementById('logoLayerVisible');
    const logoLayerStatusEl = document.getElementById('logoLayerStatus');
    if (logoLayerVisibleEl) logoLayerVisibleEl.checked = state.logoLayerVisible;
    if (logoLayerStatusEl) {
      logoLayerStatusEl.textContent = state.logoLayerVisible ? '可见' : '已隐藏';
      logoLayerStatusEl.className = 'toggle-status ' + (state.logoLayerVisible ? 'visible' : 'hidden');
    }
    
    // 同步标注层可见性
    const dimLayerVisibleEl = document.getElementById('dimLayerVisible');
    const dimLayerStatusEl = document.getElementById('dimLayerStatus');
    if (dimLayerVisibleEl) dimLayerVisibleEl.checked = state.dimLayerVisible;
    if (dimLayerStatusEl) {
      dimLayerStatusEl.textContent = state.dimLayerVisible ? '可见' : '已隐藏';
      dimLayerStatusEl.className = 'toggle-status ' + (state.dimLayerVisible ? 'visible' : 'hidden');
    }
    
    document.querySelectorAll('.template-item').forEach(item => {
      item.classList.toggle('active', parseInt(item.dataset.count) === state.templateCount);
    });
    
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.preset === state.preset);
    });
    
    document.querySelectorAll('.style-btn[data-style="twoImageStyle"]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.value === state.twoImageStyle);
    });
    
    document.querySelectorAll('.style-btn[data-style="fiveImageStyle"]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.value === state.fiveImageStyle);
    });
    
    document.querySelectorAll('.style-btn[data-style="sixImageStyle"]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.value === state.sixImageStyle);
    });
    
    document.getElementById('imageCount').textContent = state.images.length;
    
    const twoImageSection = document.getElementById('twoImageStyleSection');
    const mask4Section = document.getElementById('mask4StyleSection');
    const fiveImageSection = document.getElementById('fiveImageStyleSection');
    const sixImageSection = document.getElementById('sixImageStyleSection');
    
    twoImageSection.style.display = state.templateCount === 2 ? 'flex' : 'none';
    mask4Section.style.display = state.templateCount === 4 ? 'flex' : 'none';
    fiveImageSection.style.display = state.templateCount === 5 ? 'flex' : 'none';
    sixImageSection.style.display = state.templateCount === 6 ? 'flex' : 'none';
    
    window.updateCircleOptions();
    
    document.querySelectorAll('.style-btn[data-style="maskStyle"]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.value === state.maskStyle);
    });
    
    const irregularOptions = document.getElementById('irregularMaskOptions');
    const useDisplayOptions = document.getElementById('useDisplayOptions');
    if (irregularOptions) irregularOptions.style.display = state.maskStyle === 'irregular' ? 'block' : 'none';
    if (useDisplayOptions) useDisplayOptions.style.display = state.maskStyle === 'useDisplay' ? 'block' : 'none';
    
    const useDisplayTitleInput = document.getElementById('useDisplayTitleInput');
    const useDisplayBgColorEl = document.getElementById('useDisplayBgColor');
    const useDisplayCardBgEl = document.getElementById('useDisplayCardBg');
    const useDisplayTitleColorEl = document.getElementById('useDisplayTitleColor');
    const useDisplayBorderColorEl = document.getElementById('useDisplayBorderColor');
    if (useDisplayTitleInput) useDisplayTitleInput.value = state.useDisplayTitle;
    if (useDisplayBgColorEl) useDisplayBgColorEl.value = state.useDisplayBgColor;
    if (useDisplayCardBgEl) useDisplayCardBgEl.value = state.useDisplayCardBg;
    if (useDisplayTitleColorEl) useDisplayTitleColorEl.value = state.useDisplayTitleColor;
    if (useDisplayBorderColorEl) useDisplayBorderColorEl.value = state.useDisplayBorderColor;
    
    const mainDetailOptions = document.getElementById('mainDetailOptions');
    if (mainDetailOptions) mainDetailOptions.style.display = state.maskStyle === 'mainDetail' ? 'block' : 'none';
    const scenarioDisplayOptions = document.getElementById('scenarioDisplayOptions');
    if (scenarioDisplayOptions) scenarioDisplayOptions.style.display = state.maskStyle === 'scenarioDisplay' ? 'block' : 'none';
    
    window.updateSubstylePanel();
    
    const mainDetailBgColorEl = document.getElementById('mainDetailBgColor');
    const mainDetailMainRadiusEl = document.getElementById('mainDetailMainRadius');
    const mainDetailDetailRadiusEl = document.getElementById('mainDetailDetailRadius');
    const mainDetailMainBorderEl = document.getElementById('mainDetailMainBorder');
    const mainDetailDetailBorderEl = document.getElementById('mainDetailDetailBorder');
    if (mainDetailBgColorEl) mainDetailBgColorEl.value = state.mainDetailBgColor;
    if (mainDetailMainRadiusEl) mainDetailMainRadiusEl.value = state.mainDetailMainRadius;
    if (mainDetailDetailRadiusEl) mainDetailDetailRadiusEl.value = state.mainDetailDetailRadius;
    if (mainDetailMainBorderEl) mainDetailMainBorderEl.value = state.mainDetailMainBorder;
    if (mainDetailDetailBorderEl) mainDetailDetailBorderEl.value = state.mainDetailDetailBorder;
    
    const scenarioBgColorEl = document.getElementById('scenarioBgColor');
    const scenarioCardRadiusEl = document.getElementById('scenarioCardRadius');
    const scenarioImageRadiusEl = document.getElementById('scenarioImageRadius');
    const scenarioLabelBgColorEl = document.getElementById('scenarioLabelBgColor');
    const scenarioTextColorEl = document.getElementById('scenarioTextColor');
    const scenarioText1TitleEl = document.getElementById('scenarioText1Title');
    const scenarioText1DescEl = document.getElementById('scenarioText1Desc');
    const scenarioText2TitleEl = document.getElementById('scenarioText2Title');
    const scenarioText2DescEl = document.getElementById('scenarioText2Desc');
    const scenarioText3TitleEl = document.getElementById('scenarioText3Title');
    const scenarioText3DescEl = document.getElementById('scenarioText3Desc');
    const scenarioText4TitleEl = document.getElementById('scenarioText4Title');
    const scenarioText4DescEl = document.getElementById('scenarioText4Desc');
    if (scenarioBgColorEl) scenarioBgColorEl.value = state.scenarioBgColor;
    if (scenarioCardRadiusEl) scenarioCardRadiusEl.value = state.scenarioCardRadius;
    if (scenarioImageRadiusEl) scenarioImageRadiusEl.value = state.scenarioImageRadius;
    if (scenarioLabelBgColorEl) scenarioLabelBgColorEl.value = state.scenarioLabelBgColor;
    if (scenarioTextColorEl) scenarioTextColorEl.value = state.scenarioTextColor;
    if (scenarioText1TitleEl) scenarioText1TitleEl.value = state.scenarioText1Title;
    if (scenarioText1DescEl) scenarioText1DescEl.value = state.scenarioText1Desc;
    if (scenarioText2TitleEl) scenarioText2TitleEl.value = state.scenarioText2Title;
    if (scenarioText2DescEl) scenarioText2DescEl.value = state.scenarioText2Desc;
    if (scenarioText3TitleEl) scenarioText3TitleEl.value = state.scenarioText3Title;
    if (scenarioText3DescEl) scenarioText3DescEl.value = state.scenarioText3Desc;
    if (scenarioText4TitleEl) scenarioText4TitleEl.value = state.scenarioText4Title;
    if (scenarioText4DescEl) scenarioText4DescEl.value = state.scenarioText4Desc;
  }

  // 暴露到全局
  window.clearCustomTextPos = clearCustomTextPos;
  window.switchSidebarTab = switchSidebarTab;
  window.toggleCollapsible = toggleCollapsible;
  window.toggleTextLayer = toggleTextLayer;
  window.toggleDimLayer = toggleDimLayer;
  window.updateUIFromState = updateUIFromState;

})();
