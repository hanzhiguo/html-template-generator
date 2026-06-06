/**
 * main-image-ai-assistant.js
 * AI助手模块：参数填充、卖点填充
 * 
 * 依赖：components/ai-chat/ai-chat.js (window.AIChat)
 * 依赖全局变量：state
 * 依赖全局函数：render, updateUIFromState
 */

// ========== 全局函数：从AI接收数据并填充到主图模板 ==========
window.fillMainImageParams = function(params) {
  console.log('[AI助手] 接收到填充参数:', params);

  if (!params) return false;

  // 填充主标题
  if (params.mainTitle) {
    state.mainTitle = params.mainTitle;
    const el = document.getElementById('mainTitle');
    if (el) el.value = params.mainTitle;
  }

  // 填充副标题
  if (params.subTitle) {
    state.subTitle = params.subTitle;
    const el = document.getElementById('subTitle');
    if (el) el.value = params.subTitle;
  }

  // 填充标题颜色
  if (params.titleColor) {
    state.titleColor = params.titleColor;
    const el = document.getElementById('titleColor');
    if (el) el.value = params.titleColor;
  }

  // 填充副标题颜色
  if (params.subtitleColor) {
    state.subtitleColor = params.subtitleColor;
    const el = document.getElementById('subtitleColor');
    if (el) el.value = params.subtitleColor;
  }

  // 填充标题字号
  if (params.titleSize) {
    state.titleSize = parseInt(params.titleSize);
    const el = document.getElementById('titleSize');
    if (el) el.value = params.titleSize;
  }

  // 填充副标题字号
  if (params.subtitleSize) {
    state.subtitleSize = parseInt(params.subtitleSize);
    const el = document.getElementById('subtitleSize');
    if (el) el.value = params.subtitleSize;
  }

  // 填充文字位置
  if (params.position) {
    state.position = params.position;
  }

  // 填充垂直位置
  if (params.vposition) {
    state.vposition = params.vposition;
  }

  // 填充文字阴影
  if (params.textShadow !== undefined) {
    state.textShadow = params.textShadow;
    const el = document.getElementById('textShadow');
    if (el) el.checked = params.textShadow;
  }

  // 填充文字描边
  if (params.textStroke !== undefined) {
    state.textStroke = params.textStroke;
    const el = document.getElementById('textStroke');
    if (el) el.checked = params.textStroke;
  }

  // 填充标题加粗
  if (params.titleBold !== undefined) {
    state.titleBold = params.titleBold;
  }

  // 填充背景色
  if (params.bgColor) {
    state.bgColor = params.bgColor;
    const el = document.getElementById('bgColor');
    if (el) el.value = params.bgColor;
  }

  // 填充遮罩类型
  if (params.overlayType) {
    state.overlayType = params.overlayType;
  }

  // 重新渲染
  render();
  updateUIFromState();

  console.log('[AI助手] 参数填充完成');
  return true;
};

// 全局函数：从AI接收卖点数据并填充
window.fillSellingPoints = function(sellingPoints) {
  console.log('[AI助手] 接收到卖点数据:', sellingPoints);

  if (!sellingPoints || !Array.isArray(sellingPoints) || sellingPoints.length === 0) {
    return false;
  }

  // 填充第一个卖点作为主标题和副标题
  if (sellingPoints[0]) {
    if (sellingPoints[0].title) {
      state.mainTitle = sellingPoints[0].title;
      const el = document.getElementById('mainTitle');
      if (el) el.value = sellingPoints[0].title;
    }
    if (sellingPoints[0].description) {
      state.subTitle = sellingPoints[0].description;
      const el = document.getElementById('subTitle');
      if (el) el.value = sellingPoints[0].description;
    }
  }

  render();
  updateUIFromState();

  return true;
};

