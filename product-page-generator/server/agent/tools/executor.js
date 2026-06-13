/**
 * 工具执行器
 * 根据工具名称和参数执行对应的处理函数
 */
const fs = require('fs').promises;
const path = require('path');
const glob = require('glob');

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

      case 'get_product_specs':
        result = await getProductSpecs(params.product_id);
        break;

      case 'read_product_document':
        result = await readProductDocument(params.product_id, params.doc_type);
        break;

      case 'generate_main_image_content':
        result = await generateMainImageContent(params.product_id, params.style, params.language);
        break;

      case 'read_product_md_file':
        result = await readProductMDFile(params.product_id);
        break;

      case 'search_md_files':
        result = await searchMdFiles(params.keyword, params.search_content, params.include_raw);
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
  executeTools,
  searchMdFiles,
  generateMainImageContent,
  parseMDContent
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

/**
 * 获取产品规格参数
 */
async function getProductSpecs(productId) {
  try {
    const { all, get } = getDb();

    // 获取产品基本信息
    const product = get('SELECT * FROM products WHERE id = ?', [productId]);
    if (!product) {
      return { success: false, error: '产品不存在' };
    }

    // 获取规格参数
    const specs = all('SELECT * FROM product_specs WHERE product_id = ? ORDER BY sort_order', [productId]);

    // 获取尺寸信息
    const dimensions = all('SELECT * FROM product_dimensions WHERE product_id = ? ORDER BY sort_order', [productId]);

    // 获取卖点
    const highlights = all('SELECT * FROM product_highlights WHERE product_id = ? ORDER BY sort_order', [productId]);

    return {
      success: true,
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        subtitle: product.subtitle,
        description: product.description
      },
      specs: specs.map(s => ({
        label: s.spec_label,
        value: s.spec_value,
        unit: s.spec_unit || '',
        group: s.spec_group || '规格'
      })),
      dimensions: dimensions.map(d => ({
        label: d.dim_label,
        value: d.dim_value,
        unit: d.dim_unit || ''
      })),
      highlights: highlights.map(h => ({
        key: h.highlight_key,
        value: h.highlight_value
      })),
      message: `已获取产品"${product.name}"的规格参数：${specs.length}个规格，${dimensions.length}个尺寸，${highlights.length}个卖点`
    };
  } catch (error) {
    console.error('[getProductSpecs] Error:', error.message);
    throw error;
  }
}

/**
 * 读取产品文档内容
 */
async function readProductDocument(productId, docType = 'all') {
  try {
    const { all, get } = getDb();

    // 获取产品信息
    const product = get('SELECT * FROM products WHERE id = ?', [productId]);
    if (!product) {
      return { success: false, error: '产品不存在' };
    }

    // 获取关联的文档
    let documents = all(
      'SELECT * FROM product_documents WHERE product_id = ? ORDER BY sort_order',
      [productId]
    );

    if (docType !== 'all') {
      documents = documents.filter(d => d.doc_type === docType);
    }

    if (documents.length === 0) {
      return {
        success: true,
        product_id: productId,
        product_name: product.name,
        documents: [],
        message: '该产品暂无关联文档'
      };
    }

    // 读取文档内容
    const rootDir = path.resolve(__dirname, '../../../..');
    const results = [];

    for (const doc of documents) {
      try {
        let content = '';
        let filePath = doc.file_path;

        // 处理本地文件
        if (!filePath.startsWith('http')) {
          const fullPath = path.join(rootDir, filePath);
          const exists = await fs.access(fullPath).then(() => true).catch(() => false);
          if (exists) {
            const fileContent = await fs.readFile(fullPath, 'utf-8');
            content = fileContent.substring(0, 15000); // 限制长度
          }
        }

        results.push({
          id: doc.id,
          title: doc.title || path.basename(doc.file_path),
          type: doc.doc_type,
          path: doc.file_path,
          content: content,
          size: content.length
        });
      } catch (e) {
        results.push({
          id: doc.id,
          title: doc.title,
          type: doc.doc_type,
          error: '无法读取: ' + e.message
        });
      }
    }

    return {
      success: true,
      product_id: productId,
      product_name: product.name,
      documents: results,
      message: `已读取 ${results.length} 个文档`
    };
  } catch (error) {
    console.error('[readProductDocument] Error:', error.message);
    throw error;
  }
}

