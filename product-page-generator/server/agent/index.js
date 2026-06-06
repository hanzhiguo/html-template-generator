/**
 * Agent 核心
 * 负责管理工具调用循环和对话执行
 */
const { LLMClient } = require('./client');
const { definitions } = require('./tools/definitions');
const { executeTools } = require('./tools/executor');
const conversation = require('./conversation');
const config = require('./config');

const SYSTEM_PROMPT = `你是产品详情页生成系统的AI助手。你有以下工具可用：

1. query_products - 查询产品数据库，按关键词搜索产品信息
   - 输入参数：query (搜索关键词), limit (结果数量，默认10)
   - 输出：产品的基本信息、规格参数、卖点等

2. query_kb - 搜索知识库中的文档内容
   - 输入参数：query (搜索关键词), limit (结果数量，默认5)

3. read_file - 读取本地文件内容
   - 输入参数：path (文件路径)

4. write_file - 写入内容到本地文件
   - 输入参数：path (文件路径), content (文件内容)

5. get_product_attachments - 查询指定产品的所有附件（图片、文档、说明书、视频等）
   - 输入参数：product_id (产品ID), types (筛选类型：images/documents/all，默认all)
   - 输出：附件的下载链接、文件信息、类型等

6. get_download_link - 获取指定附件的直接下载链接
   - 输入参数：attachment_id (附件ID), type (附件类型：image/document)
   - 输出：完整的下载URL地址

7. get_product_specs - 获取指定产品的完整规格参数
   - 输入参数：product_id (产品ID)
   - 输出：产品的尺寸、材质、工艺、卖点等完整规格

8. read_product_document - 读取产品关联的文档
   - 输入参数：product_id (产品ID)
   - 输出：产品文档的完整内容

9. read_product_md_file - 直接读取MD目录中的产品规格文档
   - 输入参数：product_id (产品ID，数字)
   - 输出：产品规格文档的完整内容和解析后的数据

10. search_md_files - 【重要！】搜索MD文件夹中的产品规格文档
    - 输入参数：keyword (搜索关键词，如型号SH01、产品名地形粉、SKU等), search_content (是否搜索文件内容，默认false)
    - 输出：匹配的MD文档列表及解析后的产品信息
    - **当用户通过型号、产品名称、关键词查找产品时，必须优先使用此工具！**

11. generate_main_image_content - 生成产品主图内容参数
    - 输入参数：product_id (产品ID), target_region (目标市场，如jp/us/eu)
    - 输出：主标题、副标题、卖点等主图内容建议

**重要规则：**
- 当用户通过型号（如SH01、HDD-539）或产品名称（如"地形粉"、"灌木丛"）查找产品时，**必须优先调用 search_md_files 工具**搜索MD文档
- 当用户通过产品ID查找产品时，调用 read_product_md_file 或 get_product_specs 获取完整信息
- 当用户需要生成主图内容时，调用 generate_main_image_content 工具
- 当用户询问产品相关信息时，如果数据库中没有，再调用 query_products 工具
- 当用户询问系统使用、帮助文档时，调用 query_kb 工具
- 当用户需要查看或下载产品图片、说明书、视频等附件时，调用 get_product_attachments 工具
- 永远不要编造产品数据，必须基于工具返回的真实数据回答
- 如果工具返回空结果，告诉用户未找到匹配的产品`;

class AIAgent {
  constructor(options = {}) {
    this.provider = options.provider || config.defaultProvider;
    this.conversationId = options.conversationId;
    this.userId = options.userId;
    this.maxIterations = options.maxIterations || config.maxIterations;
    this.images = options.images || null; // 支持多模态图片

    this.client = new LLMClient(this.provider);
    this.messages = [];
  }

  async init() {
    this.messages = [{
      role: 'system',
      content: SYSTEM_PROMPT
    }];

    if (this.conversationId) {
      const history = conversation.getMessages(this.conversationId);
      if (history.length > 0) {
        this.messages = this.messages.concat(history);
      }
    }

    if (!this.conversationId && this.userId) {
      const conv = conversation.createConversation(this.userId, this.provider);
      this.conversationId = conv.id;
    }

    return this;
  }

  async chat(userMessage) {
    await this.init();

    // 保存原始消息用于标题更新
    this.originalUserMessage = userMessage;

    // 构建用户消息内容（支持多模态）
    const userContent = this._buildUserContent(userMessage);

    this.messages.push(userContent);

    conversation.addMessage(this.conversationId, 'user', userMessage, {
      model: this.client.providerConfig.model,
      hasImages: !!this.images
    });

    const response = await this._runLoop();

    return {
      conversationId: this.conversationId,
      message: response.content,
      toolCalls: response.tool_calls || [],
      iterations: response.iterations
    };
  }

  _buildUserContent(userMessage) {
    // 如果有图片，构建多模态内容
    if (this.images && Array.isArray(this.images) && this.images.length > 0) {
      const content = [{ type: 'text', text: userMessage }];
      for (const imageBase64 of this.images) {
        content.push({
          type: 'image_url',
          image_url: {
            url: `data:image/jpeg;base64,${imageBase64}`,
            detail: 'high'
          }
        });
      }
      return { role: 'user', content };
    }
    // 普通文本消息
    return { role: 'user', content: userMessage };
  }

  async chatStream(userMessage, onChunk, abortSignal) {
    await this.init();

    // 保存原始消息用于标题更新
    this.originalUserMessage = userMessage;

    // 构建用户消息内容（支持多模态）
    const userContent = this._buildUserContent(userMessage);

    this.messages.push(userContent);

    conversation.addMessage(this.conversationId, 'user', userMessage, {
      model: this.client.providerConfig.model,
      hasImages: !!this.images
    });

    const response = await this._runLoopStream(onChunk, abortSignal);

    return {
      conversationId: this.conversationId,
      message: response.content,
      toolCalls: response.tool_calls || [],
      iterations: response.iterations
    };
  }

