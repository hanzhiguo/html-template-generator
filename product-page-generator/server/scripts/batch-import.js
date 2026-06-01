/**
 * 批量导入脚本
 * 扫描目录，解析MD文档，上传图片和文档，自动创建产品
 *
 * 使用方式:
 *   node batch-import.js <目录路径> [--dry-run] [--force]
 *
 * 目录结构:
 *   <根目录>/
 *   ├── <SKU1>/
 *   │   ├── product.md          # 产品MD文档
 *   │   ├── images/             # 图片目录
 *   │   │   ├── main.jpg         # 主图
 *   │   │   ├── detail_1.jpg     # 详情图
 *   │   │   └── dimension.png   # 尺寸图
 *   │   └── documents/          # 文档目录
 *   │       ├── manual.pdf      # 说明书
 *   │       └── spec.pdf        # 规格书
 *   └── <SKU2>/
 *       └── ...
 */

const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');

// 设置工作目录为项目根目录
const projectRoot = path.resolve(__dirname, '../..');
process.chdir(projectRoot);

// 引入数据库和Markdown解析器
const { initDatabase, getDb, getDatabase, saveDatabase } = require('../db/init');
const { parseMarkdownFile } = require('../services/markdown');

const UPLOADS_DIR = path.join(projectRoot, 'public/uploads/products');

// 图片类型映射
const IMAGE_TYPE_MAP = {
  'main': 'main',
  'hero': 'main',
  'primary': 'main',
  'detail': 'detail',
  'gallery': 'detail',
  'dimension': 'dimension',
  'dim': 'dimension',
  'size': 'dimension',
  'banner': 'banner',
  'thumb': 'thumbnail'
};

// 文档类型映射
const DOC_TYPE_MAP = {
  '.pdf': 'pdf',
  '.mp4': 'video',
  '.webm': 'video',
  '.avi': 'video',
  '.mov': 'video'
};

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: false,
    force: false,
    configPath: null,
    importDir: null
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') {
      options.dryRun = true;
    } else if (args[i] === '--force') {
      options.force = true;
    } else if (args[i] === '--config' && args[i + 1]) {
      options.configPath = args[i + 1];
      i++;
    } else if (!args[i].startsWith('-')) {
      options.importDir = args[i];
    }
  }

  return options;
}

// 打印彩色日志
function log(type, message) {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    warning: '\x1b[33m',
    error: '\x1b[31m',
    step: '\x1b[35m',
    reset: '\x1b[0m'
  };
  const prefix = {
    info: 'ℹ',
    success: '✓',
    warning: '⚠',
    error: '✗',
    step: '▸',
    reset: ''
  };
  console.log(`${colors[type] || ''}${prefix[type] || ''} ${message}${colors.reset}`);
}

// 从文件名识别图片类型
function getImageType(filename) {
  const lower = filename.toLowerCase();
  for (const [keyword, type] of Object.entries(IMAGE_TYPE_MAP)) {
    if (lower.includes('_' + keyword + '_') || lower.includes('_' + keyword + '.')) {
      return type;
    }
  }
  return 'detail'; // 默认作为详情图
}

// 从文件名识别文档类型
function getDocType(filename) {
  const lower = filename.toLowerCase();
  const ext = path.extname(lower);

  // 根据扩展名判断
  if (DOC_TYPE_MAP[ext]) {
    return DOC_TYPE_MAP[ext];
  }

  // 根据文件名关键字判断
  if (lower.includes('manual') || lower.includes('说明书')) {
    return 'manual';
  }
  if (lower.includes('spec') || lower.includes('规格')) {
    return 'spec';
  }

  return 'other';
}

