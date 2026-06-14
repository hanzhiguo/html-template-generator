/**
 * main-image-dimension.js
 * 尺寸标注模块：Konva交互式标注、标注管理、自动检测
 * 
 * 依赖全局变量：state, konvaStage, konvaDimLayer, displayScale, RENDER_SZ, templates
 * 依赖全局函数：render, showToast, formatDualUnitText
 */

/**
 * 初始化标注 Konva 覆盖层（始终可用，由可见性和编辑模式控制交互）
 */
function toggleDimEnabled(enabled) {
  const dragOverlay = document.getElementById('dragOverlay');
  const konvaOverlay = document.getElementById('konvaOverlay');

  if (enabled) {
    const activeTab = document.querySelector('.sidebar-tab.active');
    const isDimTab = activeTab && activeTab.getAttribute('onclick').includes("'dim'");
    if (isDimTab) {
      if (dragOverlay) dragOverlay.style.pointerEvents = 'none';
      if (konvaOverlay) konvaOverlay.style.pointerEvents = 'auto';
    } else {
      if (dragOverlay) dragOverlay.style.pointerEvents = 'auto';
      if (konvaOverlay) konvaOverlay.style.pointerEvents = 'none';
    }
    if (state.dimLayerVisible && konvaOverlay) {
      initKonvaOverlay();
    }
  } else {
    if (dragOverlay) dragOverlay.style.pointerEvents = 'auto';
    if (konvaOverlay) konvaOverlay.style.pointerEvents = 'none';
    if (konvaStage) { konvaStage.destroy(); konvaStage = null; }
    if (konvaOverlay) konvaOverlay.style.display = 'none';
    state.dimFirstPoint = null;
  }

  render();
}

window.toggleDimEnabled = toggleDimEnabled;

/**
 * 刷新标注锚点显示/隐藏（编辑模式下可拖拽，非编辑模式隐藏）
 */
function refreshDimAnchors() {
  if (!konvaDimLayer) return;
  const editing = state.dimEditing;
  konvaDimLayer.find('.anchor').forEach(a => {
    a.visible(editing);
    a.draggable(editing);
  });
  konvaDimLayer.find('.anchor-hit').forEach(h => {
    h.visible(editing);
    h.draggable(editing);
  });
  konvaDimLayer.find('.moveHandle').forEach(m => {
    m.draggable(editing);
  });
  konvaDimLayer.batchDraw();
}

window.refreshDimAnchors = refreshDimAnchors;

function bindDimEvents() {
  document.getElementById('dimValue').addEventListener('input', (e) => {
    if (state.selectedDimId) {
      const d = state.dimensions.find(d => d.id === state.selectedDimId);
      if (d) { d.value = e.target.value; updateKonvaDim(d); render(); }
    }
  });
  document.getElementById('dimColor').addEventListener('input', (e) => {
    state.dimColor = e.target.value;
    // 应用到所有选中标注
    state.selectedDimIds.forEach(id => {
      const d = state.dimensions.find(d => d.id === id);
      if (d) { d.lineColor = state.dimColor; updateKonvaDim(d); }
    });
    render();
  });
  document.getElementById('dimLineW').addEventListener('input', (e) => {
    state.dimLineW = parseInt(e.target.value);
    document.getElementById('dimLineWVal').textContent = e.target.value + 'px';
    state.selectedDimIds.forEach(id => {
      const d = state.dimensions.find(d => d.id === id);
      if (d) { d.lineWidth = state.dimLineW; updateKonvaDim(d); render(); }
    });
  });
  document.getElementById('dimFontS').addEventListener('input', (e) => {
    state.dimFontS = parseInt(e.target.value);
    document.getElementById('dimFontSVal').textContent = e.target.value + 'px';
    state.selectedDimIds.forEach(id => {
      const d = state.dimensions.find(d => d.id === id);
      if (d) { d.fontSize = state.dimFontS; updateKonvaDim(d); render(); }
    });
  });
  document.getElementById('dimTextColor').addEventListener('input', (e) => {
    state.dimTextColor = e.target.value;
    state.selectedDimIds.forEach(id => {
      const d = state.dimensions.find(d => d.id === id);
      if (d) { d.textColor = state.dimTextColor; updateKonvaDim(d); render(); }
    });
  });
  document.getElementById('dimEndStyle').addEventListener('change', (e) => {
    state.dimEndStyle = e.target.value;
    state.selectedDimIds.forEach(id => {
      const d = state.dimensions.find(d => d.id === id);
      if (d) { d.endStyle = e.target.value; updateKonvaDim(d); render(); }
    });
  });
  document.getElementById('dimTextBg').addEventListener('change', (e) => {
    state.dimTextBg = e.target.value;
    state.selectedDimIds.forEach(id => {
      const d = state.dimensions.find(d => d.id === id);
      if (d) { d.textBg = e.target.value; updateKonvaDim(d); render(); }
    });
  });
}

