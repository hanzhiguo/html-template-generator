/**
 * 模板布局配置 & 预设位置配置
 * 供 main-image-render.js 和 main-image-template.html 共同使用
 */

// 模板布局配置（按图片数量索引）
var templates = {
  1: { layouts: [{ x: 0, y: 0, w: 1024, h: 1024 }] },
  2: { layouts: [{ x: 0, y: 0, w: 512, h: 1024 }, { x: 512, y: 0, w: 512, h: 1024 }] },
  3: { layouts: [{ x: 0, y: 0, w: 1024, h: 512 }, { x: 0, y: 512, w: 512, h: 512 }, { x: 512, y: 512, w: 512, h: 512 }] },
  4: {
    layouts: [{ x: 0, y: 0, w: 512, h: 512 }, { x: 512, y: 0, w: 512, h: 512 }, { x: 0, y: 512, w: 512, h: 512 }, { x: 512, y: 512, w: 512, h: 512 }],
    layoutsUseDisplay: [
      { x: 30, y: 100, w: 472, h: 420 },
      { x: 522, y: 100, w: 472, h: 420 },
      { x: 30, y: 540, w: 472, h: 420 },
      { x: 522, y: 540, w: 472, h: 420 }
    ],
    layoutsMainDetail: [
      { x: 20, y: 20, w: 680, h: 984 },
      { x: 720, y: 20, w: 284, h: 320 },
      { x: 720, y: 352, w: 284, h: 320 },
      { x: 720, y: 684, w: 284, h: 320 }
    ],
    layoutsScenarioDisplay: [
      { x: 40, y: 100, w: 450, h: 340 },
      { x: 534, y: 100, w: 450, h: 340 },
      { x: 40, y: 520, w: 450, h: 340 },
      { x: 534, y: 520, w: 450, h: 340 }
    ]
  },
  5: {
    layouts: [{ x: 0, y: 0, w: 682, h: 512 }, { x: 682, y: 0, w: 342, h: 512 }, { x: 0, y: 512, w: 342, h: 512 }, { x: 342, y: 512, w: 342, h: 512 }, { x: 684, y: 512, w: 340, h: 512 }],
    layoutsBig: [
      { x: 0, y: 0, w: 1024, h: 710 },
      { x: 0, y: 710, w: 256, h: 314 },
      { x: 256, y: 710, w: 256, h: 314 },
      { x: 512, y: 710, w: 256, h: 314 },
      { x: 768, y: 710, w: 256, h: 314 }
    ]
  },
  6: {
    layouts: [{ x: 0, y: 0, w: 342, h: 512 }, { x: 342, y: 0, w: 340, h: 512 }, { x: 682, y: 0, w: 342, h: 512 }, { x: 0, y: 512, w: 342, h: 512 }, { x: 342, y: 512, w: 340, h: 512 }, { x: 682, y: 512, w: 342, h: 512 }],
    layoutsBig: [
      { x: 0, y: 0, w: 1024, h: 710 },
      { x: 0, y: 710, w: 205, h: 314 },
      { x: 205, y: 710, w: 205, h: 314 },
      { x: 410, y: 710, w: 205, h: 314 },
      { x: 615, y: 710, w: 204, h: 314 },
      { x: 819, y: 710, w: 205, h: 314 }
    ]
  },
  7: { layouts: [
    { x: 0, y: 0, w: 1024, h: 710 },
    { x: 0, y: 710, w: 170, h: 314 },
    { x: 170, y: 710, w: 171, h: 314 },
    { x: 341, y: 710, w: 171, h: 314 },
    { x: 512, y: 710, w: 171, h: 314 },
    { x: 683, y: 710, w: 171, h: 314 },
    { x: 854, y: 710, w: 170, h: 314 }
  ] },
  8: { layouts: [{ x: 0, y: 0, w: 512, h: 512 }, { x: 512, y: 0, w: 512, h: 512 }, { x: 0, y: 512, w: 256, h: 256 }, { x: 256, y: 512, w: 256, h: 256 }, { x: 512, y: 512, w: 256, h: 256 }, { x: 768, y: 512, w: 256, h: 256 }, { x: 0, y: 768, w: 512, h: 256 }, { x: 512, y: 768, w: 512, h: 256 }] },
  9: { layouts: [{ x: 0, y: 0, w: 342, h: 342 }, { x: 342, y: 0, w: 340, h: 342 }, { x: 682, y: 0, w: 342, h: 342 }, { x: 0, y: 342, w: 342, h: 340 }, { x: 342, y: 342, w: 340, h: 340 }, { x: 682, y: 342, w: 342, h: 340 }, { x: 0, y: 682, w: 342, h: 342 }, { x: 342, y: 682, w: 340, h: 342 }, { x: 682, y: 682, w: 342, h: 342 }] }
};

// 文字预设位置配置
var presets = {
  topLeft: { textAlign: 'left', textVAlign: 'top', textX: 60, textY: 80 },
  top: { textAlign: 'center', textVAlign: 'top', textX: 512, textY: 80 },
  topRight: { textAlign: 'right', textVAlign: 'top', textX: 964, textY: 80 },
  left: { textAlign: 'left', textVAlign: 'center', textX: 60, textY: 512 },
  center: { textAlign: 'center', textVAlign: 'center', textX: 512, textY: 512 },
  right: { textAlign: 'right', textVAlign: 'center', textX: 964, textY: 512 },
  bottomLeft: { textAlign: 'left', textVAlign: 'bottom', textX: 60, textY: 950 },
  bottom: { textAlign: 'center', textVAlign: 'bottom', textX: 512, textY: 950 },
  bottomRight: { textAlign: 'right', textVAlign: 'bottom', textX: 964, textY: 950 }
};
