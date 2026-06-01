/**
 * Agent API
 */

const API_BASE = `${window.location.origin}/api`;

export const agentAPI = {
    chat: async (message, conversationId, token) => {
        const response = await fetch(`${API_BASE}/agent/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ message, conversationId })
        });
        return await response.json();
    },

    getTools: async (token) => {
        const response = await fetch(`${API_BASE}/agent/tools`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await response.json();
    },

    getConversations: async (token) => {
        const response = await fetch(`${API_BASE}/agent/conversations`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await response.json();
    },

    getConversation: async (conversationId, token) => {
        const response = await fetch(`${API_BASE}/agent/conversations/${conversationId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await response.json();
    },

    getKBStats: async (token) => {
        const response = await fetch(`${API_BASE}/agent/kb/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await response.json();
    },

    syncKB: async (token) => {
        const response = await fetch(`${API_BASE}/agent/kb/sync`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await response.json();
    }
};