function initKonvaOverlay() {
  // 如果涂抹模式激活，不初始化标注覆盖层
  if (typeof state !== 'undefined' && state.brushMaskEnabled && brushKonvaStage) return;
  
  if (konvaStage) konvaStage.destroy();
  const wrapper = document.querySelector('.canvas-wrapper');
  if (!wrapper) return;
  const wrapperW = wrapper.clientWidth, wrapperH = wrapper.clientHeight;
  displayScale = wrapperW / RENDER_SZ;
  
  const overlay = document.getElementById('konvaOverlay');
  overlay.style.display = 'block';
  overlay.style.width = wrapperW + 'px';
  overlay.style.height = wrapperH + 'px';
  
  konvaStage = new Konva.Stage({ container: 'konvaOverlay', width: wrapperW, height: wrapperH });
  konvaDimLayer = new Konva.Layer();
  konvaStage.add(konvaDimLayer);
  
  let tempPoint = null;
  
  konvaStage.on('click tap', (e) => {
    if (e.target !== konvaStage && e.target !== konvaDimLayer && !e.target.hasName('temp-point')) {
      return;
    }
    
    const pos = konvaStage.getPointerPosition();
    if (!pos) return;
    
    if (!state.dimFirstPoint) {
      state.dimFirstPoint = { x: pos.x, y: pos.y };
      tempPoint = new Konva.Circle({
        x: pos.x, y: pos.y, radius: 6,
        fill: state.dimColor, stroke: '#fff', strokeWidth: 2,
        name: 'temp-point'
      });
      konvaDimLayer.add(tempPoint);
      konvaDimLayer.draw();
    } else {
      const x1 = state.dimFirstPoint.x, y1 = state.dimFirstPoint.y;
      const x2 = pos.x, y2 = pos.y;
      
      const dx = Math.abs(x2 - x1), dy = Math.abs(y2 - y1);
      const isHoriz = dx > dy;
      
      // 转换为 1024 画布坐标系存储
      const s = displayScale || 1;
      let finalX1, finalY1, finalX2, finalY2;
      if (isHoriz) {
        finalX1 = x1 / s; finalY1 = y1 / s;
        finalX2 = x2 / s; finalY2 = y1 / s;
      } else {
        finalX1 = x1 / s; finalY1 = y1 / s;
        finalX2 = x1 / s; finalY2 = y2 / s;
      }
      
      const id = 'dim' + Date.now();
      // 优先使用文档尺寸数据，根据标注跨度智能分配大小边数值
      let dimDefault = document.getElementById('dimValue').value || '45';
      if (typeof _docDimData !== 'undefined' && _docDimData && (_docDimData.length || _docDimData.width || _docDimData.height || _docDimData.diameter)) {
        // 用标注跨度来判断是长边还是短边
        const spanH = Math.abs(finalX2 - finalX1);
        const spanV = Math.abs(finalY2 - finalY1);
        // 水平标注：spanH 是实际跨度，垂直标注：spanV 是实际跨度
        // 用标注方向的实际跨度与另一个方向的参考跨度比较
        const layouts = typeof getCurrentLayouts === 'function' ? getCurrentLayouts() : null;
        const layout = layouts?.[state.activeImageIndex || 0];
        const lw = layout ? layout.w : 1024;
        const lh = layout ? layout.h : 1024;
        // 将标注跨度映射为等效的遮罩宽高
        const effectiveW = isHoriz ? spanH : (spanV > 0 ? lw * spanV / lh : 0);
        const effectiveH = isHoriz ? (spanH > 0 ? lh * spanH / lw : 0) : spanV;
        if (typeof getSmartDimValues === 'function') {
          const smart = getSmartDimValues(effectiveW || lw, effectiveH || lh);
          if (smart) {
            dimDefault = String(isHoriz ? smart.horizVal : smart.vertVal);
          }
        }
      }
      const dim = {
        id, type: isHoriz ? 'horizontal' : 'vertical',
        x1: finalX1, y1: finalY1, x2: finalX2, y2: finalY2,
        value: dimDefault,
        unit: 'cm',
        lineColor: state.dimColor, lineWidth: state.dimLineW,
        textColor: state.dimTextColor, fontSize: state.dimFontS,
        endStyle: document.getElementById('dimEndStyle').value || 'arrow',
        textBg: document.getElementById('dimTextBg').value || 'white'
      };
      
      state.dimensions.push(dim);
      buildKonvaDim(dim);
      selectDim(id);
      refreshDimList();
      render();
      
      state.dimFirstPoint = null;
      if (tempPoint) { tempPoint.destroy(); tempPoint = null; }
      konvaDimLayer.draw();
    }
  });
  
  konvaStage.on('mousemove', () => {
    if (state.dimFirstPoint && tempPoint) {
      const pos = konvaStage.getPointerPosition();
      if (!pos) return;
      tempPoint.position({ x: pos.x, y: pos.y });
      konvaDimLayer.draw();
    }
  });
  
  state.dimensions.forEach(d => buildKonvaDim(d));
  refreshDimAnchors();
}

window.initKonvaOverlay = initKonvaOverlay;

function buildKonvaDim(dim) {
  if (!konvaDimLayer) return;
  removeKonvaDim(dim.id);
  const group = new Konva.Group({ id: dim.id, name: 'dim' });
  updateKonvaGroup(group, dim);
  konvaDimLayer.add(group);
  konvaDimLayer.draw();
}

function updateKonvaDim(dim) {
  if (!konvaDimLayer) return;
  const group = konvaDimLayer.findOne('#' + dim.id);
  if (!group) return;
  updateKonvaGroup(group, dim);
  konvaDimLayer.draw();
}