/**
 * 生成主图内容
 */
async function generateMainImageContent(productId, style = 'professional', language = 'zh') {
  try {
    const { all, get } = getDb();

    // 获取产品完整信息
    const product = get('SELECT * FROM products WHERE id = ?', [productId]);
    if (!product) {
      return { success: false, error: '产品不存在' };
    }

    const specs = all('SELECT * FROM product_specs WHERE product_id = ? ORDER BY sort_order', [productId]);
    const highlights = all('SELECT * FROM product_highlights WHERE product_id = ? ORDER BY sort_order', [productId]);
    const dimensions = all('SELECT * FROM product_dimensions WHERE product_id = ? ORDER BY sort_order', [productId]);

    // 构建返回的主图参数
    const result = {
      success: true,
      product_id: productId,
      product_name: product.name,
      style: style,
      language: language,

      // 主图参数 - 可直接用于前端填充
      main_image_params: {
        mainTitle: product.name || '',
        subTitle: product.subtitle || '',
        titleColor: '#ffffff',
        subtitleColor: 'rgba(255,255,255,0.85)',
        titleSize: 56,
        subtitleSize: 28,
        position: 'center',
        vposition: 'center',
        textShadow: true,
        textStroke: false,
        titleBold: true,
        textBg: false,
        bgColor: '#f5f5f5',
        overlayType: 'dark'
      },

      // 卖点文案（用于多页主图）
      selling_points: highlights.slice(0, 6).map((h, i) => ({
        page: i + 1,
        title: h.highlight_key || '',
        description: h.highlight_value || ''
      })),

      // 规格参数（可用于标注）
      specs_data: specs.map(s => ({
        label: s.spec_label,
        value: s.spec_value,
        unit: s.spec_unit || ''
      })),

      // 尺寸数据
      dimension_data: dimensions.map(d => ({
        label: d.dim_label,
        value: d.dim_value,
        unit: d.dim_unit || ''
      })),

      message: `已生成产品"${product.name}"的主图参数建议`
    };

    return result;
  } catch (error) {
    console.error('[generateMainImageContent] Error:', error.message);
    throw error;
  }
}

/**
 * 读取产品MD文件（从MD目录）
 * 支持两种命名格式：产品_XXX_名称.md 和 模型_XXX_名称.md
 */
async function readProductMDFile(productId) {
  try {
    const { get } = getDb();
    const product = get('SELECT * FROM products WHERE id = ?', [productId]);

    if (!product) {
      return { success: false, error: '产品不存在' };
    }

    // MD目录路径 - 正确计算
    // executor.js 位于: product-page-generator/server/agent/tools/
    // MD目录位于: Product Description/MD/
    // __dirname → 向上4级到达 Product Description
    const rootDir = path.resolve(__dirname, '../../../..');
    const mdDir = path.join(rootDir, 'MD');

    // glob需要使用正斜杠路径（Windows兼容）
    const mdDirNormalized = mdDir.replace(/\\/g, '/');

    console.log('[readProductMDFile] MD目录路径:', mdDirNormalized);

    // 产品ID格式化（补零到3位）
    const paddedId = String(productId).padStart(3, '0');

    // 可能的文件名模式（按优先级排序）
    const possibleNames = [
      // 产品格式：产品_010_地形粉.md
      `产品_${paddedId}_*.md`,
      `产品_${paddedId}.md`,
      // 模型格式：模型_001_沙盘_微缩草簇.md
      `模型_${paddedId}_*.md`,
      `模型_${paddedId}.md`,
      // SKU或名称匹配
      `${product.sku}.md`,
      `${product.name}.md`
    ];

    let mdFile = null;
    let matchedPattern = null;

    // 使用glob查找文件
    for (const pattern of possibleNames) {
      const files = glob.sync(`${mdDirNormalized}/${pattern}`);
      if (files.length > 0) {
        mdFile = files[0];
        matchedPattern = pattern;
        break;
      }
    }

    if (!mdFile) {
      return {
        success: false,
        error: '未找到产品MD文档',
        product_id: productId,
        product_name: product.name,
        searched_dir: mdDir,
        tried_patterns: possibleNames
      };
    }

    const content = await fs.readFile(mdFile, 'utf-8');

    // 解析MD文件内容，提取关键信息
    const parsedData = parseMDContent(content);

    return {
      success: true,
      product_id: productId,
      product_name: product.name,
      file_path: mdFile,
      file_name: path.basename(mdFile),
      matched_pattern: matchedPattern,
      content: content,
      size: content.length,
      parsed: parsedData,
      message: `已读取产品MD文档: ${path.basename(mdFile)}`
    };
  } catch (error) {
    console.error('[readProductMDFile] Error:', error.message);
    throw error;
  }
}

