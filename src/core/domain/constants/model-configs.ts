/**
 * Model Configurations
 * Centralized model settings and provider endpoints
 *
 * Evergreen Note Cultivator - Socratic Challenger 패턴 재사용
 */

import type { LLMProviderType } from '../interfaces/llm-provider.interface';

export interface AIProviderConfig {
  id: LLMProviderType;
  name: string;
  displayName: string;
  endpoint: string;
  defaultModel: string;
  apiKeyPrefix?: string;
}

export interface ModelConfig {
  id: string;
  displayName: string;
  provider: LLMProviderType;
  maxTokens: number;
}

export const AI_PROVIDERS: Record<LLMProviderType, AIProviderConfig> = {
  claude: {
    id: 'claude',
    name: 'Anthropic Claude',
    displayName: 'Claude',
    endpoint: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-sonnet-4-5-20250929',
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    displayName: 'Gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta',
    apiKeyPrefix: 'AIza',
    defaultModel: 'gemini-3-flash-preview',
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    displayName: 'OpenAI',
    endpoint: 'https://api.openai.com/v1',
    apiKeyPrefix: 'sk-',
    defaultModel: 'gpt-5.2',
  },
  grok: {
    id: 'grok',
    name: 'xAI Grok',
    displayName: 'Grok',
    endpoint: 'https://api.x.ai/v1',
    defaultModel: 'grok-4-1-fast',
  },
};

export const MODEL_CONFIGS: Record<string, ModelConfig> = {
  // Claude Models
  'claude-sonnet-4-5-20250929': {
    id: 'claude-sonnet-4-5-20250929',
    displayName: 'Claude Sonnet 4.5',
    provider: 'claude',
    maxTokens: 16384,
  },
  'claude-3-5-haiku-20241022': {
    id: 'claude-3-5-haiku-20241022',
    displayName: 'Claude 3.5 Haiku',
    provider: 'claude',
    maxTokens: 8192,
  },

  // Gemini Models
  'gemini-3-flash-preview': {
    id: 'gemini-3-flash-preview',
    displayName: 'Gemini 3 Flash',
    provider: 'gemini',
    maxTokens: 65536,
  },
  'gemini-2.0-flash': {
    id: 'gemini-2.0-flash',
    displayName: 'Gemini 2.0 Flash',
    provider: 'gemini',
    maxTokens: 8192,
  },

  // OpenAI Models
  'gpt-5.2': {
    id: 'gpt-5.2',
    displayName: 'GPT-5.2',
    provider: 'openai',
    maxTokens: 32768,
  },
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    displayName: 'GPT-4o Mini',
    provider: 'openai',
    maxTokens: 16384,
  },

  // Grok Models
  'grok-4-1-fast': {
    id: 'grok-4-1-fast',
    displayName: 'Grok 4.1 Fast',
    provider: 'grok',
    maxTokens: 16384,
  },
};

/**
 * Get models for a specific provider
 */
export function getModelsByProvider(provider: LLMProviderType): ModelConfig[] {
  return Object.values(MODEL_CONFIGS).filter((m) => m.provider === provider);
}

/**
 * Get model config by ID
 */
export function getModelConfigById(modelId: string): ModelConfig | undefined {
  return MODEL_CONFIGS[modelId];
}
