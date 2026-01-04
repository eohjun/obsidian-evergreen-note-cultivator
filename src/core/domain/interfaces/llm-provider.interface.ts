/**
 * ILLMProvider Interface
 * LLM 프로바이더 추상화 인터페이스
 *
 * Socratic Challenger와 동일한 패턴 사용 (코드 재사용)
 */

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  success: boolean;
  content: string;
  error?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cost?: number;
  };
}

export interface LLMGenerateOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
}

export interface ILLMProvider {
  /**
   * 프로바이더 이름
   */
  readonly name: string;

  /**
   * 현재 모델 ID
   */
  readonly modelId: string;

  /**
   * API 키 설정
   */
  setApiKey(apiKey: string): void;

  /**
   * 모델 설정
   */
  setModel(modelId: string): void;

  /**
   * 텍스트 생성
   */
  generate(
    messages: LLMMessage[],
    options?: LLMGenerateOptions
  ): Promise<LLMResponse>;

  /**
   * 간단한 텍스트 생성 (시스템 프롬프트 + 사용자 프롬프트)
   */
  simpleGenerate(
    userPrompt: string,
    systemPrompt?: string,
    options?: LLMGenerateOptions
  ): Promise<LLMResponse>;

  /**
   * 프로바이더가 사용 가능한지 확인
   */
  isAvailable(): boolean;

  /**
   * API 키 유효성 테스트
   */
  testApiKey(apiKey: string): Promise<boolean>;
}

/**
 * 프로바이더 타입
 */
export type LLMProviderType = 'claude' | 'openai' | 'gemini' | 'grok';

/**
 * 모델 설정
 */
export interface ModelConfig {
  id: string;
  name: string;
  provider: LLMProviderType;
  maxTokens: number;
  inputCostPer1k: number;
  outputCostPer1k: number;
}
