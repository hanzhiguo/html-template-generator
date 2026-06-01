import { showToast, escapeHtml } from '../services/utils.js';
import { productsAPI } from '../api/index.js';

class DataManager {
    constructor(getToken) {
        this.getToken = getToken;
    }

    clearAllDataLists() {
        ['Highlights', 'Specs', 'Accessories', 'Features', 'Dimensions'].forEach(type => {
            const el = document.getElementById('list' + type);
            if (el) el.innerHTML = '';
        });
    }

    renderDataList(type, items) {
        const container = document.getElementById('list' + type);
        if (!container) return;
        if (!items.length) {
            container.innerHTML = '<div style="color:#94a3b8;font-size:13px;padding:8px;">暂无数据</div>';
            return;
        }
        container.innerHTML = items.map((item, i) => {
            const id = item.id || 'new_' + i;
            const fields = this.getFieldsByType(type, item);
            return `
                <div class="data-row" data-id="${id}" data-type="${type.toLowerCase()}">
                    ${fields.map(f => `<input type="text" value="${escapeHtml(f.value)}" placeholder="${f.placeholder}" data-field="${f.field}">`).join('')}
                    <div class="data-actions">
                        <button type="button" class="btn-icon-sm btn-save-sm" onclick="app.dataManager.saveDataItem('${type.toLowerCase()}', '${id}')">✓</button>
                        <button type="button" class="btn-icon-sm btn-del-sm" onclick="app.dataManager.delDataItem('${type.toLowerCase()}', '${id}')">×</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    getFieldsByType(type, item) {
        const fields = {
            Highlights: [
                { field: 'highlight_key', value: item.highlight_key || '', placeholder: '属性名称' },
                { field: 'highlight_value', value: item.highlight_value || '', placeholder: '属性值' }
            ],
            Specs: [
                { field: 'spec_label', value: item.spec_label || '', placeholder: '规格名称' },
                { field: 'spec_value', value: item.spec_value || '', placeholder: '规格值' },
                { field: 'spec_unit', value: item.spec_unit || '', placeholder: '单位' }
            ],
            Accessories: [
                { field: 'accessory_name', value: item.accessory_name || '', placeholder: '配件名称' },
                { field: 'quantity', value: item.quantity || 1, placeholder: '数量' }
            ],
            Features: [
                { field: 'icon_emoji', value: item.icon_emoji || '', placeholder: '图标' },
                { field: 'feature_title', value: item.feature_title || '', placeholder: '功能标题' },
                { field: 'description', value: item.description || '', placeholder: '描述' }
            ],
            Dimensions: [
                { field: 'dim_label', value: item.dim_label || '', placeholder: '尺寸名称' },
                { field: 'dim_value', value: item.dim_value || '', placeholder: '尺寸值' },
                { field: 'dim_unit', value: item.dim_unit || '', placeholder: '单位' }
            ]
        };
        return fields[type] || [];
    }

    async saveDataItem(type, id) {
        const row = document.querySelector(`.data-row[data-id="${id}"]`);
        if (!row) return;
        const inputs = row.querySelectorAll('input');
        const data = {};
        const productId = document.getElementById('productId').value;
        if (!productId) { showToast('请先保存产品基本信息', 'error'); return; }

        if (type === 'highlights') {
            data.highlight_key = inputs[0].value;
            data.highlight_value = inputs[1].value;
        } else if (type === 'specs') {
            data.spec_label = inputs[0].value;
            data.spec_value = inputs[1].value;
            data.spec_unit = inputs[2].value;
        } else if (type === 'accessories') {
            data.accessory_name = inputs[0].value;
            data.quantity = parseInt(inputs[1].value) || 1;
        } else if (type === 'features') {
            data.icon_emoji = inputs[0].value;
            data.feature_title = inputs[1].value;
            data.description = inputs[2].value;
        } else if (type === 'dimensions') {
            data.dim_label = inputs[0].value;
            data.dim_value = inputs[1].value;
            data.dim_unit = inputs[2].value;
        }

        try {
            const API_BASE = `${window.location.origin}/api`;
            const token = this.getToken();
            if (id.startsWith('new_')) {
                const res = await fetch(`${API_BASE}/products/${productId}/${type}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(data)
                });
                if (res.ok) { showToast('添加成功', 'success'); await this.loadProductData(productId); }
                else { showToast('添加失败', 'error'); }
            } else {
                const res = await fetch(`${API_BASE}/products/${productId}/${type}/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(data)
                });
                if (res.ok) { showToast('更新成功', 'success'); await this.loadProductData(productId); }
                else { showToast('更新失败', 'error'); }
            }
        } catch (err) { showToast('网络错误', 'error'); }
    }

    async delDataItem(type, id) {
        if (!confirm('确定删除?')) return;
        const productId = document.getElementById('productId').value;
        const API_BASE = `${window.location.origin}/api`;
        try {
            const res = await fetch(`${API_BASE}/products/${productId}/${type}/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.getToken()}` }
            });
            if (res.ok) { showToast('删除成功', 'success'); await this.loadProductData(productId); }
            else { showToast('删除失败', 'error'); }
        } catch (err) { showToast('网络错误', 'error'); }
    }

    async addDataItem(type) {
        const productId = document.getElementById('productId').value;
        if (!productId) { showToast('请先保存产品基本信息', 'error'); return; }

        const data = {};
        if (type === 'highlights') {
            data.highlight_key = document.getElementById('addHighlightKey').value;
            data.highlight_value = document.getElementById('addHighlightValue').value;
        } else if (type === 'specs') {
            data.spec_label = document.getElementById('addSpecLabel').value;
            data.spec_value = document.getElementById('addSpecValue').value;
            data.spec_unit = document.getElementById('addSpecUnit').value;
        } else if (type === 'accessories') {
            data.accessory_name = document.getElementById('addAccessoryName').value;
            data.quantity = parseInt(document.getElementById('addAccessoryQty').value) || 1;
        } else if (type === 'features') {
            data.icon_emoji = document.getElementById('addFeatureEmoji').value;
            data.feature_title = document.getElementById('addFeatureTitle').value;
            data.description = document.getElementById('addFeatureDesc').value;
        } else if (type === 'dimensions') {
            data.dim_label = document.getElementById('addDimLabel').value;
            data.dim_value = document.getElementById('addDimValue').value;
            data.dim_unit = document.getElementById('addDimUnit').value;
        }

        const API_BASE = `${window.location.origin}/api`;
        try {
            const res = await fetch(`${API_BASE}/products/${productId}/${type}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.getToken()}` },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                showToast('添加成功', 'success');
                this.hideAddForm(type.charAt(0).toUpperCase() + type.slice(1));
                await this.loadProductData(productId);
            } else {
                showToast('添加失败', 'error');
            }
        } catch (err) { showToast('网络错误', 'error'); }
    }

    async loadProductData(productId) {
        try {
            const product = await productsAPI.getById(productId, this.getToken());
            const p = product.product || product;
            this.renderDataList('Highlights', p.highlights || []);
            this.renderDataList('Specs', p.specs || []);
            this.renderDataList('Accessories', p.accessories || []);
            this.renderDataList('Features', p.features || []);
            this.renderDataList('Dimensions', p.dimensions || []);
        } catch (err) {
            showToast('加载产品数据失败', 'error');
        }
    }

    toggleSection(type) {
        const el = document.getElementById('section' + type);
        if (el) el.classList.toggle('collapsed');
    }

    showAddForm(type) {
        const el = document.getElementById('form' + type);
        if (el) el.classList.add('active');
    }

    hideAddForm(type) {
        const el = document.getElementById('form' + type);
        if (el) el.classList.remove('active');
        this.clearAddForm(type);
    }

    clearAddForm(type) {
        const prefix = {
            Highlights: { key: 'addHighlightKey', val: 'addHighlightValue' },
            Specs: { key: 'addSpecLabel', val: 'addSpecValue', unit: 'addSpecUnit' },
            Accessories: { key: 'addAccessoryName', val: 'addAccessoryQty' },
            Features: { key: 'addFeatureEmoji', val: 'addFeatureTitle', desc: 'addFeatureDesc' },
            Dimensions: { key: 'addDimLabel', val: 'addDimValue', unit: 'addDimUnit' }
        };
        const ids = prefix[type];
        if (ids) Object.values(ids).forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    }
}

export { DataManager };