/**
 * MD 知识库
 * 解析和索引 MD 文件作为知识库
 */
const fs = require('fs').promises;
const path = require('path');
const db = require('../../db/init').getDatabase();
const config = require('../config');

/**
 * 同步 MD 知识库
 * 扫描指定目录的 MD 文件并入库
 */
async function sync() {
  const rootDir = path.resolve(__dirname, '../../../..');
  const kbDir = path.join(rootDir, config.knowledge.mdDir);

  const stats = { total: 0, success: 0, failed: 0 };

  try {
    await fs.access(kbDir);
  } catch {
    // 目录不存在，创建空目录
    await fs.mkdir(kbDir, { recursive: true });
    return stats;
  }

  // 递归扫描 MD 文件
  const files = await scanDir(kbDir);

  for (const file of files) {
    stats.total++;
    try {
      const content = await fs.readFile(file, 'utf-8');
      const doc = parseMarkdown(file, content);

      // 存入数据库
      const database = db.getDatabase();

      // 检查是否已存在
      const existing = database.exec(`
        SELECT id FROM kb_documents WHERE file_path = '${doc.file_path}'
      `);

      if (existing.length && existing[0].values.length) {
        // 更新
        database.exec(`
          UPDATE kb_documents
          SET title = '${escape(doc.title)}',
              content = '${escape(doc.content)}',
              tags = '${escape(doc.tags)}',
              updated_at = datetime('now')
          WHERE file_path = '${doc.file_path}'
        `);
      } else {
        // 新增
        const id = generateId();
        database.exec(`
          INSERT INTO kb_documents (id, title, content, file_path, tags)
          VALUES ('${id}', '${escape(doc.title)}', '${escape(doc.content)}', '${escape(doc.file_path)}', '${escape(doc.tags)}')
        `);
      }

      stats.success++;
    } catch (error) {
      console.error(`同步失败 ${file}:`, error.message);
      stats.failed++;
    }
  }

  return stats;
}

/**
 * 搜索知识库
 */
async function search(query, limit = 5) {
  const database = db.getDatabase();

  // 检查表是否存在
  const tables = database.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='kb_documents'");

  if (!tables.length || !tables[0].values.length) {
    return [];
  }

  // 模糊搜索
  const escapedQuery = escape(query);
  const results = database.exec(`
    SELECT id, title, content, file_path, tags
    FROM kb_documents
    WHERE title LIKE '%${escapedQuery}%'
       OR content LIKE '%${escapedQuery}%'
       OR tags LIKE '%${escapedQuery}%'
    LIMIT ${limit}
  `);

  if (!results.length || !results[0].values.length) {
    return [];
  }

  const columns = results[0].columns;
  return results[0].values.map(row => {
    const doc = {};
    columns.forEach((col, i) => doc[col] = row[i]);

    // 计算匹配次数作为相关度
    const regex = new RegExp(escape(query), 'gi');
    const matches = (doc.title.match(regex) || []).length +
                   (doc.content.match(regex) || []).length;

    return {
      id: doc.id,
      title: doc.title,
      content: doc.content,
      file_path: doc.file_path,
      tags: doc.tags,
      matches
    };
  });
}

/**
 * 获取知识库统计
 */
async function getStats() {
  const database = db.getDatabase();

  try {
    const result = database.exec('SELECT COUNT(*) as total FROM kb_documents');
    return { total: result[0].values[0][0] };
  } catch {
    return { total: 0 };
  }
}

/**
 * 解析 Markdown 文件
 */
function parseMarkdown(filePath, content) {
  const relativePath = path.relative(
    path.resolve(__dirname, '../../../..'),
    filePath
  );

  // 提取标题（第一个 # 标题）
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : path.basename(filePath, '.md');

  // 提取标签
  const tagsMatch = content.match(/tags?:\s*([^\n]+)/i);
  let tags = '';
  if (tagsMatch) {
    tags = tagsMatch[1].trim().replace(/[\[\]]/g, '').split(/[,，]/).map(t => t.trim()).join(',');
  }

  // 清理内容（移除 YAML front matter）
  let cleanContent = content
    .replace(/^---[\s\S]*?---\n/, '')  // 移除 front matter
    .replace(/^#\s+.+$/m, '')           // 移除标题行
    .replace(/^\s*<!--[\s\S]*?-->\s*/g, '') // 移除注释
    .trim();

  return {
    title,
    content: cleanContent.substring(0, 50000), // 限制长度
    file_path: relativePath.replace(/\\/g, '/'),
    tags
  };
}

/**
 * 递归扫描目录
 */
async function scanDir(dir) {
  const files = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        const subFiles = await scanDir(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`扫描目录失败 ${dir}:`, error.message);
  }

  return files;
}

/**
 * 生成简单 ID
 */
function generateId() {
  return 'kb_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * 转义 SQL 特殊字符
 */
function escape(str) {
  if (!str) return '';
  return String(str).replace(/'/g, "''");
}

module.exports = {
  sync,
  search,
  getStats,
  parseMarkdown
};
