/**
 * main-image-comfyui.js
 * 前端 ComfyUI 调用模块
 * 替代浏览器端 SAM2，所有分割/去水印/局部移除通过 ComfyUI 后端执行
 *
 * 依赖全局变量：state, showToast, RENDER_SZ, render
 */

// ========== ComfyUI 连接状态 ==========

let comfyConnected = false;
let comfyWorkflows = [];

// ========== 初始化 ==========

async function comfyInit() {
  await comfyCheckStatus();
  await comfyLoadWorkflows();
}

async function comfyCheckStatus() {
  try {
    const res = await fetch('/api/comfyui/status');
    const data = await res.json();
    comfyConnected = data.connected;
    updateComfyUIStatus();
    return data;
  } catch {
    comfyConnected = false;
    updateComfyUIStatus();
    return { connected: false };
  }
}

async function comfyLoadWorkflows() {
  try {
    const res = await fetch('/api/comfyui/workflows');
    comfyWorkflows = await res.json();
    updateComfyWorkflowSelects();
    return comfyWorkflows;
  } catch {
    comfyWorkflows = [];
    return [];
  }
}

// ========== 获取合成图 base64 ==========

function getCompositedImageBase64() {
  const previewCanvas = document.getElementById('previewCanvas');
  if (!previewCanvas) return null;
  return previewCanvas.toDataURL('image/png');
}

/**
 * 获取当前活跃图片的原始分辨率裁切（按视窗区域裁切，无文字/标注等叠加）
 * 用于局部移除等需要高质量原图的场景
 */
function getActiveImageCroppedBase64() {
  const activeIdx = typeof state.activeImageIndex === 'number' && state.activeImageIndex >= 0
    ? state.activeImageIndex : 0;
  const imgObj = state.images[activeIdx];
  if (!imgObj) return null;

  const img = imgObj.imgOriginal || imgObj.img || imgObj;
  const scale = imgObj.scale || 1;
  const offsetX = imgObj.offsetX || 0;
  const offsetY = imgObj.offsetY || 0;

  // 获取当前图片的 layout 区域
  const layouts = typeof getCurrentLayouts === 'function' ? getCurrentLayouts() : null;
  const gap = state.imageGap * 2;
  const adjustedLayouts = typeof adjustLayoutsWithGap === 'function'
    ? adjustLayoutsWithGap(layouts, gap) : layouts;
  const finalLayouts = typeof adjustLayoutsAvoidText === 'function'
    ? adjustLayoutsAvoidText(adjustedLayouts) : adjustedLayouts;
  const layout = finalLayouts?.[activeIdx];
  if (!layout) return getCompositedImageBase64();

  // layout 是 1024 坐标系，转换为原图像素坐标
  const { x: lx, y: ly, w: lw, h: lh } = layout;
  const imgRatio = img.width / img.height;
  const areaRatio = lw / lh;

  let drawW, drawH;
  if (imgRatio > areaRatio) {
    drawH = lh;
    drawW = drawH * imgRatio;
  } else {
    drawW = lw;
    drawH = drawW / imgRatio;
  }

  drawW *= scale;
  drawH *= scale;

  const drawX = lx + (lw - drawW) / 2 - offsetX;
  const drawY = ly + (lh - drawH) / 2 - offsetY;

  // 计算原图上的裁切区域
  const scaleX = img.width / drawW;
  const scaleY = img.height / drawH;
  const cropScale = Math.min(scaleX, scaleY);

  const srcX = Math.max(0, (lx - drawX) * cropScale);
  const srcY = Math.max(0, (ly - drawY) * cropScale);
  const srcW = Math.min(img.width - srcX, lw * cropScale);
  const srcH = Math.min(img.height - srcY, lh * cropScale);

  // 裁切并输出为 base64
  const c = document.createElement('canvas');
  c.width = Math.round(srcW);
  c.height = Math.round(srcH);
  const ctx = c.getContext('2d');
  ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, c.width, c.height);
  return c.toDataURL('image/png');
}

// ========== 关键词分割（替代 SAM2 自动分割） ==========

