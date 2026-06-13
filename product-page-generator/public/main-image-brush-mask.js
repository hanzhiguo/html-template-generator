/**
 * main-image-brush-mask.js
 * 涂抹移除模块：画笔涂抹覆盖、橡皮擦、撤销、遮罩渲染
 * 
 * 依赖全局变量：state, konvaStage, displayScale, RENDER_SZ
 * 依赖全局函数：render, showToast
 */

// ========== 涂抹功能全局变量 ==========
let brushKonvaStage = null;   // 涂抹专用 Konva Stage
let brushKonvaLayer = null;   // 涂抹 Konva Layer（视觉反馈）
let brushCursorShape = null;  // Konva 画笔光标圆圈
let isDrawing = false;        // 是否正在绘制
let currentStroke = null;     // 当前笔画的 Konva.Line 对象
let currentStrokePoints = []; // 当前笔画的点数据

// ========== 初始化 ==========

/**
 * 初始化涂抹离屏 Canvas
 */
function initBrushMaskCanvas() {
  if (!state.brushMaskCanvas) {
    const c = document.createElement('canvas');
    c.width = RENDER_SZ;
    c.height = RENDER_SZ;
    state.brushMaskCanvas = c;
  }
}

/**
 * 切换涂抹功能启用状态
 */
function toggleMaskLayer(enabled) {
  state.brushMaskEnabled = enabled;
  
  const checkbox = document.getElementById('brushMaskEnabled');
  const status = document.getElementById('brushMaskStatus');
  const eyeBtn = document.getElementById('tabEyeMask');
  
  if (checkbox) checkbox.checked = enabled;
  if (status) {
    status.textContent = enabled ? '已启用' : '已禁用';
    status.className = 'toggle-status ' + (enabled ? 'visible' : 'hidden');
  }
  if (eyeBtn) {
    eyeBtn.textContent = enabled ? '👁' : '👁‍🗨️';
    eyeBtn.classList.toggle('hidden-layer', !enabled);
  }
  
  if (enabled) {
    initBrushMaskCanvas();
    // 如果当前在 mask tab，激活画笔
    const activeTab = document.querySelector('.sidebar-tab.active');
    const isMaskTab = activeTab && activeTab.getAttribute('onclick').includes("'mask'");
    if (isMaskTab) {
      activateBrushMode();
    }
  } else {
    deactivateBrushMode();
  }
  
  render();
}
window.toggleMaskLayer = toggleMaskLayer;

/**
 * 激活画笔模式（Konva 覆盖层切换为画笔交互）
 */
function activateBrushMode() {
  const dragOverlay = document.getElementById('dragOverlay');
  const konvaOverlay = document.getElementById('konvaOverlay');
  
  // 禁用文字拖拽层
  if (dragOverlay) dragOverlay.style.pointerEvents = 'none';
  
  // 显示 Konva 覆盖层
  if (konvaOverlay) {
    konvaOverlay.style.display = 'block';
    konvaOverlay.style.pointerEvents = 'auto';
    konvaOverlay.style.cursor = 'none'; // 使用自定义光标
  }
  
  initBrushKonvaStage();
  showBrushCursor();
}

/**
 * 停用画笔模式
 */
function deactivateBrushMode() {
  const dragOverlay = document.getElementById('dragOverlay');
  const konvaOverlay = document.getElementById('konvaOverlay');
  
  if (dragOverlay) dragOverlay.style.pointerEvents = 'auto';
  
  // 如果标注也启用，保持覆盖层可见给标注用
  if (!state.dimEnabled || !state.dimLayerVisible) {
    if (konvaOverlay) {
      konvaOverlay.style.pointerEvents = 'none';
    }
  }
  
  // 销毁涂抹 Konva Stage（不影响标注 Stage）
  if (brushKonvaStage) {
    brushKonvaStage.destroy();
    brushKonvaStage = null;
    brushKonvaLayer = null;
    brushCursorShape = null;
  }
  
  hideBrushCursor();
  
  // 如果标注启用，重新初始化标注覆盖层
  if (state.dimEnabled && typeof initKonvaOverlay === 'function') {
    initKonvaOverlay();
  }
}

/**
 * 初始化涂抹 Konva Stage
 */
