/**
 * NoteAssessment Entity
 * 노트 품질 평가 결과를 나타내는 엔티티
 *
 * 포함 정보:
 * - 종합 품질 점수 및 차원별 점수
 * - 현재/추천 성숙도 레벨
 * - 개선 제안 목록
 * - 분리 제안 (원자성 위반 시)
 * - 연결 제안 (관련 노트)
 */

import { MaturityLevel, MaturityLevelEnum } from '../value-objects/maturity-level';
import { QualityScore, QualityScoreData } from '../value-objects/quality-score';

/**
 * 개선 제안
 */
export interface ImprovementSuggestion {
  dimension: string;
  priority: 'high' | 'medium' | 'low';
  suggestion: string;
  example?: string;
}

/**
 * 분리 제안 (원자성 위반 시)
 */
export interface SplitSuggestion {
  reason: string;
  suggestedNotes: {
    title: string;
    description: string;
    coreIdea: string;
  }[];
}

/**
 * 연결 제안
 */
export interface ConnectionSuggestion {
  targetNote: string;
  relationshipType: 'supports' | 'contradicts' | 'extends' | 'exemplifies' | 'relates';
  reason: string;
  linkSuggestion: string;
}

/**
 * 성장 가이드
 */
export interface GrowthGuide {
  currentLevel: MaturityLevelEnum;
  targetLevel: MaturityLevelEnum;
  requiredScore: number;
  currentScore: number;
  steps: {
    step: number;
    action: string;
    expectedImpact: string;
  }[];
  estimatedEffort: 'low' | 'medium' | 'high';
}

/**
 * 직렬화 데이터
 */
export interface NoteAssessmentData {
  id: string;
  noteId: string;
  notePath: string;
  qualityScore: QualityScoreData;
  currentMaturity: MaturityLevelEnum;
  recommendedMaturity: MaturityLevelEnum;
  improvements: ImprovementSuggestion[];
  splitSuggestion: SplitSuggestion | null;
  connectionSuggestions: ConnectionSuggestion[];
  growthGuide: GrowthGuide | null;
  assessedAt: number;
}

export class NoteAssessment {
  private readonly _id: string;
  private readonly _noteId: string;
  private readonly _notePath: string;
  private readonly _qualityScore: QualityScore;
  private readonly _currentMaturity: MaturityLevel;
  private readonly _recommendedMaturity: MaturityLevel;
  private readonly _improvements: ImprovementSuggestion[];
  private readonly _splitSuggestion: SplitSuggestion | null;
  private readonly _connectionSuggestions: ConnectionSuggestion[];
  private readonly _growthGuide: GrowthGuide | null;
  private readonly _assessedAt: Date;

  private constructor(
    id: string,
    noteId: string,
    notePath: string,
    qualityScore: QualityScore,
    currentMaturity: MaturityLevel,
    recommendedMaturity: MaturityLevel,
    improvements: ImprovementSuggestion[],
    splitSuggestion: SplitSuggestion | null,
    connectionSuggestions: ConnectionSuggestion[],
    growthGuide: GrowthGuide | null,
    assessedAt: Date
  ) {
    this._id = id;
    this._noteId = noteId;
    this._notePath = notePath;
    this._qualityScore = qualityScore;
    this._currentMaturity = currentMaturity;
    this._recommendedMaturity = recommendedMaturity;
    this._improvements = improvements;
    this._splitSuggestion = splitSuggestion;
    this._connectionSuggestions = connectionSuggestions;
    this._growthGuide = growthGuide;
    this._assessedAt = assessedAt;
  }

  /**
   * 새 평가 생성
   */
  static create(params: {
    noteId: string;
    notePath: string;
    qualityScore: QualityScore;
    currentMaturity: MaturityLevel;
    improvements?: ImprovementSuggestion[];
    splitSuggestion?: SplitSuggestion | null;
    connectionSuggestions?: ConnectionSuggestion[];
    growthGuide?: GrowthGuide | null;
  }): NoteAssessment {
    const recommendedMaturity = MaturityLevel.fromQualityScore(
      params.qualityScore.totalScore
    );

    return new NoteAssessment(
      NoteAssessment.generateId(),
      params.noteId,
      params.notePath,
      params.qualityScore,
      params.currentMaturity,
      recommendedMaturity,
      params.improvements || [],
      params.splitSuggestion || null,
      params.connectionSuggestions || [],
      params.growthGuide || null,
      new Date()
    );
  }

