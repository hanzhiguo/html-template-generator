/**
 * LLM 客户端工厂
 * 根据供应商类型创建对应的 API 客户端
 */
const OpenAI = require('openai');
const config = require('./config');

class LLMClient {
  constructor(provider = null, options = {}) {
    this.provider = provider || config.defaultProvider;
    this.providerConfig = config.providers[this.provider] || config.providers.ollama;
    this.client = this._createClient();
  }

  _createClient() {
    switch (this.provider) {
      case 'deepseek':
      case 'zhipu':
      case 'ollama':
        return new OpenAI({
          apiKey: this.providerConfig.apiKey || 'dummy',
          baseURL: this.providerConfig.baseUrl
        });
      default:
        throw new Error(`Unknown provider: ${this.provider}`);
    }
  }

  async chat(messages, tools = []) {
    const requestOptions = {
      model: this.providerConfig.model,
      messages,
      max_tokens: config.maxTokens
    };

    if (tools && tools.length > 0) {
      requestOptions.tools = tools;
      requestOptions.tool_choice = 'auto';
    }

    try {
      const response = await this.client.chat.completions.create(requestOptions);
      return this._parseResponse(response);
    } catch (error) {
      if (tools && tools.length > 0 && requestOptions.tools) {
        console.log(`[LLMClient] ${this.provider} tools call failed, retrying without tools...`);
        delete requestOptions.tools;
        delete requestOptions.tool_choice;
        try {
          const response = await this.client.chat.completions.create(requestOptions);
          return this._parseResponse(response);
        } catch (retryError) {
          console.error(`[LLMClient] ${this.provider} retry also failed:`, retryError.message);
          throw retryError;
        }
      }
      console.error(`[LLMClient] ${this.provider} API error:`, error.message);
      throw error;
    }
  }

  async *chatStream(messages, tools = []) {
    const requestOptions = {
      model: this.providerConfig.model,
      messages,
      max_tokens: config.maxTokens,
      stream: true
    };

    if (tools && tools.length > 0) {
      requestOptions.tools = tools;
      requestOptions.tool_choice = 'auto';
    }

    let fullContent = '';
    let toolCalls = [];
    let finishReason = '';

    try {
      const stream = await this.client.chat.completions.create(requestOptions);

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;

        if (delta?.content) {
          fullContent += delta.content;
          yield { type: 'content', content: delta.content };
        }

        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index || 0;
            if (!toolCalls[idx]) {
              toolCalls[idx] = { id: tc.id || '', type: 'function', function: { name: '', arguments: '' } };
            }
            if (tc.id) toolCalls[idx].id = tc.id;
            if (tc.function?.name) toolCalls[idx].function.name += tc.function.name;
            if (tc.function?.arguments) toolCalls[idx].function.arguments += tc.function.arguments;
          }
        }

        if (chunk.choices[0]?.finish_reason) {
          finishReason = chunk.choices[0].finish_reason;
        }
      }

      yield {
        type: 'done',
        content: fullContent,
        tool_calls: toolCalls.filter(t => t && t.id),
        finish_reason: finishReason
      };
    } catch (error) {
      if (tools && tools.length > 0 && requestOptions.tools) {
        console.log(`[LLMClient] ${this.provider} stream with tools failed, retrying without tools...`);
        delete requestOptions.tools;
        delete requestOptions.tool_choice;
        try {
          const stream = await this.client.chat.completions.create(requestOptions);
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;
            if (delta?.content) {
              fullContent += delta.content;
              yield { type: 'content', content: delta.content };
            }
            if (chunk.choices[0]?.finish_reason) {
              finishReason = chunk.choices[0].finish_reason;
            }
          }
          yield { type: 'done', content: fullContent, tool_calls: [], finish_reason: finishReason };
        } catch (retryError) {
          console.error(`[LLMClient] ${this.provider} stream retry also failed:`, retryError.message);
          yield { type: 'error', error: retryError.message };
        }
      } else {
        console.error(`[LLMClient] ${this.provider} stream error:`, error.message);
        yield { type: 'error', error: error.message };
      }
    }
  }

  _parseResponse(response) {
    const choice = response.choices[0];
    const message = choice.message;

    return {
      content: message.content,
      tool_calls: message.tool_calls || [],
      finish_reason: choice.finish_reason
    };
  }

  async isAvailable() {
    try {
      if (this.provider === 'ollama') {
        const response = await fetch(`${this.providerConfig.baseUrl}/models`);
        return response.ok;
      }
      return true;
    } catch {
      return false;
    }
  }

  getInfo() {
    return {
      provider: this.provider,
      model: this.providerConfig.model,
      baseUrl: this.providerConfig.baseUrl
    };
  }
}

function createClient(provider, options) {
  return new LLMClient(provider, options);
}

module.exports = { LLMClient, createClient };