async function comfySegmentByKeyword(keywords, workflowFile) {
  if (!comfyConnected) {
    const status = await comfyCheckStatus();
    if (!status.connected) {
      showToast('ComfyUI 未连接，请先启动 ComfyUI', true);
      return null;
    }
  }

  const image = getCompositedImageBase64();
  if (!image) {
    showToast('请先上传图片', true);
    return null;
  }

  updateComfyUIStatus('正在分割...');

  try {
    const res = await fetch('/api/comfyui/segment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image,
        keywords: keywords || 'product object',
        workflowFile: workflowFile || null
      })
    });

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || '分割失败');
    }

    updateComfyUIStatus(`分割完成，${data.images.length} 张结果`);
    return data;
  } catch (e) {
    console.error('[ComfyUI] 分割失败:', e);
    updateComfyUIStatus('分割失败: ' + e.message);
    showToast('分割失败: ' + e.message, true);
    return null;
  }
}

// ========== 去水印 ==========

async function comfyRemoveWatermark(workflowFile) {
  if (!comfyConnected) {
    const status = await comfyCheckStatus();
    if (!status.connected) {
      showToast('ComfyUI 未连接', true);
      return null;
    }
  }

  const image = getCompositedImageBase64();
  if (!image) {
    showToast('请先上传图片', true);
    return null;
  }

  updateComfyUIStatus('正在去水印...');

  try {
    const res = await fetch('/api/comfyui/remove-watermark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image, workflowFile: workflowFile || '图片自动去水印2.json' })
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.error || '去水印失败');

    updateComfyUIStatus('去水印完成');

    // 自动替换当前图片
    if (data.images && data.images.length > 0) {
      console.log('[ComfyUI] 去水印返回图片数:', data.images.length);
      // 取最后一个输出（最终合成结果，而非中间预览）
      const lastImage = data.images[data.images.length - 1];
      console.log('[ComfyUI] 替换图片, nodeId:', lastImage.nodeId, 'data长度:', lastImage.data?.length);
      comfyApplyResultToImage(lastImage.data);
    } else {
      console.warn('[ComfyUI] 去水印完成但无输出图片');
      showToast('去水印完成但无输出图片', true);
    }

    return data;
  } catch (e) {
    console.error('[ComfyUI] 去水印失败:', e);
    updateComfyUIStatus('去水印失败: ' + e.message);
    showToast('去水印失败: ' + e.message, true);
    return null;
  }
}

// ========== 将结果图片替换到当前编辑的图片槽 ==========

function comfyApplyResultToImage(imageDataUrl) {
  if (!imageDataUrl || !state.images || state.images.length === 0) {
    showToast('没有可替换的图片', true);
    return;
  }

  const activeIdx = typeof state.activeImageIndex === 'number' && state.activeImageIndex >= 0
    ? state.activeImageIndex : 0;

  const img = new Image();
  img.onload = () => {
    const item = state.images[activeIdx];

    // 更新原始分辨率 Image 和 base64
    item.imgOriginal = img;
    item.srcOriginal = imageDataUrl;

    // 创建低分辨率预览版本
    const previewCanvas = document.createElement('canvas');
    const maxPreview = 512;
    let pw = img.width, ph = img.height;
    if (pw > maxPreview || ph > maxPreview) {
      const ratio = Math.min(maxPreview / pw, maxPreview / ph);
      pw = Math.round(pw * ratio);
      ph = Math.round(ph * ratio);
    }
    previewCanvas.width = pw;
    previewCanvas.height = ph;
    const pCtx = previewCanvas.getContext('2d');
    pCtx.drawImage(img, 0, 0, pw, ph);
    const previewSrc = previewCanvas.toDataURL('image/png');

    const previewImg = new Image();
    previewImg.onload = () => {
      item.img = previewImg;
      item.src = previewSrc;
      if (typeof render === 'function') render();
      if (typeof renderImageList === 'function') renderImageList();
      showToast('去水印结果已替换当前图片');
    };
    previewImg.src = previewSrc;
  };
  img.src = imageDataUrl;
}

// ========== 局部移除（Inpainting） ==========

