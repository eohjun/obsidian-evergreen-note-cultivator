/**
 * GetGrowthGuideUseCase
 * 현재 성숙도에서 다음 단계로 성장하기 위한 가이드를 생성합니다.
 */

import { GrowthGuide, MaturityLevel, QualityScore } from '../../domain';
import type { ILLMProvider, LLMResponse, NoteData } from '../../domain';

export interface GetGrowthGuideInput {
  note: NoteData;
  currentMaturity: MaturityLevel;
  qualityScore: QualityScore;
}

export interface GetGrowthGuideOutput {
  guide: GrowthGuide | null;
  error?: string;
  rawResponse?: string;
}

interface LLMGrowthGuideResponse {
  steps: {
    step: number;
    action: string;
    expectedImpact: string;
  }[];
  estimatedEffort: 'low' | 'medium' | 'high';
}

const SYSTEM_PROMPT = `당신은 Zettelkasten 기반 영구 노트 작성 코치입니다.

**성숙도 단계:**
- 🌱 Seed (0-39점): 초기 아이디어, 미가공 상태
- 🌿 Sprout (40-69점): 기본 구조화, 일부 연결
- 🌳 Tree (70-89점): 완성된 원자적 노트, 풍부한 연결
- 🌲 Evergreen (90-100점): 지속 업데이트, 핵심 허브 노트

**성장 가이드 원칙:**
1. 가장 큰 영향을 주는 개선부터 제안
2. 구체적이고 실행 가능한 액션
3. 현실적인 예상 효과
4. 단계별 우선순위

모든 응답은 한국어로 작성합니다.`;

function buildUserPrompt(input: GetGrowthGuideInput): string {
  const { note, currentMaturity, qualityScore } = input;

  const nextLevel = currentMaturity.getNextLevel();
  if (!nextLevel) {
    return ''; // Already at Evergreen
  }

  const weakDimensions = qualityScore
    .getDimensionsNeedingImprovement()
    .map((d) => `- ${d.displayName}: ${d.score}점 (${d.feedback})`)
    .join('\n');

  return `다음 노트가 ${currentMaturity.getDisplayText()}에서 ${nextLevel.getDisplayText()}로 성장하기 위한 가이드를 작성해주세요.

**노트 제목**: ${note.basename}
**현재 성숙도**: ${currentMaturity.getDisplayText()}
**목표 성숙도**: ${nextLevel.getDisplayText()}
**현재 품질 점수**: ${qualityScore.totalScore}점
**필요 점수**: ${nextLevel.minQualityScore}점 이상

**개선이 필요한 차원:**
${weakDimensions || '없음'}

**노트 내용 (일부)**:
---
${note.content.slice(0, 1500)}${note.content.length > 1500 ? '...' : ''}
---

**응답 형식:**
\`\`\`json
{
  "steps": [
    {
      "step": 1,
      "action": "구체적인 액션 (1문장)",
      "expectedImpact": "예상 효과 (어떤 차원이 어느 정도 향상될지)"
    }
  ],
  "estimatedEffort": "low|medium|high"
}
\`\`\`

**주의사항:**
- steps는 3-5개, 우선순위 순
- 각 action은 즉시 실행 가능한 구체적 행동
- 현재 노트 내용을 참고하여 맞춤 제안
- estimatedEffort는 총 예상 작업량`;
}

function parseGrowthGuideResponse(
  responseText: string
): LLMGrowthGuideResponse | null {
  try {
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : responseText.trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Failed to parse growth guide response:', error);
    return null;
  }
}

export class GetGrowthGuideUseCase {
  constructor(private readonly llmProvider: ILLMProvider) {}

  async execute(input: GetGrowthGuideInput): Promise<GetGrowthGuideOutput> {
    const { currentMaturity, qualityScore } = input;

    const nextLevel = currentMaturity.getNextLevel();
    if (!nextLevel) {
      return {
        guide: null,
        error: '이미 최고 성숙도(🌲 Evergreen)에 도달했습니다.',
      };
    }

    // If already meets next level requirements, provide simple guidance
    if (qualityScore.totalScore >= nextLevel.minQualityScore) {
      return {
        guide: {
          currentLevel: currentMaturity.level,
          targetLevel: nextLevel.level,
          requiredScore: nextLevel.minQualityScore,
          currentScore: qualityScore.totalScore,
          steps: [
            {
              step: 1,
              action: '성숙도 레벨을 업데이트하세요.',
              expectedImpact: `${currentMaturity.getDisplayText()} → ${nextLevel.getDisplayText()} 전환`,
            },
          ],
          estimatedEffort: 'low',
        },
      };
    }

    const userPrompt = buildUserPrompt(input);

    const response: LLMResponse = await this.llmProvider.simpleGenerate(
      userPrompt,
      SYSTEM_PROMPT,
      {
        maxTokens: 2000,
        temperature: 0.7,
      }
    );

    if (!response.success) {
      return {
        guide: null,
        error: response.error ?? 'LLM 요청에 실패했습니다.',
        rawResponse: response.content,
      };
    }

    const parsed = parseGrowthGuideResponse(response.content);
    if (!parsed) {
      return {
        guide: null,
        error: '성장 가이드 파싱에 실패했습니다.',
        rawResponse: response.content,
      };
    }

    const guide: GrowthGuide = {
      currentLevel: currentMaturity.level,
      targetLevel: nextLevel.level,
      requiredScore: nextLevel.minQualityScore,
      currentScore: qualityScore.totalScore,
      steps: parsed.steps,
      estimatedEffort: parsed.estimatedEffort,
    };

    return {
      guide,
      rawResponse: response.content,
    };
  }
}
