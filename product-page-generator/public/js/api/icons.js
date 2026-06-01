/**
 * 图标管理 API
 */

const API_BASE = 'http://localhost:3000/api';

export const iconsAPI = {
    getAll: async (token, options = {}) => {
        const params = new URLSearchParams();
        if (options.category) params.append('category', options.category);
        if (options.search) params.append('search', options.search);

        const response = await fetch(`${API_BASE}/icons?${params.toString()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await response.json();
    },

    getById: async (iconId, token) => {
        const response = await fetch(`${API_BASE}/icons/${iconId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await response.json();
    },

    getCategories: async (token) => {
        const response = await fetch(`${API_BASE}/icons/categories/list`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await response.json();
    },

    getCategoryRecommended: async (categoryId, token) => {
        const response = await fetch(`${API_BASE}/icons/categories/${categoryId}/recommended`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await response.json();
    },

    update: async (iconId, data, token) => {
        const response = await fetch(`${API_BASE}/icons/${iconId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        return await response.json();
    },

    // 获取图标SVG内容（直接读取文件）
    getIconUrl: (iconId) => `${API_BASE.replace('/api', '')}/assets/icons/svgs/${iconId}.svg`
};