async function comfyInpaint(workflowFile) {
  if (!comfyConnected) {
    const status = await comfyCheckStatus();
    if (!status.connected) {
      showToast('ComfyUI 未连接', true);
      return null;
    }
  }

  const image = getActiveImageCroppedBase64();
  if (!image) {
    showToast('请先上传图片', true);
    return null;
  }

  // 获取涂抹遮罩，按视窗区域裁切并缩放到与原图裁切相同尺寸
  let mask = null;
  if (state.brushMaskCanvas) {
    const activeIdx = typeof state.activeImageIndex === 'number' && state.activeImageIndex >= 0
      ? state.activeImageIndex : 0;
    const layouts = typeof getCurrentLayouts === 'function' ? getCurrentLayouts() : null;
    const gap = state.imageGap * 2;
    const adjustedLayouts = typeof adjustLayoutsWithGap === 'function'
      ? adjustLayoutsWithGap(layouts, gap) : layouts;
    const finalLayouts = typeof adjustLayoutsAvoidText === 'function'
      ? adjustLayoutsAvoidText(adjustedLayouts) : adjustedLayouts;
    const layout = finalLayouts?.[activeIdx];

    // 先从 image base64 获取裁切后的尺寸
    const imgSize = await new Promise(resolve => {
      const tmpImg = new Image();
      tmpImg.onload = () => resolve({ w: tmpImg.width, h: tmpImg.height });
      tmpImg.onerror = () => resolve(null);
      tmpImg.src = image;
    });

    if (layout && imgSize) {
      // 遮罩画布是 1024x1024，裁切出当前图片对应的区域，再缩放到原图裁切尺寸
      const mc = document.createElement('canvas');
      mc.width = imgSize.w;
      mc.height = imgSize.h;
      const mctx = mc.getContext('2d');
      mctx.drawImage(state.brushMaskCanvas,
        layout.x, layout.y, layout.w, layout.h,
        0, 0, imgSize.w, imgSize.h);
      mask = mc.toDataURL('image/png');
    } else {
      mask = state.brushMaskCanvas.toDataURL('image/png');
    }
  }
  if (!mask) {
    showToast('请先使用涂抹工具标记要移除的区域', true);
    return null;
  }

  updateComfyUIStatus('正在局部移除...');

  try {
    const res = await fetch('/api/comfyui/inpaint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image, mask, workflowFile })
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.error || '局部移除失败');

    // 用结果替换当前选中位置的图片
    if (data.images && data.images.length > 0) {
      const lastImage = data.images[data.images.length - 1];
      comfyApplyResultToImage(lastImage.data);
    } else {
      showToast('局部移除完成，但未返回结果图片', true);
    }

    updateComfyUIStatus('局部移除完成');
    return data;
  } catch (e) {
    console.error('[ComfyUI] 局部移除失败:', e);
    updateComfyUIStatus('局部移除失败: ' + e.message);
    showToast('局部移除失败: ' + e.message, true);
    return null;
  }
}

// ========== 通用工作流执行 ==========

async function comfyExecuteWorkflow(workflowFile, inputImages) {
  if (!comfyConnected) {
    const status = await comfyCheckStatus();
    if (!status.connected) {
      showToast('ComfyUI 未连接', true);
      return null;
    }
  }

  // 加载工作流定义
  const wfRes = await fetch(`/api/comfyui/workflows/${workflowFile}`);
  const workflow = await wfRes.json();

  updateComfyUIStatus('正在执行工作流...');

  try {
    const res = await fetch('/api/comfyui/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflow, images: inputImages || {} })
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.error || '工作流执行失败');

    updateComfyUIStatus('工作流执行完成');
    return data;
  } catch (e) {
    console.error('[ComfyUI] 执行失败:', e);
    updateComfyUIStatus('执行失败: ' + e.message);
    showToast('执行失败: ' + e.message, true);
    return null;
  }
}

// ========== 分割结果处理：从 mask 图片提取边界用于标注 ==========

