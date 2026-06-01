import { showToast } from '../services/utils.js';
import { productsAPI } from '../api/index.js';
import { appState } from '../stores/appState.js';

class ProductManager {
    constructor(getToken, dataManager, previewManager) {
        this.getToken = getToken;
        this.dataManager = dataManager;
        this.previewManager = previewManager;
    }

    async viewProduct(id) {
        try {
            const product = await productsAPI.getById(id, this.getToken());
            const p = product.product || product;
            appState.setCurrentProduct(p);
            this.previewManager.open(p);
        } catch (err) {
            showToast('加载产品详情失败: ' + err.message, 'error');
        }
    }

    async editProduct(id) {
        try {
            const product = await productsAPI.getById(id, this.getToken());
            const p = product.product || product;

            document.getElementById('productId').value = id;
            document.getElementById('productSku').value = p.sku || '';
            document.getElementById('productName').value = p.name;
            document.getElementById('productSubtitle').value = p.subtitle || '';
            document.getElementById('productPrice').value = p.price || '';
            document.getElementById('productCurrency').value = p.currency || 'USD';
            document.getElementById('productStatus').value = p.status || 'draft';
            document.getElementById('modalTitle').textContent = '编辑产品';

            this.dataManager.renderDataList('Highlights', p.highlights || []);
            this.dataManager.renderDataList('Specs', p.specs || []);
            this.dataManager.renderDataList('Accessories', p.accessories || []);
            this.dataManager.renderDataList('Features', p.features || []);
            this.dataManager.renderDataList('Dimensions', p.dimensions || []);

            document.getElementById('productModal').classList.add('active');
        } catch (err) {
            showToast('加载产品失败', 'error');
        }
    }

    async deleteProduct(id) {
        if (!confirm('确定要删除这个产品吗？')) return;

        try {
            await productsAPI.delete(id, this.getToken());
            appState.removeProduct(id);
            if (window.app && window.app.loadProducts) {
                window.app.loadProducts();
            }
            showToast('删除成功');
        } catch (err) {
            showToast('删除失败', 'error');
        }
    }

    async handleProductSubmit(e) {
        e.preventDefault();

        const id = document.getElementById('productId').value;
        const productData = {
            sku: document.getElementById('productSku').value,
            name: document.getElementById('productName').value,
            subtitle: document.getElementById('productSubtitle').value,
            price: parseFloat(document.getElementById('productPrice').value) || null,
            currency: document.getElementById('productCurrency').value,
            status: document.getElementById('productStatus').value
        };

        try {
            if (id) {
                await productsAPI.update(id, productData, this.getToken());
                showToast('更新成功');
            } else {
                await productsAPI.create(productData, this.getToken());
                showToast('创建成功');
            }

            document.getElementById('productModal').classList.remove('active');
            if (window.app && window.app.loadProducts) {
                window.app.loadProducts();
            }
        } catch (err) {
            showToast('保存失败', 'error');
        }
    }
}

export { ProductManager };