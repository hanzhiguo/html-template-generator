const fs = require('fs');
const path = require('path');

/**
 * 解析产品MD文档 - 完整5大类
 */
function parseProductMarkdown(markdownContent) {
  const lines = markdownContent.split('\n');
  const result = {
    name: '',
    subtitle: '',
    description: '',
    highlights: [],     // 1. 核心卖点
    specs: [],          // 2. 产品规格
    accessories: [],    // 3. 包装清单
    features: [],       // 4. 功能亮点
    dimensions: [],     // 5. 适配尺寸
    raw: markdownContent
  };

  let currentSection = '';
  const icons = [
    'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
    'M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6',
    'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021-16z',
    'M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9z'
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 检测产品名称
    if (i === 0 && (line.startsWith('# ') || line.startsWith('## '))) {
      result.name = line.replace(/^#+\s*/, '').trim();
      continue;
    }

    // 检测章节标题
    if (line.startsWith('## ')) {
      const sectionName = line.replace('## ', '').toLowerCase();
      currentSection = sectionName;
      continue;
    }

    // 1. 核心卖点 (Core Selling Points)
    if (currentSection.includes('core selling point') || currentSection === '核心卖点') {
      // 匹配格式:
      //   * **Title - Value**  (标题和值在同一个**...**中，用 - 分隔)
      //   * **Title**: Value  (标题在**...**中，值在后面)
      //   * **Title**          (只有标题，尝试从标题推断值)
      if (line.startsWith('* **') || line.startsWith('- **')) {
        // 提取第一个 **...** 中的内容
        const keyMatch = line.match(/^\s*[*\-]\s+\*\*([^*]+)\*\*/);
        if (keyMatch) {
          let key = keyMatch[1].trim();
          let value = '';

          // 检查是否有剩余内容（: 或 - 后面）
          const afterKey = line.substring(line.indexOf('**') + 2);
          const remaining = afterKey.substring(afterKey.indexOf('**') + 2).trim();

          // 情况1: 格式为 "**Title - Value**" 或 "**Title – Value**"
          // 需要从标题中分割
          if (remaining === '' && (key.includes(' - ') || key.includes(' – '))) {
            const separator = key.includes(' – ') ? ' – ' : ' - ';
            const parts = key.split(separator);
            key = parts[0].trim();
            value = parts.slice(1).join(separator).trim();
          }
          // 情况2: 格式为 "**Title**: Value" 或 "**Title** - Value"
          else if (remaining) {
            const separatorMatch = remaining.match(/^([–—:-])\s*(.+)/);
            if (separatorMatch) {
              value = separatorMatch[2].trim();
            } else {
              value = remaining;
            }
          }

          if (key) {
            result.highlights.push({
              highlight_key: key,
              highlight_value: value,
              icon_svg: icons[result.highlights.length % icons.length]
            });
          }
        }
      }
      // 更新副标题
      if (!result.subtitle && line.includes('**') && line.includes('-')) {
        const match = line.match(/\*\*([^*]+)\*\*\s*[-–—]\s*(.+)/);
        if (match) {
          result.subtitle = match[2].trim();
        }
      }
    }

    // 2. 产品规格 (Product Specifications)
    if (currentSection.includes('specification') && !currentSection.includes('adaptation')) {
      if (line.startsWith('* **') || line.startsWith('- **')) {
        const match = line.match(/\*\*([^*:]+)\*\*:?\s*(.+)/);
        if (match) {
          const label = match[1].trim();
          let value = match[2].trim();
          let unit = '';
          let specGroup = 'general';

          // 尝试分离值和单位
          const unitMatch = value.match(/^(.+?)\s*([A-Z]{1,3}|%|\d+["\']?)\s*$/);
          if (unitMatch && unitMatch[2]) {
            unit = unitMatch[2];
            value = unitMatch[1].trim();
          }

          // 分组
          if (label.toLowerCase().includes('material') || label.toLowerCase().includes('color')) {
            specGroup = 'material';
          } else if (label.toLowerCase().includes('weight')) {
            specGroup = 'weight';
          } else if (label.toLowerCase().includes('size') || label.toLowerCase().includes('dimension')) {
            specGroup = 'size';
          } else if (label.toLowerCase().includes('power') || label.toLowerCase().includes('capacity')) {
            specGroup = 'performance';
          }

          result.specs.push({
            spec_label: label,
            spec_value: value,
            spec_unit: unit,
            spec_group: specGroup
          });
        }
      }
    }

    // 3. 包装清单 (Packing List)
    if (currentSection.includes('packing') || currentSection === '包装清单') {
      if (line.startsWith('* **') || line.startsWith('- **')) {
        const match = line.match(/\*\*([^*]+)\*\*:?/);
        if (match) {
          result.accessories.push({
            accessory_name: match[1].trim()
          });
        }
      } else if ((line.startsWith('* ') || line.startsWith('- ')) && !line.includes('**')) {
        const name = line.replace(/^[*\-]\s*/, '').trim();
        if (name) {
          result.accessories.push({
            accessory_name: name
          });
        }
      }
    }

    // 4. 功能亮点 (Functional Highlights)
    if (currentSection.includes('functional highlight') || currentSection === '功能亮点') {
      if (line.startsWith('* **') || line.startsWith('- **')) {
        const match = line.match(/\*\*([^*:]+)\*\*:?\s*[-–—]?\s*(.+)?/);
        if (match) {
          const title = match[1].trim();
          let value = match[2] ? match[2].trim() : '';
          let description = '';

          // 如果值太长，作为描述处理
          if (value.length > 50) {
            description = value;
            value = '';
          }

          result.features.push({
            feature_title: title,
            feature_value: value,
            description: description,
            icon_emoji: getEmoji(result.features.length)
          });
        }
      }
    }

    // 5. 适配尺寸 (Adaptation & Dimensions)
    if (currentSection.includes('adaptation') || currentSection.includes('dimension')) {
      if (line.startsWith('* **') || line.startsWith('- **')) {
        const match = line.match(/\*\*([^*:]+)\*\*:?\s*(.+)/);
        if (match) {
          const label = match[1].trim();
          let value = match[2].trim();
          let unit = '';
          let dimCategory = 'adaptation';

          // 尺寸类
          if (label.toLowerCase().includes('dimension') || label.toLowerCase().includes('size')) {
            dimCategory = 'dimensions';
          } else if (label.toLowerCase().includes('spacing') || label.toLowerCase().includes('pitch')) {
            dimCategory = 'spacing';
          } else if (label.toLowerCase().includes('wheel')) {
            dimCategory = 'wheel_size';
          } else if (label.toLowerCase().includes('height') || label.toLowerCase().includes('width') || label.toLowerCase().includes('depth')) {
            dimCategory = 'external_dims';
          }

          // 提取单位
          const unitMatch = value.match(/^(.+?)\s*([A-Z]{1,3}|["\']|inch|in)$/i);
          if (unitMatch && unitMatch[2]) {
            unit = unitMatch[2];
            value = unitMatch[1].trim();
          }

          result.dimensions.push({
            dim_label: label,
            dim_value: value,
            dim_unit: unit,
            dim_category: dimCategory
          });
        }
      }
    }
  }

  return result;
}

function getEmoji(index) {
  const emojis = ['💪', '⚙️', '🔧', '📦', '🎯', '✨', '🚀', '💡', '🔇', '⚡'];
  return emojis[index % emojis.length];
}

/**
 * 从文件路径读取并解析MD文档
 */
function parseMarkdownFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`文件不存在: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return parseProductMarkdown(content);
}

/**
 * 将解析的数据转换为数据库格式
 */
function convertToDbFormat(parsedData) {
  const data = {
    name: parsedData.name,
    subtitle: parsedData.subtitle || null,
    description: parsedData.description || null,
    highlights: parsedData.highlights || [],
    specs: parsedData.specs || [],
    accessories: parsedData.accessories || [],
    features: parsedData.features || [],
    dimensions: parsedData.dimensions || []
  };

  return data;
}

module.exports = {
  parseProductMarkdown,
  parseMarkdownFile,
  convertToDbFormat
};