function updateKonvaGroup(group, dim) {
  group.destroyChildren();
  
  // 坐标在 1024 画布空间存储，转换为 Konva stage 坐标
  const s = displayScale || 1;
  const x1 = dim.x1 * s, y1 = dim.y1 * s, x2 = dim.x2 * s, y2 = dim.y2 * s;
  const lw = (dim.lineWidth || 2);
  const fs = (dim.fontSize || 16) * s; // 缩放字体以匹配显示比例
  const endStyle = dim.endStyle || 'arrow';
  
  const line = new Konva.Line({
    points: [x1, y1, x2, y2],
    stroke: dim.lineColor, strokeWidth: lw, lineCap: 'round', name: 'line'
  });
  group.add(line);
  
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx*dx + dy*dy);
  const ux = dx / len, uy = dy / len;
  const px = -uy, py = ux;
  
  if (endStyle === 'arrow') {
    const arrowSize = Math.max(8, lw * 4);
    
    function drawArrow(cx, cy, dir) {
      const ax = cx - ux * arrowSize * dir;
      const ay = cy - uy * arrowSize * dir;
      group.add(new Konva.Line({
        points: [ax + px * arrowSize/2, ay + py * arrowSize/2, cx, cy, ax - px * arrowSize/2, ay - py * arrowSize/2],
        stroke: dim.lineColor, strokeWidth: lw, lineCap: 'round', lineJoin: 'round', name: 'end'
      }));
    }
    drawArrow(x1, y1, -1);
    drawArrow(x2, y2, 1);
  } else if (endStyle === 'line') {
    // 带横线的工程制图风格
    const lineLen = Math.max(12, fs * 0.8);
    const gap = Math.max(4, lw * 2);
    
    // 起点横线
    group.add(new Konva.Line({
      points: [
        x1 - px * lineLen/2 + ux * gap, y1 - py * lineLen/2 + uy * gap,
        x1 + px * lineLen/2 + ux * gap, y1 + py * lineLen/2 + uy * gap
      ],
      stroke: dim.lineColor, strokeWidth: lw, lineCap: 'round', name: 'end'
    }));
    // 终点横线
    group.add(new Konva.Line({
      points: [
        x2 - px * lineLen/2 - ux * gap, y2 - py * lineLen/2 - uy * gap,
        x2 + px * lineLen/2 - ux * gap, y2 + py * lineLen/2 - uy * gap
      ],
      stroke: dim.lineColor, strokeWidth: lw, lineCap: 'round', name: 'end'
    }));
  } else {
    const dotR = Math.max(4, lw * 2);
    group.add(new Konva.Circle({ x: x1, y: y1, radius: dotR, fill: dim.lineColor, name: 'end' }));
    group.add(new Konva.Circle({ x: x2, y: y2, radius: dotR, fill: dim.lineColor, name: 'end' }));
  }
  
  const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
  const offsetY = -(fs + 12);
  const textBg = dim.textBg || 'white';
  
  // 格式化双单位文本
  const numVal = parseFloat(dim.value);
  let cmVal = null, inchVal = null;
  
  if (!isNaN(numVal)) {
    const CM_TO_INCH = 1 / 2.54;
    const INCH_TO_CM = 2.54;
    const MM_TO_CM = 0.1;
    const MM_TO_INCH = 1 / 25.4;
    
    switch (dim.unit) {
      case 'cm':
        cmVal = numVal; inchVal = numVal * CM_TO_INCH; break;
      case 'in':
        cmVal = numVal * INCH_TO_CM; inchVal = numVal; break;
      case 'mm':
        cmVal = numVal * MM_TO_CM; inchVal = numVal * MM_TO_INCH; break;
    }
  }
  
  let bgW, bgH;
  
  if (cmVal !== null) {
    // 双行显示：一行厘米，一行英寸，单位首字母对齐
    const cmStr = cmVal.toFixed(1);
    const inchStr = inchVal.toFixed(1);
    
    // 数值标签（红色）
    const num1 = new Konva.Text({
      text: cmStr, fontSize: fs, fontFamily: 'sans-serif', fontStyle: 'bold',
      fill: '#e53935', name: 'num-line1'
    });
    const num2 = new Konva.Text({
      text: inchStr, fontSize: fs, fontFamily: 'sans-serif', fontStyle: 'bold',
      fill: '#e53935', name: 'num-line2'
    });
    // 单位标签（深灰色）
    const unit1 = new Konva.Text({
      text: 'cm', fontSize: fs, fontFamily: 'sans-serif', fontStyle: 'bold',
      fill: '#333333', name: 'unit-line1'
    });
    const unit2 = new Konva.Text({
      text: 'inch', fontSize: fs, fontFamily: 'sans-serif', fontStyle: 'bold',
      fill: '#333333', name: 'unit-line2'
    });
    
    // 数值右对齐，单位左对齐（单位首字母对齐）
    const maxNumW = Math.max(num1.width(), num2.width());
    const unitGap = fs * 0.2; // 数值和单位之间的间距
    const totalW = maxNumW + unitGap + Math.max(unit1.width(), unit2.width());
    bgW = totalW + 10; bgH = fs * 2 + 10;
    
    // 背景
    if (textBg === 'white') {
      const bg = new Konva.Rect({
        x: midX - bgW/2, y: midY + offsetY - bgH/2,
        width: bgW, height: bgH, fill: 'rgba(255,255,255,0.88)', cornerRadius: 3, name: 'bg'
      });
      group.add(bg);
    }
    
    const leftEdge = midX - totalW/2;
    const unitStartX = leftEdge + maxNumW + unitGap;
    
    // 第一行：数值右对齐 + 单位左对齐
    num1.position({ x: leftEdge + maxNumW - num1.width(), y: midY + offsetY - fs/2 - 2 });
    group.add(num1);
    unit1.position({ x: unitStartX, y: midY + offsetY - fs/2 - 2 });
    group.add(unit1);
    
    // 第二行
    num2.position({ x: leftEdge + maxNumW - num2.width(), y: midY + offsetY + fs/2 + 2 });
    group.add(num2);
    unit2.position({ x: unitStartX, y: midY + offsetY + fs/2 + 2 });
    group.add(unit2);
    
  } else {
    // 无单位换算：原有单行文字
    const label = new Konva.Text({
      text: formatDualUnitText(dim.value, dim.unit),
      fontSize: fs, fontFamily: 'sans-serif', fontStyle: 'bold', fill: dim.textColor, name: 'label'
    });
    label.offsetX(label.width()/2);
    label.offsetY(label.height()/2);
    
    bgW = label.width() + 10; bgH = label.height() + 6;
    
    if (textBg === 'white') {
      const bg = new Konva.Rect({
        x: midX - bgW/2, y: midY + offsetY - bgH/2,
        width: bgW, height: bgH, fill: 'rgba(255,255,255,0.88)', cornerRadius: 3, name: 'bg'
      });
      group.add(bg);
    }
    
    label.position({ x: midX, y: midY + offsetY });
    group.add(label);
  }
  
  const anchorSz = 16;
  const editing = state.dimEditing;
  const a1 = new Konva.Rect({
    x: x1 - anchorSz/2, y: y1 - anchorSz/2, width: anchorSz, height: anchorSz,
    fill: '#fff', stroke: dim.lineColor, strokeWidth: 2, cornerRadius: 2,
    draggable: editing, name: 'anchor',
    visible: editing
  });
  a1.on('dragmove', () => {
    const s = displayScale || 1;
    dim.x1 = (a1.x() + anchorSz/2) / s; dim.y1 = (a1.y() + anchorSz/2) / s;
    updatePositionsOnly(group, dim, true);
    render();
  });
  a1.on('mouseenter', () => { a1.fill('#3b82f6'); a1.stroke('#3b82f6'); a1.strokeWidth(3); konvaDimLayer.batchDraw(); });
  a1.on('mouseleave', () => { a1.fill('#fff'); a1.stroke(dim.lineColor); a1.strokeWidth(state.selectedDimIds.includes(dim.id) ? 3 : 2); konvaDimLayer.batchDraw(); });
  group.add(a1);
  // 隐式热区（可拖拽，与锚点同步）
  const hitSz = 24;
  const a1hit = new Konva.Rect({
    x: x1 - hitSz/2, y: y1 - hitSz/2, width: hitSz, height: hitSz,
    fill: 'transparent', name: 'anchor-hit',
    visible: editing,
    draggable: editing
  });
  a1hit.on('dragmove', () => {
    const s = displayScale || 1;
    dim.x1 = (a1hit.x() + hitSz/2) / s; dim.y1 = (a1hit.y() + hitSz/2) / s;
    // 同步锚点位置
    a1.position({ x: a1hit.x() + (hitSz - anchorSz) / 2, y: a1hit.y() + (hitSz - anchorSz) / 2 });
    updatePositionsOnly(group, dim, true);
    render();
  });
  a1hit.on('mouseenter', () => { a1.fill('#3b82f6'); a1.stroke('#3b82f6'); a1.strokeWidth(3); konvaDimLayer.batchDraw(); });
  a1hit.on('mouseleave', () => { a1.fill('#fff'); a1.stroke(dim.lineColor); a1.strokeWidth(state.selectedDimIds.includes(dim.id) ? 3 : 2); konvaDimLayer.batchDraw(); });
  group.add(a1hit);

  const a2 = new Konva.Rect({
    x: x2 - anchorSz/2, y: y2 - anchorSz/2, width: anchorSz, height: anchorSz,
    fill: '#fff', stroke: dim.lineColor, strokeWidth: 2, cornerRadius: 2,
    draggable: editing, name: 'anchor',
    visible: editing
  });
  a2.on('dragmove', () => {
    const s = displayScale || 1;
    dim.x2 = (a2.x() + anchorSz/2) / s; dim.y2 = (a2.y() + anchorSz/2) / s;
    updatePositionsOnly(group, dim, true);
    render();
  });
  a2.on('mouseenter', () => { a2.fill('#3b82f6'); a2.stroke('#3b82f6'); a2.strokeWidth(3); konvaDimLayer.batchDraw(); });
  a2.on('mouseleave', () => { a2.fill('#fff'); a2.stroke(dim.lineColor); a2.strokeWidth(state.selectedDimIds.includes(dim.id) ? 3 : 2); konvaDimLayer.batchDraw(); });
  group.add(a2);
  const a2hit = new Konva.Rect({
    x: x2 - hitSz/2, y: y2 - hitSz/2, width: hitSz, height: hitSz,
    fill: 'transparent', name: 'anchor-hit',
    visible: editing,
    draggable: editing
  });
  a2hit.on('dragmove', () => {
    const s = displayScale || 1;
    dim.x2 = (a2hit.x() + hitSz/2) / s; dim.y2 = (a2hit.y() + hitSz/2) / s;
    // 同步锚点位置
    a2.position({ x: a2hit.x() + (hitSz - anchorSz) / 2, y: a2hit.y() + (hitSz - anchorSz) / 2 });
    updatePositionsOnly(group, dim, true);
    render();
  });
  a2hit.on('mouseenter', () => { a2.fill('#3b82f6'); a2.stroke('#3b82f6'); a2.strokeWidth(3); konvaDimLayer.batchDraw(); });
  a2hit.on('mouseleave', () => { a2.fill('#fff'); a2.stroke(dim.lineColor); a2.strokeWidth(state.selectedDimIds.includes(dim.id) ? 3 : 2); konvaDimLayer.batchDraw(); });
  group.add(a2hit);

  const moveHandle = new Konva.Rect({
    x: midX - bgW/2, y: midY + offsetY - bgH/2,
    width: bgW, height: bgH,
    fill: 'transparent',
    draggable: editing, name: 'moveHandle'
  });
  moveHandle.on('dragmove', () => {
    const s = displayScale || 1;
    const newMidX = (moveHandle.x() + bgW/2) / s;
    const newMidY = (moveHandle.y() + bgH/2 - offsetY) / s;
    const halfDx = (dim.x2 - dim.x1) / 2;
    const halfDy = (dim.y2 - dim.y1) / 2;
    dim.x1 = newMidX - halfDx;
    dim.y1 = newMidY - halfDy;
    dim.x2 = newMidX + halfDx;
    dim.y2 = newMidY + halfDy;
    updatePositionsOnly(group, dim, true);
    render();
  });
  group.add(moveHandle);
  
  group.on('click tap', (e) => {
    const isMulti = e.evt && (e.evt.ctrlKey || e.evt.metaKey);
    selectDim(dim.id, isMulti);
  });

  if (state.selectedDimIds.includes(dim.id)) {
    const bg = group.findOne('.bg');
    if (bg) { bg.stroke('#3b82f6'); bg.strokeWidth(3); }
  }
}

