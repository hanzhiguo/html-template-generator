/**
 * 设置API
 */

const API_BASE = `${window.location.origin}/api`;

export const settingsAPI = {
    getConfig: async (token) => {
        const response = await fetch(`${API_BASE}/settings/config`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await response.json();
    },

    saveConfig: async (config, token) => {
        const response = await fetch(`${API_BASE}/settings/config`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(config)
        });
        return await response.json();
    },

    testProvider: async (provider, token) => {
        const response = await fetch(`${API_BASE}/settings/test-provider`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ provider })
        });
        return await response.json();
    },

    getModels: async (provider, token) => {
        const response = await fetch(`${API_BASE}/settings/models/${provider}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await response.json();
    }
};
