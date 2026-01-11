/**
 * QualityScore Value Object
 * Immutable value object representing overall note quality score
 *
 * Calculated as weighted average of 5 dimensions:
 * - Atomicity (25%): One note, one idea
 * - Connectivity (25%): Links to other notes
 * - Clarity (20%): Self-explanatory content
 * - Evidence (15%): Sources and examples
 * - Originality (15%): Own words
 */

import {
  QualityDimension,
  QualityDimensionData,
  QualityDimensionType,
} from './quality-dimension';

export interface QualityScoreData {
  totalScore: number;
  dimensions: QualityDimensionData[];
  assessedAt: number;
}

export class QualityScore {
  private readonly _dimensions: Map<QualityDimensionType, QualityDimension>;
  private readonly _totalScore: number;
  private readonly _assessedAt: Date;

  private constructor(
    dimensions: QualityDimension[],
    assessedAt: Date = new Date()
  ) {
    this._dimensions = new Map();
    dimensions.forEach((d) => this._dimensions.set(d.type, d));
    this._totalScore = this.calculateTotalScore();
    this._assessedAt = assessedAt;
  }

  /**
   * Create quality score from dimensions
   */
  static create(dimensions: QualityDimension[]): QualityScore {
    const allTypes = QualityDimension.getAllTypes();
    const providedTypes = new Set(dimensions.map((d) => d.type));

    // Check if all dimensions are provided
    for (const type of allTypes) {
      if (!providedTypes.has(type)) {
        throw new Error(`Missing quality dimension: ${type}`);
      }
    }

    return new QualityScore(dimensions);
  }

  /**
   * Convenience creation from score object
   */
  static fromScores(scores: {
    atomicity: { score: number; feedback?: string };
    connectivity: { score: number; feedback?: string };
    clarity: { score: number; feedback?: string };
    evidence: { score: number; feedback?: string };
    originality: { score: number; feedback?: string };
  }): QualityScore {
    const dimensions = QualityDimension.getAllTypes().map((type) => {
      const data = scores[type];
      return QualityDimension.create(type, data.score, data.feedback || '');
    });

    return QualityScore.create(dimensions);
  }

  /**
   * Restore from data
   */
  static fromData(data: QualityScoreData): QualityScore {
    const dimensions = data.dimensions.map((d) => QualityDimension.fromData(d));
    return new QualityScore(dimensions, new Date(data.assessedAt));
  }

  private calculateTotalScore(): number {
    let totalWeightedScore = 0;

    this._dimensions.forEach((dimension) => {
      totalWeightedScore += dimension.weightedScore;
    });

    return Math.round(totalWeightedScore);
  }

  // Getters
  get totalScore(): number {
    return this._totalScore;
  }

  get assessedAt(): Date {
    return this._assessedAt;
  }

  /**
   * Get specific dimension score
   */
  getDimension(type: QualityDimensionType): QualityDimension | undefined {
    return this._dimensions.get(type);
  }

  /**
   * Return all dimensions
   */
  getAllDimensions(): QualityDimension[] {
    return Array.from(this._dimensions.values());
  }

  /**
   * Strongest dimension (highest score)
   */
  getStrongestDimension(): QualityDimension {
    let strongest: QualityDimension | null = null;

    this._dimensions.forEach((dimension) => {
      if (!strongest || dimension.score > strongest.score) {
        strongest = dimension;
      }
    });

    return strongest!;
  }

  /**
   * Weakest dimension (needs improvement)
   */
  getWeakestDimension(): QualityDimension {
    let weakest: QualityDimension | null = null;

    this._dimensions.forEach((dimension) => {
      if (!weakest || dimension.score < weakest.score) {
        weakest = dimension;
      }
    });

    return weakest!;
  }

  /**
   * Dimensions needing improvement (score below 70)
   */
  getDimensionsNeedingImprovement(): QualityDimension[] {
    return this.getAllDimensions()
      .filter((d) => d.score < 70)
      .sort((a, b) => a.score - b.score);
  }

  /**
   * Overall grade (A-F)
   */
  getGrade(): string {
    if (this._totalScore >= 90) return 'A';
    if (this._totalScore >= 80) return 'B';
    if (this._totalScore >= 70) return 'C';
    if (this._totalScore >= 60) return 'D';
    return 'F';
  }

  /**
   * Status text
   */
  getStatusText(): string {
    const grade = this.getGrade();
    switch (grade) {
      case 'A':
        return 'Excellent';
      case 'B':
        return 'Good';
      case 'C':
        return 'Fair';
      case 'D':
        return 'Poor';
      default:
        return 'Needs Improvement';
    }
  }

  /**
   * Summary display text
   */
  getSummaryText(): string {
    return `Total ${this._totalScore}pts (${this.getGrade()}) - ${this.getStatusText()}`;
  }

  /**
   * Detailed display text
   */
  getDetailedText(): string {
    const lines = [
      `📊 Total Quality Score: ${this._totalScore}pts (${this.getGrade()})`,
      '',
      'Dimension Scores:',
    ];

    this.getAllDimensions()
      .sort((a, b) => b.score - a.score)
      .forEach((d) => {
        lines.push(`  ${d.getDisplayText()}`);
      });

    const weakest = this.getWeakestDimension();
    if (weakest.score < 70) {
      lines.push('');
      lines.push(`⚠️ Most needs improvement: ${weakest.displayName}`);
    }

    return lines.join('\n');
  }

  /**
   * Compare with other score
   */
  equals(other: QualityScore): boolean {
    return this._totalScore === other._totalScore;
  }

  /**
   * Check if higher than other score
   */
  isHigherThan(other: QualityScore): boolean {
    return this._totalScore > other._totalScore;
  }

  /**
   * Serialize
   */
  toData(): QualityScoreData {
    return {
      totalScore: this._totalScore,
      dimensions: this.getAllDimensions().map((d) => d.toData()),
      assessedAt: this._assessedAt.getTime(),
    };
  }
}