function updatePositionsOnly(group, dim, updateAnchors = false) {
  // 坐标在 1024 画布空间存储，转换为 Konva stage 坐标
  const s = displayScale || 1;
  const x1 = dim.x1 * s, y1 = dim.y1 * s, x2 = dim.x2 * s, y2 = dim.y2 * s;
  const lw = dim.lineWidth || 2;
  const fs = (dim.fontSize || 16) * s; // 缩放字体以匹配显示比例
  const endStyle = dim.endStyle || 'arrow';
  
  const line = group.findOne('.line');
  if (line) line.points([x1, y1, x2, y2]);
  
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx*dx + dy*dy);
  const ux = dx / len, uy = dy / len;
  const px = -uy, py = ux;
  
  group.find('.end').forEach(e => e.destroy());
  
  if (endStyle === 'arrow') {
    const arrowSize = Math.max(8, lw * 4);
    
    function drawArrow(cx, cy, dir) {
      const ax = cx - ux * arrowSize * dir;
      const ay = cy - uy * arrowSize * dir;
      group.add(new Konva.Line({
        points: [ax + px * arrowSize/2, ay + py * arrowSize/2, cx, cy, ax - px * arrowSize/2, ay - py * arrowSize/2],
        stroke: dim.lineColor, strokeWidth: lw, lineCap: 'round', lineJoin: 'round', name: 'end'
      }));
    }
    drawArrow(x1, y1, -1);
    drawArrow(x2, y2, 1);
  } else if (endStyle === 'line') {
    // 带横线的工程制图风格
    const lineLen = Math.max(12, fs * 0.8);
    const gap = Math.max(4, lw * 2);
    
    // 起点横线
    group.add(new Konva.Line({
      points: [
        x1 - px * lineLen/2 + ux * gap, y1 - py * lineLen/2 + uy * gap,
        x1 + px * lineLen/2 + ux * gap, y1 + py * lineLen/2 + uy * gap
      ],
      stroke: dim.lineColor, strokeWidth: lw, lineCap: 'round', name: 'end'
    }));
    // 终点横线
    group.add(new Konva.Line({
      points: [
        x2 - px * lineLen/2 - ux * gap, y2 - py * lineLen/2 - uy * gap,
        x2 + px * lineLen/2 - ux * gap, y2 + py * lineLen/2 - uy * gap
      ],
      stroke: dim.lineColor, strokeWidth: lw, lineCap: 'round', name: 'end'
    }));
  } else {
    const dotR = Math.max(4, lw * 2);
    group.add(new Konva.Circle({ x: x1, y: y1, radius: dotR, fill: dim.lineColor, name: 'end' }));
    group.add(new Konva.Circle({ x: x2, y: y2, radius: dotR, fill: dim.lineColor, name: 'end' }));
  }
  
  const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
  const offsetY = -(fs + 12);
  
  const num1 = group.findOne('.num-line1');
  const num2 = group.findOne('.num-line2');
  const unit1 = group.findOne('.unit-line1');
  const unit2 = group.findOne('.unit-line2');
  const label = group.findOne('.label');
  const bg = group.findOne('.bg');
  const textBg = dim.textBg || 'white';
  
  if (num1 && num2 && unit1 && unit2) {
    // 双行标签更新：数值+单位分离，单位首字母对齐
    const numVal = parseFloat(dim.value);
    let cmVal = null, inchVal = null;
    
    if (!isNaN(numVal)) {
      switch (dim.unit) {
        case 'cm': cmVal = numVal; inchVal = numVal / 2.54; break;
        case 'in': cmVal = numVal * 2.54; inchVal = numVal; break;
        case 'mm': cmVal = numVal * 0.1; inchVal = numVal / 25.4; break;
      }
    }
    
    if (cmVal !== null) {
      const cmStr = cmVal.toFixed(1);
      const inchStr = inchVal.toFixed(1);
      
      num1.text(cmStr); num1.fontSize(fs);
      num2.text(inchStr); num2.fontSize(fs);
      unit1.fontSize(fs);
      unit2.fontSize(fs);
      
      const maxNumW = Math.max(num1.width(), num2.width());
      const unitGap = fs * 0.2;
      const totalW = maxNumW + unitGap + Math.max(unit1.width(), unit2.width());
      const bgW = totalW + 10, bgH = fs * 2 + 10;
      
      const leftEdge = midX - totalW/2;
      const unitStartX = leftEdge + maxNumW + unitGap;
      
      num1.position({ x: leftEdge + maxNumW - num1.width(), y: midY + offsetY - fs/2 - 2 });
      unit1.position({ x: unitStartX, y: midY + offsetY - fs/2 - 2 });
      num2.position({ x: leftEdge + maxNumW - num2.width(), y: midY + offsetY + fs/2 + 2 });
      unit2.position({ x: unitStartX, y: midY + offsetY + fs/2 + 2 });
      
      if (textBg === 'white') {
        if (bg) {
          bg.position({ x: midX - bgW/2, y: midY + offsetY - bgH/2 });
          bg.size({ width: bgW, height: bgH });
        }
      } else {
        if (bg) bg.destroy();
      }
      
      const mh = group.findOne('.moveHandle');
      if (mh) {
        mh.position({ x: midX - bgW/2, y: midY + offsetY - bgH/2 });
        mh.size({ width: bgW, height: bgH });
      }
    }
  } else if (label) {
    label.text(formatDualUnitText(dim.value, dim.unit));
    label.fontSize(fs);
    label.offsetX(label.width()/2);
    label.offsetY(label.height()/2);
    label.position({ x: midX, y: midY + offsetY });
    
    const bgW = label.width() + 10, bgH = label.height() + 6;
    
    if (textBg === 'white') {
      if (bg) {
        bg.position({ x: midX - bgW/2, y: midY + offsetY - bgH/2 });
        bg.size({ width: bgW, height: bgH });
      }
    } else {
      if (bg) bg.destroy();
    }
    
    // 同步更新moveHandle的位置和大小
    const mh = group.findOne('.moveHandle');
    if (mh) {
      mh.position({ x: midX - bgW/2, y: midY + offsetY - bgH/2 });
      mh.size({ width: bgW, height: bgH });
    }
  }
  
  if (updateAnchors) {
    const anchorSz = 16;
    const anchors = group.find('.anchor');
    if (anchors.length >= 2) {
      anchors[0].position({ x: x1 - anchorSz/2, y: y1 - anchorSz/2 });
      anchors[1].position({ x: x2 - anchorSz/2, y: y2 - anchorSz/2 });
    }
    // 同步更新隐式热区位置
    const hitSz = 24;
    const hits = group.find('.anchor-hit');
    if (hits.length >= 2) {
      hits[0].position({ x: x1 - hitSz/2, y: y1 - hitSz/2 });
      hits[1].position({ x: x2 - hitSz/2, y: y2 - hitSz/2 });
    }
  }
  
  // 关键修复：将anchors和moveHandle移到最顶层，避免被重建的.end元素遮挡
  group.find('.anchor-hit').forEach(a => a.moveToTop());
  group.find('.anchor').forEach(a => a.moveToTop());
  const mh = group.findOne('.moveHandle');
  if (mh) mh.moveToTop();
  
  if (konvaDimLayer) konvaDimLayer.batchDraw();
}

