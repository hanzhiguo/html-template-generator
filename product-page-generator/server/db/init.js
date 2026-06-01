const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'database.sqlite');
let db = null;

function run(sql, params = []) {
  try {
    db.run(sql, params);
    saveDatabase();
    return { lastInsertRowid: db.exec('SELECT last_insert_rowid()')[0]?.values[0][0], changes: db.getRowsModified() };
  } catch (err) {
    throw err;
  }
}

function get(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

async function initDatabase() {
  console.log('Initializing database...');

  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
    console.log('Loaded existing database');
  } else {
    db = new SQL.Database();
    console.log('Created new database');
  }

  db.run('PRAGMA foreign_keys = ON');

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      username        TEXT UNIQUE NOT NULL,
      password_hash   TEXT NOT NULL,
      email           TEXT,
      role            TEXT DEFAULT 'user',
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      name            TEXT NOT NULL,
      slug            TEXT UNIQUE,
      parent_id       INTEGER DEFAULT NULL,
      default_template_id INTEGER
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS templates (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      name            TEXT NOT NULL,
      slug            TEXT UNIQUE,
      category_id     INTEGER,
      primary_color   TEXT DEFAULT '#1e40af',
      accent_color    TEXT DEFAULT '#3b82f6',
      template_path   TEXT,
      description     TEXT,
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id         INTEGER NOT NULL,
      sku             TEXT,
      name            TEXT NOT NULL,
      subtitle        TEXT,
      description     TEXT,
      price           REAL,
      currency        TEXT DEFAULT 'USD',
      main_image      TEXT,
      dimension_image TEXT,
      category_id     INTEGER,
      template_id     INTEGER,
      md_document_path TEXT,
      status          TEXT DEFAULT 'draft',
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS product_images (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id      INTEGER NOT NULL,
      image_type      TEXT,
      image_url       TEXT,
      alt_text        TEXT,
      sort_order      INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS product_documents (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id      INTEGER NOT NULL,
      doc_type        TEXT,
      title           TEXT,
      file_path       TEXT,
      file_size       INTEGER DEFAULT 0,
      mime_type       TEXT DEFAULT '',
      link_type       TEXT DEFAULT 'upload',
      sort_order      INTEGER DEFAULT 0
    )
  `);

  const docColumns = db.exec("PRAGMA table_info('product_documents')");
  if (docColumns.length > 0) {
    const columns = docColumns[0].values.map(v => v[1]);
    if (!columns.includes('file_size')) {
      db.run("ALTER TABLE product_documents ADD COLUMN file_size INTEGER DEFAULT 0");
    }
    if (!columns.includes('mime_type')) {
      db.run("ALTER TABLE product_documents ADD COLUMN mime_type TEXT DEFAULT ''");
    }
    if (!columns.includes('link_type')) {
      db.run("ALTER TABLE product_documents ADD COLUMN link_type TEXT DEFAULT 'upload'");
    }
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS product_highlights (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id      INTEGER NOT NULL,
      highlight_key   TEXT NOT NULL,
      highlight_value TEXT,
      icon_svg        TEXT,
      sort_order      INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS product_specs (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id      INTEGER NOT NULL,
      spec_label      TEXT NOT NULL,
      spec_value      TEXT NOT NULL,
      spec_unit       TEXT,
      spec_group      TEXT,
      sort_order      INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS product_accessories (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id      INTEGER NOT NULL,
      accessory_name  TEXT NOT NULL,
      quantity        INTEGER DEFAULT 1,
      is_included     INTEGER DEFAULT 1,
      sort_order      INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS product_features (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id      INTEGER NOT NULL,
      feature_title   TEXT NOT NULL,
      feature_value   TEXT,
      icon_emoji      TEXT,
      description     TEXT,
      sort_order      INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS product_dimensions (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id      INTEGER NOT NULL,
      dim_label       TEXT NOT NULL,
      dim_value       TEXT NOT NULL,
      dim_unit        TEXT,
      dim_category    TEXT DEFAULT 'dimensions',
      sort_order      INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS agent_conversations (
      id              TEXT PRIMARY KEY,
      user_id         INTEGER NOT NULL,
      title           TEXT,
      provider        TEXT DEFAULT 'ollama',
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS agent_messages (
      id              TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role            TEXT NOT NULL,
      content         TEXT NOT NULL,
      tool_calls      TEXT,
      tool_results    TEXT,
      model           TEXT,
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES agent_conversations(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS kb_documents (
      id              TEXT PRIMARY KEY,
      title           TEXT NOT NULL,
      content         TEXT NOT NULL,
      file_path       TEXT,
      tags            TEXT,
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS agent_tool_logs (
      id              TEXT PRIMARY KEY,
      message_id      TEXT NOT NULL,
      tool_name       TEXT NOT NULL,
      arguments       TEXT,
      result          TEXT,
      duration_ms     INTEGER,
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (message_id) REFERENCES agent_messages(id)
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_agent_conv_user ON agent_conversations(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_agent_conv_updated ON agent_conversations(updated_at)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_agent_messages_conv ON agent_messages(conversation_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_agent_kb_search ON kb_documents(title, content, tags)`);

  const templateCount = all('SELECT COUNT(*) as count FROM templates')[0]?.count || 0;
  if (templateCount === 0) {
    console.log('Inserting default templates...');
    run(`INSERT INTO templates (name, slug, primary_color, accent_color, description)
        VALUES ('默认产品页', 'default', '#1e40af', '#3b82f6', '通用产品详情页模板')`);
    run(`INSERT INTO templates (name, slug, primary_color, accent_color, description)
        VALUES ('工业风格', 'industrial', '#374151', '#6b7280', '工业风格模板')`);
    run(`INSERT INTO templates (name, slug, primary_color, accent_color, description)
        VALUES ('科技风格', 'tech', '#0f172a', '#06b6d4', '科技风格模板')`);
    run(`INSERT INTO templates (name, slug, primary_color, accent_color, description)
        VALUES ('简约风格', 'minimal', '#1f2937', '#10b981', '简约风格模板')`);
  }

  const categoryCount = all('SELECT COUNT(*) as count FROM categories')[0]?.count || 0;
  if (categoryCount === 0) {
    console.log('Inserting default categories...');
    run(`INSERT INTO categories (name, slug, default_template_id) VALUES ('通用产品', 'general', 1)`);
    run(`INSERT INTO categories (name, slug, default_template_id) VALUES ('工业设备', 'industrial', 2)`);
    run(`INSERT INTO categories (name, slug, default_template_id) VALUES ('电子产品', 'electronics', 3)`);
    run(`INSERT INTO categories (name, slug, default_template_id) VALUES ('家居用品', 'home', 4)`);
  }

  const userCount = all('SELECT COUNT(*) as count FROM users')[0]?.count || 0;
  if (userCount === 0) {
    console.log('Creating default admin user...');
    const passwordHash = bcrypt.hashSync('admin123', 10);
    run(`INSERT INTO users (username, password_hash, email, role)
        VALUES (?, ?, ?, ?)`, ['admin', passwordHash, 'admin@example.com', 'admin']);
    console.log('Default admin created: admin / admin123');
  }

  saveDatabase();
  console.log('Database initialized successfully!');
  console.log('Tables: products, product_highlights, product_specs, product_accessories, product_features, product_dimensions');
  console.log('Agent Tables: agent_conversations, agent_messages, kb_documents, agent_tool_logs');
}

function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

function getDb() {
  return { run, get, all, raw: db };
}

function getDatabase() {
  return db;
}

module.exports = { initDatabase, getDb, getDatabase, saveDatabase };
