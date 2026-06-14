/**
 * main-image-sam-segment.js
 * SAM2 图像分割模块：自动生成精准遮罩，用户点击选择
 *
 * 核心思路：直接用合成后的 1024x1024 画布图做 SAM 编码
 * 这样 mask 坐标直接就是 1024 画布坐标，不需要 layout/padding 映射
 *
 * 依赖全局变量：state, showToast, RENDER_SZ, getCtx
 */

// ========== SAM 分割全局变量 ==========
let sam2Instance = null;
let samInitialized = false;
let samImageEncoded = false;
let samMasks = [];
let samSelectedMaskIdx = -1;
let samMode = 'idle';          // idle | loading | encoding | ready | segmenting
let samModelConfig = null;

// ========== 初始化 SAM ==========

async function initSAM() {
  if (samInitialized && sam2Instance) return sam2Instance;

  samMode = 'loading';
  updateSAMStatus('正在加载 SAM2 模型...');

  try {
    const sam2Module = await import('/npm/sam-web/SAM2-DGqPpXtk.js');
    const SAM2 = sam2Module.S;
    const getModelConfig = sam2Module.g;

    samModelConfig = getModelConfig('sam2_tiny');
    sam2Instance = new SAM2(samModelConfig);

    updateSAMStatus('正在下载模型文件...');
    await sam2Instance.downloadModels();

    updateSAMStatus('正在加载模型...');
    const report = await sam2Instance.createSessions();

    samInitialized = true;
    samMode = 'ready';
    updateSAMStatus(`SAM2 就绪 (${report.device || 'cpu'})`);
    console.log('[SAM] 初始化完成, device:', report.device);
    return sam2Instance;
  } catch (e) {
    console.error('[SAM] 初始化失败:', e);
    samMode = 'idle';
    updateSAMStatus('SAM2 加载失败: ' + e.message);
    throw e;
  }
}

// ========== 编码：直接用合成后的 1024 画布 ==========

async function samEncodeImage() {
  if (!sam2Instance) await initSAM();

  if (state.images.length === 0) {
    showToast('请先上传图片', true);
    return;
  }

  samMode = 'encoding';
  samImageEncoded = false;
  samMasks = [];
  samSelectedMaskIdx = -1;
  updateSAMStatus('正在编码图片...');
  updateSAMMaskList();

  try {
    // 先确保预览画布是最新的渲染结果
    if (typeof render === 'function') render();

    // 直接从预览画布获取合成图
    const previewCanvas = document.getElementById('previewCanvas');
    const size = samModelConfig.imageSize; // {w: 1024, h: 1024}

    // 将预览画布内容绘制到 SAM 输入尺寸（1:1，无需 padding）
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = size.w;
    tmpCanvas.height = size.h;
    const tmpCtx = tmpCanvas.getContext('2d');
    tmpCtx.drawImage(previewCanvas, 0, 0, size.w, size.h);

    // 转为 CHW Float32Array [1, 3, H, W]
    const imageData = tmpCtx.getImageData(0, 0, size.w, size.h);
    const pixels = imageData.data;
    const channelSize = size.w * size.h;
    const float32Array = new Float32Array(3 * channelSize);
    for (let i = 0; i < channelSize; i++) {
      float32Array[i] = pixels[i * 4] / 255;
      float32Array[channelSize + i] = pixels[i * 4 + 1] / 255;
      float32Array[2 * channelSize + i] = pixels[i * 4 + 2] / 255;
    }

    const tensorShape = samModelConfig.useBatchDimension ? [1, 3, size.h, size.w] : [3, size.h, size.w];

    const ortModule = await import('/npm/onnxruntime-web/ort.all.min.mjs');
    const imgTensor = new ortModule.Tensor('float32', float32Array, tensorShape);

    const startTime = performance.now();
    await sam2Instance.encodeImage(imgTensor);
    const durationMs = performance.now() - startTime;
    console.log(`[SAM] 合成图编码完成: ${durationMs.toFixed(0)}ms`);

    samImageEncoded = true;
    samMode = 'ready';
    updateSAMStatus('图片编码完成，可进行分割');
  } catch (e) {
    console.error('[SAM] 编码失败:', e);
    samMode = 'ready';
    updateSAMStatus('编码失败: ' + e.message);
    throw e;
  }
}

