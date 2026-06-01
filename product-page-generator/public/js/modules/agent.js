import { showToast, escapeHtml } from '../services/utils.js';
import { agentAPI } from '../api/index.js';
import { appState } from '../stores/appState.js';

class AgentManager {
    constructor(getToken) {
        this.getToken = getToken;
        this.abortController = null;
    }

    async loadTools() {
        try {
            const data = await agentAPI.getTools(this.getToken());
            const container = document.getElementById('agentToolsList');
            if (!container) return;

            if (data.tools && data.tools.length > 0) {
                container.innerHTML = data.tools.map(tool => `
                    <div style="margin-bottom: 8px; padding: 8px; background: #f1f5f9; border-radius: 4px;">
                        <div style="font-weight: 600; color: #1e40af;">${tool.function.name}</div>
                        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">${tool.function.description}</div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<p style="color: #94a3b8;">暂无可用工具</p>';
            }
        } catch (error) {
            const container = document.getElementById('agentToolsList');
            if (container) {
                container.innerHTML = '<p style="color: #dc2626;">加载失败</p>';
            }
        }
    }

    async loadKBStats() {
        try {
            const data = await agentAPI.getKBStats(this.getToken());
            const container = document.getElementById('kbStats');
            if (!container) return;

            container.innerHTML = `
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span>文档数量:</span>
                    <span style="font-weight: 600;">${data.documentCount || 0}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>最后同步:</span>
                    <span style="font-size: 12px;">${data.lastSync ? new Date(data.lastSync).toLocaleString() : '未同步'}</span>
                </div>
            `;
        } catch (error) {
            const container = document.getElementById('kbStats');
            if (container) {
                container.innerHTML = '<p style="color: #dc2626;">加载失败</p>';
            }
        }
    }

    async loadConversations(onLoad) {
        try {
            const data = await agentAPI.getConversations(this.getToken());
            const container = document.getElementById('conversationList');
            if (!container) return;

            const currentId = appState.getState().currentConversationId;

            if (data.conversations && data.conversations.length > 0) {
                container.innerHTML = `
                    <div style="margin-bottom: 8px;">
                        <button onclick="app.agentManager.newConversation()" style="width:100%;padding:8px;background:#3b82f6;color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px;">+ 新对话</button>
                    </div>
                ` + data.conversations.map(conv => `
                    <div style="padding:10px;background:${conv.id === currentId ? '#dbeafe' : '#f1f5f9'};border-radius:6px;margin-bottom:6px;cursor:pointer;border:${conv.id === currentId ? '1px solid #3b82f6' : '1px solid transparent'};transition:all 0.2s;"
                         onclick="app.agentManager.loadConversation('${conv.id}')">
                        <div style="font-weight:600;font-size:13px;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${conv.title || '新对话'}</div>
                        <div style="font-size:11px;color:#94a3b8;margin-top:4px;display:flex;justify-content:space-between;">
                            <span>${new Date(conv.updated_at || conv.created_at).toLocaleString()}</span>
                            <span>${conv.message_count || 0} 条消息</span>
                        </div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = `
                    <div style="margin-bottom:8px;">
                        <button onclick="app.agentManager.newConversation()" style="width:100%;padding:8px;background:#3b82f6;color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px;">+ 新对话</button>
                    </div>
                    <p style="color:#94a3b8;text-align:center;padding:20px;">暂无会话</p>
                `;
            }
            if (onLoad) onLoad();
        } catch (error) {
            const container = document.getElementById('conversationList');
            if (container) {
                container.innerHTML = '<p style="color: #dc2626;">加载失败</p>';
            }
        }
    }

    newConversation() {
        appState.setCurrentConversationId(null);
        const container = document.getElementById('agentMessages');
        if (container) container.innerHTML = '';
        this.loadConversations();
    }

    async loadConversation(conversationId) {
        try {
            const data = await agentAPI.getConversation(conversationId, this.getToken());
            
            if (data.messages) {
                appState.setCurrentConversationId(conversationId);
                const container = document.getElementById('agentMessages');
                if (container) {
                    container.innerHTML = '';
                    data.messages.forEach(msg => {
                        if (msg.role === 'user' || msg.role === 'assistant') {
                            this.addMessageToUI(msg.role, msg.content);
                        }
                    });
                }
                this.loadConversations();
            }
        } catch (error) {
            showToast('加载会话失败', 'error');
        }
    }

    addMessageToUI(role, content) {
        const container = document.getElementById('agentMessages');
        if (!container) return;

        const msgDiv = document.createElement('div');
        msgDiv.style.cssText = `
            margin-bottom: 16px;
            padding: 12px 16px;
            border-radius: 8px;
            max-width: 80%;
            ${role === 'user' ? 'margin-left: auto; background: #3b82f6; color: white;' : 'background: white; border: 1px solid #e5e7eb;'}
        `;

        const roleLabel = role === 'user' ? '👤 你' : '🤖 AI';
        const formattedContent = this.renderMessageContent(content);
        msgDiv.innerHTML = `
            <div style="font-size: 12px; color: ${role === 'user' ? 'rgba(255,255,255,0.8)' : '#94a3b8'}; margin-bottom: 4px;">${roleLabel}</div>
            <div style="white-space: pre-wrap; line-height: 1.6;">${formattedContent}</div>
        `;

        container.appendChild(msgDiv);
        container.scrollTop = container.scrollHeight;
    }

    renderMessageContent(content) {
        if (!content) return '';
        let escaped = escapeHtml(content);
        escaped = escaped.replace(
            /(https?:\/\/[^\s<]+)/g,
            '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:#3b82f6;text-decoration:underline;word-break:break-all;">$1</a>'
        );
        escaped = escaped.replace(/\n/g, '<br>');
        return escaped;
    }

    addAttachmentCard(attachments) {
        const container = document.getElementById('agentMessages');
        if (!container || !attachments || attachments.length === 0) return;

        const cardDiv = document.createElement('div');
        cardDiv.style.cssText = `
            margin-bottom: 16px;
            padding: 12px 16px;
            border-radius: 8px;
            background: white;
            border: 1px solid #e5e7eb;
        `;

        const typeIcons = { image: '🖼️', document: '📄' };
        const itemsHtml = attachments.map(att => {
            const icon = typeIcons[att.category] || '📎';
            const downloadUrl = att.download_url || att.url;
            return `
                <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f1f5f9;">
                    <span style="font-size:24px;">${icon}</span>
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:13px;font-weight:500;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(att.title || '附件')}</div>
                        <div style="font-size:11px;color:#94a3b8;">
                            ${att.category === 'image' ? '图片 · ' + (att.type || '') : '文档 · ' + (att.type || '')}
                            ${att.file_size ? ' · ' + (att.file_size / 1024).toFixed(1) + ' KB' : ''}
                        </div>
                    </div>
                    <a href="${escapeHtml(downloadUrl)}" target="_blank" rel="noopener noreferrer"
                       style="padding:6px 14px;background:#3b82f6;color:white;border-radius:6px;text-decoration:none;font-size:12px;white-space:nowrap;flex-shrink:0;">
                        📥 下载
                    </a>
                </div>
            `;
        }).join('');

        cardDiv.innerHTML = `
            <div style="font-size: 12px; color: #94a3b8; margin-bottom: 8px;">📎 附件列表</div>
            ${itemsHtml}
        `;

        container.appendChild(cardDiv);
        container.scrollTop = container.scrollHeight;
    }

    addStreamingMessage() {
        const container = document.getElementById('agentMessages');
        if (!container) return null;

        const msgDiv = document.createElement('div');
        msgDiv.style.cssText = `
            margin-bottom: 16px;
            padding: 12px 16px;
            border-radius: 8px;
            max-width: 80%;
            background: white;
            border: 1px solid #e5e7eb;
        `;

        msgDiv.innerHTML = `
            <div style="font-size: 12px; color: #94a3b8; margin-bottom: 4px;">🤖 AI</div>
            <div class="streaming-content" style="white-space: pre-wrap; line-height: 1.6;"><span class="streaming-cursor" style="display:inline-block;width:2px;height:16px;background:#3b82f6;animation:blink 0.8s infinite;vertical-align:text-bottom;"></span></div>
        `;

        container.appendChild(msgDiv);
        container.scrollTop = container.scrollHeight;
        return msgDiv;
    }

    appendStreamingContent(msgEl, content) {
        if (!msgEl) return;
        const contentEl = msgEl.querySelector('.streaming-content');
        if (!contentEl) return;
        const cursor = contentEl.querySelector('.streaming-cursor');
        const text = document.createTextNode(content);
        contentEl.insertBefore(text, cursor);
        const container = document.getElementById('agentMessages');
        if (container) container.scrollTop = container.scrollHeight;
    }

    finalizeStreamingMessage(msgEl, errorContent) {
        if (!msgEl) return;
        const cursor = msgEl.querySelector('.streaming-cursor');
        if (cursor) cursor.remove();
        if (errorContent) {
            const contentEl = msgEl.querySelector('.streaming-content');
            if (contentEl) {
                contentEl.textContent = errorContent;
                contentEl.style.color = '#dc2626';
            }
        }
    }

    addToolStep(toolCalls) {
        const container = document.getElementById('agentMessages');
        if (!container) return null;

        const stepDiv = document.createElement('div');
        stepDiv.style.cssText = 'margin-bottom:8px;display:flex;flex-direction:column;gap:4px;';

        stepDiv.innerHTML = toolCalls.map(tc => `
            <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;padding:8px 12px;font-size:12px;color:#0369a1;display:flex;align-items:center;gap:8px;">
                <span style="font-size:14px;">🔍</span>
                <span style="font-weight:500;">${tc.name === 'query_products' ? '查询产品' : tc.name === 'query_kb' ? '搜索知识库' : tc.name === 'read_file' ? '读取文件' : tc.name === 'write_file' ? '写入文件' : tc.name}</span>
                <span style="color:#64748b;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${tc.args ? tc.args.substring(0, 100) : ''}</span>
                <span class="tool-step-spinner" style="width:14px;height:14px;border:2px solid #bae6fd;border-top-color:#0369a1;border-radius:50%;animation:spin 0.8s linear infinite;flex-shrink:0;"></span>
            </div>
        `).join('');

        container.appendChild(stepDiv);
        container.scrollTop = container.scrollHeight;
        return stepDiv;
    }

    completeToolStep(stepEl, results) {
        if (!stepEl) return;
        const spinners = stepEl.querySelectorAll('.tool-step-spinner');
        spinners.forEach(s => {
            s.style.border = '2px solid #86efac';
            s.style.borderTopColor = '#16a34a';
            s.style.animation = 'none';
            s.style.width = '10px';
            s.style.height = '10px';
            s.style.background = '#16a34a';
            s.style.borderRadius = '50%';
        });
        if (results && results.length > 0) {
            const resultDiv = document.createElement('div');
            resultDiv.style.cssText = 'margin-top:4px;padding:6px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;font-size:12px;color:#166534;';
            resultDiv.textContent = `✓ 完成 — ${results.map(r => r.summary || '成功').join(' | ')}`;
            stepEl.appendChild(resultDiv);
        }
        const container = document.getElementById('agentMessages');
        if (container) container.scrollTop = container.scrollHeight;
    }

    showStopButton() {
        const existing = document.getElementById('stopAgentBtn');
        if (existing) return existing;

        const container = document.getElementById('agentMessages');
        if (!container) return null;

        const btnDiv = document.createElement('div');
        btnDiv.id = 'stopAgentBtn';
        btnDiv.style.cssText = 'text-align:center;margin:8px 0;';

        btnDiv.innerHTML = `
            <button onclick="window.abortAgent()" style="padding:6px 20px;background:#ef4444;color:white;border:none;border-radius:20px;cursor:pointer;font-size:13px;display:inline-flex;align-items:center;gap:6px;transition:background 0.2s;"
                    onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#ef4444'">
                <span>■</span> 停止生成
            </button>
        `;

        container.appendChild(btnDiv);
        container.scrollTop = container.scrollHeight;
        return btnDiv;
    }

    hideStopButton() {
        const btn = document.getElementById('stopAgentBtn');
        if (btn) btn.remove();
    }
}

export { AgentManager };