function removeKonvaDim(id) {
  if (!konvaDimLayer) return;
  const g = konvaDimLayer.findOne('#' + id);
  if (g) g.destroy();
}

function selectDim(id, multi = false) {
  if (multi && id) {
    // 多选模式：切换选中状态
    const idx = state.selectedDimIds.indexOf(id);
    if (idx >= 0) {
      state.selectedDimIds.splice(idx, 1);
    } else {
      state.selectedDimIds.push(id);
    }
    state.selectedDimId = id; // 最后点击的作为"主选"
  } else {
    // 单选模式
    state.selectedDimIds = id ? [id] : [];
    state.selectedDimId = id;
  }

  if (id) {
    const d = state.dimensions.find(d => d.id === id);
    if (d) {
      document.getElementById('dimValue').value = d.value || '';
      document.getElementById('dimColor').value = d.lineColor || state.dimColor;
      document.getElementById('dimTextColor').value = d.textColor || state.dimTextColor;
      document.getElementById('dimEndStyle').value = d.endStyle || 'arrow';
      document.getElementById('dimTextBg').value = d.textBg || 'white';
    }
  }
  if (konvaDimLayer) {
    konvaDimLayer.find('.dim').forEach(g => {
      const isSelected = state.selectedDimIds.includes(g.id());
      const bg = g.findOne('.bg');
      if (bg) { bg.stroke(isSelected ? '#3b82f6' : null); bg.strokeWidth(isSelected ? 3 : 2); }
    });
    konvaDimLayer.draw();
  }
  refreshDimList();
}

