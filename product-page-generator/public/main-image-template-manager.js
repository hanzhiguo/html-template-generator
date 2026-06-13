/**
 * 模板管理模块
 * 负责模板的保存、加载、删除、列表渲染等功能
 */

(function() {
  'use strict';

  /**
   * 构建模板数据对象
   */
  function buildTemplateData(name) {
    return {
      name: name,
      timestamp: Date.now(),
      settings: {
        templateCount: window.state.templateCount,
        preset: window.state.preset,
        customTextPos: window.state.customTextPos,
        mainTitle: window.state.mainTitle,
        subTitle: window.state.subTitle,
        titleColor: window.state.titleColor,
        subtitleColor: window.state.subtitleColor,
        bgColor: window.state.bgColor,
        titleSize: window.state.titleSize,
        mainTitleFont: window.state.mainTitleFont,
        subTitleFont: window.state.subTitleFont,
        mainTitleWeight: window.state.mainTitleWeight,
        subTitleWeight: window.state.subTitleWeight,
        mainTitleItalic: window.state.mainTitleItalic,
        subTitleItalic: window.state.subTitleItalic,
        shadow: window.state.shadow,
        stroke: window.state.stroke,
        bold: window.state.bold,
        textBg: window.state.textBg,
        textBgColor: window.state.textBgColor,
        textBgRadius: window.state.textBgRadius,
        textLayerVisible: window.state.textLayerVisible,
        dimLayerVisible: window.state.dimLayerVisible,
        imageGap: window.state.imageGap,
        imageRadius: window.state.imageRadius,
        twoImageStyle: window.state.twoImageStyle,
        fiveImageStyle: window.state.fiveImageStyle,
        sixImageStyle: window.state.sixImageStyle,
        circlePosition: window.state.circlePosition,
        circleSize: window.state.circleSize,
        circleBorderColor: window.state.circleBorderColor,
        circleBorderWidth: window.state.circleBorderWidth,
        maskStyle: window.state.maskStyle,
        maskOffsetX: window.state.maskOffsetX,
        maskOffsetY: window.state.maskOffsetY,
        maskScaleW: window.state.maskScaleW,
        maskScaleH: window.state.maskScaleH,
        useDisplayTitle: window.state.useDisplayTitle,
        useDisplayBgColor: window.state.useDisplayBgColor,
        useDisplayCardBg: window.state.useDisplayCardBg,
        useDisplayTitleColor: window.state.useDisplayTitleColor,
        useDisplayBorderColor: window.state.useDisplayBorderColor,
        mainDetailBgColor: window.state.mainDetailBgColor,
        mainDetailMainRadius: window.state.mainDetailMainRadius,
        mainDetailDetailRadius: window.state.mainDetailDetailRadius,
        mainDetailMainBorder: window.state.mainDetailMainBorder,
        mainDetailDetailBorder: window.state.mainDetailDetailBorder,
        maskTitle: window.state.maskTitle,
        maskTexts: window.state.maskTexts,
        maskBgColor: window.state.maskBgColor,
        maskCardColor: window.state.maskCardColor,
        maskNumberBg: window.state.maskNumberBg,
        maskTextColor: window.state.maskTextColor,
        detailTitle: window.state.detailTitle,
        detailSubtitle: window.state.detailSubtitle,
        detailText1Title: window.state.detailText1Title,
        detailText2Title: window.state.detailText2Title,
        detailText1Desc: window.state.detailText1Desc,
        detailText2Desc: window.state.detailText2Desc,
        detailBgColor: window.state.detailBgColor,
        detailCardColor: window.state.detailCardColor,
        detailTitleColor: window.state.detailTitleColor,
        detailTextColor: window.state.detailTextColor,
        cardTitle: window.state.cardTitle,
        cardSubtitle: window.state.cardSubtitle,
        cardBgColor: window.state.cardBgColor,
        cardRadius: window.state.cardRadius,
        cardTitleColor: window.state.cardTitleColor,
        cardSubtitleColor: window.state.cardSubtitleColor,
        logoColor: window.state.logoColor,
        logoSize: window.state.logoSize,
        logoMargin: window.state.logoMargin,
        logoLayerVisible: window.state.logoLayerVisible,
        dimColor: window.state.dimColor,
        dimLineW: window.state.dimLineW,
        dimFontS: window.state.dimFontS,
        dimTextColor: window.state.dimTextColor,
        dimEndStyle: window.state.dimEndStyle,
        dimTextBg: window.state.dimTextBg,
        maskAvoidText: window.state.maskAvoidText,
        maskAvoidMargin: window.state.maskAvoidMargin,
        brushMaskEnabled: window.state.brushMaskEnabled,
        brushMaskColor: window.state.brushMaskColor,
        brushMaskSize: window.state.brushMaskSize,
        brushMaskOpacity: window.state.brushMaskOpacity,
        brushMaskVisible: window.state.brushMaskVisible,
        brushMaskData: typeof serializeBrushMask === 'function' ? serializeBrushMask() : null,
        imageSettings: window.state.images.map(img => ({
          type: img.type || null,
          scale: img.scale || 1,
          offsetX: img.offsetX || 0,
          offsetY: img.offsetY || 0
        }))
      }
    };
  }

  /**
   * 保存模板（如果已加载则覆盖，否则需要输入名称）
   */
  function saveTemplate() {
    // 如果已加载模板，直接覆盖保存
    if (window.state.currentTemplateName) {
      const templates = JSON.parse(localStorage.getItem('mainImageTemplates') || '[]');
      const existingIndex = templates.findIndex(t => t.name === window.state.currentTemplateName);
      if (existingIndex > -1) {
        templates[existingIndex] = buildTemplateData(window.state.currentTemplateName);
        localStorage.setItem('mainImageTemplates', JSON.stringify(templates));
        window.showToast('模板已保存');
        renderTemplateList();
        return;
      }
    }
    // 否则需要输入名称保存
    const name = document.getElementById('templateName').value.trim();
    if (!name) {
      window.showToast('请输入模板名称', true);
      return;
    }
    doSaveTemplate(name);
  }

  /**
   * 另存为模板
   */
  function saveAsTemplate() {
    const name = document.getElementById('templateName').value.trim();
    if (!name) {
      window.showToast('请输入模板名称', true);
      return;
    }
    doSaveTemplate(name);
  }

  /**
   * 执行保存模板
   */
  function doSaveTemplate(name) {
    let templates = JSON.parse(localStorage.getItem('mainImageTemplates') || '[]');
    const templateData = buildTemplateData(name);
    
    const existingIndex = templates.findIndex(t => t.name === name);
    if (existingIndex > -1) {
      templates[existingIndex] = templateData;
      window.showToast('模板已更新');
    } else {
      templates.push(templateData);
      window.showToast('模板保存成功');
    }
    
    localStorage.setItem('mainImageTemplates', JSON.stringify(templates));
    window.state.currentTemplateName = name;
    document.getElementById('templateName').value = '';
    updateCurrentTemplateDisplay();
    renderTemplateList();
  }

  /**
   * 加载模板
   */
  function loadTemplate(name) {
    const templates = JSON.parse(localStorage.getItem('mainImageTemplates') || '[]');
    const template = templates.find(t => t.name === name);
    
    if (!template) {
      window.showToast('模板不存在', true);
      return;
    }
    
    const settings = template.settings;
    
    window.state.templateCount = settings.templateCount;
    window.state.preset = settings.preset;
    window.state.customTextPos = settings.customTextPos || null;
    window.state.mainTitle = settings.mainTitle;
    window.state.subTitle = settings.subTitle;
    window.state.titleColor = settings.titleColor;
    window.state.subtitleColor = settings.subtitleColor;
    window.state.bgColor = settings.bgColor;
    window.state.titleSize = settings.titleSize;
    window.state.mainTitleFont = settings.mainTitleFont || 'sans-serif';
    window.state.subTitleFont = settings.subTitleFont || 'sans-serif';
    window.state.mainTitleWeight = settings.mainTitleWeight || 'bold';
    window.state.subTitleWeight = settings.subTitleWeight || 'normal';
    window.state.mainTitleItalic = settings.mainTitleItalic || false;
    window.state.subTitleItalic = settings.subTitleItalic || false;
    window.state.shadow = settings.shadow;
    window.state.stroke = settings.stroke;
    window.state.bold = settings.bold;
    window.state.textBg = settings.textBg;
    window.state.textBgColor = settings.textBgColor || 'rgba(0,0,0,0.5)';
    window.state.textBgRadius = settings.textBgRadius !== undefined ? settings.textBgRadius : 16;
    window.state.textLayerVisible = settings.textLayerVisible !== undefined ? settings.textLayerVisible : true;
    window.state.dimLayerVisible = settings.dimLayerVisible !== undefined ? settings.dimLayerVisible : true;
    window.state.imageGap = settings.imageGap;
    window.state.imageRadius = settings.imageRadius;
    window.state.twoImageStyle = settings.twoImageStyle;
    window.state.fiveImageStyle = settings.fiveImageStyle || 'normal';
    window.state.sixImageStyle = settings.sixImageStyle || 'normal';
    window.state.circlePosition = settings.circlePosition;
    window.state.circleSize = settings.circleSize;
    window.state.circleBorderColor = settings.circleBorderColor;
    window.state.circleBorderWidth = settings.circleBorderWidth;
    window.state.maskStyle = settings.maskStyle;
    window.state.maskOffsetX = settings.maskOffsetX || 0;
    window.state.maskOffsetY = settings.maskOffsetY || 0;
    window.state.maskScaleW = settings.maskScaleW || 100;
    window.state.maskScaleH = settings.maskScaleH || 100;
    window.state.useDisplayTitle = settings.useDisplayTitle || 'Use Display';
    window.state.useDisplayBgColor = settings.useDisplayBgColor || '#f5f0e1';
    window.state.useDisplayCardBg = settings.useDisplayCardBg || '#e8e3d4';
    window.state.useDisplayTitleColor = settings.useDisplayTitleColor || '#333333';
    window.state.useDisplayBorderColor = settings.useDisplayBorderColor || '#d4c9a8';
    window.state.mainDetailBgColor = settings.mainDetailBgColor || '#f5f5f5';
    window.state.mainDetailMainRadius = settings.mainDetailMainRadius || 16;
    window.state.mainDetailDetailRadius = settings.mainDetailDetailRadius || 12;
    window.state.mainDetailMainBorder = settings.mainDetailMainBorder || '#e0e0e0';
    window.state.mainDetailDetailBorder = settings.mainDetailDetailBorder || '#e0e0e0';
    window.state.maskTitle = settings.maskTitle;
    window.state.maskTexts = settings.maskTexts;
    window.state.maskBgColor = settings.maskBgColor;
    window.state.maskCardColor = settings.maskCardColor;
    window.state.maskNumberBg = settings.maskNumberBg;
    window.state.maskTextColor = settings.maskTextColor;
    window.state.detailTitle = settings.detailTitle;
    window.state.detailSubtitle = settings.detailSubtitle;
    window.state.detailText1Title = settings.detailText1Title;
    window.state.detailText2Title = settings.detailText2Title;
    window.state.detailText1Desc = settings.detailText1Desc;
    window.state.detailText2Desc = settings.detailText2Desc;
    window.state.detailBgColor = settings.detailBgColor;
    window.state.detailCardColor = settings.detailCardColor;
    window.state.detailTitleColor = settings.detailTitleColor;
    window.state.detailTextColor = settings.detailTextColor;
    window.state.cardTitle = settings.cardTitle;
    window.state.cardSubtitle = settings.cardSubtitle;
    window.state.cardBgColor = settings.cardBgColor;
    window.state.cardRadius = settings.cardRadius;
    window.state.cardTitleColor = settings.cardTitleColor;
    window.state.cardSubtitleColor = settings.cardSubtitleColor;
    window.state.logoColor = settings.logoColor;
    window.state.logoSize = settings.logoSize;
    window.state.logoMargin = settings.logoMargin;
    window.state.logoLayerVisible = settings.logoLayerVisible !== undefined ? settings.logoLayerVisible : true;
    window.state.dimColor = settings.dimColor;
    window.state.dimLineW = settings.dimLineW;
    window.state.dimFontS = settings.dimFontS;
    window.state.dimTextColor = settings.dimTextColor;
    window.state.dimEndStyle = settings.dimEndStyle;
    window.state.dimTextBg = settings.dimTextBg;
    window.state.maskAvoidText = settings.maskAvoidText || false;
    window.state.maskAvoidMargin = settings.maskAvoidMargin || 30;
    
    // 恢复涂抹遮罩数据
    window.state.brushMaskEnabled = settings.brushMaskEnabled || false;
    window.state.brushMaskColor = settings.brushMaskColor || '#ffffff';
    window.state.brushMaskSize = settings.brushMaskSize || 40;
    window.state.brushMaskOpacity = settings.brushMaskOpacity !== undefined ? settings.brushMaskOpacity : 1.0;
    window.state.brushMaskVisible = settings.brushMaskVisible !== undefined ? settings.brushMaskVisible : true;
    window.state.brushStrokes = [];
    if (settings.brushMaskData && typeof deserializeBrushMask === 'function') {
      deserializeBrushMask(settings.brushMaskData);
    }
    
    // 同步涂抹遮罩UI
    const brushMaskCheckbox = document.getElementById('brushMaskEnabled');
    const brushColorInput = document.getElementById('brushColor');
    const brushColorText = document.getElementById('brushColorText');
    const brushSizeSlider = document.getElementById('brushSize');
    const brushSizeVal = document.getElementById('brushSizeVal');
    const brushOpacitySlider = document.getElementById('brushOpacity');
    const brushOpacityVal = document.getElementById('brushOpacityVal');
    if (brushMaskCheckbox) brushMaskCheckbox.checked = window.state.brushMaskEnabled;
    if (brushColorInput) brushColorInput.value = window.state.brushMaskColor;
    if (brushColorText) brushColorText.value = window.state.brushMaskColor;
    if (brushSizeSlider) brushSizeSlider.value = window.state.brushMaskSize;
    if (brushSizeVal) brushSizeVal.textContent = window.state.brushMaskSize + 'px';
    if (brushOpacitySlider) brushOpacitySlider.value = Math.round(window.state.brushMaskOpacity * 100);
    if (brushOpacityVal) brushOpacityVal.textContent = Math.round(window.state.brushMaskOpacity * 100) + '%';
    
    // 同步遮罩避让UI
    const maskAvoidCheckbox = document.getElementById('maskAvoidText');
    const maskAvoidStatus = document.getElementById('maskAvoidStatus');
    const maskAvoidMarginRow = document.getElementById('maskAvoidMarginRow');
    const maskAvoidMarginSlider = document.getElementById('maskAvoidMargin');
    const maskAvoidMarginVal = document.getElementById('maskAvoidMarginVal');
    if (maskAvoidCheckbox) maskAvoidCheckbox.checked = window.state.maskAvoidText;
    if (maskAvoidStatus) {
      maskAvoidStatus.textContent = window.state.maskAvoidText ? '开启' : '关闭';
      maskAvoidStatus.style.color = window.state.maskAvoidText ? '#3b82f6' : '#9ca3af';
    }
    if (maskAvoidMarginRow) maskAvoidMarginRow.style.display = window.state.maskAvoidText ? 'block' : 'none';
    if (maskAvoidMarginSlider) maskAvoidMarginSlider.value = window.state.maskAvoidMargin;
    if (maskAvoidMarginVal) maskAvoidMarginVal.textContent = window.state.maskAvoidMargin + 'px';
    
    if (settings.imageSettings) {
      window.state.pendingImageSettings = settings.imageSettings;
      
      if (window.state.images.length > 0) {
        applyPendingImageSettings();
      }
    } else {
      window.state.pendingImageSettings = null;
    }
    
    window.updateUIFromState();
    window.renderImageList();
    window.render();
    
    if (window.syncTabEyeButtons) window.syncTabEyeButtons();
    
    window.state.currentTemplateName = name;
    updateCurrentTemplateDisplay();
    window.showToast('模板加载成功');
  }

  /**
   * 更新当前模板显示
   */
  function updateCurrentTemplateDisplay() {
    const label = document.getElementById('currentTemplateLabel');
    const display = document.getElementById('currentTemplateNameDisplay');
    if (label && display) {
      if (window.state.currentTemplateName) {
        label.style.display = 'inline';
        display.textContent = window.state.currentTemplateName;
      } else {
        label.style.display = 'none';
      }
    }
  }

  /**
   * 应用待处理的图片设置
   */
  function applyPendingImageSettings() {
    if (!window.state.pendingImageSettings || window.state.images.length === 0) return;
    
    window.state.pendingImageSettings.forEach((imgSetting, i) => {
      if (window.state.images[i]) {
        // 不覆盖图片的 type 属性，保持用户上传时设置的类型
        // window.state.images[i].type = imgSetting.type || null;
        window.state.images[i].scale = imgSetting.scale || 1;
        window.state.images[i].offsetX = imgSetting.offsetX || 0;
        window.state.images[i].offsetY = imgSetting.offsetY || 0;
      }
    });
    
    window.updateImageTypeStats();
    
    // 更新活跃图片的调整面板
    if (window.state.activeImageIndex >= 0 && window.state.activeImageIndex < window.state.images.length) {
      window.setActiveImage(window.state.activeImageIndex);
    }
  }

  /**
   * 删除模板
   */
  function deleteTemplate(name) {
    if (!confirm(`确定删除模板 "${name}" 吗？`)) return;
    
    let templates = JSON.parse(localStorage.getItem('mainImageTemplates') || '[]');
    templates = templates.filter(t => t.name !== name);
    localStorage.setItem('mainImageTemplates', JSON.stringify(templates));
    
    if (window.state.currentTemplateName === name) {
      window.state.currentTemplateName = null;
      updateCurrentTemplateDisplay();
    }
    
    renderTemplateList();
    window.showToast('模板已删除');
  }

  /**
   * 渲染模板列表
   */
  function renderTemplateList() {
    const templates = JSON.parse(localStorage.getItem('mainImageTemplates') || '[]');
    const list = document.getElementById('templateList');
    const emptyHint = document.getElementById('emptyTemplateHint');
    document.getElementById('savedTemplateCount').textContent = templates.length;
    
    if (templates.length === 0) {
      list.innerHTML = '';
      if (emptyHint) emptyHint.style.display = 'block';
      return;
    }
    if (emptyHint) emptyHint.style.display = 'none';
    
    // 按图片数量分组
    const groups = {};
    templates.forEach((t, idx) => {
      const count = t.settings && t.settings.templateCount ? t.settings.templateCount : 0;
      if (!groups[count]) groups[count] = [];
      groups[count].push({ template: t, idx });
    });
    
    // 按图片数量排序
    const sortedKeys = Object.keys(groups).sort((a, b) => parseInt(a) - parseInt(b));
    
    let html = '';
    sortedKeys.forEach(key => {
      html += `<div style="width:100%;margin-bottom:6px;">
        <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;font-weight:600;letter-spacing:0.5px;">${key} 图模板</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px;">`;
      groups[key].forEach(({ template, idx }) => {
        html += `
          <span class="template-tag-new" data-template-idx="${idx}" title="${escapeHtml(template.name)} · ${new Date(template.timestamp).toLocaleString('zh-CN')}">
            <span class="tag-name">${escapeHtml(template.name)}</span>
            <button class="delete-btn" data-delete-idx="${idx}">×</button>
          </span>`;
      });
      html += `</div></div>`;
    });
    
    list.innerHTML = html;
    
    list.querySelectorAll('.template-tag-new').forEach(tag => {
      tag.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
          e.stopPropagation();
          const idx = e.target.dataset.deleteIdx;
          if (idx !== undefined && templates[idx]) {
            deleteTemplate(templates[idx].name);
          }
        } else {
          const idx = tag.dataset.templateIdx;
          if (idx !== undefined && templates[idx]) {
            loadTemplate(templates[idx].name);
          }
        }
      });
    });
  }

  /**
   * HTML转义工具函数
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 暴露到全局
  window.buildTemplateData = buildTemplateData;
  window.saveTemplate = saveTemplate;
  window.saveAsTemplate = saveAsTemplate;
  window.doSaveTemplate = doSaveTemplate;
  window.loadTemplate = loadTemplate;
  window.updateCurrentTemplateDisplay = updateCurrentTemplateDisplay;
  window.applyPendingImageSettings = applyPendingImageSettings;
  window.deleteTemplate = deleteTemplate;
  window.renderTemplateList = renderTemplateList;
  window.escapeHtml = escapeHtml;

})();