async function comfyMaskToAnnotation(maskImageDataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, c.width, c.height);
      const pixels = imageData.data;
      const w = c.width, h = c.height;

      console.log('[MaskToAnnotation] mask图片尺寸:', w, 'x', h);

      // 构建二值图
      const binary = new Uint8Array(w * h);
      let whitePixelCount = 0;
      for (let i = 0; i < w * h; i++) {
        const idx = i * 4;
        if (pixels[idx] > 128 || pixels[idx + 1] > 128 || pixels[idx + 2] > 128) {
          binary[i] = 1;
          whitePixelCount++;
        }
      }

      console.log('[MaskToAnnotation] 白色像素数:', whitePixelCount);
      if (whitePixelCount === 0) { resolve(null); return; }

      // 连通区域分析（BFS）
      const visited = new Uint8Array(w * h);
      const regions = [];
      const minRegionSize = Math.max(100, w * h * 0.005); // 最小区域：0.5%面积或100像素

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = y * w + x;
          if (binary[i] && !visited[i]) {
            // BFS 找连通区域
            const queue = [i];
            visited[i] = 1;
            let rMinX = x, rMinY = y, rMaxX = x, rMaxY = y;
            let count = 0;
            let head = 0;

            while (head < queue.length) {
              const ci = queue[head++];
              const cx = ci % w, cy = (ci - cx) / w;
              count++;
              if (cx < rMinX) rMinX = cx;
              if (cy < rMinY) rMinY = cy;
              if (cx > rMaxX) rMaxX = cx;
              if (cy > rMaxY) rMaxY = cy;

              // 4邻域
              const neighbors = [
                cy > 0 ? ci - w : -1,
                cy < h - 1 ? ci + w : -1,
                cx > 0 ? ci - 1 : -1,
                cx < w - 1 ? ci + 1 : -1
              ];
              for (const ni of neighbors) {
                if (ni >= 0 && binary[ni] && !visited[ni]) {
                  visited[ni] = 1;
                  queue.push(ni);
                }
              }
            }

            if (count >= minRegionSize) {
              regions.push({ minX: rMinX, minY: rMinY, maxX: rMaxX, maxY: rMaxY, pixels: count });
            }
          }
        }
      }

      console.log('[MaskToAnnotation] 检测到', regions.length, '个连通区域');

      // mask 坐标 → 1024 画布坐标
      const scaleX = RENDER_SZ / w;
      const scaleY = RENDER_SZ / h;

      const results = regions.map(r => ({
        minX: r.minX * scaleX,
        minY: r.minY * scaleY,
        maxX: r.maxX * scaleX,
        maxY: r.maxY * scaleY
      }));

      console.log('[MaskToAnnotation] 1024坐标:', JSON.stringify(results));
      resolve(results.length > 0 ? results : null);
    };
    img.onerror = (e) => {
      console.error('[MaskToAnnotation] 图片加载失败:', e);
      resolve(null);
    };
    img.src = maskImageDataUrl;
  });
}

// ========== 一键自动识别（替代 autoDetectProduct 中的 SAM2） ==========

async function comfyAutoDetect(targetIdx) {
  // 优先使用标注Tab输入框的关键词
  let keywords = document.getElementById('dimSubjectInput')?.value?.trim() || '';
  
  // 如果输入了中文，自动翻译成英文
  if (keywords && /[\u4e00-\u9fff]/.test(keywords)) {
    showToast('正在翻译: ' + keywords);
    const translated = await comfyTranslateToEnglish(keywords);
    if (translated) {
      keywords = translated;
      const input = document.getElementById('dimSubjectInput');
      if (input) input.value = keywords;
    } else {
      showToast('翻译失败，请直接输入英文', true);
      return null;
    }
  }
  
  // 如果没有输入关键词，用 AI 自动识别
  if (!keywords) {
    keywords = await comfyAutoDetectSubject();
  }
  if (!keywords) {
    keywords = 'main body';
  }

  const workflowFile = document.getElementById('comfySegmentWorkflow')?.value || 'ZHEZHAOok.json';

  updateComfyUIStatus('正在识别主体: ' + keywords);

  const result = await comfySegmentByKeyword(keywords, workflowFile);
  if (!result || !result.images || result.images.length === 0) {
    showToast('未检测到物体', true);
    return null;
  }

  console.log('[ComfyUI] 分割结果图片数:', result.images.length);
  result.images.forEach((img, i) => {
    console.log(`[ComfyUI] 图片[${i}]: nodeId=${img.nodeId}, filename=${img.filename}, data长度=${img.data?.length}`);
  });

  // 优先找 MaskPreview 节点输出，否则取最后一个
  const maskImage = result.images.find(img => img.filename?.includes('MaskPreview'))
    || result.images[result.images.length - 1];

  // 从 mask 图片提取边界
  const bounds = await comfyMaskToAnnotation(maskImage.data);
  console.log('[ComfyUI] mask 边界:', JSON.stringify(bounds));

  if (!bounds) {
    showToast('遮罩为空', true);
    return null;
  }

  // 保存 mask 图片供后续应用
  window._comfyLastMaskImage = maskImage.data;

  updateComfyUIStatus('识别完成: ' + keywords);
  return bounds;
}

