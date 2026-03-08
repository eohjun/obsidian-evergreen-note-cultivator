/**
 * Grok Provider — 공유 빌더/파서 사용
 *
 * 추가: Reasoning 모델 지원 (grok-4-1-fast)
 */

import { BaseProvider } from './base-provider';
import type { LLMProviderType } from '../../domain/interfaces/llm-provider.interface';
import type { LLMMessage, LLMResponse, LLMGenerateOptions } from '../../domain/interfaces/llm-provider.interface';
import { buildGrokBody, parseGrokResponse } from 'obsidian-llm-shared';

export class GrokProvider extends BaseProvider {
  readonly providerType: LLMProviderType = 'grok';
  readonly name = 'xAI Grok';

  async testApiKey(apiKey: string): Promise<boolean> {
    try {
      const body = buildGrokBody(
        [{ role: 'user', content: 'Hello' }],
        this.config.defaultModel,
        { maxTokens: 10 }
      );
      const json = await this.makeRequest<Record<string, unknown>>({
        url: `${this.config.endpoint}/chat/completions`,
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return parseGrokResponse(json).success;
    } catch {
      return false;
    }
  }

  async generate(messages: LLMMessage[], options?: LLMGenerateOptions): Promise<LLMResponse> {
    if (!this.isAvailable()) {
      return { success: false, content: '', error: 'API 키가 설정되지 않았습니다.' };
    }

    try {
      const body = buildGrokBody(messages, this.modelId, {
        maxTokens: options?.maxTokens,
        temperature: options?.temperature,
      });

      const json = await this.makeRequest<Record<string, unknown>>({
        url: `${this.config.endpoint}/chat/completions`,
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = parseGrokResponse(json);
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
