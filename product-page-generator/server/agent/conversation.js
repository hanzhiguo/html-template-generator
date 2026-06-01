/**
 * 会话管理
 * 管理 Agent 对话历史
 */
const db = require('../db/init');

/**
 * 创建新会话
 */
function createConversation(userId, provider = 'ollama') {
  const database = db.getDatabase();
  const id = generateId();

  database.exec(`
    INSERT INTO agent_conversations (id, user_id, title, provider)
    VALUES ('${id}', '${userId}', '新对话', '${provider}')
  `);

  return { id, title: '新对话', provider };
}

/**
 * 获取用户会话列表
 */
function getConversations(userId) {
  const database = db.getDatabase();

  const result = database.exec(`
    SELECT c.id, c.title, c.provider, c.created_at, c.updated_at,
           (SELECT COUNT(*) FROM agent_messages m WHERE m.conversation_id = c.id AND m.role IN ('user', 'assistant')) as message_count
    FROM agent_conversations c
    WHERE c.user_id = '${userId}'
    ORDER BY c.updated_at DESC
    LIMIT 50
  `);

  if (!result.length || !result[0].values.length) {
    return [];
  }

  const columns = result[0].columns;
  return result[0].values.map(row => {
    const obj = {};
    columns.forEach((col, i) => obj[col] = row[i]);
    return obj;
  });
}

/**
 * 获取会话详情
 */
function getConversation(id) {
  const database = db.getDatabase();

  const result = database.exec(`
    SELECT * FROM agent_conversations WHERE id = '${id}'
  `);

  if (!result.length || !result[0].values.length) {
    return null;
  }

  const columns = result[0].columns;
  const conv = {};
  columns.forEach((col, i) => conv[col] = result[0].values[0][i]);

  return conv;
}

/**
 * 更新会话标题
 */
function updateTitle(id, title) {
  const database = db.getDatabase();

  database.exec(`
    UPDATE agent_conversations
    SET title = '${escape(title)}',
        updated_at = datetime('now')
    WHERE id = '${id}'
  `);
}

/**
 * 删除会话
 */
function deleteConversation(id) {
  const database = db.getDatabase();

  // 删除消息
  database.exec(`DELETE FROM agent_messages WHERE conversation_id = '${id}'`);

  // 删除会话
  database.exec(`DELETE FROM agent_conversations WHERE id = '${id}'`);
}

/**
 * 获取会话消息历史
 */
function getMessages(conversationId) {
  const database = db.getDatabase();

  const result = database.exec(`
    SELECT * FROM agent_messages
    WHERE conversation_id = '${conversationId}'
    ORDER BY created_at ASC
  `);

  if (!result.length || !result[0].values.length) {
    return [];
  }

  const columns = result[0].columns;
  return result[0].values.map(row => {
    const msg = {};
    columns.forEach((col, i) => {
      msg[col] = row[i];
      // 解析 JSON 字段
      if (col === 'tool_calls' || col === 'tool_results') {
        try {
          msg[col] = JSON.parse(row[i] || '[]');
        } catch {
          msg[col] = [];
        }
      }
    });
    return msg;
  });
}

/**
 * 添加消息
 */
function addMessage(conversationId, role, content, options = {}) {
  const database = db.getDatabase();
  const id = generateId();

  const toolCalls = options.tool_calls ? JSON.stringify(options.tool_calls) : null;
  const toolResults = options.tool_results ? JSON.stringify(options.tool_results) : null;
  const model = options.model || null;

  database.exec(`
    INSERT INTO agent_messages (id, conversation_id, role, content, tool_calls, tool_results, model)
    VALUES ('${id}', '${conversationId}', '${role}', '${escape(content)}', ${toolCalls ? `'${escape(toolCalls)}'` : 'NULL'}, ${toolResults ? `'${escape(toolResults)}'` : 'NULL'}, ${model ? `'${model}'` : 'NULL'})
  `);

  // 更新会话时间
  database.exec(`
    UPDATE agent_conversations SET updated_at = datetime('now') WHERE id = '${conversationId}'
  `);

  return { id };
}

/**
 * 生成 ID
 */
function generateId() {
  return 'msg_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * 转义
 */
function escape(str) {
  if (!str) return '';
  return String(str).replace(/'/g, "''");
}

module.exports = {
  createConversation,
  getConversations,
  getConversation,
  updateTitle,
  deleteConversation,
  getMessages,
  addMessage
};