// ========== AI 自动识别图片主体 ==========

// ========== 中文翻译成英文 ==========

async function comfyTranslateToEnglish(text) {
  try {
    // 使用本地 Ollama 翻译接口（无需认证）
    const res = await fetch('/api/translate/zh2en', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    if (!res.ok) {
      console.warn('[ComfyUI] 翻译接口错误:', res.status);
      return null;
    }

    const data = await res.json();
    if (data.translated) {
      return data.translated;
    }
  } catch (e) {
    console.warn('[ComfyUI] 翻译失败:', e);
  }
  return null;
}

async function comfyAutoDetectSubject() {
  const image = getCompositedImageBase64();
  if (!image) return null;

  updateComfyUIStatus('正在识别主体...');

  try {
    // 调用后端 AI 接口识别主体
    const res = await fetch('/api/agent/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: '请识别这张图片中的主要物体/主体，只返回一个英文单词（如：bicycle, person, car, dog, bottle）。不要返回任何其他内容。',
        image: image,
        conversationId: 'auto_detect_' + Date.now()
      })
    });

    if (res.status === 401 || res.status === 403) {
      console.warn('[ComfyUI] AI接口未授权，使用默认关键词');
      return null;
    }

    const data = await res.json();
    if (data.response) {
      // 提取英文单词（去除多余内容）
      const word = data.response.trim().split(/[\s,，]+/)[0].toLowerCase();
      updateComfyUIStatus('识别到主体: ' + word);
      return word;
    }
  } catch (e) {
    console.warn('[ComfyUI] AI识别主体失败:', e);
  }

  return null;
}

// ========== 关键词分割 + 自动标注 ==========

async function comfyAutoDetectAndAnnotate() {
  // 优先从主体名称输入框获取关键词
  let keywords = document.getElementById('dimSubjectInput')?.value?.trim() || '';
  const workflowFile = document.getElementById('comfySegmentWorkflow')?.value || 'ZHEZHAOok.json';

  // 如果输入了中文，自动翻译成英文
  if (keywords && /[\u4e00-\u9fff]/.test(keywords)) {
    showToast('正在翻译: ' + keywords);
    const translated = await comfyTranslateToEnglish(keywords);
    if (translated) {
      keywords = translated;
      // 回填翻译结果
      const input = document.getElementById('dimSubjectInput');
      if (input) input.value = keywords;
    } else {
      showToast('翻译失败，请直接输入英文', true);
      return;
    }
  }

  // 如果没有输入关键词，使用 AI 自动识别主体
  if (!keywords) {
    keywords = await comfyAutoDetectSubject();
    if (!keywords) {
      showToast('请输入主体名称或留空由AI自动识别', true);
      return;
    }
    // 回填关键词到输入框
    const input = document.getElementById('dimSubjectInput');
    if (input) input.value = keywords;
  }

  const result = await comfySegmentByKeyword(keywords, workflowFile);
  if (!result || !result.images || result.images.length === 0) {
    showToast('未检测到物体', true);
    return;
  }

  // 显示分割结果预览
  updateComfyResultPreview(result.images);

  // 从 mask 图片提取边界
  const maskImage = result.images.find(img => img.nodeId && img.filename?.includes('MaskPreview'))
    || result.images[result.images.length - 1];
  const bounds = await comfyMaskToAnnotation(maskImage.data);
  if (!bounds) {
    showToast('遮罩为空', true);
    return;
  }

  // 保存 mask 图片供后续应用
  window._comfyLastMaskImage = maskImage.data;

  // 根据遮罩边界生成尺寸标注（支持多区域）
  const boundsArray = Array.isArray(bounds) ? bounds : [bounds];
  boundsArray.forEach((b, i) => comfyBoundsToDimensions(b, i));

  showToast(`分割完成，${boundsArray.length} 个区域，已生成尺寸标注`);
}

