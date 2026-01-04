/**
 * Claude Provider
 * Anthropic Claude API implementation
 *
 * Evergreen Note Cultivator - Socratic Challenger 패턴 재사용
 */

import { BaseProvider } from './base-provider';
import type { LLMProviderType } from '../../domain/interfaces/llm-provider.interface';
import type { LLMMessage, LLMResponse, LLMGenerateOptions } from '../../domain/interfaces/llm-provider.interface';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeRequest {
  model: string;
  messages: ClaudeMessage[];
  system?: string;
  max_tokens: number;
  temperature?: number;
}

interface ClaudeResponse {
  content: { type: string; text: string }[];
  usage: { input_tokens: number; output_tokens: number };
  error?: { type: string; message: string };
}

export class ClaudeProvider extends BaseProvider {
  readonly providerType: LLMProviderType = 'claude';
  readonly name = 'Anthropic Claude';
  private readonly API_VERSION = '2023-06-01';

  async testApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await this.makeRequest<ClaudeResponse>({
        url: `${this.config.endpoint}/messages`,
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': this.API_VERSION,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.defaultModel,
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 10,
        }),
      });
      return !response.error && !!response.content;
    } catch {
      return false;
    }
  }

  async generate(messages: LLMMessage[], options?: LLMGenerateOptions): Promise<LLMResponse> {
    if (!this.isAvailable()) {
      return { success: false, content: '', error: 'API 키가 설정되지 않았습니다.' };
    }

    const { claudeMessages, systemPrompt } = this.convertMessages(messages);

    const requestBody: ClaudeRequest = {
      model: this.modelId,
      messages: claudeMessages,
      max_tokens: options?.maxTokens ?? 4096,
      temperature: options?.temperature ?? 0.7,
    };

    if (systemPrompt) {
      requestBody.system = systemPrompt;
    }

    // Debug logging
    console.log('[Evergreen Cultivator] Claude API Request:', {
      model: this.modelId,
      messagesCount: claudeMessages.length,
      hasSystemPrompt: !!systemPrompt,
      maxTokens: requestBody.max_tokens,
    });

    try {
      const response = await this.makeRequest<ClaudeResponse>({
        url: `${this.config.endpoint}/messages`,
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': this.API_VERSION,
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

      const generatedText = response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('');

      return {
        success: true,
        content: generatedText,
        usage: response.usage
          ? {
              inputTokens: response.usage.input_tokens,
              outputTokens: response.usage.output_tokens,
              totalTokens: response.usage.input_tokens + response.usage.output_tokens,
            }
          : undefined,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private convertMessages(messages: LLMMessage[]): {
    claudeMessages: ClaudeMessage[];
    systemPrompt: string | null;
  } {
    const claudeMessages: ClaudeMessage[] = [];
    let systemPrompt: string | null = null;

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemPrompt = msg.content;
      } else {
        claudeMessages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      }
    }

    return { claudeMessages, systemPrompt };
  }
}
