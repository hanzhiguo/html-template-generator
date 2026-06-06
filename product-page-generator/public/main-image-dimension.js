/**
 * main-image-dimension.js
 * 尺寸标注模块：Konva交互式标注、标注管理、自动检测
 * 
 * 依赖全局变量：state, konvaStage, konvaDimLayer, displayScale, RENDER_SZ, templates
 * 依赖全局函数：render, showToast, formatDualUnitText
 */

function bindDimEvents() {
  const dt = document.getElementById('dimToggle');
  if (!dt) return;
  
  dt.addEventListener('change', () => {
    state.dimEnabled = dt.checked;
    document.getElementById('dimPanel').style.display = state.dimEnabled ? 'block' : 'none';
    const dragOverlay = document.getElementById('dragOverlay');
    if (state.dimEnabled) {
      if (dragOverlay) dragOverlay.style.pointerEvents = 'none';
      if (state.dimLayerVisible) {
        initKonvaOverlay();
      }
    } else {
      if (dragOverlay) dragOverlay.style.pointerEvents = 'auto';
      if (konvaStage) { konvaStage.destroy(); konvaStage = null; }
      document.getElementById('konvaOverlay').style.display = 'none';
      state.dimFirstPoint = null;
    }
    render();
  });
  
  document.getElementById('dimValue').addEventListener('input', (e) => {
    if (state.selectedDimId) {
      const d = state.dimensions.find(d => d.id === state.selectedDimId);
      if (d) { d.value = e.target.value; updateKonvaDim(d); render(); }
    }
  });
  document.getElementById('dimColor').addEventListener('input', (e) => {
    state.dimColor = e.target.value;
    if (state.selectedDimId) {
      const d = state.dimensions.find(d => d.id === state.selectedDimId);
      if (d) { d.lineColor = e.target.value; updateKonvaDim(d); render(); }
    }
  });
  document.getElementById('dimLineW').addEventListener('input', (e) => {
    state.dimLineW = parseInt(e.target.value);
    document.getElementById('dimLineWVal').textContent = e.target.value + 'px';
  });
  document.getElementById('dimFontS').addEventListener('input', (e) => {
    state.dimFontS = parseInt(e.target.value);
    document.getElementById('dimFontSVal').textContent = e.target.value + 'px';
  });
  document.getElementById('dimTextColor').addEventListener('input', (e) => {
    state.dimTextColor = e.target.value;
  });
  document.getElementById('dimEndStyle').addEventListener('change', (e) => {
    state.dimEndStyle = e.target.value;
    if (state.selectedDimId) {
      const d = state.dimensions.find(d => d.id === state.selectedDimId);
      if (d) { d.endStyle = e.target.value; updateKonvaDim(d); render(); }
    }
  });
  document.getElementById('dimTextBg').addEventListener('change', (e) => {
    state.dimTextBg = e.target.value;
    if (state.selectedDimId) {
      const d = state.dimensions.find(d => d.id === state.selectedDimId);
      if (d) { d.textBg = e.target.value; updateKonvaDim(d); render(); }
    }
  });
}