// ========== 从遮罩边界生成尺寸标注 ==========

function comfyBoundsToDimensions(bounds, regionIndex = 0) {
  // bounds 是 1024 画布坐标系中的 {minX, minY, maxX, maxY}
  const { minX, minY, maxX, maxY } = bounds;

  // 获取当前图片的 layout 区域
  const activeIdx = typeof state.activeImageIndex === 'number' && state.activeImageIndex >= 0
    ? state.activeImageIndex : 0;
  const layouts = typeof getCurrentLayouts === 'function' ? getCurrentLayouts() : null;
  const gap = state.imageGap * 2;
  const adjustedLayouts = typeof adjustLayoutsWithGap === 'function'
    ? adjustLayoutsWithGap(layouts, gap) : layouts;
  const finalLayouts = typeof adjustLayoutsAvoidText === 'function'
    ? adjustLayoutsAvoidText(adjustedLayouts) : adjustedLayouts;
  const layout = finalLayouts?.[activeIdx];

  // 使用原始边界，不做缩小/扩大
  const bx1 = minX, by1 = minY, bx2 = maxX, by2 = maxY;

  // 计算标注值（优先使用文档尺寸数据，根据遮罩宽高智能分配大小边）
  let dimW, dimH;
  const maskW = bx2 - bx1;
  const maskH = by2 - by1;
  if (typeof getSmartDimValues === 'function') {
    const smart = getSmartDimValues(maskW, maskH);
    if (smart) {
      dimW = smart.horizVal;
      dimH = smart.vertVal;
    }
  }
  if (dimW == null || dimH == null) {
    dimW = layout ? Math.round((bx2 - bx1) / layout.w * 100) : Math.round(bx2 - bx1);
    dimH = layout ? Math.round((by2 - by1) / layout.h * 100) : Math.round(by2 - by1);
  }

  const color = state.dimColor;
  const lw = state.dimLineW;
  const endStyle = document.getElementById('dimEndStyle')?.value || 'arrow';
  const textBg = document.getElementById('dimTextBg')?.value || 'white';

  // 水平标注（底部）
  const hDim = {
    id: 'dim_auto_h_' + Date.now() + '_r' + regionIndex,
    type: 'horizontal',
    x1: bx1,
    y1: by2,
    x2: bx2,
    y2: by2,
    value: dimW.toString(),
    unit: 'cm',
    lineColor: color, lineWidth: lw,
    textColor: state.dimTextColor, fontSize: state.dimFontS,
    endStyle: endStyle, textBg: textBg
  };

  // 垂直标注（右侧）
  const vDim = {
    id: 'dim_auto_v_' + Date.now() + '_r' + regionIndex,
    type: 'vertical',
    x1: bx2,
    y1: by1,
    x2: bx2,
    y2: by2,
    value: dimH.toString(),
    unit: 'cm',
    lineColor: color, lineWidth: lw,
    textColor: state.dimTextColor, fontSize: state.dimFontS,
    endStyle: endStyle, textBg: textBg
  };

  state.dimensions.push(hDim, vDim);

  // 初始化 Konva 覆盖层（如果还没初始化）
  if (typeof initKonvaOverlay === 'function') initKonvaOverlay();
  if (konvaStage) {
    if (typeof buildKonvaDim === 'function') {
      buildKonvaDim(hDim);
      buildKonvaDim(vDim);
    }
    if (konvaDimLayer) konvaDimLayer.draw();
  }

  if (typeof selectDim === 'function') selectDim(hDim.id);
  if (typeof refreshDimList === 'function') refreshDimList();
  if (typeof render === 'function') render();
}