  /**
   * 데이터에서 복원
   */
  static fromData(data: NoteAssessmentData): NoteAssessment {
    return new NoteAssessment(
      data.id,
      data.noteId,
      data.notePath,
      QualityScore.fromData(data.qualityScore),
      MaturityLevel.create(data.currentMaturity),
      MaturityLevel.create(data.recommendedMaturity),
      data.improvements,
      data.splitSuggestion,
      data.connectionSuggestions,
      data.growthGuide,
      new Date(data.assessedAt)
    );
  }

  private static generateId(): string {
    return `assessment_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get noteId(): string {
    return this._noteId;
  }

  get notePath(): string {
    return this._notePath;
  }

  get qualityScore(): QualityScore {
    return this._qualityScore;
  }

  get currentMaturity(): MaturityLevel {
    return this._currentMaturity;
  }

  get recommendedMaturity(): MaturityLevel {
    return this._recommendedMaturity;
  }

  get improvements(): ReadonlyArray<ImprovementSuggestion> {
    return this._improvements;
  }

  get splitSuggestion(): SplitSuggestion | null {
    return this._splitSuggestion;
  }

  get connectionSuggestions(): ReadonlyArray<ConnectionSuggestion> {
    return this._connectionSuggestions;
  }

  get growthGuide(): GrowthGuide | null {
    return this._growthGuide;
  }

  get assessedAt(): Date {
    return this._assessedAt;
  }

  /**
   * 성숙도 업그레이드가 추천되는지 확인
   */
  isMaturityUpgradeRecommended(): boolean {
    return this._recommendedMaturity.isHigherThan(this._currentMaturity);
  }

  /**
   * 분리가 제안되는지 확인
   */
  hasSplitSuggestion(): boolean {
    return this._splitSuggestion !== null;
  }

  /**
   * 연결 제안이 있는지 확인
   */
  hasConnectionSuggestions(): boolean {
    return this._connectionSuggestions.length > 0;
  }

  /**
   * 우선순위별 개선 제안 필터링
   */
  getImprovementsByPriority(
    priority: 'high' | 'medium' | 'low'
  ): ImprovementSuggestion[] {
    return this._improvements.filter((i) => i.priority === priority);
  }

  /**
   * 고우선순위 개선 제안
   */
  getHighPriorityImprovements(): ImprovementSuggestion[] {
    return this.getImprovementsByPriority('high');
  }

  /**
   * 요약 텍스트
   */
  getSummaryText(): string {
    const lines = [
      `📊 노트 품질 평가 결과`,
      ``,
      `현재 성숙도: ${this._currentMaturity.getDisplayText()}`,
      `품질 점수: ${this._qualityScore.getSummaryText()}`,
    ];

    if (this.isMaturityUpgradeRecommended()) {
      lines.push(
        `✨ 추천 성숙도: ${this._recommendedMaturity.getDisplayText()}`
      );
    }

    if (this.hasSplitSuggestion()) {
      lines.push(`⚠️ 원자성 위반: 노트 분리 추천`);
    }

    if (this.hasConnectionSuggestions()) {
      lines.push(
        `🔗 연결 제안: ${this._connectionSuggestions.length}개 노트`
      );
    }

    return lines.join('\n');
  }

  /**
   * 마크다운 형식 상세 리포트
   */
  toMarkdown(): string {
    const lines: string[] = [
      `## 📊 노트 품질 평가 결과`,
      ``,
      `**평가 시간**: ${this._assessedAt.toLocaleString('ko-KR')}`,
      ``,
      `---`,
      ``,
      `### 🌱 성숙도`,
      ``,
      `| 구분 | 상태 |`,
      `|------|------|`,
      `| 현재 성숙도 | ${this._currentMaturity.getDisplayText()} |`,
      `| 추천 성숙도 | ${this._recommendedMaturity.getDisplayText()} |`,
      ``,
    ];

    // 품질 점수 섹션
    lines.push(`### 📈 품질 점수`);
    lines.push(``);
    lines.push(`**종합 점수**: ${this._qualityScore.totalScore}점 (${this._qualityScore.getGrade()})`);
    lines.push(``);
    lines.push(`| 차원 | 점수 | 피드백 |`);
    lines.push(`|------|------|--------|`);

    this._qualityScore.getAllDimensions().forEach((d) => {
      lines.push(`| ${d.icon} ${d.displayName} | ${d.score}점 | ${d.feedback || '-'} |`);
    });
    lines.push(``);

