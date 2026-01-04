/**
 * QualityDimension Value Object
 * 노트 품질 평가의 개별 차원을 나타내는 불변 값 객체
 *
 * 평가 차원 (Zettelkasten 원칙 기반):
 * - Atomicity: 원자성 (하나의 노트는 하나의 아이디어만)
 * - Connectivity: 연결성 (다른 노트와의 연결)
 * - Clarity: 명확성 (독립적으로 이해 가능)
 * - Evidence: 근거 (출처, 예시 포함)
 * - Originality: 독창성 (자기 언어로 표현)
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
    displayName: '원자성',
    description: '하나의 노트는 하나의 아이디어만 담고 있는가?',
    weight: 0.25,
    icon: '⚛️',
  },
  connectivity: {
    type: 'connectivity',
    displayName: '연결성',
    description: '다른 노트들과 의미 있는 연결이 있는가?',
    weight: 0.25,
    icon: '🔗',
  },
  clarity: {
    type: 'clarity',
    displayName: '명확성',
    description: '맥락 없이도 독립적으로 이해 가능한가?',
    weight: 0.20,
    icon: '💡',
  },
  evidence: {
    type: 'evidence',
    displayName: '근거',
    description: '출처, 예시, 또는 근거가 충분히 제시되어 있는가?',
    weight: 0.15,
    icon: '📚',
  },
  originality: {
    type: 'originality',
    displayName: '독창성',
    description: '단순 복사가 아닌 자기 언어로 표현되어 있는가?',
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
   * 차원별 평가 생성
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
   * 데이터에서 복원
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
   * 가중치가 적용된 점수
   */
  get weightedScore(): number {
    return this._score * this._config.weight;
  }

  /**
   * 점수 등급 (A-F)
   */
  getGrade(): string {
    if (this._score >= 90) return 'A';
    if (this._score >= 80) return 'B';
    if (this._score >= 70) return 'C';
    if (this._score >= 60) return 'D';
    return 'F';
  }

  /**
   * 점수 상태
   */
  getStatus(): 'excellent' | 'good' | 'fair' | 'needs-improvement' {
    if (this._score >= 80) return 'excellent';
    if (this._score >= 60) return 'good';
    if (this._score >= 40) return 'fair';
    return 'needs-improvement';
  }

  /**
   * 표시용 텍스트
   */
  getDisplayText(): string {
    return `${this._config.icon} ${this._config.displayName}: ${this._score}점`;
  }

  /**
   * 상세 표시용 텍스트
   */
  getDetailedDisplayText(): string {
    const grade = this.getGrade();
    return `${this._config.icon} ${this._config.displayName} [${grade}]: ${this._score}점\n${this._feedback}`;
  }

  /**
   * 다른 차원과 비교
   */
  equals(other: QualityDimension): boolean {
    return this._config.type === other._config.type && this._score === other._score;
  }

  /**
   * 직렬화
   */
  toData(): QualityDimensionData {
    return {
      type: this._config.type,
      score: this._score,
      feedback: this._feedback,
    };
  }

  /**
   * 모든 차원 타입 목록
   */
  static getAllTypes(): QualityDimensionType[] {
    return ['atomicity', 'connectivity', 'clarity', 'evidence', 'originality'];
  }

  /**
   * 차원 설정 정보 조회
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
