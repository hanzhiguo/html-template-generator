const express = require('express');
const fs = require('fs');
const path = require('path');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const ICONS_DIR = path.join(__dirname, '..', '..', 'public', 'assets', 'icons');
const MANIFEST_PATH = path.join(ICONS_DIR, 'manifest.json');

router.use(authMiddleware);

function readManifest() {
  try {
    const data = fs.readFileSync(MANIFEST_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return { icons: {}, categories: {} };
  }
}

function writeManifest(manifest) {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
}

// 获取所有图标列表
router.get('/', (req, res) => {
  try {
    const manifest = readManifest();
    const { category, search } = req.query;

    let icons = Object.entries(manifest.icons).map(([id, info]) => ({
      id,
      ...info,
      url: `${manifest.basePath}/${info.file}`
    }));

    if (category) {
      icons = icons.filter(icon => icon.category === category);
    }

    if (search) {
      const q = search.toLowerCase();
      icons = icons.filter(icon =>
        icon.name.toLowerCase().includes(q) ||
        icon.nameEn.toLowerCase().includes(q) ||
        (icon.tags && icon.tags.some(t => t.toLowerCase().includes(q)))
      );
    }

    res.json({
      total: icons.length,
      icons,
      categories: getCategories()
    });
  } catch (err) {
    console.error('获取图标列表错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取单个图标
router.get('/:iconId', (req, res) => {
  try {
    const { iconId } = req.params;
    const manifest = readManifest();
    const icon = manifest.icons[iconId];

    if (!icon) {
      return res.status(404).json({ error: '图标不存在' });
    }

    res.json({
      id: iconId,
      ...icon,
      url: `${manifest.basePath}/${icon.file}`
    });
  } catch (err) {
    console.error('获取图标错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取分类列表
router.get('/categories/list', (req, res) => {
  try {
    res.json({ categories: getCategories() });
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

function getCategories() {
  const categoriesDir = path.join(ICONS_DIR, 'categories');
  if (!fs.existsSync(categoriesDir)) return [];

  const categories = [];
  const files = fs.readdirSync(categoriesDir).filter(f => f.endsWith('.json'));

  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(categoriesDir, file), 'utf-8'));
      categories.push(data);
    } catch (e) {}
  }

  return categories;
}

// 获取指定分类的推荐图标
router.get('/categories/:categoryId/recommended', (req, res) => {
  try {
    const { categoryId } = req.params;
    const categoryPath = path.join(ICONS_DIR, 'categories', `${categoryId}.json`);

    if (!fs.existsSync(categoryPath)) {
      return res.status(404).json({ error: '分类不存在' });
    }

    const category = JSON.parse(fs.readFileSync(categoryPath, 'utf-8'));
    const manifest = readManifest();

    const recommended = category.recommendedIcons.map(rec => {
      const iconInfo = manifest.icons[rec.id];
      return rec.iconInfo ? {
        ...rec,
        url: `${manifest.basePath}/${iconInfo.file}`
      } : null;
    }).filter(Boolean);

    res.json({
      category,
      recommended
    });
  } catch (err) {
    console.error('获取推荐图标错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 更新图标信息（名称、描述、标签等）
router.put('/:iconId', (req, res) => {
  try {
    const { iconId } = req.params;
    const manifest = readManifest();

    if (!manifest.icons[iconId]) {
      return res.status(404).json({ error: '图标不存在' });
    }

    const { name, nameEn, description, tags, category } = req.body;

    if (name) manifest.icons[iconId].name = name;
    if (nameEn) manifest.icons[iconId].nameEn = nameEn;
    if (description) manifest.icons[iconId].description = description;
    if (tags) manifest.icons[iconId].tags = tags;
    if (category) manifest.icons[iconId].category = category;

    writeManifest(manifest);
    manifest.lastUpdated = new Date().toISOString();

    res.json({
      message: '更新成功',
      icon: { id: iconId, ...manifest.icons[iconId] }
    });
  } catch (err) {
    console.error('更新图标错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