function selectAllDims() {
  if (state.selectedDimIds.length === state.dimensions.length) {
    // 全部取消
    state.selectedDimIds = [];
    state.selectedDimId = null;
  } else {
    state.selectedDimIds = state.dimensions.map(d => d.id);
    state.selectedDimId = state.selectedDimIds[0] || null;
  }
  // 直接更新 UI，不走 selectDim 避免重置
  if (konvaDimLayer) {
    konvaDimLayer.find('.dim').forEach(g => {
      const isSelected = state.selectedDimIds.includes(g.id());
      const bg = g.findOne('.bg');
      if (bg) { bg.stroke(isSelected ? '#3b82f6' : null); bg.strokeWidth(isSelected ? 3 : 2); }
    });
    konvaDimLayer.draw();
  }
  refreshDimList();
}

function refreshDimList() {
  const el = document.getElementById('dimList');
  const countEl = document.getElementById('dimCount');
  if (!el) return;
  if (countEl) countEl.textContent = state.dimensions.length;
  const selSet = new Set(state.selectedDimIds);
  el.innerHTML = state.dimensions.map(d => {
    const isSel = selSet.has(d.id);
    return `
    <div class="dim-list-item ${isSel ? 'sel' : ''}" data-dim-id="${d.id}" style="cursor:pointer;">
      <span class="color-dot" style="background:${d.lineColor || '#ff6b6b'}"></span>
      <span class="dim-name">${d.type === 'horizontal' ? '↔' : '↕'} ${formatDualUnitText(d.value, d.unit)}</span>
      <span class="dim-del" data-del-id="${d.id}">×</span>
    </div>
  `;
  }).join('');

  // 绑定事件（避免 inline onclick 获取不到 event 的问题）
  el.querySelectorAll('.dim-list-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('dim-del')) return;
      const id = item.dataset.dimId;
      selectDim(id, e.ctrlKey || e.metaKey);
    });
  });
  el.querySelectorAll('.dim-del').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteDim(btn.dataset.delId);
    });
  });
}

