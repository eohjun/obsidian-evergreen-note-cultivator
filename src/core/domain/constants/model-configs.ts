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
    defaultModel: 'claude-sonnet-4-6',
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    displayName: 'Gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta',
    apiKeyPrefix: 'AIza',
    defaultModel: 'gemini-2.5-flash',
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    displayName: 'OpenAI',
    endpoint: 'https://api.openai.com/v1',
    apiKeyPrefix: 'sk-',
    defaultModel: 'gpt-5-mini',
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
  'claude-opus-4-6': {
    id: 'claude-opus-4-6',
    displayName: 'Claude Opus 4.6',
    provider: 'claude',
    maxTokens: 128000,
  },
  'claude-sonnet-4-6': {
    id: 'claude-sonnet-4-6',
    displayName: 'Claude Sonnet 4.6',
    provider: 'claude',
    maxTokens: 64000,
  },
  'claude-haiku-4-5-20251001': {
    id: 'claude-haiku-4-5-20251001',
    displayName: 'Claude Haiku 4.5',
    provider: 'claude',
    maxTokens: 64000,
  },

  // Gemini Models
  'gemini-3.1-pro-preview': {
    id: 'gemini-3.1-pro-preview',
    displayName: 'Gemini 3.1 Pro',
    provider: 'gemini',
    maxTokens: 65536,
  },
  'gemini-2.5-flash': {
    id: 'gemini-2.5-flash',
    displayName: 'Gemini 2.5 Flash',
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
  'gpt-5.4': {
    id: 'gpt-5.4',
    displayName: 'GPT-5.4',
    provider: 'openai',
    maxTokens: 128000,
  },
  'gpt-5-mini': {
    id: 'gpt-5-mini',
    displayName: 'GPT-5 Mini',
    provider: 'openai',
    maxTokens: 128000,
  },
  'gpt-5-nano': {
    id: 'gpt-5-nano',
    displayName: 'GPT-5 Nano',
    provider: 'openai',
    maxTokens: 128000,
  },

  // Grok Models
  'grok-4-1-fast': {
    id: 'grok-4-1-fast',
    displayName: 'Grok 4.1 Fast',
    provider: 'grok',
    maxTokens: 16384,
  },
  'grok-4-1-fast-non-reasoning': {
    id: 'grok-4-1-fast-non-reasoning',
    displayName: 'Grok 4.1 Fast (Non-Reasoning)',
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
