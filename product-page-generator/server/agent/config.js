/**
 * Agent 配置
 * 支持多供应商：DeepSeek、智谱GLM、Ollama本地模型
 */
module.exports = {
  // 默认供应商
  defaultProvider: process.env.LLM_PROVIDER || 'ollama',

  // 供应商配置
  providers: {
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseUrl: 'https://api.deepseek.com/v1',
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat'
    },
    zhipu: {
      apiKey: process.env.ZHIPU_API_KEY,
      baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
      model: process.env.ZHIPU_MODEL || 'glm-4-flash'
    },
    ollama: {
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
      model: process.env.OLLAMA_MODEL || 'gemma4:e4b'
    }
  },

  // Agent 配置
  maxIterations: 10,
  maxTokens: 4096,

  // 知识库配置
  knowledge: {
    // MD 知识库目录
    mdDir: process.env.KB_MD_DIR || 'knowledge',
    // 搜索结果数量
    searchLimit: 5
  }
};
