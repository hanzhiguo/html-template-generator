/**
 * 工具函数服务
 */

export const formatPrice = (price, currency = 'USD') => {
    const symbols = { USD: '$', CNY: '¥', EUR: '€' };
    return `${symbols[currency] || ''}${parseFloat(price).toFixed(2)}`;
};

export const getStatusText = (status) => {
    const texts = {
        draft: '草稿',
        active: '已发布',
        archived: '已归档'
    };
    return texts[status] || status;
};

export const showToast = (message, type = 'success') => {
    const toast = document.getElementById('toast');
    if (!toast) {
        console.error('[showToast] Toast element not found, message:', message);
        alert(message);
        return;
    }
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
};

export const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('zh-CN');
};

export const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

export const throttle = (func, limit) => {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

export const escapeHtml = (str) => {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
};
