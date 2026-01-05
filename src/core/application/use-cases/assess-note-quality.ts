/**
 * AssessNoteQualityUseCase
 * 노트 품질을 5개 차원에서 평가하고 개선 제안을 생성합니다.
 *
 * 평가 차원:
 * - Atomicity (원자성): 하나의 아이디어만 담고 있는가?
 * - Connectivity (연결성): 다른 노트와 의미 있게 연결되어 있는가?
 * - Clarity (명확성): 독립적으로 이해 가능한가?
 * - Evidence (근거): 출처, 예시가 충분한가?
 * - Originality (독창성): 자기 언어로 표현되어 있는가?
 */

import {
  NoteAssessment,
  ImprovementSuggestion,
  QualityScore,
  QualityDimension,
  MaturityLevel,
} from '../../domain';
import type { ILLMProvider, LLMResponse, NoteData } from '../../domain';

export interface AssessNoteQualityInput {
  note: NoteData;
  existingLinks: string[];
  backlinks: string[];
}

export interface AssessNoteQualityOutput {
  assessment: NoteAssessment | null;
  error?: string;
  rawResponse?: string;
}

interface LLMAssessmentResponse {
  dimensions: {
    atomicity: { score: number; feedback: string };
    connectivity: { score: number; feedback: string };
    clarity: { score: number; feedback: string };
    evidence: { score: number; feedback: string };
    originality: { score: number; feedback: string };
  };
  improvements: {
    dimension: string;
    priority: 'high' | 'medium' | 'low';
    suggestion: string;
    example?: string;
  }[];
  splitSuggestion?: {
    reason: string;
    suggestedNotes: {
      title: string;
      description: string;
      coreIdea: string;
    }[];
  };
}

const SYSTEM_PROMPT = `당신은 Zettelkasten 원칙에 기반한 영구 노트 품질 평가 전문가입니다.

**평가 기준 (각 0-100점):**

1. **원자성 (Atomicity)** - 25% 가중치
   - 하나의 노트는 하나의 핵심 아이디어만 담아야 함
   - 100점: 단일 아이디어에 집중, 쉽게 분리 불가
   - 70점: 주요 아이디어가 명확하나 부수적 내용 일부 존재
   - 40점: 2-3개 아이디어가 혼재
   - 0점: 여러 주제가 혼합되어 분리 필요

2. **연결성 (Connectivity)** - 25% 가중치
   - 다른 노트와의 의미 있는 연결
   - 100점: 5개 이상의 관련 노트와 양방향 연결
   - 70점: 3-4개 노트와 연결, 연결 이유 명확
   - 40점: 1-2개 연결만 존재
   - 0점: 고립된 노트

3. **명확성 (Clarity)** - 20% 가중치
   - 맥락 없이도 독립적으로 이해 가능
   - 100점: 완전한 독립 이해 가능, 명확한 구조
   - 70점: 대부분 이해 가능, 약간의 배경지식 필요
   - 40점: 상당한 맥락 지식 필요
   - 0점: 독립적 이해 불가

4. **근거 (Evidence)** - 15% 가중치
   - 출처, 예시, 근거의 충분성
   - 100점: 명확한 출처와 구체적 예시 포함
   - 70점: 일부 출처 또는 예시 포함
   - 40점: 출처 없이 주장만 존재
   - 0점: 근거 완전 부재

5. **독창성 (Originality)** - 15% 가중치
   - 단순 복사가 아닌 자기 언어로 표현
   - 100점: 완전히 자기 언어, 고유한 통찰 포함
   - 70점: 대부분 자기 표현, 일부 인용
   - 40점: 인용 위주, 자기 해석 부족
   - 0점: 복사/붙여넣기

**분리 제안 기준:**
원자성 점수가 50점 미만이면 분리를 제안합니다.

모든 응답은 한국어로 작성합니다.`;

