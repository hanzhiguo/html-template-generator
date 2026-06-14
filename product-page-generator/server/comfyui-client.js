/**
 * ComfyUI API 客户端
 * 负责与 ComfyUI 后端通信：提交工作流、轮询进度、获取结果
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const COMFYUI_HOST = process.env.COMFYUI_HOST || '127.0.0.1';
const COMFYUI_PORT = parseInt(process.env.COMFYUI_PORT || '8188');
const COMFYUI_URL = `http://${COMFYUI_HOST}:${COMFYUI_PORT}`;

// 工作流存储目录
const WORKFLOWS_DIR = path.join(__dirname, '..', 'comfyui-workflows');

// 确保工作流目录存在
if (!fs.existsSync(WORKFLOWS_DIR)) {
  fs.mkdirSync(WORKFLOWS_DIR, { recursive: true });
}

// ========== 基础 HTTP 请求 ==========

function comfyRequest(method, urlPath, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, COMFYUI_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('ComfyUI 请求超时')); });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ========== ComfyUI 连接检测 ==========

async function checkComfyUI() {
  try {
    const res = await comfyRequest('GET', '/system_stats');
    return { connected: true, ...res.data };
  } catch {
    return { connected: false };
  }
}

// ========== 图片上传到 ComfyUI ==========

async function uploadImageToComfyUI(imageBuffer, filename, overwrite = true) {
  return new Promise((resolve, reject) => {
    const boundary = '----FormBoundary' + Date.now();
    const url = new URL('/upload/image', COMFYUI_URL);

    const parts = [];
    // image 字段
    parts.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="${filename}"\r\nContent-Type: image/png\r\n\r\n`
    );
    // overwrite 字段
    parts.push(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="overwrite"\r\n\r\n${overwrite}`);
    // type 字段 (参考 COMFYUI.html 调试工具的成功逻辑)
    parts.push(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="type"\r\n\r\ninput`);

    const headerBuf = Buffer.from(parts[0], 'utf8');
    const midBuf1 = Buffer.from(parts[1], 'utf8');
    const midBuf2 = Buffer.from(parts[2], 'utf8');
    const endBuf = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');

    const contentLength = headerBuf.length + imageBuffer.length + midBuf1.length + midBuf2.length + endBuf.length;

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': contentLength
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error('上传响应解析失败: ' + data));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('上传超时')); });

    req.write(headerBuf);
    req.write(imageBuffer);
    req.write(midBuf1);
    req.write(midBuf2);
    req.write(endBuf);
    req.end();
  });
}

// ========== 提交工作流 ==========

async function queuePrompt(workflow, clientId = 'main-image-tool') {
  const res = await comfyRequest('POST', '/prompt', { prompt: workflow, client_id: clientId });
  if (res.status !== 200) {
    throw new Error(`提交工作流失败: ${JSON.stringify(res.data)}`);
  }
  return res.data; // { prompt_id, number, node_errors }
}

// ========== 轮询执行结果 ==========

async function waitForCompletion(promptId, timeoutMs = 120000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const res = await comfyRequest('GET', `/history/${promptId}`);
    if (res.status === 200 && res.data[promptId]) {
      const history = res.data[promptId];
      if (history.status && history.status.completed) {
        return history;
      }
      if (history.status && history.status.status_str === 'error') {
        throw new Error('工作流执行失败: ' + JSON.stringify(history.status.messages || []));
      }
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  throw new Error('工作流执行超时');
}

// ========== 获取输出图片 ==========

async function getOutputImage(filename, subfolder = '', type = 'output') {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({ filename, subfolder, type });
    const url = new URL(`/view?${params}`, COMFYUI_URL);

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          buffer,
          contentType: res.headers['content-type'] || 'image/png'
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('获取图片超时')); });
    req.end();
  });
}

// ========== 从执行结果中提取输出图片 ==========

function extractOutputImages(history) {
  const outputs = history.outputs || {};
  const images = [];

  for (const [nodeId, nodeOutput] of Object.entries(outputs)) {
    if (nodeOutput.images) {
      for (const img of nodeOutput.images) {
        images.push({
          nodeId,
          filename: img.filename,
          subfolder: img.subfolder || '',
          type: img.type || 'output'
        });
      }
    }
  }

  return images;
}

// ========== 工作流管理 ==========

const WORK_DIR = path.join(__dirname, 'work');

function listWorkflows() {
  const results = [];
  const dirs = [WORKFLOWS_DIR, WORK_DIR].filter(d => fs.existsSync(d));

  for (const dir of dirs) {
    for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
      try {
        const content = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
        const isAPI = !content.nodes; // API 格式没有 nodes 字段
        results.push({
          filename: f,
          dir,
          name: content._name || f.replace('.json', ''),
          description: content._description || '',
          type: content._type || (isAPI ? 'api' : 'ui'),
          format: isAPI ? 'api' : 'ui'
        });
      } catch {
        results.push({
          filename: f, dir, name: f.replace('.json', ''),
          description: '', type: 'unknown', format: 'unknown'
        });
      }
    }
  }
  return results;
}

function getWorkflow(filename) {
  // 优先查找 API 格式文件（_api.json 后缀）
  const apiFilename = filename.replace('.json', '_api.json');
  const dirs = [WORKFLOWS_DIR, WORK_DIR];

  // 先找 API 格式
  for (const dir of dirs) {
    const filePath = path.join(dir, apiFilename);
    if (fs.existsSync(filePath)) {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (!content.nodes) return content; // API 格式直接返回
    }
  }

  // 再找原始文件
  for (const dir of dirs) {
    const filePath = path.join(dir, filename);
    if (fs.existsSync(filePath)) {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      // UI 格式自动转为 API 格式
      if (content.nodes) {
        return convertUIToAPI(content);
      }
      return content;
    }
  }
  return null;
}

// ========== UI 格式 → API 格式转换 ==========

function convertUIToAPI(workflow) {
  const linkMap = {};
  if (workflow.links) {
    for (const link of workflow.links) {
      linkMap[link[0]] = { sourceNodeId: link[1], sourceSlot: link[2] };
    }
  }

  const knownWidgets = {
    'LoadImage': ['image', 'upload'],
    'PreviewImage': [],
    'MaskPreview': [],
    'SaveImage': ['filename_prefix'],
    'WatermarkDetector': ['confidence'],
    'WatermarkDetectorLoader': [],
    'Mask Crop Region': ['padding', 'region_type'],
    'ImageCrop+': ['width', 'height', 'position', 'x_offset', 'y_offset'],
    'ImageResize+': ['width', 'height', 'interpolation', 'method', 'condition', 'multiple_of'],
    'Image Paste Crop': ['crop_blending', 'crop_sharpening'],
    'MaskBlur+': ['amount', 'method'],
    'ImpactDilateMask': ['dilation'],
    'INPAINT_LoadInpaintModel': ['model_name'],
    'INPAINT_InpaintWithModel': ['seed', 'control_after_generate'],
    'easy sam3ModelLoader': ['model_name', 'segmentor_type', 'device', 'dtype'],
    'easy sam3ImageSegmentation': ['prompt', 'threshold', 'show_mask', 'sam_mask_mode', 'seed'],
  };

  const api = {};
  for (const node of workflow.nodes) {
    const nodeId = String(node.id);
    const inputs = {};

    // 输入连接
    if (node.inputs) {
      for (const input of node.inputs) {
        if (input.link != null) {
          const link = linkMap[input.link];
          if (link) inputs[input.name] = [String(link.sourceNodeId), link.sourceSlot];
        }
      }
    }

    // Widget 值
    if (node.widgets_values && node.widgets_values.length > 0) {
      const widgetNames = [];
      if (node.inputs) {
        for (const input of node.inputs) {
          if (input.widget) widgetNames.push(input.widget.name);
        }
      }
      const known = knownWidgets[node.type] || [];
      const names = widgetNames.length > 0 ? widgetNames : known;
      const usedKeys = new Set(Object.keys(inputs));

      for (let i = 0; i < node.widgets_values.length; i++) {
        const val = node.widgets_values[i];
        if (val !== undefined && val !== null) {
          const name = names[i] || `widget_${i}`;
          if (!usedKeys.has(name)) inputs[name] = val;
        }
      }
    }

    api[nodeId] = { class_type: node.type, inputs };
  }

  return api;
}

function saveWorkflow(filename, workflow) {
  const filePath = path.join(WORKFLOWS_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(workflow, null, 2), 'utf8');
  return filePath;
}

// ========== 便捷方法：执行工作流并获取结果图片 ==========

async function executeWorkflow(workflow, inputImages = {}) {
  // 1. 上传输入图片到 ComfyUI
  for (const [key, imgData] of Object.entries(inputImages)) {
    const uploadResult = await uploadImageToComfyUI(imgData.buffer, imgData.filename);
    if (!uploadResult.name) {
      throw new Error(`上传图片 ${key} 失败`);
    }
    // 替换工作流中的图片节点
    if (workflow[key]) {
      if (workflow[key].class_type === 'LoadImage' || workflow[key].class_type === 'ETN_LoadImageBase64') {
        workflow[key].inputs.image = uploadResult.name;
      }
    }
  }

  // 2. 提交工作流
  const { prompt_id } = await queuePrompt(workflow);

  // 3. 等待完成
  const history = await waitForCompletion(prompt_id);

  // 4. 获取输出图片
  const outputImages = extractOutputImages(history);
  const results = [];
  for (const imgInfo of outputImages) {
    const imgData = await getOutputImage(imgInfo.filename, imgInfo.subfolder, imgInfo.type);
    results.push({
      ...imgInfo,
      buffer: imgData.buffer,
      contentType: imgData.contentType
    });
  }

  return { history, images: results };
}

// ========== 内置工作流：SAM 分割（关键词） ==========

function buildSAMSegmentWorkflow(imageName, keywords = '') {
  // 使用 ComfyUI 内置的 SAM 节点进行分割
  // 需要安装: ComfyUI-Segment-Anything 或 ComfyUI-Impact-Pack
  return {
    "1": {
      "class_type": "LoadImage",
      "inputs": {
        "image": imageName
      }
    },
    "2": {
      "class_type": "SAMModelLoader",
      "inputs": {
        "model_name": "sam_vit_b_01ec64.pth",
        "device_mode": "AUTO"
      }
    },
    "3": {
      "class_type": "GroundingDinoModelLoader",
      "inputs": {
        "model_name": "GroundingDINO_SwinB (938MB)"
      }
    },
    "4": {
      "class_type": "GroundingDinoSAMSegment",
      "inputs": {
        "sam_model": ["2", 0],
        "grounding_dino_model": ["3", 0],
        "image": ["1", 0],
        "prompt": keywords || "bicycle product object",
        "threshold": 0.3
      }
    },
    "5": {
      "class_type": "SaveImage",
      "inputs": {
        "images": ["4", 0],
        "filename_prefix": "sam_mask"
      }
    }
  };
}

// ========== 内置工作流：去水印 ==========

function buildWatermarkRemovalWorkflow(imageName) {
  // 基于 inpainting 的去水印工作流
  // 需要安装: ComfyUI-Inspyrenet-Rembg 或其他去水印节点
  return {
    "1": {
      "class_type": "LoadImage",
      "inputs": {
        "image": imageName
      }
    },
    "2": {
      "class_type": "WatermarkRemoval",
      "inputs": {
        "image": ["1", 0]
      }
    },
    "3": {
      "class_type": "SaveImage",
      "inputs": {
        "images": ["2", 0],
        "filename_prefix": "no_watermark"
      }
    }
  };
}

// ========== 内置工作流：局部移除（Inpainting） ==========

function buildInpaintWorkflow(imageName, maskImageName) {
  // 使用 INPAINT 节点（与手动涂抹3.json一致）
  return {
    "3": {
      "class_type": "LoadImage",
      "inputs": {
        "image": imageName
      }
    },
    "26": {
      "class_type": "LoadImage",
      "inputs": {
        "image": maskImageName
      }
    },
    "27": {
      "class_type": "ImageToMask",
      "inputs": {
        "channel": "red",
        "image": ["26", 0]
      }
    },
    "22": {
      "class_type": "ImpactDilateMask",
      "inputs": {
        "dilation": 6,
        "mask": ["27", 0]
      }
    },
    "23": {
      "class_type": "MaskBlur+",
      "inputs": {
        "amount": 3,
        "device": "auto",
        "mask": ["22", 0]
      }
    },
    "13": {
      "class_type": "INPAINT_LoadInpaintModel",
      "inputs": {
        "model_name": "big-lama.pt"
      }
    },
    "12": {
      "class_type": "INPAINT_InpaintWithModel",
      "inputs": {
        "seed": Math.floor(Math.random() * 999999999999999),
        "inpaint_model": ["13", 0],
        "image": ["3", 0],
        "mask": ["23", 0]
      }
    },
    "14": {
      "class_type": "PreviewImage",
      "inputs": {
        "images": ["12", 0]
      }
    }
  };
}

module.exports = {
  checkComfyUI,
  uploadImageToComfyUI,
  queuePrompt,
  waitForCompletion,
  getOutputImage,
  extractOutputImages,
  executeWorkflow,
  listWorkflows,
  getWorkflow,
  saveWorkflow,
  buildSAMSegmentWorkflow,
  buildWatermarkRemovalWorkflow,
  buildInpaintWorkflow,
  COMFYUI_URL,
  WORKFLOWS_DIR
};