function initBrushKonvaStage() {
  // 如果标注 Stage 存在，先销毁
  if (typeof konvaStage !== 'undefined' && konvaStage) {
    konvaStage.destroy();
    konvaStage = null;
  }
  
  // 如果已有涂抹 Stage，先销毁
  if (brushKonvaStage) {
    brushKonvaStage.destroy();
  }
  
  const wrapper = document.querySelector('.canvas-wrapper');
  if (!wrapper) return;
  const wrapperW = wrapper.clientWidth;
  const wrapperH = wrapper.clientHeight;
  displayScale = wrapperW / RENDER_SZ;
  
  const overlay = document.getElementById('konvaOverlay');
  overlay.style.display = 'block';
  overlay.style.width = wrapperW + 'px';
  overlay.style.height = wrapperH + 'px';
  
  brushKonvaStage = new Konva.Stage({
    container: 'konvaOverlay',
    width: wrapperW,
    height: wrapperH
  });
  brushKonvaLayer = new Konva.Layer();
  brushKonvaStage.add(brushKonvaLayer);
  
  // 重绘已有笔画
  redrawBrushStrokes();
  
  // 创建 Konva 光标圆圈
  brushCursorShape = new Konva.Circle({
    x: -100,
    y: -100,
    radius: state.brushMaskSize * displayScale / 2,
    stroke: 'rgba(0,0,0,0.6)',
    strokeWidth: 2,
    dash: state.brushMaskTool === 'eraser' ? [6, 4] : [],
    listening: false,
    perfectDrawEnabled: false
  });
  brushKonvaLayer.add(brushCursorShape);
  brushKonvaLayer.draw();
  
  // 绑定绘制事件
  bindBrushEvents();
}

/**
 * 绑定画笔绘制事件
 */
function bindBrushEvents() {
  if (!brushKonvaStage) return;
  
  brushKonvaStage.on('mousedown touchstart', (e) => {
    if (!state.brushMaskEnabled) return;
    isDrawing = true;
    currentStrokePoints = [];
    
    const pos = brushKonvaStage.getPointerPosition();
    if (!pos) return;
    
    // 转换为 1024 坐标
    const canvasPos = screenToCanvas(pos.x, pos.y);
    currentStrokePoints.push(canvasPos);
    
    // 创建 Konva.Line 用于实时视觉反馈
    const strokeColor = state.brushMaskTool === 'eraser' ? 'rgba(255,0,0,0.3)' : state.brushMaskColor;
    const strokeWidth = state.brushMaskSize * displayScale;
    
    currentStroke = new Konva.Line({
      points: [pos.x, pos.y],
      stroke: strokeColor,
      strokeWidth: strokeWidth,
      lineCap: 'round',
      lineJoin: 'round',
      globalCompositeOperation: state.brushMaskTool === 'eraser' ? 'destination-out' : 'source-over',
      opacity: state.brushMaskTool === 'eraser' ? 0.5 : state.brushMaskOpacity
    });
    brushKonvaLayer.add(currentStroke);
  });
  
  brushKonvaStage.on('mousemove touchmove', (e) => {
    const pointerPos = brushKonvaStage.getPointerPosition();
    if (pointerPos) {
      // 更新 Konva 光标位置
      updateKonvaBrushCursor(pointerPos.x, pointerPos.y);
    }
    
    if (!isDrawing || !currentStroke) return;
    
    const pos = brushKonvaStage.getPointerPosition();
    if (!pos) return;
    
    // 添加到 Konva.Line 的点
    const newPoints = currentStroke.points().concat([pos.x, pos.y]);
    currentStroke.points(newPoints);
    
    // 记录 1024 坐标
    const canvasPos = screenToCanvas(pos.x, pos.y);
    currentStrokePoints.push(canvasPos);
    
    brushKonvaLayer.batchDraw();
  });
  
  brushKonvaStage.on('mouseup touchend', () => {
    if (!isDrawing) return;
    isDrawing = false;
    
    if (currentStrokePoints.length > 0) {
      // 保存笔画数据
      state.brushStrokes.push({
        points: [...currentStrokePoints],
        color: state.brushMaskColor,
        size: state.brushMaskSize,
        opacity: state.brushMaskOpacity,
        tool: state.brushMaskTool
      });
      
      // 重绘离屏 Canvas
      rebuildMaskCanvas();
      render();
    }
    
    currentStroke = null;
    currentStrokePoints = [];
  });
  
  brushKonvaStage.on('mouseleave', () => {
    hideBrushCursor();
    if (isDrawing && currentStrokePoints.length > 0) {
      // 鼠标离开时完成当前笔画
      isDrawing = false;
      state.brushStrokes.push({
        points: [...currentStrokePoints],
        color: state.brushMaskColor,
        size: state.brushMaskSize,
        opacity: state.brushMaskOpacity,
        tool: state.brushMaskTool
      });
      rebuildMaskCanvas();
      render();
      currentStroke = null;
      currentStrokePoints = [];
    }
  });
  
  brushKonvaStage.on('mouseenter', () => {
    if (state.brushMaskEnabled) {
      showBrushCursor();
    }
  });
}