// ========== 自动全图分割（网格采样） ==========

async function samAutoSegment() {
  if (!samImageEncoded) {
    await samEncodeImage();
    if (!samImageEncoded) return;
  }

  samMode = 'segmenting';
  samMasks = [];
  samSelectedMaskIdx = -1;
  updateSAMStatus('正在自动分割...');
  updateSAMMaskList();

  try {
    const size = samModelConfig.imageSize;

    // 在 1024x1024 画布上均匀采样点（像素坐标）
    const gridPoints = [];
    const gridSize = 4;
    for (let gy = 0; gy < gridSize; gy++) {
      for (let gx = 0; gx < gridSize; gx++) {
        const px = (gx + 0.5) / gridSize * size.w;
        const py = (gy + 0.5) / gridSize * size.h;
        gridPoints.push({ x: px, y: py, label: 1 });
      }
    }

    const seenBounds = [];
    for (let i = 0; i < gridPoints.length; i++) {
      try {
        const result = await sam2Instance.decode([gridPoints[i]]);
        const masks = result.masks || result.low_res_masks;
        const iouPred = result.iou_predictions || result.iou_pred;
        if (!masks || !iouPred) continue;

        const maskData = masks.data;
        const maskDims = masks.dims;
        const iouData = iouPred.data;

        const numMasks = maskDims[1] || 1;
        let bestIdx = 0, bestScore = 0;
        for (let m = 0; m < numMasks; m++) {
          if (iouData[m] > bestScore) { bestScore = iouData[m]; bestIdx = m; }
        }
        if (bestScore < 0.5) continue;

        const maskH = maskDims[2] || maskDims[maskDims.length - 2];
        const maskW = maskDims[3] || maskDims[maskDims.length - 1];
        const singleMaskSize = maskH * maskW;
        const singleMask = new Float32Array(singleMaskSize);
        for (let j = 0; j < singleMaskSize; j++) {
          singleMask[j] = maskData[bestIdx * singleMaskSize + j];
        }

        // 计算面积
        let area = 0;
        for (let j = 0; j < singleMaskSize; j++) {
          if (singleMask[j] > 0.5) area++;
        }
        const areaRatio = area / singleMaskSize;
        if (areaRatio > 0.9 || areaRatio < 0.005) continue;

        // bounds 直接是 1024 画布坐标
        const bounds = findMaskBounds1024(singleMask, maskW, maskH, size);

        let isDuplicate = false;
        for (const existing of seenBounds) {
          if (computeBoundsIoU(bounds, existing) > 0.7) { isDuplicate = true; break; }
        }
        if (isDuplicate) continue;
        seenBounds.push(bounds);

        const bitmap = await maskDataToBitmap(singleMask, maskW, maskH);

        samMasks.push({
          id: 'mask_' + i,
          index: samMasks.length,
          score: bestScore,
          area, areaRatio, bounds,
          data: singleMask,
          shape: [maskH, maskW],
          bitmap,
          color: getMaskColor(samMasks.length)
        });
      } catch (e) {
        console.warn('[SAM] 点分割失败:', e.message);
      }
    }

    samMasks.sort((a, b) => b.area - a.area);
    samMasks.forEach((m, i) => m.index = i);

    samMode = 'ready';
    updateSAMStatus(`分割完成，发现 ${samMasks.length} 个区域`);
    updateSAMMaskList();
    renderSAMOverlay();
  } catch (e) {
    console.error('[SAM] 自动分割失败:', e);
    samMode = 'ready';
    updateSAMStatus('分割失败: ' + e.message);
  }
}

// ========== 点击分割（交互式） ==========