// 创建目录
async function ensureDir(dirPath) {
  try {
    await fsPromises.mkdir(dirPath, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

// 复制文件
async function copyFile(src, dest) {
  try {
    await fsPromises.copyFile(src, dest);
    return true;
  } catch (err) {
    // 文件已存在则跳过
    if (err.code === 'EEXIST') {
      return 'skipped';
    }
    throw err;
  }
}

// 创建或更新产品
async function createOrUpdateProduct(productData, force) {
  const { run, get, all } = getDb();

  // 检查SKU是否已存在
  let existingProduct = null;
  if (productData.sku) {
    existingProduct = get('SELECT * FROM products WHERE sku = ?', [productData.sku]);
  }

  let productId;
  let isNew = false;

  if (existingProduct) {
    if (force) {
      // 更新现有产品
      run(`
        UPDATE products SET
          name = COALESCE(?, name),
          subtitle = ?,
          description = ?,
          price = COALESCE(?, price),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        productData.name || existingProduct.name,
        productData.subtitle || null,
        productData.description || null,
        productData.price || null,
        existingProduct.id
      ]);
      productId = existingProduct.id;
      log('info', `更新现有产品 ID: ${productId}`);
    } else {
      productId = existingProduct.id;
      log('info', `跳过已存在产品 ID: ${productId}`);
    }
  } else {
    // 创建新产品
    const result = run(`
      INSERT INTO products (user_id, sku, name, subtitle, description, price, currency, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      1, // 默认用户ID
      productData.sku || null,
      productData.name,
      productData.subtitle || null,
      productData.description || null,
      productData.price || null,
      productData.currency || 'USD',
      productData.status || 'draft'
    ]);

    // 获取插入的产品ID
    const stmt = getDatabase().prepare('SELECT last_insert_rowid() as id');
    stmt.step();
    const idRow = stmt.getAsObject();
    stmt.free();
    productId = idRow.id;
    isNew = true;
    log('success', `创建新产品 ID: ${productId}`);
  }

  return { productId, isNew, existing: !!existingProduct };
}

// 插入5大数据
async function insertProductData(productId, data, clearExisting = true) {
  const { run, all } = getDb();

  if (clearExisting) {
    // 清理旧数据
    run('DELETE FROM product_highlights WHERE product_id = ?', [productId]);
    run('DELETE FROM product_specs WHERE product_id = ?', [productId]);
    run('DELETE FROM product_accessories WHERE product_id = ?', [productId]);
    run('DELETE FROM product_features WHERE product_id = ?', [productId]);
    run('DELETE FROM product_dimensions WHERE product_id = ?', [productId]);
  }

  let stats = { highlights: 0, specs: 0, accessories: 0, features: 0, dimensions: 0 };

  // 插入核心卖点
  // MD解析器返回: highlight_key, highlight_value, icon_svg
  if (data.highlights && Array.isArray(data.highlights)) {
    data.highlights.forEach((h, index) => {
      const key = h.highlight_key || h.key || '';
      const value = h.highlight_value || h.value || '';
      if (key) {
        run(`
          INSERT INTO product_highlights (product_id, highlight_key, highlight_value, icon_svg, sort_order)
          VALUES (?, ?, ?, ?, ?)
        `, [productId, key, value, h.icon_svg || null, index]);
        stats.highlights++;
      }
    });
  }

  // 插入产品规格
  // MD解析器返回: spec_label, spec_value, spec_unit, spec_group
  if (data.specs && Array.isArray(data.specs)) {
    data.specs.forEach((s, index) => {
      const label = s.spec_label || s.label || '';
      const value = s.spec_value || s.value || '';
      if (label || value) {
        run(`
          INSERT INTO product_specs (product_id, spec_label, spec_value, spec_unit, spec_group, sort_order)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [productId, label, value, s.spec_unit || s.unit || '', s.spec_group || '规格', index]);
        stats.specs++;
      }
    });
  }

  // 插入包装清单
  // MD解析器返回: accessory_name, quantity
  if (data.accessories && Array.isArray(data.accessories)) {
    data.accessories.forEach((a, index) => {
      const name = a.accessory_name || a.name || '';
      if (name) {
        run(`
          INSERT INTO product_accessories (product_id, accessory_name, quantity, is_included, sort_order)
          VALUES (?, ?, ?, 1, ?)
        `, [productId, name, a.quantity || 1, index]);
        stats.accessories++;
      }
    });
  }

  // 插入功能亮点
  // MD解析器返回: feature_title, description, feature_value, icon_emoji
  if (data.features && Array.isArray(data.features)) {
    data.features.forEach((f, index) => {
      const title = f.feature_title || f.title || '';
      const description = f.description || f.feature_value || '';
      if (title) {
        run(`
          INSERT INTO product_features (product_id, feature_title, feature_value, icon_emoji, description, sort_order)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [productId, title, f.feature_value || '', f.icon_emoji || '', description, index]);
        stats.features++;
      }
    });
  }

  // 插入适配尺寸
  // MD解析器返回: dim_label, dim_value, dim_unit, dim_category
  if (data.dimensions && Array.isArray(data.dimensions)) {
    data.dimensions.forEach((d, index) => {
      const label = d.dim_label || d.label || '';
      const value = d.dim_value || d.value || '';
      if (label || value) {
        run(`
          INSERT INTO product_dimensions (product_id, dim_label, dim_value, dim_unit, dim_category, sort_order)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [productId, label, value, d.dim_unit || d.unit || '', d.dim_category || 'dimensions', index]);
        stats.dimensions++;
      }
    });
  }

  return stats;
}

// 上传图片
async function uploadImage(productId, srcPath, targetDir) {
  const { run, all } = getDb();
  const filename = path.basename(srcPath);
  const imageType = getImageType(filename);
  const ext = path.extname(filename);
  const timestamp = Date.now();
  const newFilename = `${productId}_${imageType}_${timestamp}${ext}`;
  const destPath = path.join(targetDir, newFilename);

  // 确保目录存在
  await ensureDir(targetDir);

  // 复制文件
  const result = await copyFile(srcPath, destPath);

  if (result === 'skipped') {
    return { skipped: true, type: imageType };
  }

  // 插入数据库
  const { get } = getDb();
  const existing = get(
    'SELECT id FROM product_images WHERE product_id = ? AND image_type = ?',
    [productId, imageType]
  );

  if (existing) {
    run('DELETE FROM product_images WHERE id = ?', [existing.id]);
  }

  const url = `/uploads/products/${productId}/${newFilename}`;
  run(`
    INSERT INTO product_images (product_id, image_type, image_url, alt_text, sort_order)
    VALUES (?, ?, ?, ?, 0)
  `, [productId, imageType, url, filename]);

  return { success: true, type: imageType, path: destPath };
}

// 上传文档
async function uploadDocument(productId, srcPath, targetDir) {
  const { run, get } = getDb();
  const filename = path.basename(srcPath);
  const docType = getDocType(filename);
  const ext = path.extname(filename);
  const timestamp = Date.now();
  const newFilename = `${productId}_${timestamp}_${filename}`;
  const destPath = path.join(targetDir, newFilename);

  // 确保目录存在
  await ensureDir(targetDir);

  // 获取文件大小
  const stats = await fsPromises.stat(srcPath);

  // 复制文件
  const result = await copyFile(srcPath, destPath);

  if (result === 'skipped') {
    return { skipped: true, type: docType };
  }

  // 获取MIME类型
  const mimeTypes = {
    '.pdf': 'application/pdf',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };

  const mime_type = mimeTypes[ext] || 'application/octet-stream';
  const url = `/uploads/products/${productId}/documents/${newFilename}`;

  run(`
    INSERT INTO product_documents (product_id, doc_type, title, file_path, file_size, mime_type, link_type, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, 'upload', 0)
  `, [productId, docType, filename, url, stats.size, mime_type]);

  return { success: true, type: docType, path: destPath };
}

// 处理单个产品目录
async function processProductDir(productDir, options) {
  const sku = path.basename(productDir);
  const mdPath = path.join(productDir, 'product.md');
  const imagesDir = path.join(productDir, 'images');
  const documentsDir = path.join(productDir, 'documents');

  log('step', `处理产品: ${sku}`);

  // 检查MD文件是否存在
  if (!fs.existsSync(mdPath)) {
    log('warning', `  跳过: 未找到 product.md`);
    return { sku, skipped: true, reason: '无MD文件' };
  }

  // 解析MD文件
  let productData;
  try {
    productData = await parseMarkdownFile(mdPath);
    if (!productData.name) {
      // 如果MD解析的name为空，使用文件夹名作为产品名
      productData.name = sku;
    }
  } catch (err) {
    log('error', `  解析MD失败: ${err.message}`);
    return { sku, failed: true, error: err.message };
  }

  // 设置SKU
  productData.sku = sku;

  // 预览模式
  if (options.dryRun) {
    log('info', `  [DRY-RUN] 将创建产品: ${productData.name}`);
    log('info', `  [DRY-RUN] 亮点: ${(productData.highlights || []).length}条`);
    log('info', `  [DRY-RUN] 规格: ${(productData.specs || []).length}条`);
    log('info', `  [DRY-RUN] 配件: ${(productData.accessories || []).length}条`);
    log('info', `  [DRY-RUN] 功能: ${(productData.features || []).length}条`);
    log('info', `  [DRY-RUN] 尺寸: ${(productData.dimensions || []).length}条`);

    // 检查图片和文档
    if (fs.existsSync(imagesDir)) {
      const images = fs.readdirSync(imagesDir);
      log('info', `  [DRY-RUN] 图片: ${images.length}张`);
    }
    if (fs.existsSync(documentsDir)) {
      const docs = fs.readdirSync(documentsDir);
      log('info', `  [DRY-RUN] 文档: ${docs.length}个`);
    }

    return { sku, dryRun: true, productData };
  }

  // 创建/更新产品
  let productInfo;
  try {
    productInfo = await createOrUpdateProduct(productData, options.force);
  } catch (err) {
    log('error', `  创建产品失败: ${err.message}`);
    return { sku, failed: true, error: err.message };
  }

  const { productId, isNew } = productInfo;

  // 插入产品数据
  let dataStats;
  try {
    dataStats = await insertProductData(productId, productData, true);
    log('success', `  数据已导入: 亮点${dataStats.highlights}条, 规格${dataStats.specs}条, 配件${dataStats.accessories}条, 功能${dataStats.features}条, 尺寸${dataStats.dimensions}条`);
  } catch (err) {
    log('error', `  导入数据失败: ${err.message}`);
    console.error(err);
    return { sku, failed: true, error: err.message };
  }

  // 处理图片
  const imageResults = [];
  if (fs.existsSync(imagesDir)) {
    try {
      const images = fs.readdirSync(imagesDir).filter(f =>
        /\.(jpg|jpeg|png|gif|webp)$/i.test(f)
      );

      for (const imageFile of images) {
        const srcPath = path.join(imagesDir, imageFile);
        try {
          const result = await uploadImage(productId, srcPath, path.join(UPLOADS_DIR, String(productId)));
          if (result.success) {
            imageResults.push(`${result.type}: ${imageFile}`);
          }
        } catch (err) {
          log('warning', `  上传图片失败: ${imageFile} - ${err.message}`);
        }
      }
    } catch (err) {
      log('warning', `  处理图片目录失败: ${err.message}`);
    }
  }

  // 处理文档
  const docResults = [];
  if (fs.existsSync(documentsDir)) {
    try {
      const docs = fs.readdirSync(documentsDir).filter(f =>
        /\.(pdf|mp4|webm|doc|docx|txt)$/i.test(f)
      );

      for (const docFile of docs) {
        const srcPath = path.join(documentsDir, docFile);
        try {
          const result = await uploadDocument(productId, srcPath, path.join(UPLOADS_DIR, String(productId), 'documents'));
          if (result.success) {
            docResults.push(`${result.type}: ${docFile}`);
          }
        } catch (err) {
          log('warning', `  上传文档失败: ${docFile} - ${err.message}`);
        }
      }
    } catch (err) {
      log('warning', `  处理文档目录失败: ${err.message}`);
    }
  }

  log('success', `  完成! 图片: ${imageResults.length}张, 文档: ${docResults.length}个`);

  return {
    sku,
    productId,
    isNew,
    dataStats,
    imageResults,
    docResults
  };
}

// 主函数
async function main() {
  const options = parseArgs();

  if (!options.importDir) {
    console.log(`
批量导入脚本 - 扫描目录批量导入产品

使用方式:
  node batch-import.js <目录路径> [--dry-run] [--force]

示例:
  node batch-import.js ./my-products           # 导入目录
  node batch-import.js ./my-products --dry-run # 预览模式
  node batch-import.js ./my-products --force   # 强制更新已存在的产品
`);
    process.exit(1);
  }

  // 确保uploads目录存在
  await ensureDir(UPLOADS_DIR);

  // 初始化数据库
  await initDatabase();

  console.log('\n========================================');
  log('info', '批量导入脚本');
  log('info', `导入目录: ${options.importDir}`);
  if (options.dryRun) {
    log('warning', '模式: 预览 (DRY-RUN - 不会实际导入)');
  } else if (options.force) {
    log('warning', '模式: 强制更新已存在的产品');
  } else {
    log('info', '模式: 跳过已存在的产品');
  }
  console.log('========================================\n');

  // 检查目录是否存在
  const importPath = path.resolve(options.importDir);
  if (!fs.existsSync(importPath)) {
    log('error', `目录不存在: ${importPath}`);
    process.exit(1);
  }

  // 扫描子目录
  let entries;
  try {
    entries = fs.readdirSync(importPath).filter(name => {
      return fs.statSync(path.join(importPath, name)).isDirectory();
    }).map(name => ({ name, isDirectory: () => true }));
  } catch (err) {
    log('error', `无法读取目录: ${err.message}`);
    process.exit(1);
  }

  const productDirs = entries
    .filter(e => e.isDirectory())
    .map(e => path.join(importPath, e.name));

  if (productDirs.length === 0) {
    log('warning', '未找到任何产品目录');
    process.exit(0);
  }

  log('info', `找到 ${productDirs.length} 个产品目录\n`);

  // 处理每个产品
  const results = [];
  for (const productDir of productDirs) {
    try {
      const result = await processProductDir(productDir, options);
      results.push(result);
    } catch (err) {
      log('error', `处理失败: ${err.message}`);
      results.push({ failed: true, error: err.message });
    }
    console.log('');
  }

  // 打印汇总
  console.log('========================================');
  log('info', '导入汇总');
  console.log('========================================');

  const successCount = results.filter(r => !r.failed && !r.skipped && !r.dryRun).length;
  const skippedCount = results.filter(r => r.skipped).length;
  const dryRunCount = results.filter(r => r.dryRun).length;
  const failedCount = results.filter(r => r.failed).length;

  if (options.dryRun) {
    console.log(`  预览产品数: ${dryRunCount}`);
  } else {
    console.log(`  成功: ${successCount}`);
    console.log(`  跳过: ${skippedCount}`);
    console.log(`  失败: ${failedCount}`);
  }

  if (failedCount > 0) {
    console.log('\n失败的产品:');
    results.filter(r => r.failed).forEach(r => {
      console.log(`  - ${path.basename(r.sku || 'unknown')}: ${r.error}`);
    });
  }

  console.log('\n完成!\n');
}

// 运行
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});