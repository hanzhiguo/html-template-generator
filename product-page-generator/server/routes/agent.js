/**
 * Agent API 路由
 */
const express = require('express');
const router = express.Router();
const { AIAgent, runAgent } = require('../agent/index');
const conversation = require('../agent/conversation');
const knowledge = require('../agent/knowledge');
const { definitions } = require('../agent/tools/definitions');
const auth = require('../middleware/auth').authMiddleware;

// 获取可用工具列表
router.get('/tools', (req, res) => {
  res.json({
    tools: definitions,
    count: definitions.length
  });
});

// 获取支持的供应商
router.get('/providers', (req, res) => {
  const config = require('../agent/config');
  res.json({
    defaultProvider: config.defaultProvider,
    providers: Object.keys(config.providers)
  });
});

// 对话
router.post('/chat', auth, async (req, res) => {
  try {
    const { message, conversationId, provider, images } = req.body;
    const userId = req.user.id;

    if (!message) {
      return res.status(400).json({ error: '消息内容不能为空' });
    }

    const config = require('../agent/config');
    const selectedProvider = provider || config.defaultProvider;
    const providerConfig = config.providers[selectedProvider];

    if (!providerConfig) {
      return res.status(400).json({ error: `未知的供应商: ${selectedProvider}` });
    }

    if (selectedProvider === 'ollama') {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        await fetch(providerConfig.baseUrl.replace('/v1', '/api/tags'), {
          method: 'GET',
          signal: controller.signal
        });
        clearTimeout(timeoutId);
      } catch (e) {
        return res.status(503).json({
          error: `无法连接Ollama服务 (${providerConfig.baseUrl})。请确保Ollama已启动并且模型已拉取。`
        });
      }
    }

    if ((selectedProvider === 'deepseek' || selectedProvider === 'zhipu') && !providerConfig.apiKey) {
      return res.status(400).json({ error: `${selectedProvider} 的API Key未配置，请在设置中配置。` });
    }

    // 如果有图片，构建多模态消息
    let finalMessage = message;
    if (images && Array.isArray(images) && images.length > 0) {
      // 图片已通过 base64 传递，在 runAgent 中处理
      finalMessage = message;
    }

    const result = await runAgent(finalMessage, {
      userId,
      conversationId,
      provider: selectedProvider,
      images: images
    });

    res.json(result);
  } catch (error) {
    console.error('[Agent Chat]', error);
    res.status(500).json({ error: error.message });
  }
});

// 流式对话
router.post('/chat/stream', auth, async (req, res) => {
  try {
    const { message, conversationId, provider } = req.body;
    const userId = req.user.id;

    if (!message) {
      return res.status(400).json({ error: '消息内容不能为空' });
    }

    const config = require('../agent/config');
    const selectedProvider = provider || config.defaultProvider;
    const providerConfig = config.providers[selectedProvider];

    if (!providerConfig) {
      return res.status(400).json({ error: `未知的供应商: ${selectedProvider}` });
    }

    if (selectedProvider === 'ollama') {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        await fetch(providerConfig.baseUrl.replace('/v1', '/api/tags'), {
          method: 'GET',
          signal: controller.signal
        });
        clearTimeout(timeoutId);
      } catch (e) {
        return res.status(503).json({
          error: `无法连接Ollama服务 (${providerConfig.baseUrl})。请确保Ollama已启动并且模型已拉取。`
        });
      }
    }

    if ((selectedProvider === 'deepseek' || selectedProvider === 'zhipu') && !providerConfig.apiKey) {
      return res.status(400).json({ error: `${selectedProvider} 的API Key未配置，请在设置中配置。` });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const abortController = new AbortController();

    req.on('close', () => {
      abortController.abort();
    });

    const { AIAgent } = require('../agent/index');

    const agent = new AIAgent({
      provider: selectedProvider,
      conversationId,
      userId
    });

    const result = await agent.chatStream(message, (event) => {
      if (event.type === 'content') {
        res.write(`data: ${JSON.stringify({ type: 'content', content: event.content })}\n\n`);
      } else if (event.type === 'tool_start') {
        res.write(`data: ${JSON.stringify({ type: 'tool_start', tool_calls: event.tool_calls })}\n\n`);
      } else if (event.type === 'tool_result') {
        res.write(`data: ${JSON.stringify({ type: 'tool_result', results: event.results })}\n\n`);
      }
    }, abortController.signal);

    if (result.aborted) {
      res.write(`data: ${JSON.stringify({ type: 'aborted' })}\n\n`);
    } else {
      res.write(`data: ${JSON.stringify({ type: 'done', conversationId: result.conversationId })}\n\n`);
    }
    res.end();
  } catch (error) {
    console.error('[Agent Chat Stream]', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
      res.end();
    }
  }
});

// 获取会话列表
router.get('/conversations', auth, (req, res) => {
  try {
    const conversations = conversation.getConversations(req.user.id);
    res.json({ conversations });
  } catch (error) {
    console.error('[Get Conversations]', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取会话详情
router.get('/conversations/:id', auth, (req, res) => {
  try {
    const conv = conversation.getConversation(req.params.id);
    if (!conv) {
      return res.status(404).json({ error: '会话不存在' });
    }

    // 检查权限
    if (conv.user_id !== req.user.id) {
      return res.status(403).json({ error: '无权访问此会话' });
    }

    const messages = conversation.getMessages(req.params.id);

    res.json({
      conversation: conv,
      messages
    });
  } catch (error) {
    console.error('[Get Conversation]', error);
    res.status(500).json({ error: error.message });
  }
});

// 删除会话
router.delete('/conversations/:id', auth, (req, res) => {
  try {
    const conv = conversation.getConversation(req.params.id);
    if (!conv) {
      return res.status(404).json({ error: '会话不存在' });
    }

    if (conv.user_id !== req.user.id) {
      return res.status(403).json({ error: '无权删除此会话' });
    }

    conversation.deleteConversation(req.params.id);

    res.json({ success: true });
  } catch (error) {
    console.error('[Delete Conversation]', error);
    res.status(500).json({ error: error.message });
  }
});

// 同步知识库
router.post('/kb/sync', auth, async (req, res) => {
  try {
    const stats = await knowledge.sync();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('[KB Sync]', error);
    res.status(500).json({ error: error.message });
  }
});

// 搜索知识库
router.get('/kb/search', auth, async (req, res) => {
  try {
    const { query, limit = 5 } = req.query;

    if (!query) {
      return res.status(400).json({ error: '搜索关键词不能为空' });
    }

    const results = await knowledge.search(query, { limit: parseInt(limit) });
    res.json(results);
  } catch (error) {
    console.error('[KB Search]', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取知识库统计
router.get('/kb/stats', auth, async (req, res) => {
  try {
    const stats = await knowledge.getStats();
    res.json(stats);
  } catch (error) {
    console.error('[KB Stats]', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
