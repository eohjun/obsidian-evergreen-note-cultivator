/**
 * OpenAI Provider
 * OpenAI GPT API implementation
 *
 * Evergreen Note Cultivator - Socratic Challenger 패턴 재사용
 */

import { BaseProvider } from './base-provider';
import type { LLMProviderType } from '../../domain/interfaces/llm-provider.interface';
import type { LLMMessage, LLMResponse, LLMGenerateOptions } from '../../domain/interfaces/llm-provider.interface';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stop?: string[];
}

interface OpenAIResponse {
  choices: { message: { content: string } }[];
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  error?: { message: string; type: string };
}

export class OpenAIProvider extends BaseProvider {
  readonly providerType: LLMProviderType = 'openai';
  readonly name = 'OpenAI';

  async testApiKey(apiKey: string): Promise<boolean> {
    try {
      const model = this.config.defaultModel;
      const isReasoningModel = model.startsWith('gpt-5') || model.startsWith('o1') || model.startsWith('o3');

      const requestBody: Record<string, unknown> = {
        model,
        messages: [{ role: 'user', content: 'Hello' }],
      };

      if (isReasoningModel) {
        requestBody.max_completion_tokens = 10;
      } else {
        requestBody.max_tokens = 10;
      }

      const response = await this.makeRequest<OpenAIResponse>({
        url: `${this.config.endpoint}/chat/completions`,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      return !response.error && response.choices && response.choices.length > 0;
    } catch {
      return false;
    }
  }

  async generate(messages: LLMMessage[], options?: LLMGenerateOptions): Promise<LLMResponse> {
    if (!this.isAvailable()) {
      return { success: false, content: '', error: 'API 키가 설정되지 않았습니다.' };
    }

    const openaiMessages: OpenAIMessage[] = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Check if this is a reasoning model (gpt-5.x, o1, o3)
    const isReasoningModel = this.modelId.startsWith('gpt-5') ||
                             this.modelId.startsWith('o1') ||
                             this.modelId.startsWith('o3');

    const requestBody: Record<string, unknown> = {
      model: this.modelId,
      messages: openaiMessages,
      temperature: options?.temperature ?? 0.7,
    };

    // Reasoning models use max_completion_tokens instead of max_tokens
    if (isReasoningModel) {
      requestBody.max_completion_tokens = options?.maxTokens ?? 4096;
    } else {
      requestBody.max_tokens = options?.maxTokens ?? 4096;
    }

    if (options?.topP !== undefined) {
      requestBody.top_p = options.topP;
    }

    if (options?.stopSequences) {
      requestBody.stop = options.stopSequences;
    }

    // Debug logging
    console.log('[Evergreen Cultivator] OpenAI API Request:', {
      model: this.modelId,
      isReasoningModel,
      messagesCount: openaiMessages.length,
    });

    try {
      const response = await this.makeRequest<OpenAIResponse>({
        url: `${this.config.endpoint}/chat/completions`,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.error) {
        return {
          success: false,
          content: '',
          error: response.error.message,
        };
      }

      const content = response.choices?.[0]?.message?.content ?? '';

      return {
        success: true,
        content,
        usage: response.usage
          ? {
              inputTokens: response.usage.prompt_tokens,
              outputTokens: response.usage.completion_tokens,
              totalTokens: response.usage.total_tokens,
            }
          : undefined,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }
}
