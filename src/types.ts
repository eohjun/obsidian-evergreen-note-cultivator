/**
 * Plugin Settings and Types
 * Evergreen Note Cultivator
 */

import type { LLMProviderType } from './core/domain';

/**
 * AI 설정
 */
export interface AISettings {
  provider: LLMProviderType;
  apiKeys: Partial<Record<LLMProviderType, string>>;
  models: Partial<Record<LLMProviderType, string>>;
  maxTokens: number;
  temperature: number;
  budgetLimit?: number;
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
 * 평가 설정
 */
export interface AssessmentSettings {
  autoAssessOnOpen: boolean;
  showDetailedFeedback: boolean;
  enableSplitSuggestions: boolean;
  enableConnectionSuggestions: boolean;
}

/**
 * 이력 설정
 */
export interface HistorySettings {
  maxPerNote: number;
  enabled: boolean;
}

/**
 * 플러그인 설정
 */
export interface PluginSettings {
  ai: AISettings;
  display: DisplaySettings;
  assessment: AssessmentSettings;
  history: HistorySettings;
  frontmatterKey: string;
}

/**
 * 기본 설정값
 */
export const DEFAULT_SETTINGS: PluginSettings = {
  ai: {
    provider: 'claude',
    apiKeys: {},
    models: {},
    maxTokens: 4096,
    temperature: 0.7,
  },
  display: {
    showMaturityInExplorer: true,
    showScoreInSidebar: true,
    autoOpenSidebar: false,
  },
  assessment: {
    autoAssessOnOpen: false,
    showDetailedFeedback: true,
    enableSplitSuggestions: true,
    enableConnectionSuggestions: true,
  },
  history: {
    maxPerNote: 5,
    enabled: true,
  },
  frontmatterKey: 'growth-stage',
};
