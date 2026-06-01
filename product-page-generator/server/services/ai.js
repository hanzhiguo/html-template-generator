const Anthropic = require('@anthropic-ai/sdk');

let client = null;

function getClient() {
  if (!client) {
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }
  return client;
}

// 使用AI增强产品描述
async function enhanceProductDescription(product) {
  try {
    const anthropic = getClient();

    const prompt = `你是一个专业的产品文案专家。请根据以下产品信息，生成一段吸引人的产品描述。

产品名称: ${product.name}
${product.subtitle ? `副标题: ${product.subtitle}` : ''}
${product.description ? `现有描述: ${product.description}` : ''}

要求:
1. 描述要专业、有说服力，突出产品卖点
2. 长度控制在100-200字之间
3. 使用中文输出
4. 适合电商平台展示`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    return message.content[0].text.trim();
  } catch (err) {
    console.error('AI增强描述失败:', err);
    return product.description || '';
  }
}

// 生成快速特性
async function generateQuickFeatures(product) {
  try {
    const anthropic = getClient();

    const prompt = `根据以下产品信息，生成4个快速特性介绍。

产品名称: ${product.name}
产品描述: ${product.description || product.subtitle || ''}

要求:
1. 每个特性包含SVG图标路径（简洁的stroke图标路径）、两行文字
2. 突出产品的4个核心卖点
3. 返回JSON数组格式:
[
  {"icon_svg": "SVG路径", "text_line1": "第一行", "text_line2": "第二行"},
  ...
]
4. 只返回JSON，不要其他内容`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const text = message.content[0].text.trim();
    // 尝试解析JSON
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return [];
  } catch (err) {
    console.error('AI生成快速特性失败:', err);
    return [];
  }
}

// 生成功能卡片
async function generateFeatureCards(product) {
  try {
    const anthropic = getClient();

    const prompt = `根据以下产品信息，生成4个功能卡片介绍。

产品名称: ${product.name}
${product.description ? `产品描述: ${product.description}` : ''}

要求:
1. 每个卡片包含emoji图标、标题、描述
2. 标题用英文大写，16字以内
3. 描述用英文，40字以内
4. 返回JSON数组格式:
[
  {"icon_emoji": "🔧", "title": "标题", "description": "描述"},
  ...
]
5. 只返回JSON，不要其他内容`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const text = message.content[0].text.trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return [];
  } catch (err) {
    console.error('AI生成功能卡片失败:', err);
    return [];
  }
}

// 生成规格参数
async function generateSpecifications(product) {
  try {
    const anthropic = getClient();

    const prompt = `根据以下产品信息，生成6-8个规格参数。

产品名称: ${product.name}
${product.specifications ? `现有规格: ${JSON.stringify(product.specifications)}` : ''}

要求:
1. 生成常见的产品规格（如材质、尺寸、重量、颜色等）
2. 返回JSON数组格式:
[
  {"spec_label": "标签", "spec_value": "值"},
  ...
]
3. 只返回JSON，不要其他内容
4. 使用中文标签`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const text = message.content[0].text.trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return [];
  } catch (err) {
    console.error('AI生成规格参数失败:', err);
    return [];
  }
}

module.exports = {
  enhanceProductDescription,
  generateQuickFeatures,
  generateFeatureCards,
  generateSpecifications
};