// ========== 坐标转换 ==========

/**
 * 屏幕坐标转 1024 Canvas 坐标
 */
function screenToCanvas(sx, sy) {
  return {
    x: sx / displayScale,
    y: sy / displayScale
  };
}

/**
 * 1024 Canvas 坐标转屏幕坐标
 */
function canvasToScreen(cx, cy) {
  return {
    x: cx * displayScale,
    y: cy * displayScale
  };
}

// ========== 画笔光标（Konva 实现） ==========

function showBrushCursor() {
  if (brushCursorShape) brushCursorShape.visible(true);
  if (brushKonvaLayer) brushKonvaLayer.batchDraw();
}

function hideBrushCursor() {
  if (brushCursorShape) {
    brushCursorShape.position({ x: -100, y: -100 });
    brushCursorShape.visible(false);
  }
  if (brushKonvaLayer) brushKonvaLayer.batchDraw();
}

function updateKonvaBrushCursor(sx, sy) {
  if (!brushCursorShape) return;
  const size = state.brushMaskSize * displayScale;
  brushCursorShape.position({ x: sx, y: sy });
  brushCursorShape.radius(size / 2);
  brushCursorShape.dash(state.brushMaskTool === 'eraser' ? [6, 4] : []);
  brushCursorShape.visible(true);
  brushKonvaLayer.batchDraw();
}

function updateBrushCursorStyle() {
  if (!brushCursorShape) return;
  const size = state.brushMaskSize * displayScale;
  brushCursorShape.radius(size / 2);
  brushCursorShape.dash(state.brushMaskTool === 'eraser' ? [6, 4] : []);
  if (brushKonvaLayer) brushKonvaLayer.batchDraw();
}
window.updateBrushCursorStyle = updateBrushCursorStyle;

// ========== 笔画管理 ==========

/**
 * 设置画笔工具
 */
function setBrushTool(tool) {
  state.brushMaskTool = tool;
  document.getElementById('brushModeBtn').classList.toggle('active', tool === 'brush');
  document.getElementById('eraserModeBtn').classList.toggle('active', tool === 'eraser');
  updateBrushCursorStyle();
}
window.setBrushTool = setBrushTool;

/**
 * 撤销最后一笔
 */
function undoBrushStroke() {
  if (state.brushStrokes.length === 0) {
    showToast('没有可撤销的笔画');
    return;
  }
  state.brushStrokes.pop();
  rebuildMaskCanvas();
  redrawBrushStrokes();
  render();
  showToast('已撤销一笔');
}
window.undoBrushStroke = undoBrushStroke;

/**
 * 清空所有笔画
 */
function clearAllBrushStrokes() {
  if (state.brushStrokes.length === 0) {
    showToast('没有涂抹内容');
    return;
  }
  state.brushStrokes = [];
  rebuildMaskCanvas();
  redrawBrushStrokes();
  render();
  showToast('已清空所有涂抹');
}
window.clearAllBrushStrokes = clearAllBrushStrokes;

/**
 * 重绘 Konva 上的所有笔画（视觉反馈）
 */
function redrawBrushStrokes() {
  if (!brushKonvaLayer) return;
  brushKonvaLayer.destroyChildren();
  
  state.brushStrokes.forEach((stroke) => {
    if (stroke.points.length === 0) return;
    
    const screenPoints = [];
    stroke.points.forEach(p => {
      const sp = canvasToScreen(p.x, p.y);
      screenPoints.push(sp.x, sp.y);
    });
    
    const strokeColor = stroke.tool === 'eraser' ? 'rgba(255,0,0,0.3)' : stroke.color;
    const strokeWidth = stroke.size * displayScale;
    
    const line = new Konva.Line({
      points: screenPoints,
      stroke: strokeColor,
      strokeWidth: strokeWidth,
      lineCap: 'round',
      lineJoin: 'round',
      globalCompositeOperation: stroke.tool === 'eraser' ? 'destination-out' : 'source-over',
      opacity: stroke.tool === 'eraser' ? 0.5 : stroke.opacity
    });
    brushKonvaLayer.add(line);
  });
  
  // 重新创建光标圆圈（destroyChildren 会删除它）
  brushCursorShape = new Konva.Circle({
    x: -100,
    y: -100,
    radius: state.brushMaskSize * displayScale / 2,
    stroke: 'rgba(0,0,0,0.6)',
    strokeWidth: 2,
    dash: state.brushMaskTool === 'eraser' ? [6, 4] : [],
    listening: false,
    perfectDrawEnabled: false,
    visible: false
  });
  brushKonvaLayer.add(brushCursorShape);
  
  brushKonvaLayer.draw();
}

