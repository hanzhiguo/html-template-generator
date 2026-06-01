/**
 * 数据库知识库
 * 将产品数据作为结构化知识查询
 */
const db = require('../../db/init').getDatabase();

/**
 * 搜索产品数据
 */
async function search(query, limit = 5) {
  const database = db.getDatabase();
  const escapedQuery = escape(query);

  // 搜索产品
  const products = database.exec(`
    SELECT p.id, p.name, p.description, p.sku, p.category_id,
           c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.name LIKE '%${escapedQuery}%'
       OR p.description LIKE '%${escapedQuery}%'
       OR p.sku LIKE '%${escapedQuery}%'
       OR c.name LIKE '%${escapedQuery}%'
    LIMIT ${limit}
  `);

  if (!products.length || !products[0].values.length) {
    return [];
  }

  const results = [];
  const columns = products[0].columns;

  for (const row of products[0].values) {
    const product = {};
    columns.forEach((col, i) => product[col] = row[i]);

    // 补充详细数据
    const details = await getProductDetails(product.id);

    // 计算匹配度
    const regex = new RegExp(escapedQuery, 'gi');
    let matches = 0;
    if (product.name) matches += (product.name.match(regex) || []).length;
    if (product.description) matches += (product.description.match(regex) || []).length;

    results.push({
      id: product.id,
      name: product.name,
      description: product.description,
      category: product.category_name,
      details,
      matches
    });
  }

  return results;
}

/**
 * 获取产品完整信息
 */
async function getProductDetails(productId) {
  const database = db.getDatabase();

  const getTable = (table, where = `product_id = '${productId}'`) => {
    const result = database.exec(`SELECT * FROM ${table} WHERE ${where}`);
    if (!result.length || !result[0].values.length) return [];

    const cols = result[0].columns;
    return result[0].values.map(row => {
      const obj = {};
      cols.forEach((col, i) => obj[col] = row[i]);
      return obj;
    });
  };

  return {
    highlights: getTable('product_highlights'),
    specs: getTable('product_specs'),
    features: getTable('product_features'),
    accessories: getTable('product_accessories'),
    dimensions: getTable('product_dimensions'),
    images: getTable('product_images')
  };
}

/**
 * 获取知识库统计
 */
async function getStats() {
  const database = db.getDatabase();

  try {
    const products = database.exec('SELECT COUNT(*) FROM products');
    const categories = database.exec('SELECT COUNT(*) FROM categories');

    return {
      products: products[0].values[0][0],
      categories: categories[0].values[0][0]
    };
  } catch {
    return { products: 0, categories: 0 };
  }
}

/**
 * 同步数据库知识库
 * （实际上产品数据已在主数据库中，这里主要用于验证表结构）
 */
async function sync() {
  const database = db.getDatabase();

  try {
    // 验证必要的表是否存在
    const requiredTables = ['products', 'categories', 'product_highlights',
                           'product_specs', 'product_features',
                           'product_accessories', 'product_dimensions'];

    for (const table of requiredTables) {
      const exists = database.exec(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'
      `);

      if (!exists.length || !exists[0].values.length) {
        console.warn(`表 ${table} 不存在，跳过`);
      }
    }

    return { success: true, message: '数据库知识库已就绪' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 转义 SQL 特殊字符
 */
function escape(str) {
  if (!str) return '';
  return String(str).replace(/'/g, "''");
}

module.exports = {
  search,
  getProductDetails,
  getStats,
  sync
};