  async _runLoop() {
    let iterations = 0;

    while (iterations < this.maxIterations) {
      iterations++;

      const response = await this.client.chat(this.messages, definitions);

      this.messages.push({
        role: 'assistant',
        content: response.content,
        tool_calls: response.tool_calls
      });

      conversation.addMessage(this.conversationId, 'assistant', response.content, {
        tool_calls: response.tool_calls,
        model: this.client.providerConfig.model
      });

      if (!response.tool_calls || response.tool_calls.length === 0) {
        try {
          if (iterations === 1 && this.messages.length >= 2) {
            const title = (this.originalUserMessage || userMessage).substring(0, 30);
            conversation.updateTitle(this.conversationId, title);
          }
        } catch (e) {
          console.error('[Agent] updateTitle error:', e.message);
        }

        return {
          content: response.content,
          iterations
        };
      }

      const toolResults = await executeTools(response.tool_calls);
      this.messages.push(...toolResults);

      for (const result of toolResults) {
        conversation.addMessage(this.conversationId, 'tool', result.content, {
          model: this.client.providerConfig.model
        });
      }
    }

    return {
      content: '抱歉，我需要更多时间来处理这个请求。',
      iterations,
      truncated: true
    };
  }

  async _runLoopStream(onChunk, abortSignal) {
    let iterations = 0;

    while (iterations < this.maxIterations) {
      if (abortSignal && abortSignal.aborted) {
        return { content: '已中止', iterations, aborted: true };
      }

      iterations++;

      const response = await this.client.chat(this.messages, definitions);

      if (response.tool_calls && response.tool_calls.length > 0) {
        if (onChunk) {
          onChunk({
            type: 'tool_start',
            tool_calls: response.tool_calls.map(tc => ({
              name: tc.function.name,
              args: tc.function.arguments
            }))
          });
        }

        this.messages.push({
          role: 'assistant',
          content: response.content,
          tool_calls: response.tool_calls
        });

        conversation.addMessage(this.conversationId, 'assistant', response.content, {
          tool_calls: response.tool_calls,
          model: this.client.providerConfig.model
        });

        const toolResults = await executeTools(response.tool_calls);

        if (onChunk) {
          const toolResultsSummary = toolResults.map(r => {
            let parsedContent = null;
            try {
              parsedContent = JSON.parse(r.content);
            } catch (e) {}

            const isAttachmentTool = r.tool_name === 'get_product_attachments' || r.tool_name === 'get_download_link';

            return {
              name: r.tool_name,
              summary: r.content ? r.content.substring(0, 200) : '完成',
              ...(isAttachmentTool && parsedContent ? { data: parsedContent } : {})
            };
          });

          onChunk({
            type: 'tool_result',
            results: toolResultsSummary
          });
        }

        this.messages.push(...toolResults);

        for (const result of toolResults) {
          conversation.addMessage(this.conversationId, 'tool', result.content, {
            model: this.client.providerConfig.model
          });
        }
        continue;
      }

      try {
        if (iterations === 1 && this.messages.length >= 2) {
          const title = userMessage.substring(0, 30);
          conversation.updateTitle(this.conversationId, title);
        }
      } catch (e) {
        console.error('[Agent] updateTitle error:', e.message);
      }

      if (onChunk) {
        let streamedContent = '';
        for await (const chunk of this.client.chatStream(this.messages, definitions)) {
          if (abortSignal && abortSignal.aborted) {
            return { content: streamedContent || '已中止', iterations, aborted: true };
          }
          if (chunk.type === 'content') {
            streamedContent += chunk.content;
            onChunk({ type: 'content', content: chunk.content });
          } else if (chunk.type === 'done') {
            this.messages.push({
              role: 'assistant',
              content: streamedContent
            });
            conversation.addMessage(this.conversationId, 'assistant', streamedContent, {
              model: this.client.providerConfig.model
            });
            return {
              content: streamedContent,
              iterations
            };
          } else if (chunk.type === 'error') {
            this.messages.push({
              role: 'assistant',
              content: response.content || '抱歉，流式输出时发生错误。'
            });
            conversation.addMessage(this.conversationId, 'assistant', response.content || '抱歉，流式输出时发生错误。', {
              model: this.client.providerConfig.model
            });
            return {
              content: response.content || '抱歉，流式输出时发生错误。',
              iterations
            };
          }
        }
      }

      this.messages.push({
        role: 'assistant',
        content: response.content
      });
      conversation.addMessage(this.conversationId, 'assistant', response.content, {
        model: this.client.providerConfig.model
      });
      return {
        content: response.content,
        iterations
      };
    }

    return {
      content: '抱歉，我需要更多时间来处理这个请求。',
      iterations,
      truncated: true
    };
  }

  getHistory() {
    return this.messages;
  }

  getInfo() {
    return {
      conversationId: this.conversationId,
      provider: this.provider,
      model: this.client.providerConfig.model,
      messageCount: this.messages.length
    };
  }
}

let userMessage = '';

async function runAgent(userMsg, options = {}) {
  userMessage = userMsg;
  const agent = new AIAgent(options);
  return agent.chat(userMsg);
}

async function quickQuery(message, provider = null) {
  const client = new LLMClient(provider);

  const messages = [
    { role: 'user', content: message }
  ];

  const response = await client.chat(messages, definitions);

  return {
    content: response.content,
    toolCalls: response.tool_calls
  };
}

module.exports = {
  AIAgent,
  runAgent,
  quickQuery
};