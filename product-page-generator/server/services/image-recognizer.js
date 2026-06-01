/**
 * 图片文字识别服务
 * 使用视觉模型识别图片中的文字
 */
const { LLMClient } = require('../agent/client');
const config = require('../agent/config');

/**
 * 识别图片中的文字
 * @param {string} imageBase64 - 图片的base64编码（不含前缀）
 * @returns {Promise<string>} - 识别的文字内容
 */
async function recognizeImageText(imageBase64) {
  const client = new LLMClient(config.defaultProvider);

  // 构建多模态消息
  const messages = [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: '请仔细识别这张图片中的所有文字内容，包括产品名称、型号、规格参数、说明文字等。请以结构化的方式返回所有识别到的文字，保持原始格式和顺序。'
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:image/jpeg;base64,${imageBase64}`,
            detail: 'high'
          }
        }
      ]
    }
  ];

  try {
    const response = await client.chat(messages, []);
    return response.content || '未能识别到文字内容';
  } catch (error) {
    console.error('[ImageRecognizer] Error:', error.message);
    throw new Error(`图片文字识别失败: ${error.message}`);
  }
}

/**
 * 批量识别多张图片
 * @param {Array<string>} imagesBase64 - 图片base64数组
 * @returns {Promise<Array>} - 每张图片的识别结果
 */
async function recognizeMultipleImages(imagesBase64) {
  const results = [];

  for (let i = 0; i < imagesBase64.length; i++) {
    try {
      const text = await recognizeImageText(imagesBase64[i]);
      results.push({
        index: i + 1,
        success: true,
        text: text
      });
    } catch (error) {
      results.push({
        index: i + 1,
        success: false,
        error: error.message
      });
    }
  }

  return results;
}

module.exports = {
  recognizeImageText,
  recognizeMultipleImages
};