    // 개선 제안 섹션
    if (this._improvements.length > 0) {
      lines.push(`### 💡 개선 제안`);
      lines.push(``);

      const highPriority = this.getHighPriorityImprovements();
      if (highPriority.length > 0) {
        lines.push(`#### 🔴 높은 우선순위`);
        highPriority.forEach((imp) => {
          lines.push(`- **${imp.dimension}**: ${imp.suggestion}`);
          if (imp.example) {
            lines.push(`  - 예시: ${imp.example}`);
          }
        });
        lines.push(``);
      }

      const mediumPriority = this.getImprovementsByPriority('medium');
      if (mediumPriority.length > 0) {
        lines.push(`#### 🟡 중간 우선순위`);
        mediumPriority.forEach((imp) => {
          lines.push(`- **${imp.dimension}**: ${imp.suggestion}`);
        });
        lines.push(``);
      }

      const lowPriority = this.getImprovementsByPriority('low');
      if (lowPriority.length > 0) {
        lines.push(`#### 🟢 낮은 우선순위`);
        lowPriority.forEach((imp) => {
          lines.push(`- **${imp.dimension}**: ${imp.suggestion}`);
        });
        lines.push(``);
      }
    }

    // 분리 제안 섹션
    if (this._splitSuggestion) {
      lines.push(`### ⚛️ 분리 제안`);
      lines.push(``);
      lines.push(`**이유**: ${this._splitSuggestion.reason}`);
      lines.push(``);
      lines.push(`**제안되는 새 노트**:`);
      this._splitSuggestion.suggestedNotes.forEach((note, i) => {
        lines.push(`${i + 1}. **${note.title}**`);
        lines.push(`   - ${note.description}`);
        lines.push(`   - 핵심 아이디어: ${note.coreIdea}`);
      });
      lines.push(``);
    }

    // 연결 제안 섹션
    if (this._connectionSuggestions.length > 0) {
      lines.push(`### 🔗 연결 제안`);
      lines.push(``);
      this._connectionSuggestions.forEach((conn) => {
        const typeIcon = this.getConnectionTypeIcon(conn.relationshipType);
        lines.push(`- ${typeIcon} **[[${conn.targetNote}]]**`);
        lines.push(`  - 관계: ${conn.relationshipType}`);
        lines.push(`  - 이유: ${conn.reason}`);
      });
      lines.push(``);
    }

    // 성장 가이드 섹션
    if (this._growthGuide) {
      lines.push(`### 🚀 성장 가이드`);
      lines.push(``);
      lines.push(
        `**목표**: ${MaturityLevel.create(this._growthGuide.currentLevel).getDisplayText()} → ${MaturityLevel.create(this._growthGuide.targetLevel).getDisplayText()}`
      );
      lines.push(
        `**필요 점수**: ${this._growthGuide.currentScore}점 → ${this._growthGuide.requiredScore}점`
      );
      lines.push(`**예상 노력**: ${this.getEffortText(this._growthGuide.estimatedEffort)}`);
      lines.push(``);
      lines.push(`**단계별 액션**:`);
      this._growthGuide.steps.forEach((step) => {
        lines.push(`${step.step}. ${step.action}`);
        lines.push(`   - 기대 효과: ${step.expectedImpact}`);
      });
      lines.push(``);
    }

    return lines.join('\n');
  }

  private getConnectionTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      supports: '🤝',
      contradicts: '⚔️',
      extends: '📐',
      exemplifies: '📖',
      relates: '🔗',
    };
    return icons[type] || '🔗';
  }

  private getEffortText(effort: string): string {
    const texts: Record<string, string> = {
      low: '낮음 (10-30분)',
      medium: '보통 (30분-1시간)',
      high: '높음 (1시간 이상)',
    };
    return texts[effort] || effort;
  }

  /**
   * 직렬화
   */
  toData(): NoteAssessmentData {
    return {
      id: this._id,
      noteId: this._noteId,
      notePath: this._notePath,
      qualityScore: this._qualityScore.toData(),
      currentMaturity: this._currentMaturity.level,
      recommendedMaturity: this._recommendedMaturity.level,
      improvements: [...this._improvements],
      splitSuggestion: this._splitSuggestion,
      connectionSuggestions: [...this._connectionSuggestions],
      growthGuide: this._growthGuide,
      assessedAt: this._assessedAt.getTime(),
    };
  }
}
