/**
 * 知识库入口
 * 提供统一的知识库查询接口
 */
const markdownKB = require('./markdown');
const dbKB = require('./db');

/**
 * 搜索知识库
 * @param {string} query - 搜索关键词
 * @param {Object} options - 选项 { type: 'all'|'md'|'db', limit: 5 }
 */
async function search(query, options = {}) {
  const { type = 'all', limit = 5 } = options;
  const results = {
    query,
    results: []
  };

  if (type === 'all' || type === 'md') {
    const mdResults = await markdownKB.search(query, limit);
    results.results.push(...mdResults.map(r => ({ ...r, source: 'md' })));
  }

  if (type === 'all' || type === 'db') {
    const dbResults = await dbKB.search(query, limit);
    results.results.push(...dbResults.map(r => ({ ...r, source: 'database' })));
  }

  // 按相关度排序（简单实现：匹配次数多的在前）
  results.results.sort((a, b) => (b.matches || 0) - (a.matches || 0));

  return results;
}

/**
 * 同步知识库
 */
async function sync() {
  const stats = {
    md: { total: 0, success: 0, failed: 0 },
    db: { total: 0, success: 0, failed: 0 }
  };

  try {
    const mdStats = await markdownKB.sync();
    stats.md = mdStats;
  } catch (error) {
    console.error('MD 知识库同步失败:', error.message);
  }

  try {
    const dbStats = await dbKB.sync();
    stats.db = dbStats;
  } catch (error) {
    console.error('数据库知识库同步失败:', error.message);
  }

  return stats;
}

/**
 * 获取知识库统计
 */
async function getStats() {
  const stats = {
    md: await markdownKB.getStats(),
    db: await dbKB.getStats()
  };

  return stats;
}

module.exports = {
  search,
  sync,
  getStats,
  markdownKB,
  dbKB
};
