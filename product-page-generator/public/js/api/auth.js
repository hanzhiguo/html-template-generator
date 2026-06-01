/**
 * 认证API
 */

const API_BASE = `${window.location.origin}/api`;

export const authAPI = {
    login: async (username, password) => {
        console.log('authAPI.login called');
        try {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();
            console.log('Login response status:', response.status);
            console.log('Login data:', data);
            if (!response.ok) {
                return { error: data.error || `登录失败 (HTTP ${response.status})` };
            }
            if (data.token) {
                console.log('Token received, length:', data.token.length);
            }
            return data;
        } catch (err) {
            console.error('authAPI.login error:', err);
            return { error: '网络错误: ' + err.message };
        }
    },

    register: async (username, password) => {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        return await response.json();
    },

    verify: async (token) => {
        const response = await fetch(`${API_BASE}/auth/verify`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await response.json();
    }
};
