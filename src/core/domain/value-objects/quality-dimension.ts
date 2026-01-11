/**
 * QualityDimension Value Object
 * Immutable value object representing individual quality assessment dimensions
 *
 * Assessment dimensions (based on Zettelkasten principles):
 * - Atomicity: One note, one idea
 * - Connectivity: Connections to other notes
 * - Clarity: Understandable independently
 * - Evidence: Sources and examples included
 * - Originality: Expressed in own words
 */

export type QualityDimensionType =
  | 'atomicity'
  | 'connectivity'
  | 'clarity'
  | 'evidence'
  | 'originality';

export interface QualityDimensionConfig {
  type: QualityDimensionType;
  displayName: string;
  description: string;
  weight: number;
  icon: string;
}

const DIMENSION_CONFIGS: Record<QualityDimensionType, QualityDimensionConfig> = {
  atomicity: {
    type: 'atomicity',
    displayName: 'Atomicity',
    description: 'Does this note contain only one idea?',
    weight: 0.25,
    icon: '⚛️',
  },
  connectivity: {
    type: 'connectivity',
    displayName: 'Connectivity',
    description: 'Are there meaningful connections to other notes?',
    weight: 0.25,
    icon: '🔗',
  },
  clarity: {
    type: 'clarity',
    displayName: 'Clarity',
    description: 'Is it understandable without additional context?',
    weight: 0.20,
    icon: '💡',
  },
  evidence: {
    type: 'evidence',
    displayName: 'Evidence',
    description: 'Are sources, examples, or evidence provided?',
    weight: 0.15,
    icon: '📚',
  },
  originality: {
    type: 'originality',
    displayName: 'Originality',
    description: 'Is it expressed in your own words, not just copied?',
    weight: 0.15,
    icon: '✨',
  },
};

export class QualityDimension {
  private readonly _config: QualityDimensionConfig;
  private readonly _score: number;
  private readonly _feedback: string;

  private constructor(type: QualityDimensionType, score: number, feedback: string) {
    this._config = DIMENSION_CONFIGS[type];
    this._score = this.validateScore(score);
    this._feedback = feedback;
  }

  /**
   * Create dimension assessment
   */
  static create(
    type: QualityDimensionType,
    score: number,
    feedback: string = ''
  ): QualityDimension {
    if (!DIMENSION_CONFIGS[type]) {
      throw new Error(`Invalid quality dimension type: ${type}`);
    }
    return new QualityDimension(type, score, feedback);
  }

  /**
   * Restore from data
   */
  static fromData(data: QualityDimensionData): QualityDimension {
    return QualityDimension.create(data.type, data.score, data.feedback);
  }

  private validateScore(score: number): number {
    if (score < 0) return 0;
    if (score > 100) return 100;
    return Math.round(score);
  }

  // Getters
  get type(): QualityDimensionType {
    return this._config.type;
  }

  get displayName(): string {
    return this._config.displayName;
  }

  get description(): string {
    return this._config.description;
  }

  get weight(): number {
    return this._config.weight;
  }

  get icon(): string {
    return this._config.icon;
  }

  get score(): number {
    return this._score;
  }

  get feedback(): string {
    return this._feedback;
  }

  /**
   * Weighted score
   */
  get weightedScore(): number {
    return this._score * this._config.weight;
  }

  /**
   * Score grade (A-F)
   */
  getGrade(): string {
    if (this._score >= 90) return 'A';
    if (this._score >= 80) return 'B';
    if (this._score >= 70) return 'C';
    if (this._score >= 60) return 'D';
    return 'F';
  }

  /**
   * Score status
   */
  getStatus(): 'excellent' | 'good' | 'fair' | 'needs-improvement' {
    if (this._score >= 80) return 'excellent';
    if (this._score >= 60) return 'good';
    if (this._score >= 40) return 'fair';
    return 'needs-improvement';
  }

  /**
   * Display text
   */
  getDisplayText(): string {
    return `${this._config.icon} ${this._config.displayName}: ${this._score}pts`;
  }

  /**
   * Detailed display text
   */
  getDetailedDisplayText(): string {
    const grade = this.getGrade();
    return `${this._config.icon} ${this._config.displayName} [${grade}]: ${this._score}pts\n${this._feedback}`;
  }

  /**
   * Compare with other dimension
   */
  equals(other: QualityDimension): boolean {
    return this._config.type === other._config.type && this._score === other._score;
  }

  /**
   * Serialize
   */
  toData(): QualityDimensionData {
    return {
      type: this._config.type,
      score: this._score,
      feedback: this._feedback,
    };
  }

  /**
   * List of all dimension types
   */
  static getAllTypes(): QualityDimensionType[] {
    return ['atomicity', 'connectivity', 'clarity', 'evidence', 'originality'];
  }

  /**
   * Get dimension configuration
   */
  static getConfig(type: QualityDimensionType): QualityDimensionConfig {
    return DIMENSION_CONFIGS[type];
  }
}

export interface QualityDimensionData {
  type: QualityDimensionType;
  score: number;
  feedback: string;
}
