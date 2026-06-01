/**
 * 设置 API 路由
 */
const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const auth = require('../middleware/auth').authMiddleware;

const envPath = path.join(__dirname, '../../.env');

// 获取当前配置
router.get('/config', auth, async (req, res) => {
  try {
    const config = require('../agent/config');

    res.json({
      defaultProvider: config.defaultProvider,
      providers: {
        deepseek: {
          configured: !!config.providers.deepseek.apiKey,
          model: config.providers.deepseek.model,
          hasApiKey: !!config.providers.deepseek.apiKey
        },
        zhipu: {
          configured: !!config.providers.zhipu.apiKey,
          model: config.providers.zhipu.model,
          hasApiKey: !!config.providers.zhipu.apiKey
        },
        ollama: {
          configured: true,
          baseUrl: config.providers.ollama.baseUrl,
          model: config.providers.ollama.model
        }
      },
      maxIterations: config.maxIterations,
      maxTokens: config.maxTokens
    });
  } catch (error) {
    console.error('[Get Config]', error);
    res.status(500).json({ error: error.message });
  }
});

// 更新配置
router.post('/config', auth, async (req, res) => {
  try {
    const { defaultProvider, providers } = req.body;

    // 读取现有.env文件
    let envContent = '';
    try {
      envContent = await fs.readFile(envPath, 'utf-8');
    } catch (e) {
      // 文件不存在，使用默认内容
      envContent = `# Environment Variables\n\n`;
    }

    // 更新配置
    const lines = envContent.split('\n');
    const updatedLines = [];
    const updatedKeys = new Set();

    for (const line of lines) {
      let updatedLine = line;

      // 更新默认供应商
      if (line.startsWith('LLM_PROVIDER=')) {
        updatedLine = `LLM_PROVIDER=${defaultProvider}`;
        updatedKeys.add('LLM_PROVIDER');
      }

      // 更新各供应商配置
      if (providers.deepseek) {
        if (line.startsWith('DEEPSEEK_API_KEY=') && providers.deepseek.apiKey) {
          updatedLine = `DEEPSEEK_API_KEY=${providers.deepseek.apiKey}`;
          updatedKeys.add('DEEPSEEK_API_KEY');
        }
        if (line.startsWith('DEEPSEEK_MODEL=') && providers.deepseek.model) {
          updatedLine = `DEEPSEEK_MODEL=${providers.deepseek.model}`;
          updatedKeys.add('DEEPSEEK_MODEL');
        }
      }

      if (providers.zhipu) {
        if (line.startsWith('ZHIPU_API_KEY=') && providers.zhipu.apiKey) {
          updatedLine = `ZHIPU_API_KEY=${providers.zhipu.apiKey}`;
          updatedKeys.add('ZHIPU_API_KEY');
        }
        if (line.startsWith('ZHIPU_MODEL=') && providers.zhipu.model) {
          updatedLine = `ZHIPU_MODEL=${providers.zhipu.model}`;
          updatedKeys.add('ZHIPU_MODEL');
        }
      }

      if (providers.ollama) {
        if (line.startsWith('OLLAMA_BASE_URL=') && providers.ollama.baseUrl) {
          updatedLine = `OLLAMA_BASE_URL=${providers.ollama.baseUrl}`;
          updatedKeys.add('OLLAMA_BASE_URL');
        }
        if (line.startsWith('OLLAMA_MODEL=') && providers.ollama.model) {
          updatedLine = `OLLAMA_MODEL=${providers.ollama.model}`;
          updatedKeys.add('OLLAMA_MODEL');
        }
      }

      updatedLines.push(updatedLine);
    }

    // 添加未存在的配置
    if (!updatedKeys.has('LLM_PROVIDER')) {
      updatedLines.push(`LLM_PROVIDER=${defaultProvider}`);
    }

    if (providers.deepseek) {
      if (!updatedKeys.has('DEEPSEEK_API_KEY') && providers.deepseek.apiKey) {
        updatedLines.push(`DEEPSEEK_API_KEY=${providers.deepseek.apiKey}`);
      }
      if (!updatedKeys.has('DEEPSEEK_MODEL') && providers.deepseek.model) {
        updatedLines.push(`DEEPSEEK_MODEL=${providers.deepseek.model}`);
      }
    }

    if (providers.zhipu) {
      if (!updatedKeys.has('ZHIPU_API_KEY') && providers.zhipu.apiKey) {
        updatedLines.push(`ZHIPU_API_KEY=${providers.zhipu.apiKey}`);
      }
      if (!updatedKeys.has('ZHIPU_MODEL') && providers.zhipu.model) {
        updatedLines.push(`ZHIPU_MODEL=${providers.zhipu.model}`);
      }
    }

    if (providers.ollama) {
      if (!updatedKeys.has('OLLAMA_BASE_URL') && providers.ollama.baseUrl) {
        updatedLines.push(`OLLAMA_BASE_URL=${providers.ollama.baseUrl}`);
      }
      if (!updatedKeys.has('OLLAMA_MODEL') && providers.ollama.model) {
        updatedLines.push(`OLLAMA_MODEL=${providers.ollama.model}`);
      }
    }

    // 写入文件
    await fs.writeFile(envPath, updatedLines.join('\n'), 'utf-8');

    res.json({
      success: true,
      message: '配置已保存，重启服务后生效'
    });
  } catch (error) {
    console.error('[Update Config]', error);
    res.status(500).json({ error: error.message });
  }
});

