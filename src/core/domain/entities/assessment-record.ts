/**
 * AssessmentRecord Entity
 * Lightweight snapshot of a NoteAssessment for history tracking.
 * Stores only scores and metadata to keep data.json small.
 */

import type { QualityDimensionType } from '../value-objects/quality-dimension';
import type { MaturityLevelEnum } from '../value-objects/maturity-level';

export interface AssessmentRecord {
  id: string;
  notePath: string;
  totalScore: number;
  dimensionScores: Record<QualityDimensionType, number>;
  maturityLevel: MaturityLevelEnum;
  assessedAt: number;
}

export interface ScoreDelta {
  totalDelta: number;
  dimensionDeltas: Partial<Record<QualityDimensionType, number>>;
  previousAssessedAt: number;
}
