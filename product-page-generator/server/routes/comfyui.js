/**
 * ComfyUI API 路由
 * 提供前端调用 ComfyUI 的 HTTP 接口
 */

const express = require('express');
const router = express.Router();
const comfy = require('../comfyui-client');
const fs = require('fs');
const path = require('path');

// ========== 连接状态 ==========

router.get('/status', async (req, res) => {
  try {
    const status = await comfy.checkComfyUI();
    res.json(status);
  } catch (e) {
    res.json({ connected: false, error: e.message });
  }
});

// ========== 工作流管理 ==========

router.get('/workflows', (req, res) => {
  res.json(comfy.listWorkflows());
});

router.get('/workflows/:filename', (req, res) => {
  const wf = comfy.getWorkflow(req.params.filename);
  if (!wf) return res.status(404).json({ error: '工作流不存在' });
  res.json(wf);
});

router.post('/workflows', (req, res) => {
  const { filename, workflow } = req.body;
  if (!filename || !workflow) return res.status(400).json({ error: '缺少参数' });
  const safeName = filename.replace(/[^a-zA-Z0-9_-]/g, '_') + '.json';
  comfy.saveWorkflow(safeName, workflow);
  res.json({ success: true, filename: safeName });
});

// ========== 关键词分割（替代 SAM2） ==========

router.post('/segment', async (req, res) => {
  try {
    const { image, keywords, workflowFile } = req.body;

    if (!image) return res.status(400).json({ error: '缺少图片数据' });

    // 检查 ComfyUI 连接
    const status = await comfy.checkComfyUI();
    if (!status.connected) {
      return res.status(503).json({ error: 'ComfyUI 未连接，请先启动 ComfyUI' });
    }

    // 解析 base64 图片
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const imageName = `segment_input_${Date.now()}.png`;

    // 上传图片到 ComfyUI
    const uploadResult = await comfy.uploadImageToComfyUI(imageBuffer, imageName);
    if (!uploadResult.name) {
      return res.status(500).json({ error: '图片上传到 ComfyUI 失败' });
    }

    // 构建或加载工作流
    let workflow;
    if (workflowFile) {
      workflow = comfy.getWorkflow(workflowFile);
      if (!workflow) return res.status(404).json({ error: `工作流 ${workflowFile} 不存在` });
      // 替换输入图片节点
      for (const node of Object.values(workflow)) {
        if (node.class_type === 'LoadImage' && node.inputs) {
          node.inputs.image = uploadResult.name;
          break; // 只替换第一个 LoadImage
        }
      }
      // 替换关键词
      for (const node of Object.values(workflow)) {
        if (node.class_type === 'GroundingDinoSAMSegment' && node.inputs && keywords) {
          node.inputs.prompt = keywords;
        }
        // 替换 PrimitiveStringMultiline 节点的 value（用于 SAM3 关键词分割）
        if (node.class_type === 'PrimitiveStringMultiline' && node.inputs && keywords) {
          node.inputs.value = keywords;
        }
      }
    } else {
      workflow = comfy.buildSAMSegmentWorkflow(uploadResult.name, keywords || 'product object');
    }

    // 执行工作流
    const result = await comfy.executeWorkflow(workflow);

    // 返回分割结果
    const outputImages = [];
    for (const img of result.images) {
      const base64 = img.buffer.toString('base64');
      outputImages.push({
        nodeId: img.nodeId,
        filename: img.filename,
        data: `data:${img.contentType};base64,${base64}`
      });
    }

    res.json({
      success: true,
      promptId: result.history.prompt_id,
      images: outputImages
    });
  } catch (e) {
    console.error('[ComfyUI] 分割失败:', e);
    res.status(500).json({ error: e.message });
  }
});

// ========== 去水印 ==========