function initKonvaOverlay() {
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
      
      let finalX1, finalY1, finalX2, finalY2;
      if (isHoriz) {
        finalX1 = x1; finalY1 = y1;
        finalX2 = x2; finalY2 = y1;
      } else {
        finalX1 = x1; finalY1 = y1;
        finalX2 = x1; finalY2 = y2;
      }
      
      const id = 'dim' + Date.now();
      const dim = {
        id, type: isHoriz ? 'horizontal' : 'vertical',
        x1: finalX1, y1: finalY1, x2: finalX2, y2: finalY2,
        value: document.getElementById('dimValue').value || '45',
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
  
  const x1 = dim.x1, y1 = dim.y1, x2 = dim.x2, y2 = dim.y2;
  const lw = dim.lineWidth || 2;
  const fs = dim.fontSize || 16;
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
  
  if (endStyle === 'line' && cmVal !== null) {
    // 横线样式：双色文字，分两行显示
    const cmStr = cmVal % 1 === 0 ? cmVal.toString() : cmVal.toFixed(1);
    const inchStr = inchVal % 1 === 0 ? inchVal.toString() : inchVal.toFixed(2);
    
    // 第一行标签（数值红色+单位黑色）
    const label1 = new Konva.Text({
      text: `${cmStr}cm`,
      fontSize: fs, fontFamily: 'sans-serif', fontStyle: 'bold', name: 'label-line1'
    });
    // 第二行标签（换算值红色+单位黑色）
    const label2 = new Konva.Text({
      text: `${inchStr}inch`,
      fontSize: fs, fontFamily: 'sans-serif', fontStyle: 'bold', name: 'label-line2'
    });
    
    const maxW = Math.max(label1.width(), label2.width());
    bgW = maxW + 10; bgH = fs * 2 + 6 + 4;
    
    // 背景
    if (textBg === 'white') {
      const bg = new Konva.Rect({
        x: midX - bgW/2, y: midY + offsetY - bgH/2,
        width: bgW, height: bgH, fill: 'rgba(255,255,255,0.88)', cornerRadius: 3, name: 'bg'
      });
      group.add(bg);
    }
    
    // 第一行文字位置
    label1.position({ x: midX, y: midY + offsetY - fs/2 - 2 });
    label1.offsetX(label1.width()/2);
    label1.offsetY(label1.height()/2);
    group.add(label1);
    
    // 第二行文字位置
    label2.position({ x: midX, y: midY + offsetY + fs/2 + 2 });
    label2.offsetX(label2.width()/2);
    label2.offsetY(label2.height()/2);
    group.add(label2);
    
  } else {
    // 其他样式：原有单行文字
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
  
  const anchorSz = 10;
  const a1 = new Konva.Rect({
    x: x1 - anchorSz/2, y: y1 - anchorSz/2, width: anchorSz, height: anchorSz,
    fill: '#fff', stroke: dim.lineColor, strokeWidth: 2, cornerRadius: 2,
    draggable: true, name: 'anchor'
  });
  a1.on('dragmove', () => {
    dim.x1 = a1.x() + anchorSz/2; dim.y1 = a1.y() + anchorSz/2;
    updatePositionsOnly(group, dim);
    render();
  });
  group.add(a1);
  
  const a2 = new Konva.Rect({
    x: x2 - anchorSz/2, y: y2 - anchorSz/2, width: anchorSz, height: anchorSz,
    fill: '#fff', stroke: dim.lineColor, strokeWidth: 2, cornerRadius: 2,
    draggable: true, name: 'anchor'
  });
  a2.on('dragmove', () => {
    dim.x2 = a2.x() + anchorSz/2; dim.y2 = a2.y() + anchorSz/2;
    updatePositionsOnly(group, dim);
    render();
  });
  group.add(a2);
  
  const moveHandle = new Konva.Rect({
    x: midX - bgW/2, y: midY + offsetY - bgH/2,
    width: bgW, height: bgH,
    fill: 'transparent',
    draggable: true, name: 'moveHandle'
  });
  moveHandle.on('dragmove', () => {
    const newMidX = moveHandle.x() + bgW/2;
    const newMidY = moveHandle.y() + bgH/2 - offsetY;
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
  
  group.on('click tap', () => selectDim(dim.id));
  
  if (dim.id === state.selectedDimId) {
    const bg = group.findOne('.bg');
    if (bg) { bg.stroke('#3b82f6'); bg.strokeWidth(2); }
  }
}

function updatePositionsOnly(group, dim, updateAnchors = false) {
  const x1 = dim.x1, y1 = dim.y1, x2 = dim.x2, y2 = dim.y2;
  const lw = dim.lineWidth || 2;
  const fs = dim.fontSize || 16;
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
  
  const label = group.findOne('.label');
  const label1 = group.findOne('.label-line1');
  const label2 = group.findOne('.label-line2');
  const bg = group.findOne('.bg');
  const textBg = dim.textBg || 'white';
  
  if (endStyle === 'line' && label1 && label2) {
    // 横线样式的双行标签更新
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
      const cmStr = cmVal % 1 === 0 ? cmVal.toString() : cmVal.toFixed(1);
      const inchStr = inchVal % 1 === 0 ? inchVal.toString() : inchVal.toFixed(2);
      
      label1.text(`${cmStr}cm`);
      label2.text(`${inchStr}inch`);
      
      const maxW = Math.max(label1.width(), label2.width());
      const bgW = maxW + 10, bgH = fs * 2 + 6 + 4;
      
      label1.offsetX(label1.width()/2);
      label1.offsetY(label1.height()/2);
      label1.position({ x: midX, y: midY + offsetY - fs/2 - 2 });
      
      label2.offsetX(label2.width()/2);
      label2.offsetY(label2.height()/2);
      label2.position({ x: midX, y: midY + offsetY + fs/2 + 2 });
      
      if (textBg === 'white') {
        if (bg) {
          bg.position({ x: midX - bgW/2, y: midY + offsetY - bgH/2 });
          bg.size({ width: bgW, height: bgH });
        }
      } else {
        if (bg) bg.destroy();
      }
    }
  } else if (label) {
    label.text(formatDualUnitText(dim.value, dim.unit));
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
  }
  
  if (updateAnchors) {
    const anchorSz = 10;
    const anchors = group.find('.anchor');
    if (anchors.length >= 2) {
      anchors[0].position({ x: x1 - anchorSz/2, y: y1 - anchorSz/2 });
      anchors[1].position({ x: x2 - anchorSz/2, y: y2 - anchorSz/2 });
    }
  }
  
  if (konvaDimLayer) konvaDimLayer.batchDraw();
}

function removeKonvaDim(id) {
  if (!konvaDimLayer) return;
  const g = konvaDimLayer.findOne('#' + id);
  if (g) g.destroy();
}

function selectDim(id) {
  state.selectedDimId = id;
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
      const bg = g.findOne('.bg');
      if (bg) { bg.stroke(g.id() === id ? '#3b82f6' : null); bg.strokeWidth(2); }
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
  el.innerHTML = state.dimensions.map(d => `
    <div class="dim-list-item ${d.id === state.selectedDimId ? 'sel' : ''}" onclick="selectDim('${d.id}')">
      <span class="color-dot" style="background:${d.lineColor || '#ff6b6b'}"></span>
      <span class="dim-name">${d.type === 'horizontal' ? '↔' : '↕'} ${formatDualUnitText(d.value, d.unit)}</span>
      <span class="dim-del" onclick="event.stopPropagation();deleteDim('${d.id}')">×</span>
    </div>
  `).join('');
}

function deleteDim(id) {
  removeKonvaDim(id);
  state.dimensions = state.dimensions.filter(d => d.id !== id);
  if (state.selectedDimId === id) state.selectedDimId = null;
  refreshDimList();
  if (konvaDimLayer) konvaDimLayer.draw();
  render();
}

function deleteAllDims() {
  state.dimensions.forEach(d => removeKonvaDim(d.id));
  state.dimensions = [];
  state.selectedDimId = null;
  refreshDimList();
  if (konvaDimLayer) konvaDimLayer.draw();
  render();
}

function autoDetectProduct() {
  const targetIdx = parseInt(document.getElementById('dimTargetImg').value) || 0;
  if (!state.images[targetIdx]) { 
    showToast(targetIdx === 0 ? '请先上传主图' : '请先上传副图', true); 
    return; 
  }
  
  if (!state.dimEnabled) {
    document.getElementById('dimToggle').checked = true;
    state.dimEnabled = true;
    document.getElementById('dimPanel').style.display = 'block';
    initKonvaOverlay();
  }
  
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
  
  const pad = Math.min(w, h) * 0.03;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(w, maxX + pad);
  maxY = Math.min(h, maxY + pad);
  
  const template = templates[state.templateCount];
  const layout = template?.layouts[targetIdx];
  if (!layout) { showToast('无法获取图片布局', true); return; }
  
  const scaleX = layout.w / w;
  const scaleY = layout.h / h;
  const offsetX = layout.x;
  const offsetY = layout.y;
  
  const color = state.dimColor;
  const lw = state.dimLineW;
  const endStyle = document.getElementById('dimEndStyle').value || 'arrow';
  const textBg = document.getElementById('dimTextBg').value || 'white';
  
  const dimW = Math.round((maxX - minX) * 100 / w);
  const dimH = Math.round((maxY - minY) * 100 / h);
  
  const hDim = {
    id: 'dim_auto_h_' + Date.now(),
    type: 'horizontal',
    x1: (offsetX + minX * scaleX) * displayScale,
    y1: (offsetY + maxY * scaleY + 20) * displayScale,
    x2: (offsetX + maxX * scaleX) * displayScale,
    y2: (offsetY + maxY * scaleY + 20) * displayScale,
    value: dimW.toString(),
    unit: 'cm', lineColor: color, lineWidth: lw,
    textColor: state.dimTextColor, fontSize: state.dimFontS,
    endStyle: endStyle, textBg: textBg
  };
  const vDim = {
    id: 'dim_auto_v_' + Date.now(),
    type: 'vertical',
    x1: (offsetX + maxX * scaleX + 20) * displayScale,
    y1: (offsetY + minY * scaleY) * displayScale,
    x2: (offsetX + maxX * scaleX + 20) * displayScale,
    y2: (offsetY + maxY * scaleY) * displayScale,
    value: dimH.toString(),
    unit: 'cm', lineColor: color, lineWidth: lw,
    textColor: state.dimTextColor, fontSize: state.dimFontS,
    endStyle: endStyle, textBg: textBg
  };
  
  state.dimensions.push(hDim, vDim);
  if (konvaStage) {
    buildKonvaDim(hDim);
    buildKonvaDim(vDim);
    konvaDimLayer.draw();
  }
  selectDim(hDim.id);
  refreshDimList();
  render();
  showToast(`识别完成: ${dimW}cm × ${dimH}cm`);
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