/**
 * 解析MD文件内容，提取关键信息
 */
function parseMDContent(content) {
  const result = {
    product_name: '',
    product_name_en: '',
    model: '',
    material: '',
    material_en: '',
    process: '',
    process_en: '',
    category: '',
    category_en: '',
    dimensions: [],
    specs: [],
    selling_points: [],
    selling_points_en: [],
    description: '',
    description_en: '',
    sku_colors: [],
    raw_content: content  // 保留原始内容供AI参考
  };

  try {
    // 提取产品名称
    const nameMatch = content.match(/\*\*产品名称\*\*\s*\|\s*([^\|]+)/);
    if (nameMatch) result.product_name = nameMatch[1].trim();

    const nameEnMatch = content.match(/\*\*产品名称\*\*\s*\|[^\|]+\|\s*([^\|]+)/);
    if (nameEnMatch) result.product_name_en = nameEnMatch[1].trim();

    // 提取型号
    const modelMatch = content.match(/\*\*产品型号\*\*\s*\|\s*([^\|]+)/);
    if (modelMatch) result.model = modelMatch[1].trim();

    // 提取材质
    const materialMatch = content.match(/\*\*材质\*\*\s*\|\s*([^\|]+)/);
    if (materialMatch) result.material = materialMatch[1].trim();

    // 提取工艺
    const processMatch = content.match(/\*\*工艺\*\*\s*\|\s*([^\|]+)/);
    if (processMatch) result.process = processMatch[1].trim();

    // 提取分类
    const categoryMatch = content.match(/\*\*产品分类\*\*\s*\|\s*([^\|]+)/);
    if (categoryMatch) result.category = categoryMatch[1].trim();

    // 提取尺寸 - 改进版，支持多种格式
    // 格式1: **长度** | value | ...
    // 格式2: **Height** | value | ...
    const dimensionPatterns = [
      { pattern: /\*\*长度[^*]*\*\*\s*\|\s*([^\|]+)/g, label: '长度' },
      { pattern: /\*\*宽度[^*]*\*\*\s*\|\s*([^\|]+)/g, label: '宽度' },
      { pattern: /\*\*高度[^*]*\*\*\s*\|\s*([^\|]+)/g, label: '高度' },
      { pattern: /\*\*Height\*\*\s*\|\s*([^\|]+)/g, label: '高度/Height' },
      { pattern: /\*\*Width\*\*\s*\|\s*([^\|]+)/g, label: '宽度/Width' },
      { pattern: /\*\*Length\*\*\s*\|\s*([^\|]+)/g, label: '长度/Length' },
      { pattern: /\*\*Diameter\*\*\s*\|\s*([^\|]+)/g, label: '直径/Diameter' },
      { pattern: /\*\*Branch Diameter\*\*\s*\|\s*([^\|]+)/g, label: '分支直径/Branch Diameter' },
      { pattern: /\*\*直径[^*]*\*\*\s*\|\s*([^\|]+)/g, label: '直径' },
    ];

    for (const { pattern, label } of dimensionPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const value = match[1].trim();
        if (value && !result.dimensions.find(d => d.value === value)) {
          result.dimensions.push({ label, value });
        }
      }
    }

    // 提取尺寸规格表格中的所有尺寸
    const dimSectionMatch = content.match(/## 尺寸规格[\s\S]*?(?=\n##[^#]|$)/);
    if (dimSectionMatch) {
      // 匹配表格中的尺寸行: | **Label** | value | ... |
      const dimRows = dimSectionMatch[0].matchAll(/\|\s*\*\*([^*]+)\*\*\s*\|\s*([^\|]+)/g);
      for (const row of dimRows) {
        const label = row[1].trim();
        const value = row[2].trim();
        if (value && !result.dimensions.find(d => d.value === value)) {
          result.dimensions.push({ label, value });
        }
      }
    }

    // 提取卖点
    const sellingPointsSection = content.match(/## 产品卖点[\s\S]*?(?=\n##[^#]|$)/);
    if (sellingPointsSection) {
      // 中文卖点
      const zhSection = sellingPointsSection[0].match(/### 中文卖点\s*([\s\S]*?)(?=###|##|$)/);
      if (zhSection) {
        const points = zhSection[1].match(/\d+\.\s+\*\*([^*]+)\*\*\s*[—\-]\s*([^\n]+)/g);
        if (points) {
          result.selling_points = points.map(p => {
            const m = p.match(/\d+\.\s+\*\*([^*]+)\*\*\s*[—\-]\s*(.+)/);
            return m ? { title: m[1].trim(), description: m[2].trim() } : null;
          }).filter(Boolean);
        }
      }

      // 英文卖点
      const enSection = sellingPointsSection[0].match(/### English Selling Points\s*([\s\S]*?)(?=###|##|$)/);
      if (enSection) {
        const points = enSection[1].match(/\d+\.\s+\*\*([^*]+)\*\*\s*[—\-]\s*([^\n]+)/g);
        if (points) {
          result.selling_points_en = points.map(p => {
            const m = p.match(/\d+\.\s+\*\*([^*]+)\*\*\s*[—\-]\s*(.+)/);
            return m ? { title: m[1].trim(), description: m[2].trim() } : null;
          }).filter(Boolean);
        }
      }

      // 兼容：如果没有分中英文，用旧逻辑
      if (result.selling_points.length === 0) {
        const points = sellingPointsSection[0].match(/\d+\.\s+\*\*([^*]+)\*\*\s*[—\-]\s*([^\n]+)/g);
        if (points) {
          result.selling_points = points.map(p => {
            const m = p.match(/\d+\.\s+\*\*([^*]+)\*\*\s*[—\-]\s*(.+)/);
            return m ? { title: m[1].trim(), description: m[2].trim() } : null;
          }).filter(Boolean);
        }
      }
    }

    // 提取中文描述
    const descMatch = content.match(/### 中文描述\s+([\s\S]*?)(?=###|##|$)/);
    if (descMatch) result.description = descMatch[1].trim();

    // 提取英文描述
    const descEnMatch = content.match(/### English Description\s+([\s\S]*?)(?=###|##|$)/);
    if (descEnMatch) result.description_en = descEnMatch[1].trim();

    // 提取SKU颜色/规格列表
    const skuSectionMatch = content.match(/### SKU[^#]*[\s\S]*?(?=###|##|$)/);
    if (skuSectionMatch) {
      const skuRows = skuSectionMatch[0].matchAll(/\|\s*(\d+)\s*\|\s*([^\|]+)\s*\|\s*([^\|]+)\s*\|\s*([^\|]+)\s*\|\s*([^\|]+)/g);
      for (const row of skuRows) {
        result.sku_colors.push({
          index: row[1].trim(),
          name_cn: row[2].trim(),
          name_en: row[3].trim(),
          sku_code: row[4].trim(),
          quantity: row[5].trim()
        });
      }
    }

  } catch (e) {
    console.error('[parseMDContent] Error:', e.message);
  }

  return result;
}

/**
 * 搜索MD文件
 * 根据关键词搜索文件名或内容
 * @param {string} keyword - 搜索关键词
 * @param {boolean} searchContent - 是否搜索文件内容
 * @param {boolean} includeRaw - 是否返回原始文档内容（默认false，节省token）
 */
async function searchMdFiles(keyword, searchContent = false, includeRaw = false) {
  try {
    // 使用配置文件中的目录设置
    const config = require('../config');
    const rootDir = path.resolve(__dirname, '../../../..');
    const mdDirName = config.mdDocsDir || 'MD';
    const mdDir = path.join(rootDir, mdDirName);
    const mdDirNormalized = mdDir.replace(/\\/g, '/');

    console.log('[searchMdFiles] MD目录路径:', mdDirNormalized, '(配置: mdDocsDir =', mdDirName, ')');

    // 获取所有MD文件
    const allFiles = glob.sync(`${mdDirNormalized}/*.md`);

    if (allFiles.length === 0) {
      return {
        success: true,
        keyword: keyword,
        results: [],
        message: 'MD目录中没有找到任何文档'
      };
    }

    const results = [];
    const keywordLower = keyword.toLowerCase();

    for (const filePath of allFiles) {
      const fileName = path.basename(filePath);
      let matched = false;
      let matchType = '';

      // 1. 检查文件名是否匹配
      if (fileName.toLowerCase().includes(keywordLower)) {
        matched = true;
        matchType = 'filename';
      }

      // 2. 如果文件名不匹配，检查是否需要搜索内容
      if (!matched && searchContent) {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const contentLower = content.toLowerCase();

          if (contentLower.includes(keywordLower)) {
            matched = true;
            matchType = 'content';
          }
        } catch (e) {
          console.error(`[searchMdFiles] 读取文件失败: ${fileName}`, e.message);
        }
      }

      // 3. 如果匹配，读取并解析文件内容
      if (matched) {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const parsedData = parseMDContent(content);
          const idMatch = fileName.match(/(?:产品|模型)_(\d+)/);
          const productId = idMatch ? parseInt(idMatch[1]) : null;

          // 构建返回结果，默认不包含原始内容
          const result = {
            file_name: fileName,
            product_id: productId,
            match_type: matchType,
            parsed: {
              product_name: parsedData.product_name,
              product_name_en: parsedData.product_name_en,
              model: parsedData.model,
              material: parsedData.material,
              material_en: parsedData.material_en,
              process: parsedData.process,
              process_en: parsedData.process_en,
              category: parsedData.category,
              category_en: parsedData.category_en,
              dimensions: parsedData.dimensions,
              selling_points: parsedData.selling_points,
              selling_points_en: parsedData.selling_points_en,
              description: parsedData.description,
              description_en: parsedData.description_en,
              sku_colors: parsedData.sku_colors
            }
          };

          // 只有明确请求时才返回原始内容，且限制大小
          if (includeRaw) {
            // 限制原始内容最大 3000 字符（约 1500 tokens）
            result.parsed.raw_content = parsedData.raw_content.substring(0, 3000);
            if (parsedData.raw_content.length > 3000) {
              result.parsed.raw_content += '\n...[内容已截断]';
            }
          }

          results.push(result);
        } catch (e) {
          console.error(`[searchMdFiles] 解析文件失败: ${fileName}`, e.message);
        }
      }
    }

    // 排序：文件名匹配优先，内容匹配靠后
    results.sort((a, b) => {
      if (a.match_type === 'filename' && b.match_type !== 'filename') return -1;
      if (a.match_type !== 'filename' && b.match_type === 'filename') return 1;
      return 0;
    });

    return {
      success: true,
      keyword: keyword,
      total_files: allFiles.length,
      matched_count: results.length,
      results: results,
      message: results.length > 0 
        ? `找到 ${results.length} 个匹配的文档` 
        : `未找到包含 "${keyword}" 的文档`
    };
  } catch (error) {
    console.error('[searchMdFiles] Error:', error.message);
    throw error;
  }
}
