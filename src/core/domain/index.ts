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
  ModelConfig,
} from './interfaces';
