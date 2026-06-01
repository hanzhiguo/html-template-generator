/**
 * 工具执行器
 * 根据工具名称和参数执行对应的处理函数
 */
const fs = require('fs').promises;
const path = require('path');

// 使用 getDb() 获取数据库操作接口
const { getDb, getDatabase } = require('../../db/init');
const { recognizeImageText } = require('../../services/image-recognizer');

/**
 * 执行单个工具调用
 */
async function executeTool(name, args) {
  const startTime = Date.now();

  // 解析参数（可能是字符串或对象）
  const params = typeof args === 'string' ? JSON.parse(args) : args;

  try {
    let result;

    switch (name) {
      case 'query_products':
        result = await queryProducts(params.query, params.limit);
        break;

      case 'query_kb':
        result = await queryKnowledge(params.query, params.limit);
        break;

      case 'read_file':
        result = await readFile(params.path);
        break;

      case 'write_file':
        result = await writeFile(params.path, params.content);
        break;

      case 'get_product_attachments':
        result = await getProductAttachments(params.product_id, params.types);
        break;

      case 'get_download_link':
        result = await getDownloadLink(params.attachment_id, params.type);
        break;

      case 'create_product':
        result = await createProduct(params);
        break;

      case 'recognize_image_text':
        result = await recognizeImageTool(params.image);
        break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      success: true,
      result,
      duration_ms: Date.now() - startTime
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      duration_ms: Date.now() - startTime
    };
  }
}

/**
 * 批量执行工具调用
 * @param {Array} toolCalls - 工具调用列表
 * @returns {Array} 结果列表
 */
async function executeTools(toolCalls) {
  const results = [];

  for (const call of toolCalls) {
    const result = await executeTool(call.function.name, call.function.arguments || {});
    results.push({
      tool_call_id: call.id,
      role: 'tool',
      name: call.function.name,
      content: JSON.stringify(result)
    });
  }

  return results;
}

/**
 * 查询产品数据
 */
