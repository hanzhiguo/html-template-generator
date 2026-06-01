const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

async function resetAndImport() {
  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, 'server/db/database.sqlite');

  // 删除旧数据库
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('删除旧数据库');
  }

  // 创建新数据库
  db = new SQL.Database();

  // 执行初始化SQL
  db.run('PRAGMA foreign_keys = ON');

  // 创建表
  db.run('CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT UNIQUE, password_hash TEXT, email TEXT, role TEXT DEFAULT user, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)');
  db.run('CREATE TABLE products (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, sku TEXT, name TEXT, subtitle TEXT, description TEXT, price REAL, currency TEXT DEFAULT USD, main_image TEXT, dimension_image TEXT, category_id INTEGER, template_id INTEGER, md_document_path TEXT, status TEXT DEFAULT draft, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)');
  db.run('CREATE TABLE product_highlights (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER, highlight_key TEXT, highlight_value TEXT, icon_svg TEXT, sort_order INTEGER DEFAULT 0)');
  db.run('CREATE TABLE product_specs (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER, spec_label TEXT, spec_value TEXT, spec_unit TEXT, spec_group TEXT, sort_order INTEGER DEFAULT 0)');
  db.run('CREATE TABLE product_accessories (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER, accessory_name TEXT, quantity INTEGER DEFAULT 1, is_included INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0)');
  db.run('CREATE TABLE product_features (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER, feature_title TEXT, feature_value TEXT, icon_emoji TEXT, description TEXT, sort_order INTEGER DEFAULT 0)');
  db.run('CREATE TABLE product_dimensions (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER, dim_label TEXT, dim_value TEXT, dim_unit TEXT, dim_category TEXT DEFAULT dimensions, sort_order INTEGER DEFAULT 0)');

  // 创建默认管理员
  const passwordHash = bcrypt.hashSync('admin123', 10);
  db.run('INSERT INTO users (username, password_hash, email, role) VALUES (?, ?, ?, ?)', ['admin', passwordHash, 'admin@example.com', 'admin']);

  console.log('数据库已重建');

  // 产品1: Smart Fitness Cross Trainer
  db.run('INSERT INTO products (user_id, sku, name, status) VALUES (?, ?, ?, ?)', [1, 'PROD-S004', 'Smart Fitness Cross Trainer', 'draft']);
  const p1Id = db.exec('SELECT last_insert_rowid()')[0].values[0][0];

  const highlights1 = [
    ['Digital Display', 'Real-time Tracking'],
    ['Ergonomic Design', 'Comfortable Grip'],
    ['Silent Operation', 'Smooth Movement'],
    ['12 Resistance Levels', 'Customizable Workout']
  ];
  highlights1.forEach(([k, v]) => db.run('INSERT INTO product_highlights (product_id, highlight_key, highlight_value) VALUES (?, ?, ?)', [p1Id, k, v]));

  const specs1 = [
    ['Type', 'Elliptical Trainer', ''],
    ['Material', 'Steel & ABS', ''],
    ['Color', 'White/Gray', ''],
    ['Weight', '35', 'KG'],
    ['Max Load', '150', 'KG'],
    ['Flywheel', '8', 'KG'],
    ['Display', 'LCD Screen', ''],
    ['Power', 'Battery', 'Powered']
  ];
  specs1.forEach(([l, v, u]) => db.run('INSERT INTO product_specs (product_id, spec_label, spec_value, spec_unit) VALUES (?, ?, ?, ?)', [p1Id, l, v, u]));

  const accessories1 = ['Main Frame', 'Handlebars', 'Pedals', 'Console', 'Resistance Knob', 'Base Stabilizers', 'Assembly Tools', 'User Manual'];
  accessories1.forEach(a => db.run('INSERT INTO product_accessories (product_id, accessory_name, quantity) VALUES (?, ?, ?)', [p1Id, a, 1]));

  const features1 = [
    ['Full Body Workout', 'Engages multiple muscle groups'],
    ['Low Impact', 'Easy on joints'],
    ['Heart Rate Monitor', 'Built-in pulse sensors'],
    ['Compact Design', 'Fits small spaces'],
    ['Transport Wheels', 'Easy to move']
  ];
  features1.forEach(([t, d]) => db.run('INSERT INTO product_features (product_id, feature_title, description) VALUES (?, ?, ?)', [p1Id, t, d]));

  const dims1 = [['Dimensions', '120 x 60 x 150', 'CM'], ['Stride Length', '35', 'CM'], ['Pedal Size', '40 x 15', 'CM']];
  dims1.forEach(([l, v, u]) => db.run('INSERT INTO product_dimensions (product_id, dim_label, dim_value, dim_unit) VALUES (?, ?, ?, ?)', [p1Id, l, v, u]));

  // 产品2: Heavy Duty Weight Bench
  db.run('INSERT INTO products (user_id, sku, name, status) VALUES (?, ?, ?, ?)', [1, 'PROD-S005', 'Heavy Duty Weight Bench', 'draft']);
  const p2Id = db.exec('SELECT last_insert_rowid()')[0].values[0][0];

  const highlights2 = [['Professional Grade', 'Commercial Quality'], ['Adjustable Positions', 'Multiple Angles'], ['Non-slip Surface', 'Safe Workout'], ['500KG Capacity', 'Ultra Strong']];
  highlights2.forEach(([k, v]) => db.run('INSERT INTO product_highlights (product_id, highlight_key, highlight_value) VALUES (?, ?, ?)', [p2Id, k, v]));

  const specs2 = [['Type', 'Weight Bench', ''], ['Material', 'Steel Frame', ''], ['Color', 'Black', ''], ['Weight', '22', 'KG'], ['Max Load', '500', 'KG'], ['Pad Thickness', '5', 'CM'], ['Adjustment', '7', 'Positions'], ['Incline Range', '0-90', 'Degrees']];
  specs2.forEach(([l, v, u]) => db.run('INSERT INTO product_specs (product_id, spec_label, spec_value, spec_unit) VALUES (?, ?, ?, ?)', [p2Id, l, v, u]));

  const accessories2 = ['Bench Frame', 'Back Pad', 'Seat Pad', 'Leg Developer', 'Spotter Platform', 'Bar Holder', 'Adjustment Pin', 'Warranty Card'];
  accessories2.forEach(a => db.run('INSERT INTO product_accessories (product_id, accessory_name, quantity) VALUES (?, ?, ?)', [p2Id, a, 1]));

  const features2 = [['Flat Bench Press', 'Standard exercises'], ['Incline Press', 'Upper chest target'], ['Decline Press', 'Lower chest focus'], ['Leg Curl', 'Hamstring training'], ['Preacher Curl', 'Arm isolation']];
  features2.forEach(([t, d]) => db.run('INSERT INTO product_features (product_id, feature_title, description) VALUES (?, ?, ?)', [p2Id, t, d]));

  const dims2 = [['Overall Size', '130 x 60 x 110', 'CM'], ['Pad Size', '90 x 30', 'CM'], ['Min Height', '50', 'CM']];
  dims2.forEach(([l, v, u]) => db.run('INSERT INTO product_dimensions (product_id, dim_label, dim_value, dim_unit) VALUES (?, ?, ?, ?)', [p2Id, l, v, u]));

  // 产品3: Adjustable Dumbbell Set
  db.run('INSERT INTO products (user_id, sku, name, status) VALUES (?, ?, ?, ?)', [1, 'PROD-S006', 'Adjustable Dumbbell Set', 'draft']);
  const p3Id = db.exec('SELECT last_insert_rowid()')[0].values[0][0];

  const highlights3 = [['Space Saving Design', 'Compact Storage'], ['Quick Lock System', '5-25KG Range'], ['Premium Grip', 'Anti-slip Coating'], ['Durable Construction', 'Long Life']];
  highlights3.forEach(([k, v]) => db.run('INSERT INTO product_highlights (product_id, highlight_key, highlight_value) VALUES (?, ?, ?)', [p3Id, k, v]));

  const specs3 = [['Type', 'Adjustable Dumbbells', ''], ['Material', 'Steel + Plastic', ''], ['Color', 'Black/Red', ''], ['Weight Range', '2.5-25', 'KG each'], ['Increment', '2.5', 'KG'], ['Total Weight', '50', 'KG set'], ['Grip Length', '15', 'CM'], ['Coating', 'Rubber', '']];
  specs3.forEach(([l, v, u]) => db.run('INSERT INTO product_specs (product_id, spec_label, spec_value, spec_unit) VALUES (?, ?, ?, ?)', [p3Id, l, v, u]));

  const accessories3 = ['Left Dumbbell', 'Right Dumbbell', 'Weight Plates x 40', 'Lock Collars x 4', 'Storage Rack', 'Exercise Guide'];
  accessories3.forEach(a => db.run('INSERT INTO product_accessories (product_id, accessory_name, quantity) VALUES (?, ?, ?)', [p3Id, a, 1]));

  const features3 = [['Quick Adjust', '2 second change'], ['Compact Storage', '60% less space'], ['Versatile', 'Full body workout'], ['Safe Lock', 'No accidental drops'], ['Home Friendly', 'Perfect for apartments']];
  features3.forEach(([t, d]) => db.run('INSERT INTO product_features (product_id, feature_title, description) VALUES (?, ?, ?)', [p3Id, t, d]));

  const dims3 = [['Single Dumbbell', '25 x 15 x 15', 'CM'], ['Storage Rack', '60 x 30 x 50', 'CM'], ['Bar Diameter', '30', 'MM']];
  dims3.forEach(([l, v, u]) => db.run('INSERT INTO product_dimensions (product_id, dim_label, dim_value, dim_unit) VALUES (?, ?, ?, ?)', [p3Id, l, v, u]));

  // 产品4: Treadmill Running Machine
  db.run('INSERT INTO products (user_id, sku, name, status) VALUES (?, ?, ?, ?)', [1, 'PROD-S007', 'Treadmill Running Machine', 'draft']);
  const p4Id = db.exec('SELECT last_insert_rowid()')[0].values[0][0];

  const highlights4 = [['Powerful Motor', '3.0HP Peak'], ['Shock Absorption', 'Joint Protection'], ['LED Display', 'Clear Metrics'], ['Foldable Design', 'Space Saving']];
  highlights4.forEach(([k, v]) => db.run('INSERT INTO product_highlights (product_id, highlight_key, highlight_value) VALUES (?, ?, ?)', [p4Id, k, v]));

  const specs4 = [['Type', 'Treadmill', ''], ['Running Surface', '120 x 45', 'CM'], ['Speed Range', '0.8-16', 'KM/H'], ['Incline', '0-15', '%'], ['Motor Power', '1.5', 'HP Continuous'], ['Weight Capacity', '130', 'KG'], ['Console', '6 Inch LCD', ''], ['Programs', '36', 'Preset']];
  specs4.forEach(([l, v, u]) => db.run('INSERT INTO product_specs (product_id, spec_label, spec_value, spec_unit) VALUES (?, ?, ?, ?)', [p4Id, l, v, u]));

  const accessories4 = ['Treadmill Unit', 'Console Panel', 'Safety Key', 'Silicone Oil', 'Assembly Kit', 'User Manual', 'Warranty Card', 'Heart Rate Sensor'];
  accessories4.forEach(a => db.run('INSERT INTO product_accessories (product_id, accessory_name, quantity) VALUES (?, ?, ?)', [p4Id, a, 1]));

  const features4 = [['Speed Control', 'Key or touch'], ['Incline Adjust', 'Button control'], ['Heart Rate', 'Hand grip sensors'], ['Auto Lubrication', 'Self-maintaining'], ['Safety Stop', 'Emergency button']];
  features4.forEach(([t, d]) => db.run('INSERT INTO product_features (product_id, feature_title, description) VALUES (?, ?, ?)', [p4Id, t, d]));

  const dims4 = [['Folded Size', '80 x 70 x 150', 'CM'], ['Running Belt', '120 x 45', 'CM'], ['Console Height', '150', 'CM']];
  dims4.forEach(([l, v, u]) => db.run('INSERT INTO product_dimensions (product_id, dim_label, dim_value, dim_unit) VALUES (?, ?, ?, ?)', [p4Id, l, v, u]));

  // 保存数据库
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));

  console.log('数据导入完成！4个产品已创建，每个产品包含5大数据类别。');

  db.close();
}

resetAndImport().catch(console.error);
