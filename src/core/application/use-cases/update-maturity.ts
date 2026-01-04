/**
 * UpdateMaturityUseCase
 * 노트의 성숙도를 업데이트합니다.
 *
 * 규칙:
 * - 성숙도는 성장만 가능 (역행 불가)
 * - 품질 점수 기준에 따른 자동 추천
 * - 사용자 수동 업데이트 지원
 */

import { MaturityLevel, QualityScore } from '../../domain';
import type { INoteRepository } from '../../domain';

export interface UpdateMaturityInput {
  noteId: string;
  currentMaturity: MaturityLevel;
  targetMaturity?: MaturityLevel;
  qualityScore?: QualityScore;
  forceUpdate?: boolean;
}

export interface UpdateMaturityOutput {
  success: boolean;
  previousLevel: MaturityLevel;
  newLevel: MaturityLevel;
  isUpgrade: boolean;
  error?: string;
}

export class UpdateMaturityUseCase {
  constructor(private readonly noteRepository: INoteRepository) {}

  async execute(input: UpdateMaturityInput): Promise<UpdateMaturityOutput> {
    const { noteId, currentMaturity, targetMaturity, qualityScore, forceUpdate } = input;

    // Determine target level
    let newLevel: MaturityLevel;

    if (targetMaturity) {
      // User specified target
      newLevel = targetMaturity;
    } else if (qualityScore) {
      // Calculate from quality score
      newLevel = MaturityLevel.fromQualityScore(qualityScore.totalScore);
    } else {
      return {
        success: false,
        previousLevel: currentMaturity,
        newLevel: currentMaturity,
        isUpgrade: false,
        error: '대상 성숙도 또는 품질 점수가 필요합니다.',
      };
    }

    // Check if this is a valid upgrade (no downgrade unless forced)
    const isUpgrade = newLevel.isHigherThan(currentMaturity);
    const isDowngrade = newLevel.isLowerThan(currentMaturity);
    const isSame = newLevel.equals(currentMaturity);

    if (isSame) {
      return {
        success: true,
        previousLevel: currentMaturity,
        newLevel: currentMaturity,
        isUpgrade: false,
      };
    }

    if (isDowngrade && !forceUpdate) {
      return {
        success: false,
        previousLevel: currentMaturity,
        newLevel: currentMaturity,
        isUpgrade: false,
        error: `성숙도를 낮출 수 없습니다: ${currentMaturity.getDisplayText()} → ${newLevel.getDisplayText()}`,
      };
    }

    // Validate upgrade requirements
    if (isUpgrade && qualityScore) {
      const threshold = newLevel.minQualityScore;
      if (qualityScore.totalScore < threshold && !forceUpdate) {
        return {
          success: false,
          previousLevel: currentMaturity,
          newLevel: currentMaturity,
          isUpgrade: false,
          error: `${newLevel.getDisplayText()}로 업그레이드하려면 품질 점수가 ${threshold}점 이상이어야 합니다. (현재: ${qualityScore.totalScore}점)`,
        };
      }
    }

    // Update the maturity level
    try {
      await this.noteRepository.updateMaturityLevel(noteId, newLevel);

      return {
        success: true,
        previousLevel: currentMaturity,
        newLevel: newLevel,
        isUpgrade: isUpgrade,
      };
    } catch (error) {
      return {
        success: false,
        previousLevel: currentMaturity,
        newLevel: currentMaturity,
        isUpgrade: false,
        error: `성숙도 업데이트 실패: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Check if upgrade is recommended based on quality score
   */
  static isUpgradeRecommended(
    currentMaturity: MaturityLevel,
    qualityScore: QualityScore
  ): { recommended: boolean; targetLevel: MaturityLevel | null; reason: string } {
    const recommendedLevel = MaturityLevel.fromQualityScore(qualityScore.totalScore);

    if (!recommendedLevel.isHigherThan(currentMaturity)) {
      return {
        recommended: false,
        targetLevel: null,
        reason: '현재 품질 점수가 더 높은 성숙도 기준을 충족하지 않습니다.',
      };
    }

    return {
      recommended: true,
      targetLevel: recommendedLevel,
      reason: `품질 점수 ${qualityScore.totalScore}점으로 ${recommendedLevel.getDisplayText()} 레벨 기준(${recommendedLevel.minQualityScore}점)을 충족합니다.`,
    };
  }
}
