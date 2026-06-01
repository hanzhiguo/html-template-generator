export function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
}

export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

export function resetProductForm() {
    document.getElementById('productId').value = '';
    document.getElementById('productSku').value = '';
    document.getElementById('productName').value = '';
    document.getElementById('productSubtitle').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('productCurrency').value = 'USD';
    document.getElementById('productStatus').value = 'draft';
    document.getElementById('modalTitle').textContent = '新增产品';
}