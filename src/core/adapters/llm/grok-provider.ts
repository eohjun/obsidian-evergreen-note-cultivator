/**
 * Grok Provider
 * xAI Grok API implementation (OpenAI-compatible)
 *
 * Evergreen Note Cultivator - Socratic Challenger 패턴 재사용
 */

import { BaseProvider } from './base-provider';
import type { LLMProviderType } from '../../domain/interfaces/llm-provider.interface';
import type { LLMMessage, LLMResponse, LLMGenerateOptions } from '../../domain/interfaces/llm-provider.interface';

interface GrokMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GrokRequest {
  model: string;
  messages: GrokMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stop?: string[];
}

interface GrokResponse {
  choices: { message: { content: string } }[];
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  error?: { message: string; type: string };
}

export class GrokProvider extends BaseProvider {
  readonly providerType: LLMProviderType = 'grok';
  readonly name = 'xAI Grok';

  async testApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await this.makeRequest<GrokResponse>({
        url: `${this.config.endpoint}/chat/completions`,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.defaultModel,
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 10,
        }),
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

    const grokMessages: GrokMessage[] = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const requestBody: GrokRequest = {
      model: this.modelId,
      messages: grokMessages,
      max_tokens: options?.maxTokens ?? 4096,
      temperature: options?.temperature ?? 0.7,
    };

    if (options?.topP !== undefined) {
      requestBody.top_p = options.topP;
    }

    if (options?.stopSequences) {
      requestBody.stop = options.stopSequences;
    }

    // Debug logging
    console.log('[Evergreen Cultivator] Grok API Request:', {
      model: this.modelId,
      messagesCount: grokMessages.length,
    });

    try {
      const response = await this.makeRequest<GrokResponse>({
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
