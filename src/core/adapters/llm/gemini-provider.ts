/**
 * Gemini Provider — 공유 빌더/파서 사용
 */

import { BaseProvider } from './base-provider';
import type { LLMProviderType } from '../../domain/interfaces/llm-provider.interface';
import type { LLMMessage, LLMResponse, LLMGenerateOptions } from '../../domain/interfaces/llm-provider.interface';
import { buildGeminiBody, parseGeminiResponse, getGeminiGenerateUrl } from 'obsidian-llm-shared';

export class GeminiProvider extends BaseProvider {
  readonly providerType: LLMProviderType = 'gemini';
  readonly name = 'Google Gemini';

  async testApiKey(apiKey: string): Promise<boolean> {
    try {
      const body = buildGeminiBody(
        [{ role: 'user', content: 'Hello' }],
        this.config.defaultModel,
        { maxTokens: 10 }
      );
      const url = getGeminiGenerateUrl(this.config.defaultModel, apiKey, this.config.endpoint);
      const json = await this.makeRequest<Record<string, unknown>>({
        url,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return parseGeminiResponse(json).success;
    } catch {
      return false;
    }
  }

  async generate(messages: LLMMessage[], options?: LLMGenerateOptions): Promise<LLMResponse> {
    if (!this.isAvailable()) {
      return { success: false, content: '', error: 'API 키가 설정되지 않았습니다.' };
    }

    try {
      const body = buildGeminiBody(messages, this.modelId, {
        maxTokens: options?.maxTokens,
        temperature: options?.temperature,
      });

      const url = getGeminiGenerateUrl(this.modelId, this.apiKey, this.config.endpoint);

      const json = await this.makeRequest<Record<string, unknown>>({
        url,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = parseGeminiResponse(json);
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
