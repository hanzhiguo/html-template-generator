export function openImportModal() {
    document.getElementById('importModal').classList.add('active');
}

export function closeImportModal() {
    document.getElementById('importModal').classList.remove('active');
    const preview = document.getElementById('csvPreview');
    if (preview) preview.classList.add('hidden');
}

export function showCsvPreview(headers, rows, stats) {
    const preview = document.getElementById('csvPreview');
    if (preview) preview.classList.remove('hidden');

    const headEl = document.getElementById('csvPreviewHead');
    if (headEl) {
        headEl.innerHTML = '<tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr>';
    }

    const bodyEl = document.getElementById('csvPreviewBody');
    if (bodyEl) {
        bodyEl.innerHTML = rows.map(row =>
            '<tr>' + row.map(cell => `<td>${cell || ''}</td>`).join('') + '</tr>'
        ).join('');
    }

    const statsEl = document.getElementById('csvStats');
    if (statsEl && stats) {
        statsEl.innerHTML = `
            <span class="csv-stat-tag csv-stat-products">📦 ${stats.productCount} 个产品</span>
            <span class="csv-stat-tag csv-stat-rows">📊 ${stats.rowCount} 行数据</span>
            <span class="csv-stat-tag csv-stat-category">🏷️ ${stats.categoryCount} 种数据类型</span>
        `;
    }
}