/**
 * 重建离屏遮罩 Canvas（从笔画数据）
 */
function rebuildMaskCanvas() {
  initBrushMaskCanvas();
  const c = state.brushMaskCanvas;
  const ctx = c.getContext('2d');
  
  // 清空
  ctx.clearRect(0, 0, RENDER_SZ, RENDER_SZ);
  
  // 按顺序重绘所有笔画
  state.brushStrokes.forEach((stroke) => {
    if (stroke.points.length === 0) return;
    
    ctx.save();
    
    if (stroke.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.globalAlpha = 1;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = stroke.color;
      ctx.globalAlpha = stroke.opacity;
    }
    
    ctx.lineWidth = stroke.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    
    // 使用二次贝塞尔曲线平滑
    for (let i = 1; i < stroke.points.length - 1; i++) {
      const xc = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
      const yc = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
      ctx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, xc, yc);
    }
    
    // 最后一个点
    if (stroke.points.length > 1) {
      const last = stroke.points[stroke.points.length - 1];
      ctx.lineTo(last.x, last.y);
    } else if (stroke.points.length === 1) {
      // 单点，画一个圆
      ctx.arc(stroke.points[0].x, stroke.points[0].y, stroke.size / 2, 0, Math.PI * 2);
      ctx.fillStyle = stroke.tool === 'eraser' ? 'rgba(0,0,0,1)' : stroke.color;
      ctx.fill();
    }
    
    ctx.stroke();
    ctx.restore();
  });
}

/**
 * 将遮罩 Canvas 叠加到目标 Canvas 上
 */
function compositeMaskCanvas(targetCtx) {
  if (!state.brushMaskEnabled || !state.brushMaskVisible) return;
  if (!state.brushMaskCanvas || state.brushStrokes.length === 0) return;
  
  targetCtx.drawImage(state.brushMaskCanvas, 0, 0, RENDER_SZ, RENDER_SZ);
}

/**
 * AI 移除（预留接口）
 */
function aiRemoveObject() {
  showToast('AI 移除功能即将推出，敬请期待！');
}
window.aiRemoveObject = aiRemoveObject;

/**
 * 序列化遮罩数据（用于模板保存）
 */
function serializeBrushMask() {
  if (state.brushStrokes.length === 0) return null;
  return {
    strokes: state.brushStrokes,
    dataURL: state.brushMaskCanvas ? state.brushMaskCanvas.toDataURL() : null
  };
}
window.serializeBrushMask = serializeBrushMask;

/**
 * 反序列化遮罩数据（用于模板加载）
 */
function deserializeBrushMask(data) {
  if (!data || !data.strokes) {
    state.brushStrokes = [];
    return;
  }
  state.brushStrokes = data.strokes;
  
  // 如果有 dataURL，直接加载到离屏 Canvas
  if (data.dataURL && state.brushMaskCanvas) {
    const img = new Image();
    img.onload = () => {
      const ctx = state.brushMaskCanvas.getContext('2d');
      ctx.clearRect(0, 0, RENDER_SZ, RENDER_SZ);
      ctx.drawImage(img, 0, 0, RENDER_SZ, RENDER_SZ);
      render();
    };
    img.src = data.dataURL;
  } else {
    rebuildMaskCanvas();
  }
}
window.deserializeBrushMask = deserializeBrushMask;

/**
 * 处理 Tab 切换时的画笔模式激活/停用
 */
function onBrushTabSwitch(tabName) {
  if (tabName === 'mask' && state.brushMaskEnabled) {
    activateBrushMode();
  } else if (tabName !== 'mask') {
    deactivateBrushMode();
    // 如果标注启用且切换到标注 tab，激活标注模式
    if (tabName === 'dim' && state.dimEnabled && typeof initKonvaOverlay === 'function') {
      initKonvaOverlay();
    }
  }
}
window.onBrushTabSwitch = onBrushTabSwitch;

/**
 * 键盘快捷键：Ctrl+Z 撤销
 */
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    // 只在涂抹模式激活时响应
    if (state.brushMaskEnabled && state.brushStrokes.length > 0) {
      const activeEl = document.activeElement;
      // 不在输入框中时才响应
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return;
      e.preventDefault();
      undoBrushStroke();
    }
  }
});
