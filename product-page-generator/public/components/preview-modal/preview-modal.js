export function openPreview() {
    document.getElementById('previewModal').classList.add('active');
}

export function closePreview() {
    document.getElementById('previewModal').classList.remove('active');
}

export function setPreviewTitle(title) {
    const el = document.getElementById('previewTitle');
    if (el) el.textContent = title;
}

export function setPreviewContent(html) {
    const el = document.getElementById('previewContent');
    if (el) el.innerHTML = html;
}

export function setPageIndicator(current, total) {
    const el = document.getElementById('previewPageIndicator');
    if (el) el.textContent = `第 ${current}/${total} 页`;
}

export function showTranslationLoading(show) {
    const el = document.getElementById('translationLoading');
    if (el) el.style.display = show ? 'flex' : 'none';
}

export function setTranslationStatus(text) {
    const el = document.getElementById('translationStatus');
    if (el) el.textContent = text;
}