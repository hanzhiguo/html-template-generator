-- Agent 模块数据库迁移脚本
-- 运行方式：在 db/init.js 中导入执行

-- 1. 会话表
CREATE TABLE IF NOT EXISTS agent_conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT,
  provider TEXT DEFAULT 'ollama',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 2. 消息表
CREATE TABLE IF NOT EXISTS agent_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  tool_calls TEXT,
  tool_results TEXT,
  model TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES agent_conversations(id)
);

-- 3. 知识库表（MD文档索引）
CREATE TABLE IF NOT EXISTS kb_documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  file_path TEXT,
  tags TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. 工具调用日志表
CREATE TABLE IF NOT EXISTS agent_tool_logs (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  arguments TEXT,
  result TEXT,
  duration_ms INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES agent_messages(id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_conversations_user ON agent_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON agent_conversations(updated_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON agent_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_kb_search ON kb_documents(title, content, tags);