// ========== 初始化AIChat组件并注册主图页工具处理器 ==========
document.addEventListener('DOMContentLoaded', function() {
  // 等待AIChat组件加载完成
  function initAIChatForMainImage() {
    if (!window.AIChat) {
      // 如果AIChat还没加载，延迟重试
      setTimeout(initAIChatForMainImage, 100);
      return;
    }

    // 初始化AIChat
    window.AIChat.init({
      getToken: () => localStorage.getItem('token'),
      conversationIdKey: 'aiConversationId'
    });

    // 注册主图页专用的工具处理器
    window.AIChat.registerToolHandler('generate_main_image_content', (r) => {
      if (r.data?.success && r.data.main_image_params) {
        window.fillMainImageParams(r.data.main_image_params);
        window.AIChat.addMessage('assistant', `✅ 已自动填充主图参数:\n- 主标题: ${r.data.main_image_params.mainTitle}\n- 副标题: ${r.data.main_image_params.subTitle}`);
      }
    });

    window.AIChat.registerToolHandler('read_product_md_file', (r) => {
      if (r.data?.success && r.data.parsed) {
        const parsed = r.data.parsed;
        const params = {
          mainTitle: parsed.product_name || '',
          subTitle: parsed.material || ''
        };
        if (parsed.selling_points && parsed.selling_points.length > 0) {
          params.subTitle = parsed.selling_points[0].title;
        }
        window.fillMainImageParams(params);
        window.AIChat.addMessage('assistant', `✅ 已从文档提取并填充:\n- 产品名: ${parsed.product_name}\n- 材质: ${parsed.material}\n- 卖点数: ${parsed.selling_points?.length || 0}`);
      }
    });

    window.AIChat.registerToolHandler('search_md_files', (r) => {
      if (r.data?.success) {
        const results = r.data.results || [];
        if (results.length > 0) {
          const firstResult = results[0];
          if (firstResult.parsed) {
            const params = {
              mainTitle: firstResult.parsed.product_name || '',
              subTitle: firstResult.parsed.model || firstResult.parsed.material || ''
            };
            if (firstResult.parsed.selling_points && firstResult.parsed.selling_points.length > 0) {
              params.subTitle = firstResult.parsed.selling_points[0].title;
            }
            window.fillMainImageParams(params);
          }

          // 使用Markdown格式显示结果
          let mdContent = `## 🔍 搜索结果\n\n找到 **${results.length}** 个匹配文档：\n\n`;
          results.forEach((item, index) => {
            const p = item.parsed || {};
            mdContent += `### ${index + 1}. ${p.product_name || '未知产品'}\n`;
            mdContent += `| 属性 | 值 |\n|------|----|\n`;
            mdContent += `| 📄 文件 | \`${item.file_name}\` |\n`;
            if (item.product_id) mdContent += `| 🆔 产品ID | ${item.product_id} |\n`;
            if (p.model) mdContent += `| 📦 型号 | ${p.model} |\n`;
            if (p.material) mdContent += `| 🧱 材质 | ${p.material} |\n`;
            if (p.category) mdContent += `| 📁 分类 | ${p.category} |\n`;
            if (p.dimensions && p.dimensions.length > 0) {
              const dims = p.dimensions.slice(0, 3).map(d => `${d.label}: ${d.value}`).join('、');
              mdContent += `| 📐 尺寸 | ${dims} |\n`;
            }
            if (p.sku_colors && p.sku_colors.length > 0) {
              const skus = p.sku_colors.slice(0, 3).map(s => s.sku_code).join(', ');
              mdContent += `| 🏷️ SKU | ${skus}${p.sku_colors.length > 3 ? '...' : ''} |\n`;
            }
            mdContent += '\n';
          });
          mdContent += `---\n✅ 已自动填充第一个产品的参数`;
          window.AIChat.addMessage('assistant', mdContent);
        } else {
          window.AIChat.addMessage('assistant', `❌ 未找到包含 "${r.data.keyword}" 的文档`);
        }
      }
    });

    window.AIChat.registerToolHandler('get_product_specs', (r) => {
      if (r.data?.success) {
        const product = r.data.product;
        const specs = r.data.specs || [];
        window.AIChat.addMessage('assistant', `📋 产品: ${product.name}\n规格参数: ${specs.length}项\n尺寸: ${r.data.dimensions?.length || 0}项`);
      }
    });

    console.log('[主图AI助手] AIChat组件已初始化，工具处理器已注册');
  }

  initAIChatForMainImage();
});
