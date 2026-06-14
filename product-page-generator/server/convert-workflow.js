/**
 * 将 ComfyUI UI 格式工作流转为 API 格式
 * UI 格式: { nodes: [...], links: [...] }
 * API 格式: { "nodeId": { class_type, inputs: {...} } }
 */

const fs = require('fs');
const path = require('path');

const inputFile = process.argv[2];
const outputFile = process.argv[3];

if (!inputFile) {
  console.error('用法: node convert-workflow.js <input.json> [output.json]');
  process.exit(1);
}

const workflow = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

// 构建 link 映射: linkId -> { sourceNodeId, sourceSlot }
const linkMap = {};
if (workflow.links) {
  for (const link of workflow.links) {
    // link format: [linkId, sourceNodeId, sourceSlot, targetNodeId, targetSlot, type]
    linkMap[link[0]] = {
      sourceNodeId: link[1],
      sourceSlot: link[2]
    };
  }
}

// 构建节点映射
const nodeMap = {};
for (const node of workflow.nodes) {
  nodeMap[node.id] = node;
}

// 转换
const apiWorkflow = {};

for (const node of workflow.nodes) {
  const nodeId = String(node.id);
  const inputs = {};

  // 处理输入连接
  if (node.inputs) {
    for (const input of node.inputs) {
      if (input.link != null) {
        const link = linkMap[input.link];
        if (link) {
          inputs[input.name] = [String(link.sourceNodeId), link.sourceSlot];
        }
      }
    }
  }

  // 处理 widget 值
  if (node.widgets_values && node.widgets_values.length > 0) {
    // 获取 widget 名称列表（从 inputs 中非连接的 widget）
    const widgetNames = [];
    if (node.inputs) {
      for (const input of node.inputs) {
        if (input.widget) {
          widgetNames.push(input.widget.name);
        }
      }
    }

    // 如果没有从 inputs 中获取到 widget 名称，尝试从节点定义推断
    // 对于没有 widget 信息的节点，按顺序分配
    let widgetIdx = 0;
    const usedNames = new Set(Object.keys(inputs));

    if (widgetNames.length > 0) {
      // 有明确的 widget 名称映射
      for (let i = 0; i < node.widgets_values.length && i < widgetNames.length; i++) {
        const name = widgetNames[i];
        if (!usedNames.has(name)) {
          inputs[name] = node.widgets_values[i];
        }
      }
      // 多余的 widget 值
      for (let i = widgetNames.length; i < node.widgets_values.length; i++) {
        const val = node.widgets_values[i];
        if (val !== undefined && val !== null && val !== '') {
          inputs[`widget_${i}`] = val;
        }
      }
    } else {
      // 没有明确的 widget 名称，根据已知节点类型映射
      const knownWidgets = getKnownWidgets(node.type);
      for (let i = 0; i < node.widgets_values.length; i++) {
        const val = node.widgets_values[i];
        if (val !== undefined && val !== null) {
          const name = knownWidgets[i] || `widget_${i}`;
          if (!usedNames.has(name)) {
            inputs[name] = val;
          }
        }
      }
    }
  }

  apiWorkflow[nodeId] = {
    class_type: node.type,
    inputs
  };
}

// 添加元数据
apiWorkflow._name = path.basename(inputFile, '.json');
apiWorkflow._description = `工作流: ${path.basename(inputFile)}`;
apiWorkflow._type = 'watermark-removal';

const output = JSON.stringify(apiWorkflow, null, 2);

if (outputFile) {
  fs.writeFileSync(outputFile, output, 'utf8');
  console.log(`已保存到: ${outputFile}`);
} else {
  console.log(output);
}

// 已知节点的 widget 名称映射
function getKnownWidgets(nodeType) {
  const map = {
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
  return map[nodeType] || [];
}