function buildUserPrompt(input: AssessNoteQualityInput): string {
  const { note, existingLinks, backlinks } = input;

  return `다음 노트를 Zettelkasten 원칙에 따라 평가해주세요.

**노트 제목**: ${note.basename}
**태그**: ${note.metadata.tags?.join(', ') || '없음'}
**아웃링크**: ${existingLinks.length}개 (${existingLinks.slice(0, 5).join(', ')}${existingLinks.length > 5 ? '...' : ''})
**백링크**: ${backlinks.length}개 (${backlinks.slice(0, 5).join(', ')}${backlinks.length > 5 ? '...' : ''})

**노트 내용**:
---
${note.content}
---

**응답 형식:**
다음 JSON 형식으로 응답하세요:
\`\`\`json
{
  "dimensions": {
    "atomicity": {
      "score": 0-100,
      "feedback": "평가 이유 (1-2문장)"
    },
    "connectivity": {
      "score": 0-100,
      "feedback": "평가 이유 (1-2문장)"
    },
    "clarity": {
      "score": 0-100,
      "feedback": "평가 이유 (1-2문장)"
    },
    "evidence": {
      "score": 0-100,
      "feedback": "평가 이유 (1-2문장)"
    },
    "originality": {
      "score": 0-100,
      "feedback": "평가 이유 (1-2문장)"
    }
  },
  "improvements": [
    {
      "dimension": "차원명 (한글)",
      "priority": "high|medium|low",
      "suggestion": "개선 제안 (구체적으로)",
      "example": "예시 (선택적)"
    }
  ],
  "splitSuggestion": {
    "reason": "분리가 필요한 이유 (원자성 점수 50 미만인 경우에만)",
    "suggestedNotes": [
      {
        "title": "새 노트 제목",
        "description": "새 노트 설명",
        "coreIdea": "핵심 아이디어"
      }
    ]
  }
}
\`\`\`

**주의사항:**
- 각 차원의 점수는 객관적 기준에 따라 부여
- improvements는 **점수가 70점 미만인 차원에 대해서만** 생성 (70점 이상인 차원은 제외)
- 개선이 필요한 차원이 없으면 improvements는 빈 배열 []
- splitSuggestion은 원자성 점수가 50 미만인 경우에만 포함`;
}

function parseAssessmentResponse(
  responseText: string
): LLMAssessmentResponse | null {
  try {
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : responseText.trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Failed to parse assessment response:', error);
    return null;
  }
}

export class AssessNoteQualityUseCase {
  constructor(private readonly llmProvider: ILLMProvider) {}

  async execute(input: AssessNoteQualityInput): Promise<AssessNoteQualityOutput> {
    const { note } = input;

    if (!note.content || note.content.trim().length < 50) {
      return {
        assessment: null,
        error: '노트 내용이 너무 짧습니다. 최소 50자 이상이어야 평가가 가능합니다.',
      };
    }

    const userPrompt = buildUserPrompt(input);

    const response: LLMResponse = await this.llmProvider.simpleGenerate(
      userPrompt,
      SYSTEM_PROMPT,
      {
        maxTokens: 3000,
        temperature: 0.5,
      }
    );

    if (!response.success) {
      return {
        assessment: null,
        error: response.error ?? 'LLM 요청에 실패했습니다.',
        rawResponse: response.content,
      };
    }

    const parsed = parseAssessmentResponse(response.content);
    if (!parsed) {
      return {
        assessment: null,
        error: '평가 결과 파싱에 실패했습니다.',
        rawResponse: response.content,
      };
    }

    // Build QualityScore from parsed dimensions
    const qualityScore = QualityScore.fromScores({
      atomicity: {
        score: parsed.dimensions.atomicity.score,
        feedback: parsed.dimensions.atomicity.feedback,
      },
      connectivity: {
        score: parsed.dimensions.connectivity.score,
        feedback: parsed.dimensions.connectivity.feedback,
      },
      clarity: {
        score: parsed.dimensions.clarity.score,
        feedback: parsed.dimensions.clarity.feedback,
      },
      evidence: {
        score: parsed.dimensions.evidence.score,
        feedback: parsed.dimensions.evidence.feedback,
      },
      originality: {
        score: parsed.dimensions.originality.score,
        feedback: parsed.dimensions.originality.feedback,
      },
    });

    // Get current maturity from frontmatter
    const currentMaturity = MaturityLevel.fromFrontmatter(
      note.metadata.growthStage as string | undefined
    );

    // Map Korean dimension names to English keys for score lookup
    const dimensionNameMap: Record<string, keyof typeof parsed.dimensions> = {
      '원자성': 'atomicity',
      '연결성': 'connectivity',
      '명확성': 'clarity',
      '근거': 'evidence',
      '독창성': 'originality',
    };

    // Build improvements list, filtering out high-scoring dimensions (>= 70)
    const improvements: ImprovementSuggestion[] = parsed.improvements
      .filter((imp) => {
        const dimKey = dimensionNameMap[imp.dimension];
        if (!dimKey) return true; // Keep if dimension name not recognized
        const score = parsed.dimensions[dimKey]?.score ?? 0;
        return score < 70; // Only include dimensions with score < 70
      })
      .map((imp) => ({
        dimension: imp.dimension,
        priority: imp.priority,
        suggestion: imp.suggestion,
        example: imp.example,
      }));

    // Create assessment
    const assessment = NoteAssessment.create({
      noteId: note.id,
      notePath: note.path,
      qualityScore,
      currentMaturity,
      improvements,
      splitSuggestion: parsed.splitSuggestion || null,
    });

    return {
      assessment,
      rawResponse: response.content,
    };
  }
}
