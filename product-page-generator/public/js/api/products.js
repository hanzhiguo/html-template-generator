/**
 * 产品API
 */

const API_BASE = `${window.location.origin}/api`;

export const productsAPI = {
    getAll: async (token) => {
        const response = await fetch(`${API_BASE}/products`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            const err = await response.text();
            console.error('API error:', response.status, err);
            throw new Error(`请求失败 (${response.status}): ${err}`);
        }
        return await response.json();
    },

    getById: async (id, token) => {
        const response = await fetch(`${API_BASE}/products/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            const err = await response.text();
            throw new Error(`获取产品失败 (${response.status}): ${err}`);
        }
        return await response.json();
    },

    create: async (productData, token) => {
        const response = await fetch(`${API_BASE}/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(productData)
        });
        return await response.json();
    },

    update: async (id, productData, token) => {
        const response = await fetch(`${API_BASE}/products/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(productData)
        });
        return await response.json();
    },

    delete: async (id, token) => {
        const response = await fetch(`${API_BASE}/products/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await response.json();
    },

    importCSV: async (formData, token) => {
        const response = await fetch(`${API_BASE}/products/import`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        return await response.json();
    },

    // ========== 文档管理 API ==========

    getDocuments: async (productId, token) => {
        const response = await fetch(`${API_BASE}/documents/${productId}/documents`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await response.json();
    },

    uploadDocument: async (productId, formData, token) => {
        const response = await fetch(`${API_BASE}/documents/${productId}/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        return await response.json();
    },

    linkDocument: async (productId, docData, token) => {
        const response = await fetch(`${API_BASE}/documents/${productId}/link`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(docData)
        });
        return await response.json();
    },

    deleteDocument: async (productId, docId, token) => {
        const response = await fetch(`${API_BASE}/documents/${productId}/documents/${docId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await response.json();
    },

    getAllAttachments: async (productId, token) => {
        const response = await fetch(`${API_BASE}/documents/${productId}/attachments/all`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await response.json();
    }
};
