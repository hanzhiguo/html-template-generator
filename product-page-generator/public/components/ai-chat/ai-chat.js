/**
 * AI聊天组件 - 独立可复用组件
 * 
 * 功能：浮动按钮、聊天窗口、拖拽/缩放、SSE流式消息、工具步骤UI、中止、Markdown渲染
 * 
 * 使用方式：
 *   1. 引入 ai-chat.css + ai-chat.html（或手动插入HTML）+ ai-chat.js
 *   2. 调用 window.AIChat.init({ getToken, onToolResult })
 *   3. 注册工具处理器：window.AIChat.registerToolHandler('tool_name', (result) => { ... })
 *   4. 页面自定义的 sendAgentMessage 可通过 window.AIChat.send() 发送
 */

;(function(global) {
  'use strict';

  // ========== 状态 ==========
  let _config = {
    getToken: null,           // () => token string
    apiBase: '',              // API基础路径，默认当前origin
    conversationIdKey: 'aiConversationId',  // localStorage中保存对话ID的key
  };
  let _toolHandlers = {};     // { toolName: (result) => void }
  let _conversationId = null;
  let _abortController = null;
  let _isDragging = false;
  let _isResizing = false;
  let _dragOffset = { x: 0, y: 0 };
  let _initialized = false;

  // ========== 初始化 ==========
  function init(config) {
    Object.assign(_config, config || {});
    _conversationId = localStorage.getItem(_config.conversationIdKey) || null;

    if (!_initialized) {
      _bindEvents();
      _initDragAndResize();
      _initialized = true;
    }
    console.log('[AIChat] 组件已初始化');
  }

  // ========== 事件绑定 ==========
  function _bindEvents() {
    const floatBtn = document.getElementById('aiFloatBtn');
    const closeBtn = document.getElementById('aiChatClose');
    const sendBtn = document.getElementById('aiSendBtn');
    const newChatBtn = document.getElementById('aiNewChatBtn');
    const input = document.getElementById('agentInput');

    if (floatBtn) floatBtn.addEventListener('click', toggle);
    
    if (closeBtn) {
      closeBtn.addEventListener('mousedown', (e) => e.stopPropagation());
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        close();
      });
    }

    if (sendBtn) sendBtn.addEventListener('click', () => send());

    if (newChatBtn) {
      newChatBtn.addEventListener('mousedown', (e) => e.stopPropagation());
      newChatBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        newConversation();
      });
    }

    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          send();
        }
      });
      // 自动调整高度
      input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = input.scrollHeight + 'px';
      });
    }
  }

  // ========== 拖拽和缩放 ==========
  function _initDragAndResize() {
    const chatWindow = document.getElementById('aiChatWindow');
    const header = document.getElementById('aiChatHeader');
    const resizeHandle = document.getElementById('aiResizeHandle');
    if (!chatWindow || !header) return;

    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('.ai-chat-close') || e.target.closest('.ai-chat-new-btn')) return;
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
      if (chatWindow) chatWindow.style.transition = '';
    });
  }

  // ========== 窗口控制 ==========
  function toggle() {
    const chatWindow = document.getElementById('aiChatWindow');
    if (!chatWindow) return;
    const isActive = chatWindow.classList.contains('active');
    if (isActive) {
      chatWindow.classList.remove('active');
    } else {
      chatWindow.classList.add('active');
      loadProviderInfo();
    }
  }

  function open() {
    const chatWindow = document.getElementById('aiChatWindow');
    if (chatWindow) {
      chatWindow.classList.add('active');
      loadProviderInfo();
    }
  }

  function close() {
    const chatWindow = document.getElementById('aiChatWindow');
    if (chatWindow) chatWindow.classList.remove('active');
  }

  // ========== Provider信息 ==========
  async function loadProviderInfo() {
    const infoEl = document.getElementById('aiProviderInfo');
    if (!infoEl) return;
    try {
      const token = _config.getToken ? _config.getToken() : localStorage.getItem('token');
      const base = _config.apiBase || window.location.origin;
      const res = await fetch(`${base}/api/settings/config`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      const provider = data.defaultProvider || 'ollama';
      const model = data.providers?.[provider]?.model || 'unknown';
      const providerNames = { ollama: 'Ollama本地', deepseek: 'DeepSeek', zhipu: '智谱AI' };
      infoEl.textContent = `${providerNames[provider] || provider} | ${model}`;
      infoEl.style.color = provider === 'ollama' ? '#10b981' : '#3b82f6';
    } catch (e) {
      infoEl.textContent = 'Ollama本地';
      infoEl.style.color = '#10b981';
    }
  }

  // ========== 消息UI ==========
  function addMessage(role, content) {
    const container = document.getElementById('agentMessages');
    if (!container) return null;

    const msgDiv = document.createElement('div');
    msgDiv.className = `ai-message ai-message-${role}`;

    const roleLabel = role === 'user' ? '👤 你' : '🤖 AI';
    let displayContent = content;
    
    // AI消息支持Markdown渲染
    if (role === 'assistant' && typeof marked !== 'undefined') {
      try {
        marked.setOptions({ breaks: true, gfm: true });
        displayContent = marked.parse(content);
      } catch (e) {
        displayContent = _escapeHtml(content).replace(/\n/g, '<br>');
      }
    } else {
      displayContent = _escapeHtml(content).replace(/\n/g, '<br>');
    }

    const contentClass = (role === 'assistant' && typeof marked !== 'undefined') ? 'markdown-content' : '';
    msgDiv.innerHTML = `
      <div class="ai-message-role">${roleLabel}</div>
      <div class="ai-message-content ${contentClass}">${displayContent}</div>
    `;

    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
    return msgDiv;
  }

  function addStreamingMessage() {
    const container = document.getElementById('agentMessages');
    if (!container) return null;

    const msgDiv = document.createElement('div');
    msgDiv.className = 'ai-message ai-message-assistant';
    msgDiv.innerHTML = `
      <div class="ai-message-role">🤖 AI</div>
      <div class="ai-message-content streaming-content"><span class="streaming-cursor"></span></div>
    `;

    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
    return msgDiv;
  }

  function appendStreamingContent(msgEl, content) {
    if (!msgEl) return;
    const contentEl = msgEl.querySelector('.streaming-content');
    if (!contentEl) return;
    const cursor = contentEl.querySelector('.streaming-cursor');
    const text = document.createTextNode(content);
    contentEl.insertBefore(text, cursor);
    const container = document.getElementById('agentMessages');
    if (container) container.scrollTop = container.scrollHeight;
  }

  function finalizeStreamingMessage(msgEl, errorContent) {
    if (!msgEl) return;
    const cursor = msgEl.querySelector('.streaming-cursor');
    if (cursor) cursor.remove();
    if (errorContent) {
      const contentEl = msgEl.querySelector('.streaming-content');
      if (contentEl) {
        contentEl.textContent = errorContent;
        contentEl.style.color = '#dc2626';
      }
    } else {
      // 流式结束后渲染Markdown
      const contentEl = msgEl.querySelector('.streaming-content');
      if (contentEl && typeof marked !== 'undefined') {
        const rawText = contentEl.textContent;
        try {
          marked.setOptions({ breaks: true, gfm: true });
          contentEl.innerHTML = marked.parse(rawText);
          contentEl.classList.add('markdown-content');
        } catch (e) {
          // 保持原始文本
        }
      }
    }
  }

  // ========== 工具步骤UI ==========
  function addToolStep(toolCalls) {
    const container = document.getElementById('agentMessages');
    if (!container) return null;

    const toolNameMap = {
      query_products: '查询产品',
      query_kb: '搜索知识库',
      read_file: '读取文件',
      write_file: '写入文件',
      search_md_files: '搜索文档',
      read_product_md_file: '读取产品文档',
      generate_main_image_content: '生成主图内容',
      get_product_specs: '获取产品规格',
      get_product_attachments: '获取附件',
      get_download_link: '获取下载链接',
    };

    const stepDiv = document.createElement('div');
    stepDiv.className = 'ai-tool-step';
    stepDiv.innerHTML = toolCalls.map(tc => `
      <div class="ai-tool-item">
        <span>🔍</span>
        <span class="ai-tool-item-name">${toolNameMap[tc.name] || tc.name}</span>
        <span class="ai-tool-item-args">${tc.args ? tc.args.substring(0, 100) : ''}</span>
        <span class="ai-tool-spinner"></span>
      </div>
    `).join('');

    container.appendChild(stepDiv);
    container.scrollTop = container.scrollHeight;
    return stepDiv;
  }

  function completeToolStep(stepEl, results) {
    if (!stepEl) return;
    // 将spinner替换为完成标记
    const spinners = stepEl.querySelectorAll('.ai-tool-spinner');
    spinners.forEach(s => {
      s.className = 'ai-tool-done';
    });
    if (results && results.length > 0) {
      const resultDiv = document.createElement('div');
      resultDiv.className = 'ai-tool-result';
      resultDiv.textContent = `✓ 完成 — ${results.map(r => r.summary || '成功').join(' | ')}`;
      stepEl.appendChild(resultDiv);
    }
    const container = document.getElementById('agentMessages');
    if (container) container.scrollTop = container.scrollHeight;
  }

  // ========== 中止按钮 ==========
  function showStopButton() {
    const existing = document.getElementById('aiStopBtn');
    if (existing) return existing;
    const container = document.getElementById('agentMessages');
    if (!container) return null;

    const btnDiv = document.createElement('div');
    btnDiv.id = 'aiStopBtn';
    btnDiv.className = 'ai-stop-btn';
    btnDiv.innerHTML = `<button onclick="window.AIChat.abort()"><span>■</span> 停止生成</button>`;
    container.appendChild(btnDiv);
    container.scrollTop = container.scrollHeight;
    return btnDiv;
  }

  function hideStopButton() {
    const btn = document.getElementById('aiStopBtn');
    if (btn) btn.remove();
  }

  // ========== 附件卡片 ==========
  function addAttachmentCard(attachments) {
    const container = document.getElementById('agentMessages');
    if (!container || !attachments || attachments.length === 0) return;

    const typeIcons = { image: '🖼️', document: '📄' };
    const itemsHtml = attachments.map(att => {
      const icon = typeIcons[att.category] || '📎';
      const downloadUrl = att.download_url || att.url;
      return `
        <div class="ai-attachment-item">
          <span class="ai-attachment-icon">${icon}</span>
          <div class="ai-attachment-info">
            <div class="ai-attachment-title">${_escapeHtml(att.title || '附件')}</div>
            <div class="ai-attachment-meta">
              ${att.category === 'image' ? '图片 · ' + (att.type || '') : '文档 · ' + (att.type || '')}
              ${att.file_size ? ' · ' + (att.file_size / 1024).toFixed(1) + ' KB' : ''}
            </div>
          </div>
          <a href="${_escapeHtml(downloadUrl)}" target="_blank" rel="noopener noreferrer" class="ai-attachment-download">📥 下载</a>
        </div>
      `;
    }).join('');

    const cardDiv = document.createElement('div');
    cardDiv.className = 'ai-attachment-card';
    cardDiv.innerHTML = `
      <div class="ai-attachment-card-label">📎 附件列表</div>
      ${itemsHtml}
    `;

    container.appendChild(cardDiv);
    container.scrollTop = container.scrollHeight;
  }

  // ========== 新对话 ==========
  function newConversation() {
    _conversationId = null;
    localStorage.removeItem(_config.conversationIdKey);
    const container = document.getElementById('agentMessages');
    if (container) container.innerHTML = '';
    addMessage('assistant', '已开始新对话，之前的记忆已清除。');
    // 通知页面层（如首页的app对象）同步状态
    if (window.app && typeof window.app.newConversation === 'function') {
      try { window.app.newConversation(); } catch (e) {}
    }
  }

  // ========== 发送消息（SSE流式） ==========
  async function send(customMessage) {
    const input = document.getElementById('agentInput');
    const message = customMessage || (input ? input.value.trim() : '');
    if (!message) return;

    const token = _config.getToken ? _config.getToken() : localStorage.getItem('token');
    if (!token) { alert('请先登录'); return; }

    addMessage('user', message);
    if (input && !customMessage) input.value = '';

    _abortController = new AbortController();
    showStopButton();

    let aiMsgEl = null;
    let aiContent = '';
    let toolStepEl = null;

    try {
      // 优先使用appState中的conversationId（首页场景），否则使用内部状态
      const convId = (window.appState && window.appState.getState && window.appState.getState().currentConversationId) || _conversationId;
      const base = _config.apiBase || window.location.origin;
      const response = await fetch(`${base}/api/agent/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          message: message,
          conversationId: convId
        }),
        signal: _abortController.signal
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const errMsg = '错误: ' + (data.error || `请求失败 (HTTP ${response.status})`);
        if (aiMsgEl) finalizeStreamingMessage(aiMsgEl, errMsg);
        else addMessage('assistant', errMsg);
        hideStopButton();
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'content') {
              if (!aiMsgEl) aiMsgEl = addStreamingMessage();
              aiContent += data.content;
              appendStreamingContent(aiMsgEl, data.content);

            } else if (data.type === 'tool_start') {
              toolStepEl = addToolStep(data.tool_calls);

            } else if (data.type === 'tool_result') {
              if (toolStepEl) {
                completeToolStep(toolStepEl, data.results);
                toolStepEl = null;
              }
              // 分发工具结果给注册的处理器
              if (data.results) {
                data.results.forEach(r => {
                  _dispatchToolResult(r);
                });
              }

            } else if (data.type === 'done') {
              hideStopButton();
              if (aiMsgEl) finalizeStreamingMessage(aiMsgEl);
              if (data.conversationId) {
                _conversationId = data.conversationId;
                localStorage.setItem(_config.conversationIdKey, data.conversationId);
                // 同步到首页appState
                if (window.appState && typeof window.appState.setCurrentConversationId === 'function') {
                  try { window.appState.setCurrentConversationId(data.conversationId); } catch (e) {}
                }
              }
              // 通知页面层刷新对话列表
              if (window.app && typeof window.app.loadConversations === 'function') {
                try { window.app.loadConversations(); } catch (e) {}
              }

            } else if (data.type === 'aborted') {
              hideStopButton();
              if (aiMsgEl) {
                finalizeStreamingMessage(aiMsgEl);
                const contentEl = aiMsgEl.querySelector('.streaming-content');
                if (contentEl) {
                  const abortMsg = document.createElement('span');
                  abortMsg.style.cssText = 'color:#ef4444;font-size:12px;margin-left:8px;';
                  abortMsg.textContent = '[已中止]';
                  contentEl.appendChild(abortMsg);
                }
              }

            } else if (data.type === 'error') {
              hideStopButton();
              if (aiMsgEl) finalizeStreamingMessage(aiMsgEl, '错误: ' + data.error);
              else addMessage('assistant', '错误: ' + data.error);
            }
          } catch (e) {
            console.error('[AIChat] 解析SSE数据失败:', e);
          }
        }
      }
    } catch (error) {
      hideStopButton();
      if (error.name === 'AbortError') {
        if (aiMsgEl) {
          finalizeStreamingMessage(aiMsgEl);
          const contentEl = aiMsgEl.querySelector('.streaming-content');
          if (contentEl) {
            const abortMsg = document.createElement('span');
            abortMsg.style.cssText = 'color:#ef4444;font-size:12px;margin-left:8px;';
            abortMsg.textContent = '[已中止]';
            contentEl.appendChild(abortMsg);
          }
        }
      } else {
        console.error('[AIChat] 发送消息失败:', error);
        if (aiMsgEl) finalizeStreamingMessage(aiMsgEl, '抱歉，发生错误，请稍后重试。');
        else addMessage('assistant', '抱歉，发生错误，请稍后重试。');
      }
    }
  }

  // ========== 中止 ==========
  function abort() {
    if (_abortController) {
      _abortController.abort();
      _abortController = null;
    }
  }

  // ========== 工具处理器注册 ==========
  function registerToolHandler(name, handler) {
    _toolHandlers[name] = handler;
  }

  function _dispatchToolResult(result) {
    const handler = _toolHandlers[result.name];
    if (handler) {
      try {
        handler(result);
      } catch (e) {
        console.error(`[AIChat] 工具处理器 ${result.name} 执行失败:`, e);
      }
    }
  }

  // ========== 工具函数 ==========
  function _escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function clearMessages() {
    const container = document.getElementById('agentMessages');
    if (container) container.innerHTML = '';
  }

  function getConversationId() {
    return _conversationId;
  }

  function setConversationId(id) {
    _conversationId = id;
    if (id) {
      localStorage.setItem(_config.conversationIdKey, id);
    } else {
      localStorage.removeItem(_config.conversationIdKey);
    }
  }

  // ========== 导出API ==========
  const AIChat = {
    init,
    toggle,
    open,
    close,
    send,
    abort,
    addMessage,
    addStreamingMessage,
    appendStreamingContent,
    finalizeStreamingMessage,
    addToolStep,
    completeToolStep,
    showStopButton,
    hideStopButton,
    addAttachmentCard,
    newConversation,
    clearMessages,
    loadProviderInfo,
    registerToolHandler,
    getConversationId,
    setConversationId,
  };

  // 全局注册
  global.AIChat = AIChat;

  // 兼容旧接口
  global.toggleAIChat = toggle;
  global.loadProviderInfo = loadProviderInfo;
  global.addMessageToUI = addMessage;

  // 自动初始化（DOM就绪后）
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => _autoInit());
  } else {
    _autoInit();
  }

  function _autoInit() {
    if (_initialized) return;
    if (document.getElementById('aiFloatBtn')) {
      _bindEvents();
      _initDragAndResize();
      _conversationId = localStorage.getItem('aiConversationId') || null;
      _initialized = true;
    }
  }

})(window);