router.post('/remove-watermark', async (req, res) => {
  try {
    const { image, workflowFile } = req.body;
    if (!image) return res.status(400).json({ error: '缺少图片数据' });

    const status = await comfy.checkComfyUI();
    if (!status.connected) {
      return res.status(503).json({ error: 'ComfyUI 未连接' });
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const imageName = `wm_input_${Date.now()}.png`;

    const uploadResult = await comfy.uploadImageToComfyUI(imageBuffer, imageName);
    if (!uploadResult.name) {
      return res.status(500).json({ error: '图片上传失败' });
    }

    let workflow;
    if (workflowFile) {
      workflow = comfy.getWorkflow(workflowFile);
      if (!workflow) return res.status(404).json({ error: `工作流 ${workflowFile} 不存在` });
      for (const node of Object.values(workflow)) {
        if (node.class_type === 'LoadImage' && node.inputs) {
          node.inputs.image = uploadResult.name;
          break;
        }
      }
    } else {
      workflow = comfy.buildWatermarkRemovalWorkflow(uploadResult.name);
    }

    const result = await comfy.executeWorkflow(workflow);

    const outputImages = [];
    for (const img of result.images) {
      const base64 = img.buffer.toString('base64');
      outputImages.push({
        nodeId: img.nodeId,
        filename: img.filename,
        data: `data:${img.contentType};base64,${base64}`
      });
    }

    res.json({ success: true, images: outputImages });
  } catch (e) {
    console.error('[ComfyUI] 去水印失败:', e);
    res.status(500).json({ error: e.message });
  }
});

// ========== 自动遮罩定位（SAM3 关键词分割） ==========

router.post('/auto-mask', async (req, res) => {
  try {
    const { image, prompt, workflowFile } = req.body;
    if (!image) return res.status(400).json({ error: '缺少图片数据' });
    if (!prompt) return res.status(400).json({ error: '缺少关键词 prompt' });

    const status = await comfy.checkComfyUI();
    if (!status.connected) {
      return res.status(503).json({ error: 'ComfyUI 未连接' });
    }

    // 上传图片
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const imageName = `mask_input_${Date.now()}.png`;

    const uploadResult = await comfy.uploadImageToComfyUI(imageBuffer, imageName);
    if (!uploadResult.name) {
      return res.status(500).json({ error: '图片上传失败' });
    }

    // 加载工作流
    const wfFile = workflowFile || 'ZHEZHAOok.json';
    const workflow = comfy.getWorkflow(wfFile);
    if (!workflow) return res.status(404).json({ error: `工作流 ${wfFile} 不存在` });

    // 替换 LoadImage 节点的图片名
    for (const node of Object.values(workflow)) {
      if (node.class_type === 'LoadImage' && node.inputs && typeof node.inputs.image === 'string') {
        node.inputs.image = uploadResult.name;
        break;
      }
    }

    // 替换 PrimitiveStringMultiline 节点的 prompt 值
    for (const node of Object.values(workflow)) {
      if (node.class_type === 'PrimitiveStringMultiline' && node.inputs && 'value' in node.inputs) {
        node.inputs.value = prompt;
      }
    }

    const result = await comfy.executeWorkflow(workflow);

    // 返回遮罩图片和原图
    const outputImages = [];
    for (const img of result.images) {
      const base64 = img.buffer.toString('base64');
      outputImages.push({
        nodeId: img.nodeId,
        filename: img.filename,
        data: `data:${img.contentType};base64,${base64}`
      });
    }

    res.json({ success: true, images: outputImages });
  } catch (e) {
    console.error('[ComfyUI] 自动遮罩定位失败:', e);
    res.status(500).json({ error: e.message });
  }
});

// ========== 局部移除（Inpainting） ==========

router.post('/inpaint', async (req, res) => {
  try {
    const { image, mask, workflowFile } = req.body;
    if (!image || !mask) return res.status(400).json({ error: '缺少图片或遮罩数据' });

    const status = await comfy.checkComfyUI();
    if (!status.connected) {
      return res.status(503).json({ error: 'ComfyUI 未连接' });
    }

    // 上传原图
    const imgBase64 = image.replace(/^data:image\/\w+;base64,/, '');
    const imgBuffer = Buffer.from(imgBase64, 'base64');
    const imgName = `inpaint_input_${Date.now()}.png`;
    const imgUpload = await comfy.uploadImageToComfyUI(imgBuffer, imgName);

    // 上传遮罩
    const maskBase64 = mask.replace(/^data:image\/\w+;base64,/, '');
    const maskBuffer = Buffer.from(maskBase64, 'base64');
    const maskName = `inpaint_mask_${Date.now()}.png`;
    const maskUpload = await comfy.uploadImageToComfyUI(maskBuffer, maskName);

    let workflow;
    if (workflowFile) {
      workflow = comfy.getWorkflow(workflowFile);
      if (!workflow) return res.status(404).json({ error: `工作流 ${workflowFile} 不存在` });
      // 替换两个 LoadImage 节点
      let imgReplaced = false, maskReplaced = false;
      for (const node of Object.values(workflow)) {
        if (node.class_type === 'LoadImage' && node.inputs) {
          if (!imgReplaced) {
            node.inputs.image = imgUpload.name;
            imgReplaced = true;
          } else if (!maskReplaced) {
            node.inputs.image = maskUpload.name;
            maskReplaced = true;
          }
        }
      }
    } else {
      workflow = comfy.buildInpaintWorkflow(imgUpload.name, maskUpload.name);
    }

    const result = await comfy.executeWorkflow(workflow);

    const outputImages = [];
    for (const img of result.images) {
      const base64 = img.buffer.toString('base64');
      outputImages.push({
        nodeId: img.nodeId,
        filename: img.filename,
        data: `data:${img.contentType};base64,${base64}`
      });
    }

    res.json({ success: true, images: outputImages });
  } catch (e) {
    console.error('[ComfyUI] 局部移除失败:', e);
    res.status(500).json({ error: e.message });
  }
});

// ========== 通用工作流执行 ==========

router.post('/execute', async (req, res) => {
  try {
    const { workflow, images } = req.body;
    if (!workflow) return res.status(400).json({ error: '缺少工作流定义' });

    const status = await comfy.checkComfyUI();
    if (!status.connected) {
      return res.status(503).json({ error: 'ComfyUI 未连接' });
    }

    // 上传所有输入图片
    const inputImages = {};
    if (images) {
      for (const [key, imgBase64] of Object.entries(images)) {
        const data = imgBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(data, 'base64');
        const filename = `${key}_${Date.now()}.png`;
        const uploadResult = await comfy.uploadImageToComfyUI(buffer, filename);
        inputImages[key] = { buffer, filename, uploadedName: uploadResult.name };
      }
    }

    // 替换工作流中的图片引用
    const wf = JSON.parse(JSON.stringify(workflow));
    for (const [key, imgInfo] of Object.entries(inputImages)) {
      if (wf[key] && wf[key].inputs) {
        wf[key].inputs.image = imgInfo.uploadedName;
      }
    }

    // 移除元数据字段（以 _ 开头的）
    for (const key of Object.keys(wf)) {
      if (key.startsWith('_')) delete wf[key];
    }

    const result = await comfy.executeWorkflow(wf);

    const outputImages = [];
    for (const img of result.images) {
      const base64 = img.buffer.toString('base64');
      outputImages.push({
        nodeId: img.nodeId,
        filename: img.filename,
        data: `data:${img.contentType};base64,${base64}`
      });
    }

    res.json({ success: true, images: outputImages });
  } catch (e) {
    console.error('[ComfyUI] 执行失败:', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