// ========== 应用 ComfyUI 遮罩到涂抹层 ==========

function comfyApplyMask() {
  if (!window._comfyLastMaskImage) {
    showToast('请先执行分割', true);
    return;
  }

  const img = new Image();
  img.onload = () => {
    if (!state.brushMaskCanvas) initBrushMaskCanvas();
    const ctx = state.brushMaskCanvas.getContext('2d');
    ctx.drawImage(img, 0, 0, RENDER_SZ, RENDER_SZ);
    if (typeof render === 'function') render();
    showToast('遮罩已应用到涂抹层');
  };
  img.src = window._comfyLastMaskImage;
}

function comfyApplyMaskInverted() {
  if (!window._comfyLastMaskImage) {
    showToast('请先执行分割', true);
    return;
  }

  const img = new Image();
  img.onload = () => {
    if (!state.brushMaskCanvas) initBrushMaskCanvas();
    const ctx = state.brushMaskCanvas.getContext('2d');

    // 先填满白色
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, RENDER_SZ, RENDER_SZ);

    // 用 destination-out 挖掉 mask 区域
    ctx.globalCompositeOperation = 'destination-out';
    ctx.drawImage(img, 0, 0, RENDER_SZ, RENDER_SZ);
    ctx.globalCompositeOperation = 'source-over';

    if (typeof render === 'function') render();
    showToast('反选遮罩已应用到涂抹层');
  };
  img.src = window._comfyLastMaskImage;
}

// ========== 分割结果预览 ==========

function updateComfyResultPreview(images) {
  const container = document.getElementById('comfyResultPreview');
  if (!container) return;

  container.innerHTML = images.map((img, i) => `
    <div style="display:flex;align-items:center;gap:6px;padding:4px;border:1px solid #e5e7eb;border-radius:4px;margin-bottom:4px;cursor:pointer;" onclick="window._comfyLastMaskImage='${img.data}';this.style.borderColor='#7c3aed';">
      <img src="${img.data}" style="width:40px;height:40px;object-fit:contain;border:1px solid #e5e7eb;border-radius:2px;">
      <span style="font-size:10px;color:#6b7280;">结果 ${i + 1}</span>
    </div>
  `).join('');
}

// ========== UI 更新 ==========

function updateComfyUIStatus(text) {
  const el = document.getElementById('comfyStatus');
  if (!el) return;

  if (text) {
    el.textContent = text;
  } else {
    el.textContent = comfyConnected ? 'ComfyUI 已连接' : 'ComfyUI 未连接';
    el.style.color = comfyConnected ? '#22c55e' : '#ef4444';
  }
}

function updateComfyWorkflowSelects() {
  const selects = document.querySelectorAll('.comfy-workflow-select');
  selects.forEach(sel => {
    const current = sel.value;
    sel.innerHTML = '<option value="">默认工作流</option>';
    comfyWorkflows.forEach(wf => {
      const opt = document.createElement('option');
      opt.value = wf.filename;
      opt.textContent = wf.name;
      sel.appendChild(opt);
    });
    if (current) sel.value = current;
  });
}

// ========== 导出 ==========

window.comfyInit = comfyInit;
window.comfyCheckStatus = comfyCheckStatus;
window.comfySegmentByKeyword = comfySegmentByKeyword;
window.comfyRemoveWatermark = comfyRemoveWatermark;
window.comfyInpaint = comfyInpaint;
window.comfyExecuteWorkflow = comfyExecuteWorkflow;
window.comfyAutoDetect = comfyAutoDetect;
window.comfyAutoDetectAndAnnotate = comfyAutoDetectAndAnnotate;
window.comfyApplyMask = comfyApplyMask;
window.comfyApplyMaskInverted = comfyApplyMaskInverted;
window.comfyMaskToAnnotation = comfyMaskToAnnotation;
window.comfyApplyResultToImage = comfyApplyResultToImage;