async function queryProducts(query, limit = 10) {
  try {
    const { all } = getDb();

    // 模糊搜索产品
    const products = all(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.name LIKE ? OR p.description LIKE ? OR p.sku LIKE ?
    `, [`%${query}%`, `%${query}%`, `%${query}%`]);

    if (!products.length) {
      return { products: [], message: '未找到匹配的产品' };
    }

    // 限制返回数量
    const limitedProducts = products.slice(0, limit);

    // 补充详细数据
    for (const product of limitedProducts) {
      product.highlights = all('SELECT * FROM product_highlights WHERE product_id = ?', [product.id]);
      product.specs = all('SELECT * FROM product_specs WHERE product_id = ?', [product.id]);
      product.features = all('SELECT * FROM product_features WHERE product_id = ?', [product.id]);
      product.accessories = all('SELECT * FROM product_accessories WHERE product_id = ?', [product.id]);
      product.dimensions = all('SELECT * FROM product_dimensions WHERE product_id = ?', [product.id]);
    }

    return {
      total: limitedProducts.length,
      products: limitedProducts
    };
  } catch (error) {
    console.error('[queryProducts] Error:', error.message);
    throw error;
  }
}

/**
 * 查询知识库
 */
async function queryKnowledge(query, limit = 5) {
  const { all } = getDb();

  // 模糊搜索
  const documents = all(`
    SELECT * FROM kb_documents
    WHERE title LIKE ? OR content LIKE ? OR tags LIKE ?
  `, [`%${query}%`, `%${query}%`, `%${query}%`]);

  if (!documents.length) {
    return { documents: [], message: '未找到匹配的文档' };
  }

  return {
    total: documents.length,
    documents: documents.slice(0, limit)
  };
}

/**
 * 读取文件
 */
async function readFile(filePath) {
  const rootDir = path.resolve(__dirname, '../../../..');
  const fullPath = path.join(rootDir, filePath);

  // 安全检查：确保文件在项目目录内
  if (!fullPath.startsWith(rootDir)) {
    throw new Error('文件路径超出项目目录范围');
  }

  try {
    const content = await fs.readFile(fullPath, 'utf-8');
    return {
      path: filePath,
      content: content.substring(0, 10000), // 限制返回长度
      size: content.length
    };
  } catch (error) {
    throw new Error(`无法读取文件: ${error.message}`);
  }
}

/**
 * 写入文件
 */
async function writeFile(filePath, content) {
  const rootDir = path.resolve(__dirname, '../../../..');
  const fullPath = path.join(rootDir, filePath);

  // 安全检查：确保文件在项目目录内
  if (!fullPath.startsWith(rootDir)) {
    throw new Error('文件路径超出项目目录范围');
  }

  try {
    // 确保目录存在
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(fullPath, content, 'utf-8');
    return {
      path: filePath,
      size: content.length,
      message: '文件写入成功'
    };
  } catch (error) {
    throw new Error(`无法写入文件: ${error.message}`);
  }
}

/**
 * 查询产品附件
 */
async function getProductAttachments(productId, types = 'all') {
  try {
    const { all } = getDb();
    const serverUrl = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3000}`;

    const result = { product_id: productId, images: [], documents: [] };

    if (types === 'all' || types === 'images') {
      const images = all(
        'SELECT id, image_type, image_url, alt_text FROM product_images WHERE product_id = ? ORDER BY sort_order ASC',
        [productId]
      );
      result.images = images.map(img => ({
        id: img.id,
        type: img.image_type,
        title: img.alt_text || `${img.image_type} 图片`,
        url: img.image_url.startsWith('http') ? img.image_url : `${serverUrl}${img.image_url}`,
        download_url: img.image_url.startsWith('http') ? img.image_url : `${serverUrl}${img.image_url}`,
        category: 'image'
      }));
    }

    if (types === 'all' || types === 'documents') {
      const documents = all(
        'SELECT id, doc_type, title, file_path, file_size, mime_type, link_type FROM product_documents WHERE product_id = ? ORDER BY sort_order ASC',
        [productId]
      );
      result.documents = documents.map(doc => {
        let downloadUrl = doc.file_path;
        if (doc.link_type === 'upload' && !doc.file_path.startsWith('http')) {
          downloadUrl = `${serverUrl}${doc.file_path}`;
        }
        return {
          id: doc.id,
          type: doc.doc_type,
          title: doc.title || doc.file_path.split('/').pop(),
          url: doc.file_path,
          download_url: downloadUrl,
          file_size: doc.file_size,
          mime_type: doc.mime_type,
          link_type: doc.link_type,
          category: 'document'
        };
      });
    }

    const totalCount = result.images.length + result.documents.length;

    return {
      product_id: productId,
      total: totalCount,
      images_count: result.images.length,
      documents_count: result.documents.length,
      attachments: [...result.images, ...result.documents],
      message: totalCount > 0
        ? `找到 ${totalCount} 个附件（${result.images.length} 张图片，${result.documents.length} 个文档）`
        : '该产品暂无附件'
    };
  } catch (error) {
    console.error('[getProductAttachments] Error:', error.message);
    throw error;
  }
}

/**
 * 获取下载链接
 */
async function getDownloadLink(attachmentId, type) {
  try {
    const { get } = getDb();
    const serverUrl = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3000}`;

    if (type === 'image') {
      const image = get('SELECT * FROM product_images WHERE id = ?', [attachmentId]);
      if (!image) {
        return { error: '图片不存在' };
      }
      return {
        id: image.id,
        title: image.alt_text || '图片',
        url: image.image_url.startsWith('http') ? image.image_url : `${serverUrl}${image.image_url}`,
        type: 'image',
        subtype: image.image_type
      };
    }

    if (type === 'document') {
      const doc = get('SELECT * FROM product_documents WHERE id = ?', [attachmentId]);
      if (!doc) {
        return { error: '文档不存在' };
      }
      let downloadUrl = doc.file_path;
      if (doc.link_type === 'upload' && !doc.file_path.startsWith('http')) {
        downloadUrl = `${serverUrl}${doc.file_path}`;
      }
      return {
        id: doc.id,
        title: doc.title || doc.file_path.split('/').pop(),
        url: doc.file_path,
        download_url: downloadUrl,
        type: 'document',
        subtype: doc.doc_type,
        file_size: doc.file_size,
        link_type: doc.link_type
      };
    }

    return { error: '不支持的附件类型' };
  } catch (error) {
    console.error('[getDownloadLink] Error:', error.message);
    throw error;
  }
}

/**
 * 创建完整产品
 * 支持一次性创建产品主信息和5大表数据
 */
async function createProduct(params) {
  try {
    const { run, get } = getDb();

    // 验证必填字段
    if (!params.name) {
      throw new Error('产品名称不能为空');
    }

    // 检查SKU是否已存在（如果提供了SKU）
    if (params.sku) {
      const existing = get('SELECT id FROM products WHERE sku = ?', [params.sku]);
      if (existing) {
        return {
          success: false,
          error: 'SKU已存在',
          existing_id: existing.id,
          message: `产品SKU "${params.sku}" 已存在，无法重复创建。建议使用update_product工具更新现有产品，或使用新的SKU。`
        };
      }
    }

    // 插入产品主表
    run(`
      INSERT INTO products (user_id, sku, name, subtitle, description, price, currency, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      params.user_id || 1,
      params.sku || null,
      params.name,
      params.subtitle || null,
      params.description || null,
      params.price || null,
      params.currency || 'USD',
      params.status || 'draft'
    ]);

    // 获取插入的产品ID - 通过查询最后一个产品（按ID倒序）
    const { all } = getDb();
    const lastProducts = all('SELECT id, sku, name FROM products ORDER BY id DESC LIMIT 1');
    const productId = lastProducts[0]?.id;

    if (!productId) {
      throw new Error('无法获取新插入产品的ID');
    }

    // 插入5大表数据
    let dataSummary = { highlights: 0, specs: 0, accessories: 0, features: 0, dimensions: 0 };

    // 1. 核心卖点
    if (params.highlights && Array.isArray(params.highlights)) {
      params.highlights.forEach((h, index) => {
        if (h.key || h.value) {
          run(`
            INSERT INTO product_highlights (product_id, highlight_key, highlight_value, sort_order)
            VALUES (?, ?, ?, ?)
          `, [productId, h.key || '', h.value || '', index]);
          dataSummary.highlights++;
        }
      });
    }

    // 2. 产品规格
    if (params.specs && Array.isArray(params.specs)) {
      params.specs.forEach((s, index) => {
        if (s.label || s.value) {
          run(`
            INSERT INTO product_specs (product_id, spec_label, spec_value, spec_unit, spec_group, sort_order)
            VALUES (?, ?, ?, ?, '规格', ?)
          `, [productId, s.label || '', s.value || '', s.unit || '', index]);
          dataSummary.specs++;
        }
      });
    }

    // 3. 包装清单
    if (params.accessories && Array.isArray(params.accessories)) {
      params.accessories.forEach((a, index) => {
        if (a.name) {
          run(`
            INSERT INTO product_accessories (product_id, accessory_name, quantity, is_included, sort_order)
            VALUES (?, ?, ?, 1, ?)
          `, [productId, a.name, a.quantity || 1, index]);
          dataSummary.accessories++;
        }
      });
    }

    // 4. 功能亮点
    if (params.features && Array.isArray(params.features)) {
      params.features.forEach((f, index) => {
        if (f.title) {
          run(`
            INSERT INTO product_features (product_id, feature_title, description, sort_order)
            VALUES (?, ?, ?, ?)
          `, [productId, f.title, f.description || '', index]);
          dataSummary.features++;
        }
      });
    }

    // 5. 适配尺寸
    if (params.dimensions && Array.isArray(params.dimensions)) {
      params.dimensions.forEach((d, index) => {
        if (d.label || d.value) {
          run(`
            INSERT INTO product_dimensions (product_id, dim_label, dim_value, dim_unit, sort_order)
            VALUES (?, ?, ?, ?, ?)
          `, [productId, d.label || '', d.value || '', d.unit || '', index]);
          dataSummary.dimensions++;
        }
      });
    }

    // 获取创建的产品信息
    const productRows = all('SELECT * FROM products WHERE id = ?', [productId]);
    const product = productRows[0];

    return {
      success: true,
      product_id: productId,
      sku: product.sku,
      name: product.name,
      data_created: dataSummary,
      message: `产品创建成功！\n` +
        `- 产品ID: ${productId}\n` +
        `- 产品名称: ${product.name}\n` +
        `- SKU: ${product.sku || '未设置'}\n` +
        `- 核心卖点: ${dataSummary.highlights}条\n` +
        `- 产品规格: ${dataSummary.specs}条\n` +
        `- 包装清单: ${dataSummary.accessories}条\n` +
        `- 功能亮点: ${dataSummary.features}条\n` +
        `- 适配尺寸: ${dataSummary.dimensions}条\n\n` +
        `数据已完整保存到数据库，可以通过产品管理页面查看和编辑。`
    };
  } catch (error) {
    console.error('[createProduct] Error:', error.message);
    throw error;
  }
}

module.exports = {
  executeTool,
  executeTools
};

/**
 * 识别图片中的文字（工具函数）
 */
async function recognizeImageTool(imageBase64) {
  try {
    const text = await recognizeImageText(imageBase64);
    return {
      success: true,
      text: text,
      message: '图片文字识别成功'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
