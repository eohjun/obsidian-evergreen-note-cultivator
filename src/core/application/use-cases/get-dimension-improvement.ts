/**
 * GetDimensionImprovementUseCase
 * 특정 차원에 대한 맞춤 개선 액션을 LLM으로 생성합니다.
 */

import type { ILLMProvider, LLMResponse, NoteData, QualityDimensionType } from '../../domain';

export interface DimensionImprovementInput {
  note: NoteData;
  dimension: QualityDimensionType;
  currentScore: number;
  feedback: string;
}

export interface DimensionImprovementAction {
  action: string;
  location?: string;
  expectedImpact: string;
}

export interface DimensionImprovementOutput {
  actions: DimensionImprovementAction[];
  error?: string;
}

const DIMENSION_PROMPTS: Record<QualityDimensionType, string> = {
  atomicity: `분석 대상: 원자성 (Atomicity) 차원
이 노트에서 분리 가능한 하위 주제를 식별하고, 하나의 핵심 아이디어를 중심으로 재구성하는 방안을 제안해주세요.
- 분리할 수 있는 독립 개념을 식별
- 핵심 아이디어 하나를 선정
- 어떤 내용을 별도 노트로 이동할지 구체적으로 제안`,

  connectivity: `분석 대상: 연결성 (Connectivity) 차원
이 노트와 연결할 수 있는 개념/주제를 제안하고, 노트의 어느 부분에 링크를 추가하면 좋을지 구체적으로 안내해주세요.
- 연결할 개념 또는 주제 제안
- 노트 내 구체적 위치에 어떤 링크를 추가할지
- 양방향 연결의 맥락 설명`,

  clarity: `분석 대상: 명확성 (Clarity) 차원
이 노트에서 모호하거나 불명확한 부분을 식별하고, 명확하게 개선하는 방안을 제안해주세요.
- 불명확한 표현/문장 식별
- 전문 용어 정의 부족 식별
- 구체적인 개선 문장 예시 제안`,

  evidence: `분석 대상: 근거 (Evidence) 차원
이 노트에서 근거가 부족한 주장을 식별하고, 필요한 출처/예시를 제안해주세요.
- 근거 없는 주장 식별
- 추가할 출처 유형 제안 (학술 논문, 사례, 데이터 등)
- 구체적 예시로 보강할 부분 제안`,

  originality: `분석 대상: 독창성 (Originality) 차원
이 노트에서 인용/복사에 가까운 부분을 식별하고, 자신의 언어로 전환하는 방안을 제안해주세요.
- 일반적 정의나 교과서적 서술 부분 식별
- 자기만의 해석이나 통찰로 전환할 방법
- 개인 경험이나 사례와 연결하는 방법`,
};

const SYSTEM_PROMPT = `당신은 Zettelkasten 기반 영구 노트 작성 코치입니다.

주어진 차원에 대해 3-5개의 구체적이고 실행 가능한 개선 액션을 제안합니다.
각 액션은 즉시 실행 가능해야 합니다.

응답 형식:
\`\`\`json
{
  "actions": [
    {
      "action": "구체적인 개선 행동 (1-2문장)",
      "location": "노트 내 해당 위치 또는 섹션 (선택)",
      "expectedImpact": "예상 효과 (간단히)"
    }
  ]
}
\`\`\`

모든 응답은 한국어로 작성합니다.`;

function buildUserPrompt(input: DimensionImprovementInput): string {
  const { note, dimension, currentScore, feedback } = input;

  return `${DIMENSION_PROMPTS[dimension]}

**노트 제목**: ${note.basename}
**현재 ${dimension} 점수**: ${currentScore}점
**AI 피드백**: ${feedback}

**노트 내용**:
---
${note.content.slice(0, 2000)}${note.content.length > 2000 ? '...' : ''}
---

위 차원에 대해 3-5개의 구체적 개선 액션을 JSON으로 응답해주세요.`;
}

function parseResponse(responseText: string): DimensionImprovementAction[] | null {
  try {
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : responseText.trim();
    const parsed = JSON.parse(jsonStr);
    if (parsed.actions && Array.isArray(parsed.actions)) {
      return parsed.actions;
    }
    return null;
  } catch {
    console.error('Failed to parse dimension improvement response');
    return null;
  }
}

export class GetDimensionImprovementUseCase {
  constructor(private readonly llmProvider: ILLMProvider) {}

  async execute(input: DimensionImprovementInput): Promise<DimensionImprovementOutput> {
    const userPrompt = buildUserPrompt(input);

    const response: LLMResponse = await this.llmProvider.simpleGenerate(
      userPrompt,
      SYSTEM_PROMPT,
      {
        maxTokens: 2000,
        temperature: 0.7,
      },
    );

    if (!response.success) {
      return {
        actions: [],
        error: response.error ?? 'LLM 요청에 실패했습니다.',
      };
    }

    const actions = parseResponse(response.content);
    if (!actions) {
      return {
        actions: [],
        error: '개선 제안 파싱에 실패했습니다.',
      };
    }

    return { actions };
  }
}
