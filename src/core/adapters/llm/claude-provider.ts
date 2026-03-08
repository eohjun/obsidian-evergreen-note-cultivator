/**
 * Claude Provider — 공유 빌더/파서 사용
 *
 * 추가: Extended thinking 지원 (Opus 4.6, Sonnet 4.6)
 * 수정: Thinking 블록 필터링, thinking 시 temperature 자동 차단
 */

import { BaseProvider } from './base-provider';
import type { LLMProviderType } from '../../domain/interfaces/llm-provider.interface';
import type { LLMMessage, LLMResponse, LLMGenerateOptions } from '../../domain/interfaces/llm-provider.interface';
import { buildAnthropicBody, parseAnthropicResponse } from 'obsidian-llm-shared';

export class ClaudeProvider extends BaseProvider {
  readonly providerType: LLMProviderType = 'claude';
  readonly name = 'Anthropic Claude';

  async testApiKey(apiKey: string): Promise<boolean> {
    try {
      const body = buildAnthropicBody(
        [{ role: 'user', content: 'Hello' }],
        this.config.defaultModel,
        { maxTokens: 10 }
      );
      const json = await this.makeRequest<Record<string, unknown>>({
        url: `${this.config.endpoint}/messages`,
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      return parseAnthropicResponse(json).success;
    } catch {
      return false;
    }
  }

  async generate(messages: LLMMessage[], options?: LLMGenerateOptions): Promise<LLMResponse> {
    if (!this.isAvailable()) {
      return { success: false, content: '', error: 'API 키가 설정되지 않았습니다.' };
    }

    try {
      const body = buildAnthropicBody(messages, this.modelId, {
        maxTokens: options?.maxTokens,
        temperature: options?.temperature,
      });

      const json = await this.makeRequest<Record<string, unknown>>({
        url: `${this.config.endpoint}/messages`,
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const result = parseAnthropicResponse(json);
      if (!result.success) {
        return { success: false, content: '', error: result.error };
      }

      return {
        success: true,
        content: result.text,
        usage: {
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          totalTokens: result.usage.totalTokens,
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }
}
