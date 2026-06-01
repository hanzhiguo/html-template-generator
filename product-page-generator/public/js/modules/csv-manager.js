import { showToast, escapeHtml } from '../services/utils.js';

class CsvManager {
    constructor(getToken) {
        this.getToken = getToken;
        this.importedCsvData = [];
    }

    openImportModal() {
        document.getElementById('importModal').classList.add('active');
        document.getElementById('csvPreview').classList.add('hidden');
        document.getElementById('csvFileInput').value = '';
        this.importedCsvData = [];
    }

    closeImportModal() {
        document.getElementById('importModal').classList.remove('active');
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            this.parseAndPreviewCsv(e.target.result);
        };
        reader.readAsText(file, 'UTF-8');
    }

    parseAndPreviewCsv(content) {
        const lines = content.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            showToast('CSV文件数据不足', 'error');
            return;
        }

        const headers = this.parseCSVLine(lines[0]);
        const rows = [];

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            const row = {};
            headers.forEach((h, idx) => {
                row[h] = values[idx] || '';
            });
            rows.push(row);
        }

        const requiredCols = ['产品ID', 'SKU', '产品名称', '数据类型', '项目', '值'];
        const missing = requiredCols.filter(col => !headers.includes(col));
        if (missing.length > 0) {
            showToast(`缺少必需列: ${missing.join(', ')}`, 'error');
            return;
        }

        this.importedCsvData = rows;

        const previewHead = document.getElementById('csvPreviewHead');
        const previewBody = document.getElementById('csvPreviewBody');
        const statsDiv = document.getElementById('csvStats');

        previewHead.innerHTML = `<tr>${headers.map(h => `<th style="padding:8px;border:1px solid #e2e8f0;">${h}</th>`).join('')}</tr>`;

        previewBody.innerHTML = rows.slice(0, 5).map(row => `
            <tr>${headers.map(h => `<td style="padding:8px;border:1px solid #e2e8f0;font-size:12px;">${escapeHtml(row[h] || '')}</td>`).join('')}</tr>
        `).join('');

        if (rows.length > 5) {
            previewBody.innerHTML += `<tr><td colspan="${headers.length}" style="padding:8px;text-align:center;color:#94a3b8;">... 还有 ${rows.length - 5} 行数据</td></tr>`;
        }

        const products = [...new Set(rows.map(r => r['产品名称']))];
        const categories = {};
        rows.forEach(r => {
            const cat = r['数据类型'];
            categories[cat] = (categories[cat] || 0) + 1;
        });

        statsDiv.innerHTML = `
            <span class="csv-stat-tag csv-stat-products">📦 ${products.length} 个产品</span>
            <span class="csv-stat-tag csv-stat-rows">📋 ${rows.length} 条数据</span>
            ${Object.entries(categories).map(([cat, count]) => `<span class="csv-stat-tag csv-stat-category">${cat}: ${count}</span>`).join('')}
        `;

        document.getElementById('csvPreview').classList.remove('hidden');
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    }

    async importCsvData() {
        if (!this.importedCsvData || this.importedCsvData.length === 0) {
            showToast('请先选择CSV文件', 'error');
            return;
        }

        const API_BASE = `${window.location.origin}/api`;
        try {
            const res = await fetch(`${API_BASE}/export/import/csv`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.getToken()}` },
                body: JSON.stringify({ products: this.importedCsvData })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                showToast(data.message, 'success');
                this.closeImportModal();
                if (window.app && window.app.loadProducts) {
                    window.app.loadProducts();
                }
            } else {
                showToast(data.error || '导入失败', 'error');
            }
        } catch (err) {
            showToast('网络错误', 'error');
        }
    }

    downloadTemplate() {
        const template = `产品ID,SKU,产品名称,数据类型,项目,值
1,PROD-S001,示例产品名称,核心卖点,材质,不锈钢
1,PROD-S001,示例产品名称,产品规格,重量,10KG
1,PROD-S001,示例产品名称,包装清单,主机,1
1,PROD-S001,示例产品名称,功能亮点,易操作,简单上手
1,PROD-S001,示例产品名称,适配尺寸,高度,100CM`;

        const blob = new Blob(['\uFEFF' + template], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'product_template.csv';
        link.click();
    }

    async exportFullCsv() {
        const API_BASE = `${window.location.origin}/api`;
        showToast('正在导出完整数据...');
        try {
            const response = await fetch(`${API_BASE}/export/full/csv`, {
                headers: { 'Authorization': `Bearer ${this.getToken()}` }
            });
            if (!response.ok) throw new Error('导出失败');
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `products_full_${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('导出成功');
        } catch (err) {
            showToast('导出失败: ' + err.message, 'error');
        }
    }

    async exportSimpleCsv() {
        const API_BASE = `${window.location.origin}/api`;
        showToast('正在导出基础数据...');
        try {
            const response = await fetch(`${API_BASE}/export/csv`, {
                headers: { 'Authorization': `Bearer ${this.getToken()}` }
            });
            if (!response.ok) throw new Error('导出失败');
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `products_basic_${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('导出成功');
        } catch (err) {
            showToast('导出失败: ' + err.message, 'error');
        }
    }
}

export { CsvManager };