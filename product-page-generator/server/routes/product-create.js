/**
 * 产品创建API路由
 * 用于从图片添加产品功能
 */
const express = require('express');
const { getDb } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

const router = express.Router();

router.use(authMiddleware);

/**
 * POST /api/products/create-from-ocr
 * 根据OCR结果生成的产品信息创建产品
 * Body: { product: object }
 */
router.post('/create-from-ocr', async (req, res) => {
    try {
        const { product } = req.body;

        if (!product) {
            return res.status(400).json({ error: '请提供产品信息' });
        }

        const db = getDb();
        const { run, get } = db;

        // 生成SKU
        let sku = product.sku;
        if (!sku) {
            // 从名称生成简单的SKU
            sku = product.name ? product.name.substring(0, 10).toUpperCase().replace(/[^A-Z0-9]/g, '-') : 'PROD-' + Date.now();
        }

        // 检查SKU是否已存在
        const existing = get('SELECT id FROM products WHERE sku = ?', [sku]);

        let productId;

        if (existing) {
            // 更新现有产品
            run(`
                UPDATE products SET
                    name = COALESCE(?, name),
                    subtitle = ?,
                    description = ?,
                    price = COALESCE(?, price),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [
                product.name || null,
                product.subtitle || null,
                product.description || null,
                product.price || null,
                existing.id
            ]);
            productId = existing.id;
        } else {
            // 创建新产品
            run(`
                INSERT INTO products (user_id, sku, name, subtitle, description, price, currency, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                req.user.id,
                sku,
                product.name,
                product.subtitle || null,
                product.description || null,
                product.price || null,
                product.currency || 'USD',
                product.status || 'draft'
            ]);

            // 获取插入的产品ID
            const lastProduct = get('SELECT last_insert_rowid() as id FROM products');
            productId = lastProduct ? lastProduct.id : null;

            // 如果last_insert_rowid()不可用，从表中查询
            if (!productId) {
                const newest = get('SELECT id FROM products WHERE user_id = ? ORDER BY id DESC LIMIT 1', [req.user.id]);
                productId = newest ? newest.id : null;
            }
        }

        if (!productId) {
            throw new Error('无法创建产品');
        }

        // 清理并插入产品数据
        const dataTypes = ['highlights', 'specs', 'accessories', 'features', 'dimensions'];
        const tableMap = {
            highlights: 'product_highlights',
            specs: 'product_specs',
            accessories: 'product_accessories',
            features: 'product_features',
            dimensions: 'product_dimensions'
        };
        const fieldMap = {
            highlights: { key: 'highlight_key', value: 'highlight_value', icon: 'icon_svg' },
            specs: { label: 'spec_label', value: 'spec_value', unit: 'spec_unit' },
            accessories: { name: 'accessory_name', quantity: 'quantity' },
            features: { title: 'feature_title', desc: 'description' },
            dimensions: { label: 'dim_label', value: 'dim_value', unit: 'dim_unit' }
        };

        for (const dataType of dataTypes) {
            const tableName = tableMap[dataType];
            const fields = fieldMap[dataType];

            // 清理旧数据
            run(`DELETE FROM ${tableName} WHERE product_id = ?`, [productId]);

            const items = product[dataType] || [];
            if (Array.isArray(items)) {
                items.forEach((item, index) => {
                    let sql = `INSERT INTO ${tableName} (product_id, sort_order`;
                    let params = [productId, index];

                    for (const [field, colName] of Object.entries(fields)) {
                        if (item[field] !== undefined && item[field] !== null && item[field] !== '') {
                            sql += `, ${colName}`;
                            params.push(item[field]);
                        }
                    }

                    sql += ') VALUES (?' + ',?'.repeat(params.length - 1) + ')';
                    run(sql, params);
                });
            }
        }

        res.json({
            success: true,
            product_id: productId,
            sku: sku
        });

    } catch (error) {
        console.error('[Product Create] 创建产品失败:', error);
        res.status(500).json({
            error: '创建产品失败: ' + error.message
        });
    }
});

module.exports = router;
