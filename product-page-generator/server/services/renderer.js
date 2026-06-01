const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');
const { getDb } = require('../db/init');

// 注册 Handlebars helpers
Handlebars.registerHelper('eq', function(a, b) {
  return a === b;
});

Handlebars.registerHelper('ne', function(a, b) {
  return a !== b;
});

Handlebars.registerHelper('gt', function(a, b) {
  return a > b;
});

Handlebars.registerHelper('or', function(...args) {
  return args.slice(0, -1).some(v => !!v);
});

Handlebars.registerHelper('and', function(...args) {
  return args.slice(0, -1).every(v => !!v);
});

Handlebars.registerHelper('default', function(value, defaultValue) {
  return value || defaultValue;
});

Handlebars.registerHelper('encodeURIComponent', function(str) {
  return encodeURIComponent(str || '');
});

function getProductFullData(productId, userId) {
  const db = getDb();

  const product = db.get('SELECT * FROM products WHERE id = ? AND user_id = ?', [productId, userId]);
  if (!product) {
    throw new Error('产品不存在');
  }

  // 5大类产品数据
  const highlights = db.all('SELECT * FROM product_highlights WHERE product_id = ?', [productId]);
  const specs = db.all('SELECT * FROM product_specs WHERE product_id = ?', [productId]);
  const accessories = db.all('SELECT * FROM product_accessories WHERE product_id = ?', [productId]);
  const features = db.all('SELECT * FROM product_features WHERE product_id = ?', [productId]);
  const dimensions = db.all('SELECT * FROM product_dimensions WHERE product_id = ?', [productId]);
  const images = db.all('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order ASC', [productId]);

  const template = product.template_id
    ? db.get('SELECT * FROM templates WHERE id = ?', [product.template_id])
    : db.get('SELECT * FROM templates WHERE slug = ?', ['default']);

  const category = product.category_id
    ? db.get('SELECT * FROM categories WHERE id = ?', [product.category_id])
    : null;

  return {
    product,
    highlights,
    specs,
    accessories,
    features,
    dimensions,
    images,
    template,
    category,
    theme: {
      primary_color: template?.primary_color || '#1e40af',
      accent_color: template?.accent_color || '#3b82f6'
    }
  };
}

function renderHTML(productData, templateSlug) {
  let templatePath;

  if (templateSlug) {
    templatePath = path.join(__dirname, '..', 'templates', `product-${templateSlug}.html`);
  } else if (productData.template?.template_path) {
    templatePath = path.join(__dirname, '..', 'templates', productData.template.template_path);
  } else if (productData.template?.slug) {
    templatePath = path.join(__dirname, '..', 'templates', `product-${productData.template.slug}.html`);
  } else {
    templatePath = path.join(__dirname, '..', 'templates', 'product-default.html');
  }

  const possiblePaths = [
    templatePath,
    path.join(__dirname, '..', 'templates', 'product-default.html'),
    path.join(__dirname, '..', 'templates', 'product.html')
  ];

  let templateContent = '';
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      templateContent = fs.readFileSync(p, 'utf-8');
      break;
    }
  }

  if (!templateContent) {
    throw new Error('未找到模板文件');
  }

  const template = Handlebars.compile(templateContent);
  return template(productData);
}

module.exports = { getProductFullData, renderHTML };