function deleteDim(id) {
  removeKonvaDim(id);
  state.dimensions = state.dimensions.filter(d => d.id !== id);
  state.selectedDimIds = state.selectedDimIds.filter(sid => sid !== id);
  if (state.selectedDimId === id) state.selectedDimId = state.selectedDimIds[0] || null;
  refreshDimList();
  if (konvaDimLayer) konvaDimLayer.draw();
  render();
}

function deleteAllDims() {
  state.dimensions.forEach(d => removeKonvaDim(d.id));
  state.dimensions = [];
  state.selectedDimId = null;
  state.selectedDimIds = [];
  refreshDimList();
  if (konvaDimLayer) konvaDimLayer.draw();
  render();
}

// 像素差异法自动识别（SAM2 的降级方案）
function autoDetectPixelDiff(targetIdx) {
  const img = state.images[targetIdx].img;
  const tmpCanvas = document.createElement('canvas');
  const tmpCtx = tmpCanvas.getContext('2d');
  tmpCanvas.width = img.width; tmpCanvas.height = img.height;
  tmpCtx.drawImage(img, 0, 0);
  const imageData = tmpCtx.getImageData(0, 0, img.width, img.height);
  const pixels = imageData.data;
  
  const w = img.width, h = img.height;
  const borderSamples = [];
  const sampleStep = Math.max(1, Math.floor(Math.min(w, h) / 50));
  
  for (let x = 0; x < w; x += sampleStep) {
    borderSamples.push(getPixel(pixels, w, x, 0));
    borderSamples.push(getPixel(pixels, w, x, h - 1));
  }
  for (let y = 0; y < h; y += sampleStep) {
    borderSamples.push(getPixel(pixels, w, 0, y));
    borderSamples.push(getPixel(pixels, w, w - 1, y));
  }
  
  let bgR = 0, bgG = 0, bgB = 0, validCount = 0;
  borderSamples.forEach(p => {
    if (p.a > 200) {
      bgR += p.r; bgG += p.g; bgB += p.b;
      validCount++;
    }
  });
  if (validCount > 0) {
    bgR = Math.round(bgR / validCount);
    bgG = Math.round(bgG / validCount);
    bgB = Math.round(bgB / validCount);
  } else {
    bgR = 255; bgG = 255; bgB = 255;
  }
  
  let minX = w, minY = h, maxX = 0, maxY = 0;
  const thr = 35;
  const scanStep = Math.max(1, Math.floor(Math.min(w, h) / 300));
  
  for (let y = 0; y < h; y += scanStep) {
    for (let x = 0; x < w; x += scanStep) {
      const p = getPixel(pixels, w, x, y);
      if (p.a < 128) continue;
      
      const dr = Math.abs(p.r - bgR);
      const dg = Math.abs(p.g - bgG);
      const db = Math.abs(p.b - bgB);
      const diff = Math.sqrt(dr*dr + dg*dg + db*db);
      
      if (diff > thr) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  
  if (minX >= maxX || minY >= maxY) {
    minX = w * 0.1; minY = h * 0.1;
    maxX = w * 0.9; maxY = h * 0.9;
    showToast('未检测到明显主体，使用默认区域');
  }
  
  return { minX, minY, maxX, maxY };
}

async function autoDetectProduct() {
  const targetIdx = parseInt(document.getElementById('dimTargetImg').value) || 0;
  if (!state.images[targetIdx]) { 
    showToast(targetIdx === 0 ? '请先上传主图' : '请先上传副图', true); 
    return; 
  }
  
  if (!state.dimLayerVisible) {
    state.dimLayerVisible = true;
    initKonvaOverlay();
  }
  
  // 获取当前 layout 区域（1024坐标系）
  const template = templates[state.templateCount];
  const layouts = getCurrentLayouts();
  const gap = state.imageGap * 2;
  const adjustedLayouts = typeof adjustLayoutsWithGap === 'function'
    ? adjustLayoutsWithGap(layouts, gap) : layouts;
  const finalLayouts = typeof adjustLayoutsAvoidText === 'function'
    ? adjustLayoutsAvoidText(adjustedLayouts) : adjustedLayouts;
  const layout = finalLayouts?.[targetIdx];
  if (!layout) { showToast('无法获取图片布局', true); return; }
  
  // 收集所有边界区域
  let allBounds = [];
  
  try {
    // 优先使用 ComfyUI 分割
    if (typeof comfyAutoDetect === 'function') {
      showToast('正在通过 ComfyUI 识别...', false);
      const bounds = await comfyAutoDetect(targetIdx);
      console.log('[autoDetectProduct] comfyAutoDetect 返回:', JSON.stringify(bounds));
      if (bounds) {
        // 支持单个边界对象或边界数组
        allBounds = Array.isArray(bounds) ? bounds : [bounds];
        showToast('ComfyUI 识别完成，检测到 ' + allBounds.length + ' 个区域');
      } else {
        throw new Error('ComfyUI 未检测到物体');
      }
    } else {
      throw new Error('ComfyUI 模块未加载');
    }
  } catch (e) {
    // ComfyUI 失败，回退到像素差异法
    console.warn('[AutoDetect] ComfyUI 分割失败，回退像素差异法:', e.message);
    const fallback = autoDetectPixelDiff(targetIdx);
    const img = state.images[targetIdx].img;
    const scaleX = layout.w / img.width;
    const scaleY = layout.h / img.height;
    allBounds = [{
      minX: layout.x + fallback.minX * scaleX,
      minY: layout.y + fallback.minY * scaleY,
      maxX: layout.x + fallback.maxX * scaleX,
      maxY: layout.y + fallback.maxY * scaleY
    }];
  }
  
  // 为每个区域生成一对标注
  const color = state.dimColor;
  const lw = state.dimLineW;
  const endStyle = document.getElementById('dimEndStyle').value || 'arrow';
  const textBg = document.getElementById('dimTextBg').value || 'white';
  
  let firstDimId = null;
  for (let i = 0; i < allBounds.length; i++) {
    const { minX, minY, maxX, maxY } = allBounds[i];
    // 优先使用文档尺寸数据，根据遮罩宽高智能分配大小边数值
    let dimW, dimH;
    const maskW = maxX - minX;
    const maskH = maxY - minY;
    if (typeof getSmartDimValues === 'function') {
      const smart = getSmartDimValues(maskW, maskH);
      if (smart) {
        dimW = smart.horizVal;
        dimH = smart.vertVal;
      }
    }
    if (dimW == null || dimH == null) {
      dimW = Math.round((maxX - minX) / layout.w * 100);
      dimH = Math.round((maxY - minY) / layout.h * 100);
    }
    
    const hDim = {
      id: 'dim_auto_h_' + Date.now() + '_' + i,
      type: 'horizontal',
      x1: minX,
      y1: maxY + 20,
      x2: maxX,
      y2: maxY + 20,
      value: dimW.toString(),
      unit: 'cm', lineColor: color, lineWidth: lw,
      textColor: state.dimTextColor, fontSize: state.dimFontS,
      endStyle: endStyle, textBg: textBg
    };
    const vDim = {
      id: 'dim_auto_v_' + Date.now() + '_' + i,
      type: 'vertical',
      x1: maxX + 20,
      y1: minY,
      x2: maxX + 20,
      y2: maxY,
      value: dimH.toString(),
      unit: 'cm', lineColor: color, lineWidth: lw,
      textColor: state.dimTextColor, fontSize: state.dimFontS,
      endStyle: endStyle, textBg: textBg
    };
    
    state.dimensions.push(hDim, vDim);
    if (i === 0) firstDimId = hDim.id;
    if (konvaStage) {
      buildKonvaDim(hDim);
      buildKonvaDim(vDim);
    }
  }
  
  if (konvaStage) konvaDimLayer.draw();
  if (firstDimId) selectDim(firstDimId);
  refreshDimList();
  render();
  
  const total = allBounds.length;
  showToast(`识别完成: ${total} 个区域，${total * 2} 个标注`);
}

function getPixel(pixels, width, x, y) {
  const idx = (y * width + x) * 4;
  return {
    r: pixels[idx],
    g: pixels[idx + 1],
    b: pixels[idx + 2],
    a: pixels[idx + 3]
  };
}
