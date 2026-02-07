/**
 * AIService
 * LLM 프로바이더 통합 관리 서비스
 *
 * Socratic Challenger와 동일한 패턴 재사용
 */

import type {
  ILLMProvider,
  LLMMessage,
  LLMResponse,
  LLMGenerateOptions,
  LLMProviderType,
} from '../../domain';

export interface AISettings {
  provider: LLMProviderType;
  apiKeys: Partial<Record<LLMProviderType, string>>;
  models: Partial<Record<LLMProviderType, string>>;
  budgetLimit?: number;
}

export class AIService {
  private providers: Map<LLMProviderType, ILLMProvider> = new Map();
  private settings: AISettings;

  constructor(settings: AISettings) {
    this.settings = settings;
  }

  /**
   * 프로바이더 등록
   */
  registerProvider(type: LLMProviderType, provider: ILLMProvider): void {
    this.providers.set(type, provider);
  }

  /**
   * 설정 업데이트
   */
  updateSettings(settings: AISettings): void {
    this.settings = settings;
  }

  /**
   * 현재 프로바이더 가져오기
   */
  getCurrentProvider(): ILLMProvider | undefined {
    return this.providers.get(this.settings.provider);
  }

  /**
   * 현재 API 키 가져오기
   */
  getCurrentApiKey(): string | undefined {
    return this.settings.apiKeys[this.settings.provider];
  }

  /**
   * 현재 모델 가져오기
   */
  getCurrentModel(): string | undefined {
    return this.settings.models[this.settings.provider];
  }

  /**
   * 프로바이더가 사용 가능한지 확인
   */
  isAvailable(): boolean {
    const provider = this.getCurrentProvider();
    const apiKey = this.getCurrentApiKey();
    return !!provider && !!apiKey;
  }

  /**
   * 텍스트 생성
   */
  async generateText(
    messages: LLMMessage[],
    options?: LLMGenerateOptions
  ): Promise<LLMResponse> {
    const provider = this.getCurrentProvider();

    if (!provider) {
      return {
        success: false,
        content: '',
        error: '프로바이더가 선택되지 않았습니다.',
      };
    }

    if (!provider.isAvailable()) {
      return {
        success: false,
        content: '',
        error: 'API 키가 설정되지 않았습니다.',
      };
    }

    return provider.generate(messages, options);
  }

  /**
   * 간단한 텍스트 생성
   */
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
    return this.generateText(messages, options);
  }

  /**
   * 특정 타입의 프로바이더 가져오기
   */
  getProvider(type: LLMProviderType): ILLMProvider | undefined {
    return this.providers.get(type);
  }

  /**
   * 등록된 프로바이더 목록
   */
  getAvailableProviders(): LLMProviderType[] {
    return Array.from(this.providers.keys());
  }

  /**
   * 프로바이더가 구성되었는지 확인
   */
  isProviderConfigured(provider: LLMProviderType): boolean {
    return !!this.settings.apiKeys[provider];
  }
}

// Singleton management
let aiServiceInstance: AIService | null = null;

export function initializeAIService(settings: AISettings): AIService {
  aiServiceInstance = new AIService(settings);
  return aiServiceInstance;
}

export function getAIService(): AIService | null {
  return aiServiceInstance;
}

export function updateAIServiceSettings(settings: AISettings): void {
  if (aiServiceInstance) {
    aiServiceInstance.updateSettings(settings);
  }
}

export function resetAIService(): void {
  aiServiceInstance = null;
}