async function samClickSegment(canvasX, canvasY, isPositive) {
  if (!samImageEncoded) {
    await samEncodeImage();
    if (!samImageEncoded) return;
  }

  samMode = 'segmenting';
  updateSAMStatus('正在分割...');

  try {
    const size = samModelConfig.imageSize;

    // canvasX/Y 已经是 1024 画布坐标，直接用作像素坐标
    const result = await sam2Instance.decode([{ x: canvasX, y: canvasY, label: isPositive ? 1 : 0 }]);
    const masks = result.masks || result.low_res_masks;
    const iouPred = result.iou_predictions || result.iou_pred;
    if (!masks || !iouPred) {
      updateSAMStatus('分割失败：无结果');
      samMode = 'ready';
      return;
    }

    const maskData = masks.data;
    const maskDims = masks.dims;
    const iouData = iouPred.data;

    const numMasks = maskDims[1] || 1;
    let bestIdx = 0, bestScore = 0;
    for (let m = 0; m < numMasks; m++) {
      if (iouData[m] > bestScore) { bestScore = iouData[m]; bestIdx = m; }
    }
    if (bestScore < 0.3) {
      updateSAMStatus('未检测到明确物体');
      samMode = 'ready';
      return;
    }

    const maskH = maskDims[2] || maskDims[maskDims.length - 2];
    const maskW = maskDims[3] || maskDims[maskDims.length - 1];
    const singleMaskSize = maskH * maskW;
    const singleMask = new Float32Array(singleMaskSize);
    for (let j = 0; j < singleMaskSize; j++) {
      singleMask[j] = maskData[bestIdx * singleMaskSize + j];
    }

    let area = 0;
    for (let j = 0; j < singleMaskSize; j++) {
      if (singleMask[j] > 0.5) area++;
    }

    const bounds = findMaskBounds1024(singleMask, maskW, maskH, size);
    const bitmap = await maskDataToBitmap(singleMask, maskW, maskH);

    const newMask = {
      id: 'mask_click_' + Date.now(),
      index: samMasks.length,
      score: bestScore,
      area,
      areaRatio: area / singleMaskSize,
      bounds,
      data: singleMask,
      shape: [maskH, maskW],
      bitmap,
      color: getMaskColor(samMasks.length)
    };

    samMasks.push(newMask);
    samSelectedMaskIdx = newMask.index;
    updateSAMStatus(`点击分割完成，置信度 ${(bestScore * 100).toFixed(0)}%`);
    updateSAMMaskList();
    renderSAMOverlay();
    samMode = 'ready';
  } catch (e) {
    console.error('[SAM] 点击分割失败:', e);
    samMode = 'ready';
    updateSAMStatus('分割失败: ' + e.message);
  }
}

// ========== 遮罩选择与应用 ==========

function samSelectMask(idx) {
  samSelectedMaskIdx = idx;
  updateSAMMaskList();
  renderSAMOverlay();
}

// 将选中的 SAM 遮罩应用到涂抹层（坐标直接就是 1024 画布坐标）
function samApplyMaskToBrush() {
  if (samSelectedMaskIdx < 0 || samSelectedMaskIdx >= samMasks.length) {
    showToast('请先选择一个遮罩', true);
    return;
  }

  const mask = samMasks[samSelectedMaskIdx];
  if (!state.brushMaskCanvas) initBrushMaskCanvas();
  const brushCtx = state.brushMaskCanvas.getContext('2d');

  const color = state.brushMaskColor || '#ffffff';
  const opacity = state.brushMaskOpacity || 1;
  const size = samModelConfig.imageSize;
  const maskH = mask.shape[0];
  const maskW = mask.shape[1];

  brushCtx.save();
  brushCtx.globalAlpha = opacity;
  brushCtx.fillStyle = color;

  for (let y = 0; y < maskH; y++) {
    for (let x = 0; x < maskW; x++) {
      if (mask.data[y * maskW + x] > 0.5) {
        // mask 像素 -> 1024 画布坐标（直接映射）
        const bx = x / maskW * size.w;
        const by = y / maskH * size.h;
        brushCtx.fillRect(Math.floor(bx), Math.floor(by), 2, 2);
      }
    }
  }

  brushCtx.restore();
  if (typeof render === 'function') render();
  showToast('遮罩已应用到涂抹层');
}

