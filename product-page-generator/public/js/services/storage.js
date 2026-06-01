/**
 * 存储服务
 */

export const storage = {
    getToken: () => {
        return localStorage.getItem('token');
    },

    setToken: (token) => {
        localStorage.setItem('token', token);
    },

    removeToken: () => {
        localStorage.removeItem('token');
    },

    getUsername: () => {
        return localStorage.getItem('username');
    },

    setUsername: (username) => {
        localStorage.setItem('username', username);
    },

    removeUsername: () => {
        localStorage.removeItem('username');
    },

    clear: () => {
        localStorage.clear();
    },

    get: (key) => {
        const value = localStorage.getItem(key);
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    },

    set: (key, value) => {
        if (typeof value === 'object') {
            localStorage.setItem(key, JSON.stringify(value));
        } else {
            localStorage.setItem(key, value);
        }
    },

    remove: (key) => {
        localStorage.removeItem(key);
    }
};
