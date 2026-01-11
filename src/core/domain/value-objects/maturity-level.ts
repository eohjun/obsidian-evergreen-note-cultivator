/**
 * MaturityLevel Value Object
 * Immutable value object representing note maturity stage
 *
 * Maturity stages:
 * - 🌱 Seed: Initial idea, raw state
 * - 🌿 Sprout: Basic structure, some connections
 * - 🌳 Tree: Complete atomic note, rich connections
 * - 🌲 Evergreen: Continuously updated, core hub note
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
    description: 'Initial idea, raw state',
    minQualityScore: 0,
    order: 1,
  },
  sprout: {
    level: 'sprout',
    icon: '🌿',
    displayName: 'Sprout',
    description: 'Basic structure, some connections',
    minQualityScore: 40,
    order: 2,
  },
  tree: {
    level: 'tree',
    icon: '🌳',
    displayName: 'Tree',
    description: 'Complete atomic note, rich connections',
    minQualityScore: 70,
    order: 3,
  },
  evergreen: {
    level: 'evergreen',
    icon: '🌲',
    displayName: 'Evergreen',
    description: 'Continuously updated, core hub note',
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
   * Create maturity level
   */
  static create(level: MaturityLevelEnum): MaturityLevel {
    if (!MATURITY_CONFIGS[level]) {
      throw new Error(`Invalid maturity level: ${level}`);
    }
    return new MaturityLevel(level);
  }

  /**
   * Create default (Seed)
   */
  static default(): MaturityLevel {
    return new MaturityLevel('seed');
  }

  /**
   * Return recommended maturity based on quality score
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
   * Parse from frontmatter string
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
   * Display text including icon and name
   */
  getDisplayText(): string {
    return `${this._config.icon} ${this._config.displayName}`;
  }

  /**
   * Full display text including icon and description
   */
  getFullDisplayText(): string {
    return `${this._config.icon} ${this._config.displayName}: ${this._config.description}`;
  }

  /**
   * Value to store in frontmatter
   */
  toFrontmatter(): string {
    return this._config.level;
  }

  /**
   * Compare with other maturity level
   */
  equals(other: MaturityLevel): boolean {
    return this._config.level === other._config.level;
  }

  /**
   * Check if current level is higher than another
   */
  isHigherThan(other: MaturityLevel): boolean {
    return this._config.order > other._config.order;
  }

  /**
   * Check if current level is lower than another
   */
  isLowerThan(other: MaturityLevel): boolean {
    return this._config.order < other._config.order;
  }

  /**
   * Return next level (null if Evergreen)
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
   * Check if can upgrade to target level
   */
  canUpgradeTo(target: MaturityLevel): boolean {
    return target.isHigherThan(this);
  }

  /**
   * Check if can downgrade - default false
   * Note maturity only grows, never regresses
   */
  canDowngradeTo(_target: MaturityLevel): boolean {
    return false;
  }

  /**
   * Minimum score required for next level
   */
  getNextLevelThreshold(): number | null {
    const nextLevel = this.getNextLevel();
    if (!nextLevel) {
      return null;
    }
    return nextLevel.minQualityScore;
  }

  /**
   * Return list of all maturity levels
   */
  static getAllLevels(): MaturityLevel[] {
    return (['seed', 'sprout', 'tree', 'evergreen'] as MaturityLevelEnum[]).map(
      (level) => MaturityLevel.create(level)
    );
  }
}
