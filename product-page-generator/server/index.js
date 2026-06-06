require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { initDatabase } = require('./db/init');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API路由放在静态文件之前，避免被拦截
const authRoutes = require('./routes/auth');
const productsRoutes = require('./routes/products');
const templatesRoutes = require('./routes/templates');
const generateRoutes = require('./routes/generate');
const markdownRoutes = require('./routes/markdown');
const exportRoutes = require('./routes/export');
const imagesRoutes = require('./routes/images');
const documentsRoutes = require('./routes/documents');
const agentRoutes = require('./routes/agent');
const settingsRoutes = require('./routes/settings');
const iconsRoutes = require('./routes/icons');
const translateRoutes = require('./routes/translate');
const ocrRoutes = require('./routes/ocr');
const productCreateRoutes = require('./routes/product-create');
const imageToProductRoutes = require('./routes/image-to-product');
const mainImageRoutes = require('./routes/main-image');
const logosRoutes = require('./routes/logos');
const imageClassifyRoutes = require('./routes/image-classify');

app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/markdown', markdownRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/images', imagesRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/icons', iconsRoutes);
app.use('/api', translateRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/products', productCreateRoutes);
app.use('/api/image-to-product', imageToProductRoutes);
app.use('/api/main-image', mainImageRoutes);
app.use('/api/logos', logosRoutes);
app.use('/api/image-classify', imageClassifyRoutes);

// 静态文件
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

async function start() {
  try {
    await initDatabase();

    const HOST = process.env.HOST || '0.0.0.0';

    app.listen(PORT, HOST, () => {
      // 获取本机局域网IP
      const os = require('os');
      const nets = os.networkInterfaces();
      let localIP = 'localhost';
      for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
          if (net.family === 'IPv4' && !net.internal) {
            localIP = net.address;
            break;
          }
        }
        if (localIP !== 'localhost') break;
      }

      console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   产品详情页AI生成系统已启动                              ║
║                                                          ║
║   本地地址:   http://localhost:${PORT}                      ║
║   网络地址:   http://${localIP}:${PORT}                      ║
║                                                          ║
║   默认管理员: admin / admin123                           ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (err) {
    console.error('启动失败:', err);
    process.exit(1);
  }
}

start();