/**
 * QualityScore Value Object
 * 노트의 종합 품질 점수를 나타내는 불변 값 객체
 *
 * 5개 차원의 가중 평균으로 계산:
 * - Atomicity (25%): 원자성
 * - Connectivity (25%): 연결성
 * - Clarity (20%): 명확성
 * - Evidence (15%): 근거
 * - Originality (15%): 독창성
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
   * 차원별 점수로 품질 점수 생성
   */
  static create(dimensions: QualityDimension[]): QualityScore {
    const allTypes = QualityDimension.getAllTypes();
    const providedTypes = new Set(dimensions.map((d) => d.type));

    // 모든 차원이 제공되었는지 확인
    for (const type of allTypes) {
      if (!providedTypes.has(type)) {
        throw new Error(`Missing quality dimension: ${type}`);
      }
    }

    return new QualityScore(dimensions);
  }

  /**
   * 간편 생성 - 숫자 객체로 생성
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
   * 데이터에서 복원
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
   * 특정 차원 점수 조회
   */
  getDimension(type: QualityDimensionType): QualityDimension | undefined {
    return this._dimensions.get(type);
  }

  /**
   * 모든 차원 목록 반환
   */
  getAllDimensions(): QualityDimension[] {
    return Array.from(this._dimensions.values());
  }

  /**
   * 가장 높은 점수 차원
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
   * 가장 낮은 점수 차원 (개선 필요)
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
   * 개선이 필요한 차원들 (점수 70 미만)
   */
  getDimensionsNeedingImprovement(): QualityDimension[] {
    return this.getAllDimensions()
      .filter((d) => d.score < 70)
      .sort((a, b) => a.score - b.score);
  }

  /**
   * 종합 등급 (A-F)
   */
  getGrade(): string {
    if (this._totalScore >= 90) return 'A';
    if (this._totalScore >= 80) return 'B';
    if (this._totalScore >= 70) return 'C';
    if (this._totalScore >= 60) return 'D';
    return 'F';
  }

  /**
   * 상태 텍스트
   */
  getStatusText(): string {
    const grade = this.getGrade();
    switch (grade) {
      case 'A':
        return '우수';
      case 'B':
        return '양호';
      case 'C':
        return '보통';
      case 'D':
        return '미흡';
      default:
        return '개선 필요';
    }
  }

  /**
   * 요약 표시 텍스트
   */
  getSummaryText(): string {
    return `종합 ${this._totalScore}점 (${this.getGrade()}) - ${this.getStatusText()}`;
  }

  /**
   * 상세 표시 텍스트
   */
  getDetailedText(): string {
    const lines = [
      `📊 종합 품질 점수: ${this._totalScore}점 (${this.getGrade()})`,
      '',
      '차원별 점수:',
    ];

    this.getAllDimensions()
      .sort((a, b) => b.score - a.score)
      .forEach((d) => {
        lines.push(`  ${d.getDisplayText()}`);
      });

    const weakest = this.getWeakestDimension();
    if (weakest.score < 70) {
      lines.push('');
      lines.push(`⚠️ 가장 개선이 필요한 영역: ${weakest.displayName}`);
    }

    return lines.join('\n');
  }

  /**
   * 다른 점수와 비교
   */
  equals(other: QualityScore): boolean {
    return this._totalScore === other._totalScore;
  }

  /**
   * 다른 점수보다 높은지 확인
   */
  isHigherThan(other: QualityScore): boolean {
    return this._totalScore > other._totalScore;
  }

  /**
   * 직렬화
   */
  toData(): QualityScoreData {
    return {
      totalScore: this._totalScore,
      dimensions: this.getAllDimensions().map((d) => d.toData()),
      assessedAt: this._assessedAt.getTime(),
    };
  }
}