// 反选应用
function samApplyMaskInverted() {
  if (samSelectedMaskIdx < 0 || samSelectedMaskIdx >= samMasks.length) {
    showToast('请先选择一个遮罩', true);
    return;
  }

  const mask = samMasks[samSelectedMaskIdx];
  if (!state.brushMaskCanvas) initBrushMaskCanvas();
  const brushCtx = state.brushMaskCanvas.getContext('2d');

  const color = state.brushMaskColor || '#ffffff';
  const opacity = state.brushMaskOpacity || 1;
  const size = samModelConfig.imageSize;
  const maskH = mask.shape[0];
  const maskW = mask.shape[1];

  brushCtx.save();
  brushCtx.globalAlpha = opacity;
  brushCtx.fillStyle = color;

  // 先涂抹整个画布
  brushCtx.fillRect(0, 0, RENDER_SZ, RENDER_SZ);

  // 然后清除遮罩覆盖的部分
  brushCtx.globalCompositeOperation = 'destination-out';

  for (let y = 0; y < maskH; y++) {
    for (let x = 0; x < maskW; x++) {
      if (mask.data[y * maskW + x] > 0.5) {
        const bx = x / maskW * size.w;
        const by = y / maskH * size.h;
        brushCtx.fillRect(Math.floor(bx), Math.floor(by), 2, 2);
      }
    }
  }

  brushCtx.restore();
  if (typeof render === 'function') render();
  showToast('反选遮罩已应用到涂抹层');
}

// ========== 遮罩可视化（叠加在预览画布上） ==========

function renderSAMOverlay() {
  const overlayEl = document.getElementById('samOverlayCanvas');
  if (!overlayEl) return;

  const ctx = overlayEl.getContext('2d');
  const displayW = overlayEl.width;
  const displayH = overlayEl.height;
  ctx.clearRect(0, 0, displayW, displayH);

  if (samMasks.length === 0) return;

  const size = samModelConfig.imageSize;
  const scale = displayW / RENDER_SZ;

  for (let i = 0; i < samMasks.length; i++) {
    const mask = samMasks[i];
    const isSelected = i === samSelectedMaskIdx;

    const maskH = mask.shape[0];
    const maskW = mask.shape[1];

    // 创建遮罩着色 canvas
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = maskW;
    tmpCanvas.height = maskH;
    const tmpCtx = tmpCanvas.getContext('2d');

    const imgData = tmpCtx.createImageData(maskW, maskH);
    for (let j = 0; j < mask.data.length; j++) {
      const v = mask.data[j] > 0.5 ? 255 : 0;
      imgData.data[j * 4] = v;
      imgData.data[j * 4 + 1] = v;
      imgData.data[j * 4 + 2] = v;
      imgData.data[j * 4 + 3] = v;
    }
    tmpCtx.putImageData(imgData, 0, 0);
    tmpCtx.globalCompositeOperation = 'source-in';
    tmpCtx.fillStyle = mask.color;
    tmpCtx.fillRect(0, 0, maskW, maskH);

    // mask 直接映射到 1024 画布 -> display
    ctx.save();
    ctx.globalAlpha = isSelected ? 0.5 : 0.2;
    ctx.drawImage(tmpCanvas,
      0, 0, maskW, maskH,
      0, 0, size.w * scale, size.h * scale
    );
    ctx.restore();

    // 选中遮罩绘制边框（bounds 直接是 1024 坐标）
    if (isSelected && mask.bounds) {
      ctx.save();
      ctx.strokeStyle = mask.color;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(
        mask.bounds.x * scale,
        mask.bounds.y * scale,
        mask.bounds.width * scale,
        mask.bounds.height * scale
      );
      ctx.restore();
    }
  }
}

// ========== UI 更新 ==========

function updateSAMStatus(text) {
  const el = document.getElementById('samStatus');
  if (el) el.textContent = text;
}

function updateSAMMaskList() {
  const listEl = document.getElementById('samMaskList');
  const countEl = document.getElementById('samMaskCount');
  if (countEl) countEl.textContent = samMasks.length;
  if (!listEl) return;

  if (samMasks.length === 0) {
    listEl.innerHTML = '<div style="font-size:10px;color:#9ca3af;text-align:center;padding:8px;">暂无分割结果</div>';
    return;
  }

  listEl.innerHTML = samMasks.map((mask, i) => {
    const selected = i === samSelectedMaskIdx;
    const pct = (mask.areaRatio * 100).toFixed(1);
    return `<div class="sam-mask-item ${selected ? 'selected' : ''}" onclick="samSelectMask(${i})" style="display:flex;align-items:center;gap:6px;padding:4px 6px;border-radius:4px;cursor:pointer;background:${selected ? mask.color + '22' : 'transparent'};border:1px solid ${selected ? mask.color : '#e5e7eb'};">
      <span style="width:12px;height:12px;border-radius:2px;background:${mask.color};flex-shrink:0;"></span>
      <span style="font-size:10px;flex:1;">区域${i + 1} · ${pct}%</span>
      <span style="font-size:9px;color:#9ca3af;">${(mask.score * 100).toFixed(0)}%</span>
    </div>`;
  }).join('');
}

