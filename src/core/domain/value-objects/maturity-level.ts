/**
 * MaturityLevel Value Object
 * 노트의 성숙도 단계를 나타내는 불변 값 객체
 *
 * 성숙도 단계:
 * - 🌱 Seed: 초기 아이디어, 미가공 상태
 * - 🌿 Sprout: 기본 구조화, 일부 연결
 * - 🌳 Tree: 완성된 원자적 노트, 풍부한 연결
 * - 🌲 Evergreen: 지속 업데이트, 핵심 허브 노트
 */

export type MaturityLevelEnum = 'seed' | 'sprout' | 'tree' | 'evergreen';

export interface MaturityLevelConfig {
  level: MaturityLevelEnum;
  icon: string;
  displayName: string;
  description: string;
  minQualityScore: number;
  order: number;
}

const MATURITY_CONFIGS: Record<MaturityLevelEnum, MaturityLevelConfig> = {
  seed: {
    level: 'seed',
    icon: '🌱',
    displayName: 'Seed',
    description: '초기 아이디어, 미가공 상태',
    minQualityScore: 0,
    order: 1,
  },
  sprout: {
    level: 'sprout',
    icon: '🌿',
    displayName: 'Sprout',
    description: '기본 구조화, 일부 연결',
    minQualityScore: 40,
    order: 2,
  },
  tree: {
    level: 'tree',
    icon: '🌳',
    displayName: 'Tree',
    description: '완성된 원자적 노트, 풍부한 연결',
    minQualityScore: 70,
    order: 3,
  },
  evergreen: {
    level: 'evergreen',
    icon: '🌲',
    displayName: 'Evergreen',
    description: '지속 업데이트, 핵심 허브 노트',
    minQualityScore: 90,
    order: 4,
  },
};

export class MaturityLevel {
  private readonly _config: MaturityLevelConfig;

  private constructor(level: MaturityLevelEnum) {
    this._config = MATURITY_CONFIGS[level];
  }

  /**
   * 성숙도 레벨 생성
   */
  static create(level: MaturityLevelEnum): MaturityLevel {
    if (!MATURITY_CONFIGS[level]) {
      throw new Error(`Invalid maturity level: ${level}`);
    }
    return new MaturityLevel(level);
  }

  /**
   * 기본값 (Seed) 생성
   */
  static default(): MaturityLevel {
    return new MaturityLevel('seed');
  }

  /**
   * 품질 점수 기반으로 추천 성숙도 반환
   */
  static fromQualityScore(score: number): MaturityLevel {
    if (score >= MATURITY_CONFIGS.evergreen.minQualityScore) {
      return MaturityLevel.create('evergreen');
    }
    if (score >= MATURITY_CONFIGS.tree.minQualityScore) {
      return MaturityLevel.create('tree');
    }
    if (score >= MATURITY_CONFIGS.sprout.minQualityScore) {
      return MaturityLevel.create('sprout');
    }
    return MaturityLevel.create('seed');
  }

  /**
   * Frontmatter 문자열에서 파싱
   */
  static fromFrontmatter(value: string | undefined): MaturityLevel {
    if (!value) {
      return MaturityLevel.default();
    }

    const normalized = value.toLowerCase().trim();
    if (MATURITY_CONFIGS[normalized as MaturityLevelEnum]) {
      return MaturityLevel.create(normalized as MaturityLevelEnum);
    }

    return MaturityLevel.default();
  }

  // Getters
  get level(): MaturityLevelEnum {
    return this._config.level;
  }

  get icon(): string {
    return this._config.icon;
  }

  get displayName(): string {
    return this._config.displayName;
  }

  get description(): string {
    return this._config.description;
  }

  get minQualityScore(): number {
    return this._config.minQualityScore;
  }

  get order(): number {
    return this._config.order;
  }

  /**
   * 아이콘과 이름을 포함한 표시 텍스트
   */
  getDisplayText(): string {
    return `${this._config.icon} ${this._config.displayName}`;
  }

  /**
   * 아이콘과 설명을 포함한 전체 텍스트
   */
  getFullDisplayText(): string {
    return `${this._config.icon} ${this._config.displayName}: ${this._config.description}`;
  }

  /**
   * Frontmatter에 저장할 값
   */
  toFrontmatter(): string {
    return this._config.level;
  }

  /**
   * 다른 성숙도와 비교
   */
  equals(other: MaturityLevel): boolean {
    return this._config.level === other._config.level;
  }

  /**
   * 현재 레벨이 다른 레벨보다 높은지 확인
   */
  isHigherThan(other: MaturityLevel): boolean {
    return this._config.order > other._config.order;
  }

  /**
   * 현재 레벨이 다른 레벨보다 낮은지 확인
   */
  isLowerThan(other: MaturityLevel): boolean {
    return this._config.order < other._config.order;
  }

  /**
   * 다음 단계 레벨 반환 (Evergreen이면 null)
   */
  getNextLevel(): MaturityLevel | null {
    const levels: MaturityLevelEnum[] = ['seed', 'sprout', 'tree', 'evergreen'];
    const currentIndex = levels.indexOf(this._config.level);

    if (currentIndex === levels.length - 1) {
      return null;
    }

    return MaturityLevel.create(levels[currentIndex + 1]);
  }

  /**
   * 다음 단계로 업그레이드 가능한지 확인
   */
  canUpgradeTo(target: MaturityLevel): boolean {
    return target.isHigherThan(this);
  }

  /**
   * 역행 (다운그레이드) 가능 여부 - 기본적으로 false
   * 노트 성숙도는 성장만 가능하고 역행하지 않음
   */
  canDowngradeTo(_target: MaturityLevel): boolean {
    return false;
  }

  /**
   * 다음 단계로 성장하기 위한 최소 점수
   */
  getNextLevelThreshold(): number | null {
    const nextLevel = this.getNextLevel();
    if (!nextLevel) {
      return null;
    }
    return nextLevel.minQualityScore;
  }

  /**
   * 모든 성숙도 레벨 목록 반환
   */
  static getAllLevels(): MaturityLevel[] {
    return (['seed', 'sprout', 'tree', 'evergreen'] as MaturityLevelEnum[]).map(
      (level) => MaturityLevel.create(level)
    );
  }
}
