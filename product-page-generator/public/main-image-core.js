/**
 * main-image-core.js
 * 核心状态定义、常量、Canvas初始化
 * 依赖：无（最先加载）
 */

    const state = {
      templateCount: 1,
      preset: 'center',
      customTextPos: null,  // {x, y} 自定义文字位置，null则使用预设
      images: [],
      slotTypes: [],  // 每个模板位置对应的图片类型，如 ['scene','white','detail',...]
      activeImageIndex: -1,  // 当前活跃的图片索引（用于调整参数）
      multiSelectedIndices: [],  // Shift多选的图片索引列表
      imageDragState: { isDragging: false, index: -1, startX: 0, startY: 0, startOffsetX: 0, startOffsetY: 0 },
      mainTitle: '',
      subTitle: '',
      numberText: '',
      numberTextX: 800,
      numberTextY: 60,
      numberTextSize: 36,
      numberTextColor: '#ffffff',
      numberTextFont: 'sans-serif',
      numberTextWeight: '700',
      numberTextItalic: false,
      numberTextVisible: false,
      titleColor: '#ffffff',
      subtitleColor: '#ffffff',
      bgColor: '#f5f5f5',
      titleSize: 48,
      mainTitleFont: 'sans-serif',
      subTitleFont: 'sans-serif',
      mainTitleWeight: 'bold',
      subTitleWeight: 'normal',
      mainTitleItalic: false,
      subTitleItalic: false,
      shadow: true,
      stroke: false,
      bold: true,
      textBg: false,
      textBgColor: 'rgba(0,0,0,0.5)',
      textBgRadius: 16,
      textLayerVisible: true,  // 文字层是否可见（隐藏而非删除）
      dimLayerVisible: true,   // 标注层是否可见
      imageGap: 4,
      imageRadius: 0,
      pendingImageSettings: null,
      twoImageStyle: 'split',
      fiveImageStyle: 'normal',
      sixImageStyle: 'normal',
      circlePosition: 'right',
      circleSize: 300,
      circleBorderColor: '#ffffff',
      circleBorderWidth: 8,
      maskStyle: 'normal',
      useDisplayTitle: 'Use Display',
      useDisplayBgColor: '#f5f0e1',
      useDisplayCardBg: '#e8e3d4',
      useDisplayTitleColor: '#333333',
      useDisplayBorderColor: '#d4c9a8',
      mainDetailBgColor: '#f5f5f5',
      mainDetailMainRadius: 16,
      mainDetailDetailRadius: 12,
      mainDetailMainBorder: '#e0e0e0',
      mainDetailDetailBorder: '#e0e0e0',
      maskTitle: 'EASY TO USE',
      maskTexts: ['Step 1', 'Step 2', 'Step 3', 'Step 4'],
      maskBgColor: '#1a1a2e',
      maskCardColor: '#a8b4c6',
      maskNumberBg: '#6b7aa1',
      maskTextColor: '#ffffff',
      detailTitle: 'DETAILS',
      detailSubtitle: 'THEME COPY',
      detailText1Title: '01.DETAILS',
      detailText2Title: '02.DETAILS',
      detailText1Desc: 'Here are some of the more complex',
      detailText2Desc: 'Here are some of the more complex',
      detailBgColor: '#f0f0f0',
      detailCardColor: '#c8c8c8',
      detailTitleColor: '#888888',
      detailTextColor: '#666666',
      cardTitle: 'Original Color Presented',
      cardSubtitle: 'The Pattern is presented 100% original color as on the computer',
      cardBgColor: '#f5f5f5',
      cardRadius: 24,
      cardTitleColor: '#333333',
      cardSubtitleColor: '#666666',
      logo: null,
      logoColor: '#ffffff',
      logoSize: 150,
      logoMargin: 40,
      logoLayerVisible: true,  // LOGO层是否可见
      dimEnabled: true,
      dimEditing: false,
      dimensions: [],
      selectedDimId: null,
      selectedDimIds: [],
      dimColor: '#ff6b6b',
      dimLineW: 3,
      dimFontS: 25,
      dimTextColor: '#ff6b6b',
      dimEndStyle: 'arrow',
      dimTextBg: 'white',
      dimFirstPoint: null,
      exportSize: 1000,
      currentTemplateName: null,
      imageTypes: { scene: [], white: [], set: [], detail: [] },
      batchMode: true,
      batchResults: [],
      classifiedOnce: false,  // 是否已执行过首次自动分类
      dragState: {
        isDragging: false,
        dragIndex: -1,
        dropIndex: -1,
        startX: 0,
        startY: 0
      },
      textDragState: {
        isDragging: false,
        isResizing: false,
        resizeHandle: null,
        startX: 0,
        startY: 0,
        startTitleSize: 48,
        startCustomTextPos: null,
        startBBox: null
      },
      maskAvoidText: false,    // 遮罩避让文字
      maskAvoidMargin: 30,     // 避让间距（像素）
      // 涂抹/移除功能
      brushMaskEnabled: false,  // 涂抹功能是否启用
      brushMaskTool: 'brush',   // 'brush' 或 'eraser'
      brushMaskColor: '#ffffff',// 涂抹颜色（默认白色）
      brushMaskSize: 40,        // 画笔大小（1024坐标系中的像素）
      brushMaskOpacity: 1.0,    // 不透明度
      brushMaskVisible: true,   // 涂抹层是否可见
      brushStrokes: [],         // 笔画数据 [{points, color, size, opacity, tool}]
      brushMaskCanvas: null     // 离屏Canvas，存储涂抹遮罩
    };
    window.state = state;  // 暴露到全局，供外部模块使用
    
    const canvas = document.getElementById('previewCanvas');
    const ctx = canvas.getContext('2d');
    window._renderCtx = null;

    function getCtx() {
      return window._renderCtx || ctx;
    }

    const APP_VERSION = '1.2.0';
    const RENDER_SZ = 1024;
    let konvaStage = null, konvaDimLayer = null;
    let displayScale = 1;