// ========== 工具函数 ==========

const MASK_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e'
];

function getMaskColor(idx) {
  return MASK_COLORS[idx % MASK_COLORS.length];
}

// 在 1024 画布坐标系中查找遮罩边界
function findMaskBounds1024(data, maskW, maskH, imageSize) {
  let minX = imageSize.w, minY = imageSize.h, maxX = 0, maxY = 0;
  for (let y = 0; y < maskH; y++) {
    for (let x = 0; x < maskW; x++) {
      if (data[y * maskW + x] > 0.5) {
        const px = x / maskW * imageSize.w;
        const py = y / maskH * imageSize.h;
        if (px < minX) minX = px;
        if (py < minY) minY = py;
        if (px > maxX) maxX = px;
        if (py > maxY) maxY = py;
      }
    }
  }
  if (minX > maxX || minY > maxY) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

function computeBoundsIoU(a, b) {
  const ax1 = a.x, ay1 = a.y, ax2 = a.x + a.width, ay2 = a.y + a.height;
  const bx1 = b.x, by1 = b.y, bx2 = b.x + b.width, by2 = b.y + b.height;
  const ix1 = Math.max(ax1, bx1), iy1 = Math.max(ay1, by1);
  const ix2 = Math.min(ax2, bx2), iy2 = Math.min(ay2, by2);
  if (ix2 <= ix1 || iy2 <= iy1) return 0;
  const inter = (ix2 - ix1) * (iy2 - iy1);
  const union = a.width * a.height + b.width * b.height - inter;
  return union > 0 ? inter / union : 0;
}

async function maskDataToBitmap(data, w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const imgData = ctx.createImageData(w, h);
  for (let j = 0; j < data.length; j++) {
    const v = data[j] > 0.5 ? 255 : 0;
    imgData.data[j * 4] = v;
    imgData.data[j * 4 + 1] = v;
    imgData.data[j * 4 + 2] = v;
    imgData.data[j * 4 + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);
  return createImageBitmap(c);
}

// ========== 点击分割模式 ==========

let samClickMode = false;

function toggleSAMClickMode() {
  samClickMode = !samClickMode;
  const btn = document.getElementById('samClickModeBtn');
  const hint = document.getElementById('samClickModeHint');
  if (samClickMode) {
    btn.style.background = '#7c3aed';
    btn.style.color = '#fff';
    btn.style.borderColor = '#7c3aed';
    if (hint) hint.style.display = 'block';
    const dragOverlay = document.getElementById('dragOverlay');
    if (dragOverlay) dragOverlay.style.cursor = 'crosshair';
    updateSAMStatus('点击分割模式：点击预览区物体进行分割');
  } else {
    btn.style.background = '';
    btn.style.color = '';
    btn.style.borderColor = '';
    if (hint) hint.style.display = 'none';
    const dragOverlay = document.getElementById('dragOverlay');
    if (dragOverlay) dragOverlay.style.cursor = 'pointer';
    updateSAMStatus(samInitialized ? 'SAM2 就绪' : '未初始化');
  }
}

async function handleSAMClick(e) {
  if (!samClickMode) return;

  const wrapper = document.querySelector('.canvas-wrapper');
  if (!wrapper) return;

  const rect = wrapper.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  // 转换为 1024 画布坐标
  const scale = 1024 / rect.width;
  const canvasX = clickX * scale;
  const canvasY = clickY * scale;

  await samClickSegment(canvasX, canvasY, true);
}

// ========== 清理 ==========

function samCleanup() {
  samMasks = [];
  samSelectedMaskIdx = -1;
  samImageEncoded = false;
  if (samClickMode) toggleSAMClickMode();
  updateSAMMaskList();
  const overlayEl = document.getElementById('samOverlayCanvas');
  if (overlayEl) {
    const ctx = overlayEl.getContext('2d');
    ctx.clearRect(0, 0, overlayEl.width, overlayEl.height);
  }
  updateSAMStatus(samInitialized ? 'SAM2 就绪' : '未初始化');
}
