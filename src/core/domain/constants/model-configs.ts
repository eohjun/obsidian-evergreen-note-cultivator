/**
 * Model Configurations — re-exported from obsidian-llm-shared
 *
 * obsidian-llm-shared is the single source of truth for model configs.
 * This file adds backward-compatible aliases used within this plugin.
 */

export {
  type AIProviderType,
  type AIProviderConfig,
  type ModelConfig,
  AI_PROVIDERS,
  MODEL_CONFIGS,
  getModelsByProvider,
  getModelConfig,
  getProviderConfig,
  isReasoningModel,
  getEffectiveMaxTokens,
  getThinkingConfig,
  calculateCost,
} from 'obsidian-llm-shared';

import { getModelConfig } from 'obsidian-llm-shared';

/**
 * Backward-compatible alias: getModelConfigById → getModelConfig
 */
export const getModelConfigById = getModelConfig;
