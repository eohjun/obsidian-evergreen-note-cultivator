// Value Objects
export { MaturityLevel, QualityDimension, QualityScore } from './value-objects';
export type {
  MaturityLevelEnum,
  MaturityLevelConfig,
  QualityDimensionType,
  QualityDimensionConfig,
  QualityDimensionData,
  QualityScoreData,
} from './value-objects';

// Entities
export { NoteAssessment } from './entities';
export type {
  NoteAssessmentData,
  ImprovementSuggestion,
  SplitSuggestion,
  ConnectionSuggestion,
  GrowthGuide,
  AssessmentRecord,
  ScoreDelta,
} from './entities';

// Interfaces (Ports)
export type {
  INoteRepository,
  NoteData,
  NoteMetadata,
  NoteSummary,
  NoteSearchOptions,
  ILLMProvider,
  LLMMessage,
  LLMResponse,
  LLMGenerateOptions,
  LLMProviderType,
} from './interfaces';

// Constants (from obsidian-llm-shared via model-configs.ts)
export {
  AI_PROVIDERS,
  MODEL_CONFIGS,
  getModelsByProvider,
  getModelConfigById,
  getModelConfig,
  getProviderConfig,
  isReasoningModel,
  getEffectiveMaxTokens,
  getThinkingConfig,
  calculateCost,
} from './constants';
export type { AIProviderType, AIProviderConfig, ModelConfig } from './constants';
