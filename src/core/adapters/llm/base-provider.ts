/**
 * BaseProvider Abstract Class
 * Common functionality for all LLM providers
 *
 * Evergreen Note Cultivator - Socratic Challenger 패턴 재사용
 */

import { requestUrl, RequestUrlParam } from 'obsidian';
import type {
  ILLMProvider,
  LLMMessage,
  LLMResponse,
  LLMGenerateOptions,
  LLMProviderType,
} from '../../domain/interfaces/llm-provider.interface';
import { AI_PROVIDERS } from '../../domain/constants/model-configs';

export abstract class BaseProvider implements ILLMProvider {
  protected apiKey: string = '';
  protected model: string = '';

  abstract readonly providerType: LLMProviderType;
  abstract readonly name: string;

  get modelId(): string {
    return this.model || this.config.defaultModel;
  }

  protected get config() {
    return AI_PROVIDERS[this.providerType];
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  setModel(modelId: string): void {
    this.model = modelId;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * HTTP request wrapper using Obsidian's requestUrl
   */
  protected async makeRequest<T>(options: RequestUrlParam): Promise<T> {
    try {
      const response = await requestUrl(options);
      return response.json as T;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  /**
   * Handle errors and return normalized response
   */
  protected handleError(error: unknown): LLMResponse {
    // Check if already normalized (from makeRequest throwing normalizeError result)
    if (typeof error === 'object' && error !== null && 'message' in error && 'code' in error) {
      return {
        success: false,
        content: '',
        error: (error as { message: string }).message,
      };
    }
    const normalized = this.normalizeError(error);
    return {
      success: false,
      content: '',
      error: normalized.message,
    };
  }

  /**
   * Normalize various error types to standard format
   */
  private normalizeError(error: unknown): { message: string; code: string } {
    // Log full error for debugging
    console.error('[Evergreen Cultivator] API Error:', error);

    if (error instanceof Error) {
      if (error.message.includes('429') || error.message.includes('rate')) {
        return { message: '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.', code: 'RATE_LIMIT' };
      }
      if (error.message.includes('401') || error.message.includes('403')) {
        return { message: 'API 키가 유효하지 않거나 권한이 없습니다.', code: 'AUTH_ERROR' };
      }
      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        return { message: '요청 시간이 초과되었습니다. 다시 시도해주세요.', code: 'TIMEOUT' };
      }
      return { message: error.message, code: 'UNKNOWN' };
    }
    return { message: '알 수 없는 오류가 발생했습니다.', code: 'UNKNOWN' };
  }

  abstract generate(messages: LLMMessage[], options?: LLMGenerateOptions): Promise<LLMResponse>;

  /**
   * Test API key validity - must be implemented by each provider
   */
  abstract testApiKey(apiKey: string): Promise<boolean>;

  async simpleGenerate(
    userPrompt: string,
    systemPrompt?: string,
    options?: LLMGenerateOptions
  ): Promise<LLMResponse> {
    const messages: LLMMessage[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: userPrompt });
    return this.generate(messages, options);
  }
}
