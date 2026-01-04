/**
 * Plugin Settings and Types
 */

import { LLMProviderType } from './core/domain';

/**
 * AI 설정
 */
export interface AISettings {
  provider: LLMProviderType;
  model: string;
  apiKeys: Record<LLMProviderType, string>;
  maxTokens: number;
  temperature: number;
}

/**
 * 표시 설정
 */
export interface DisplaySettings {
  showMaturityInExplorer: boolean;
  showScoreInSidebar: boolean;
  autoOpenSidebar: boolean;
}

/**
 * 플러그인 설정
 */
export interface PluginSettings {
  ai: AISettings;
  display: DisplaySettings;
  frontmatterKey: string;
}

/**
 * 기본 설정값
 */
export const DEFAULT_SETTINGS: PluginSettings = {
  ai: {
    provider: 'claude',
    model: 'claude-sonnet-4-20250514',
    apiKeys: {
      claude: '',
      openai: '',
      gemini: '',
      grok: '',
    },
    maxTokens: 4096,
    temperature: 0.7,
  },
  display: {
    showMaturityInExplorer: true,
    showScoreInSidebar: true,
    autoOpenSidebar: false,
  },
  frontmatterKey: 'growth-stage',
};
