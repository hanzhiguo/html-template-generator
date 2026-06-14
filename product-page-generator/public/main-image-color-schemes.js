/**
 * 配色方案模块
 * 负责配色方案的初始化、应用、UI同步等功能
 */

(function() {
  'use strict';

  // 配色方案定义
  // 方案 1-2: 基础保留 | 方案 3-8: 从设计模板提取 | 方案 9: 森林深绿主题
  const colorSchemes = [
    // === 基础保留 ===
    { name: '经典白', accent: '#ffffff', titleColor: '#ffffff', subtitleColor: '#f3f4f6', textBg: true, textBgColor: 'rgba(0,0,0,0.55)', shadow: true, stroke: false, dimColor: '#ffffff', dimTextColor: '#ffffff' },
    { name: '极简黑', accent: '#111827', titleColor: '#111827', subtitleColor: '#4b5563', textBg: false, textBgColor: 'rgba(255,255,255,0.9)', shadow: false, stroke: false, dimColor: '#111827', dimTextColor: '#111827' },
    // === 模板1 · 清新绿 (E-commerce Clean) ===
    // 主色 #059669 | 强调 #F97316 | 渐变绿底 | 自然健康
    { name: '清新绿', accent: '#059669', titleColor: '#ffffff', subtitleColor: '#d1fae5', textBg: true, textBgColor: 'rgba(0,0,0,0.45)', shadow: true, stroke: false, dimColor: '#059669', dimTextColor: '#059669' },
    // === 模板2 · 奢华金 (E-commerce Luxury) ===
    // 主色 #1C1917 | 金色 #CA8A04 | 暗调奢华 | 金箔质感
    { name: '奢华金', accent: '#CA8A04', titleColor: '#fef3c7', subtitleColor: '#d4a017', textBg: true, textBgColor: 'rgba(12,10,9,0.6)', shadow: true, stroke: false, dimColor: '#CA8A04', dimTextColor: '#CA8A04' },
    // === 模板3 · 时尚粉 (Creative Agency) ===
    // 主色 #EC4899 | 强调 #06B6D4 | Aurora渐变 | 前卫活力
    { name: '时尚粉', accent: '#EC4899', titleColor: '#ffffff', subtitleColor: '#fce7f3', textBg: true, textBgColor: 'rgba(131,24,67,0.55)', shadow: true, stroke: false, dimColor: '#EC4899', dimTextColor: '#EC4899' },
    // === 模板4 · 科技蓝 (SaaS / Tech) ===
    // 主色 #2563EB | 强调 #F97316 | 网格光效 | 专业创新
    { name: '科技蓝', accent: '#2563EB', titleColor: '#ffffff', subtitleColor: '#93c5fd', textBg: true, textBgColor: 'rgba(30,41,59,0.6)', shadow: true, stroke: false, dimColor: '#3b82f6', dimTextColor: '#3b82f6' },
    // === 模板5 · 黑白极简 (Minimalism & Swiss Style) ===
    // 纯黑 #000000 / 纯白 #FFFFFF | 几何分割 | 极致减法
    { name: '黑白极简', accent: '#000000', titleColor: '#ffffff', subtitleColor: '#d1d5db', textBg: true, textBgColor: 'rgba(0,0,0,0.55)', shadow: false, stroke: false, dimColor: '#ffffff', dimTextColor: '#ffffff' },
    // === 模板6 · 高级灰 (Neutral Gray / Corporate Trust) ===
    // 灰度层级 #0F172A → #F8FAFC | 柔和叠层 | 沉稳信赖
    { name: '高级灰', accent: '#64748B', titleColor: '#f1f5f9', subtitleColor: '#94a3b8', textBg: true, textBgColor: 'rgba(15,23,42,0.55)', shadow: true, stroke: false, dimColor: '#94a3b8', dimTextColor: '#94a3b8' },
    // === 模板7 · 森林深绿 (Diorama / Miniature) ===
    // 主背景 #136F35 | 主标题 #EBE0C2 | 副标题 #D8CCAE | 沙盘微缩模型主题
    { name: '森林深绿', accent: '#136F35', titleColor: '#EBE0C2', subtitleColor: '#D8CCAE', textBg: true, textBgColor: 'rgba(19,111,53,0.55)', shadow: true, stroke: false, dimColor: '#EBE0C2', dimTextColor: '#D8CCAE' },
  ];

  /**
   * 初始化配色方案UI
   */
  function initColorSchemes() {
    const container = document.getElementById('colorSchemes');
    container.innerHTML = colorSchemes.map((scheme, i) => {
      const bg = scheme.textBg ? scheme.textBgColor : 'transparent';
      const border = scheme.textBg ? 'none' : '1px dashed var(--gray-300)';
      return `<div class="color-scheme-card" onclick="applyColorScheme(${i})">
        <div class="color-scheme-preview" style="background:${bg};border:${border};">
          <div class="color-scheme-title" style="color:${scheme.titleColor};">Aa</div>
          <div class="color-scheme-accent" style="background:${scheme.accent};"></div>
          <div class="color-scheme-sub" style="color:${scheme.subtitleColor};">副</div>
        </div>
        <div class="color-scheme-name">${scheme.name}</div>
      </div>`;
    }).join('');
  }

  /**
   * 颜色工具函数 - 变亮
   */
  function _lighten(hex, factor) {
    const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
    return '#'+[r,g,b].map(c=>Math.round(c+(255-c)*factor).toString(16).padStart(2,'0')).join('');
  }

  /**
   * 颜色工具函数 - 变暗
   */
  function _darken(hex, factor) {
    const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
    return '#'+[r,g,b].map(c=>Math.round(c*factor).toString(16).padStart(2,'0')).join('');
  }

  /**
   * 应用配色方案
   */
  function applyColorScheme(index) {
    const scheme = colorSchemes[index];
    if (!scheme) return;

    const accent = scheme.accent || scheme.titleColor;

    // === 主标题/副标题 ===
    window.state.titleColor = scheme.titleColor;
    window.state.subtitleColor = scheme.subtitleColor;

    // === 文字效果 ===
    window.state.textBg = scheme.textBg;
    window.state.textBgColor = scheme.textBgColor;
    window.state.shadow = scheme.shadow;
    window.state.stroke = scheme.stroke;

    // === 标注颜色（全局 + 每条标注） ===
    window.state.dimColor = scheme.dimColor;
    window.state.dimTextColor = scheme.dimTextColor;
    if (window.state.dimensions) {
      window.state.dimensions.forEach(d => {
        d.lineColor = scheme.dimColor;
        d.textColor = scheme.dimTextColor;
      });
    }

    // === 主标题/副标题加粗 ===
    window.state.mainTitleWeight = 'bold';
    window.state.subTitleWeight = 'normal';

    // === 派生子样式颜色 ===
    window.state.detailBgColor = _lighten(accent, 0.88);
    window.state.detailCardColor = _lighten(accent, 0.70);
    window.state.detailTitleColor = accent;
    window.state.detailTextColor = _darken(accent, 0.5);
    window.state.cardBgColor = _lighten(accent, 0.92);
    window.state.cardTitleColor = _darken(accent, 0.6);
    window.state.cardSubtitleColor = _darken(accent, 0.45);
    window.state.maskBgColor = _darken(accent, 0.25);
    window.state.maskCardColor = _lighten(accent, 0.35);
    window.state.maskNumberBg = accent;
    window.state.maskTextColor = '#ffffff';
    window.state.useDisplayBgColor = _lighten(accent, 0.90);
    window.state.useDisplayCardBg = _lighten(accent, 0.78);
    window.state.useDisplayTitleColor = _darken(accent, 0.55);
    window.state.useDisplayBorderColor = _lighten(accent, 0.45);
    window.state.circleBorderColor = '#ffffff';
    window.state.mainDetailBgColor = _lighten(accent, 0.85);
    window.state.mainDetailMainBorder = _lighten(accent, 0.5);
    window.state.mainDetailDetailBorder = _lighten(accent, 0.5);

    // === 同步 UI 控件 ===
    syncAllColorControls(scheme);

    // === 立即强制重新渲染 ===
    // 1. 清除任何渲染缓存
    window._renderCtx = null;
    
    // 2. 如果有标注，先清空Konva层防止重叠
    if (window.konvaStage) {
      window.konvaStage.destroyChildren();
    }
    
    // 3. 立即执行Canvas渲染
    if (typeof window.render === 'function') {
      window.render();
    } else {
      console.error('render函数未定义！');
    }
    
    // 4. 如果启用了标注，重建Konva层
    if (window.state.dimLayerVisible && window.state.dimensions && window.state.dimensions.length > 0) {
      if (typeof window.initKonvaOverlay === 'function') {
        // 使用setTimeout确保Canvas渲染完成后再初始化Konva
        setTimeout(() => {
          window.initKonvaOverlay();
        }, 0);
      } else {
        console.error('initKonvaOverlay函数未定义！');
      }
    }

    window.showToast(`已应用配色: ${scheme.name}`);
  }

  /**
   * 同步所有颜色控件
   */
  function syncAllColorControls(scheme) {
    // 主文字颜色
    document.getElementById('titleColor').value = scheme.titleColor;
    document.getElementById('titleColorText').value = scheme.titleColor;
    document.getElementById('subtitleColor').value = scheme.subtitleColor;
    document.getElementById('subtitleColorText').value = scheme.subtitleColor;

    // 标注颜色
    const dimBlock = document.getElementById('dimColorBlock');
    if (dimBlock) dimBlock.style.background = scheme.dimColor;
    const dc = document.getElementById('dimColor');
    if (dc) dc.value = scheme.dimColor;
    const dct = document.getElementById('dimColorText');
    if (dct) dct.value = scheme.dimColor;
    const dtb = document.getElementById('dimTextColorBlock');
    if (dtb) dtb.style.background = scheme.dimTextColor;
    const dtc = document.getElementById('dimTextColor');
    if (dtc) dtc.value = scheme.dimTextColor;
    const dtct = document.getElementById('dimTextColorText');
    if (dtct) dtct.value = scheme.dimTextColor;

    // 效果按钮
    document.querySelectorAll('.style-btn[data-style="shadow"]').forEach(b => b.classList.toggle('active', scheme.shadow));
    document.querySelectorAll('.style-btn[data-style="stroke"]').forEach(b => b.classList.toggle('active', scheme.stroke));
    document.querySelectorAll('.style-btn[data-style="textBg"]').forEach(b => b.classList.toggle('active', scheme.textBg));
    document.querySelectorAll('.style-btn[data-style="bold"]').forEach(b => b.classList.add('active'));

    // 字重
    const mw = document.getElementById('mainTitleWeight');
    if (mw) mw.value = 'bold';
    const sw = document.getElementById('subTitleWeight');
    if (sw) sw.value = 'normal';

    // 文字背景透明度控制
    const textBgRow = document.getElementById('textBgColorRow');
    if (textBgRow) textBgRow.style.opacity = scheme.textBg ? '1' : '0.35';
    
    const rgbMatch = scheme.textBgColor.match(/rgba?\((\d+),(\d+),(\d+),([\d.]+)\)/);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1]).toString(16).padStart(2,'0');
      const g = parseInt(rgbMatch[2]).toString(16).padStart(2,'0');
      const b = parseInt(rgbMatch[3]).toString(16).padStart(2,'0');
      document.getElementById('textBgColorPicker').value = '#' + r + g + b;
      document.getElementById('textBgOpacity').value = Math.round(parseFloat(rgbMatch[4]) * 100);
      document.getElementById('textBgOpacityVal').textContent = Math.round(parseFloat(rgbMatch[4]) * 100) + '%';
    }
    
    // 文字背景圆角
    const textBgRadius = document.getElementById('textBgRadius');
    if (textBgRadius) {
      textBgRadius.value = window.state.textBgRadius || 16;
      const radiusVal = document.getElementById('textBgRadiusVal');
      if (radiusVal) radiusVal.textContent = (window.state.textBgRadius || 16) + 'px';
    }

    // 子样式控件
    ['detailBgColor','detailCardColor','detailTitleColor','detailTextColor',
     'cardBgColor','cardTitleColor','cardSubtitleColor',
     'maskBgColor','maskCardColor','maskNumberBg','maskTextColor',
     'useDisplayBgColor','useDisplayCardBg','useDisplayTitleColor','useDisplayBorderColor',
     'circleBorderColor','mainDetailBgColor','mainDetailMainBorder','mainDetailDetailBorder'
    ].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = window.state[id] || '#000000';
    });
  }

  // 暴露到全局
  window.colorSchemes = colorSchemes;
  window.initColorSchemes = initColorSchemes;
  window.applyColorScheme = applyColorScheme;
  window.syncAllColorControls = syncAllColorControls;

})();