// 测试供应商连接
router.post('/test-provider', auth, async (req, res) => {
  try {
    const { provider } = req.body;
    const config = require('../agent/config');

    let testResult = {
      provider,
      status: 'unknown',
      message: ''
    };

    if (provider === 'ollama') {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(config.providers.ollama.baseUrl.replace('/v1', '/api/tags'), {
          method: 'GET',
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          testResult.status = 'success';
          testResult.message = `连接成功，可用模型：${data.models?.map(m => m.name).join(', ') || '无'}`;
        } else {
          testResult.status = 'error';
          testResult.message = `连接失败：HTTP ${response.status}`;
        }
      } catch (e) {
        testResult.status = 'error';
        testResult.message = `连接失败：${e.message}`;
      }
    } else if (provider === 'deepseek' || provider === 'zhipu') {
      if (config.providers[provider].apiKey) {
        testResult.status = 'configured';
        testResult.message = 'API Key已配置';
      } else {
        testResult.status = 'error';
        testResult.message = 'API Key未配置';
      }
    }

    res.json(testResult);
  } catch (error) {
    console.error('[Test Provider]', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取可用模型列表
router.get('/models/:provider', auth, async (req, res) => {
  try {
    const { provider } = req.params;
    const config = require('../agent/config');

    let models = [];

    if (provider === 'deepseek') {
      models = [
        { id: 'deepseek-chat', name: 'DeepSeek Chat' },
        { id: 'deepseek-coder', name: 'DeepSeek Coder' }
      ];
    } else if (provider === 'zhipu') {
      models = [
        { id: 'glm-4-flash', name: 'GLM-4-Flash (快速)' },
        { id: 'glm-4', name: 'GLM-4 (标准)' },
        { id: 'glm-4-plus', name: 'GLM-4-Plus (增强)' },
        { id: 'glm-3-turbo', name: 'GLM-3-Turbo' }
      ];
    } else if (provider === 'ollama') {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(config.providers.ollama.baseUrl.replace('/v1', '/api/tags'), {
          method: 'GET',
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          models = data.models?.map(m => ({ id: m.name, name: m.name })) || [];
        }
      } catch (e) {
        models = [
          { id: 'llama3', name: 'Llama 3' },
          { id: 'llama2', name: 'Llama 2' },
          { id: 'mistral', name: 'Mistral' },
          { id: 'qwen2', name: 'Qwen 2' }
        ];
      }
    }

    res.json({ provider, models });
  } catch (error) {
    console.error('[Get Models]', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
