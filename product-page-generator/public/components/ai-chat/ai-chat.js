let _isDragging = false;
let _isResizing = false;
let _dragOffset = { x: 0, y: 0 };

function toggleAIChat() {
    const chatWindow = document.getElementById('aiChatWindow');
    if (!chatWindow) return;
    chatWindow.classList.toggle('active');
    if (chatWindow.classList.contains('active')) {
        loadProviderInfo();
    }
}

async function loadProviderInfo() {
    const infoEl = document.getElementById('aiProviderInfo');
    if (!infoEl) return;

    try {
        const token = window.app?.token;
        const res = await fetch(`${window.location.origin}/api/settings/config`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        const provider = data.defaultProvider || 'ollama';
        const model = data.providers?.[provider]?.model || 'unknown';
        const providerNames = { ollama: 'Ollama本地', deepseek: 'DeepSeek', zhipu: '智谱AI' };

        infoEl.textContent = `${providerNames[provider] || provider} | ${model}`;
        infoEl.style.color = provider === 'ollama' ? '#10b981' : '#3b82f6';
    } catch (e) {
        infoEl.textContent = 'Ollama本地 | gemma4:e4b';
        infoEl.style.color = '#10b981';
    }
}

function addMessageToUI(role, content) {
    const container = document.getElementById('agentMessages');
    if (!container) return;

    const msgEl = document.createElement('div');
    msgEl.className = `message message-${role}`;
    msgEl.innerHTML = `<div class="message-content">${content}</div>`;
    container.appendChild(msgEl);
    container.scrollTop = container.scrollHeight;
    return msgEl;
}

function clearInput() {
    const input = document.getElementById('agentInput');
    if (input) input.value = '';
}

function getInputValue() {
    const input = document.getElementById('agentInput');
    return input ? input.value.trim() : '';
}

function initDragAndResize() {
    const chatWindow = document.getElementById('aiChatWindow');
    const header = document.getElementById('aiChatHeader');
    const resizeHandle = document.getElementById('aiResizeHandle');

    if (!chatWindow || !header) return;

    header.addEventListener('mousedown', (e) => {
        if (e.target.closest('.ai-chat-close')) return;
        _isDragging = true;
        const rect = chatWindow.getBoundingClientRect();
        _dragOffset.x = e.clientX - rect.left;
        _dragOffset.y = e.clientY - rect.top;
        chatWindow.style.transition = 'none';
        e.preventDefault();
    });

    if (resizeHandle) {
        resizeHandle.addEventListener('mousedown', (e) => {
            _isResizing = true;
            chatWindow.style.transition = 'none';
            e.preventDefault();
            e.stopPropagation();
        });
    }

    document.addEventListener('mousemove', (e) => {
        if (_isDragging) {
            const x = e.clientX - _dragOffset.x;
            const y = e.clientY - _dragOffset.y;
            const maxX = window.innerWidth - chatWindow.offsetWidth;
            const maxY = window.innerHeight - chatWindow.offsetHeight;

            chatWindow.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
            chatWindow.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
            chatWindow.style.right = 'auto';
            chatWindow.style.bottom = 'auto';
        }

        if (_isResizing) {
            const rect = chatWindow.getBoundingClientRect();
            const width = e.clientX - rect.left;
            const height = e.clientY - rect.top;

            chatWindow.style.width = Math.max(320, Math.min(width, window.innerWidth * 0.9)) + 'px';
            chatWindow.style.height = Math.max(400, Math.min(height, window.innerHeight * 0.9)) + 'px';
        }
    });

    document.addEventListener('mouseup', () => {
        _isDragging = false;
        _isResizing = false;
        if (chatWindow) {
            chatWindow.style.transition = '';
        }
    });
}

function initAIChat() {
    const floatBtn = document.getElementById('aiFloatBtn');
    const closeBtn = document.getElementById('aiChatClose');
    const sendBtn = document.getElementById('aiSendBtn');
    const input = document.getElementById('agentInput');

    if (floatBtn) {
        floatBtn.addEventListener('click', toggleAIChat);
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', toggleAIChat);
    }

    if (sendBtn) {
        sendBtn.addEventListener('click', () => {
            if (window.sendAgentMessage) {
                window.sendAgentMessage();
            }
        });
    }

    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (window.sendAgentMessage) {
                    window.sendAgentMessage();
                }
            }
        });
    }

    initDragAndResize();
}

window.toggleAIChat = toggleAIChat;
window.loadProviderInfo = loadProviderInfo;
window.addMessageToUI = addMessageToUI;
window.clearInput = clearInput;
window.getInputValue = getInputValue;

setTimeout(initAIChat, 0);

export { toggleAIChat, loadProviderInfo, addMessageToUI, clearInput, getInputValue };