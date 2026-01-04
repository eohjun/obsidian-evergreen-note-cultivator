/**
 * SuggestConnectionsUseCase
 * 현재 노트와 연결할 수 있는 다른 노트들을 분석하고 제안합니다.
 */

import { ConnectionSuggestion } from '../../domain';
import type { ILLMProvider, LLMResponse, NoteSummary, NoteData } from '../../domain';

export interface SuggestConnectionsInput {
  note: NoteData;
  candidateNotes: NoteSummary[];
  maxSuggestions?: number;
}

export interface SuggestConnectionsOutput {
  suggestions: ConnectionSuggestion[];
  error?: string;
  rawResponse?: string;
}

interface LLMConnectionResponse {
  connections: {
    targetNote: string;
    relationshipType: 'supports' | 'contradicts' | 'extends' | 'exemplifies' | 'relates';
    reason: string;
    linkSuggestion: string;
  }[];
}

const SYSTEM_PROMPT = `당신은 Zettelkasten 기반 지식 네트워크 구축 전문가입니다.

**연결 유형:**
1. **supports (지지)**: 현재 노트의 주장을 뒷받침하거나 증거를 제공
2. **contradicts (반박)**: 현재 노트와 상반되는 관점이나 반례 제시
3. **extends (확장)**: 현재 노트의 아이디어를 더 깊이 발전시킴
4. **exemplifies (예시)**: 현재 노트 개념의 구체적 사례나 적용
5. **relates (관련)**: 주제적으로 관련되어 있으나 위 유형에 해당하지 않음

**좋은 연결의 특성:**
- 의미 있는 관계: 단순 키워드 일치가 아닌 개념적 연결
- 양방향 가치: 두 노트 모두에 인사이트 제공
- 발견 가능성: 새로운 관점이나 아이디어 촉발

모든 응답은 한국어로 작성합니다.`;

function buildUserPrompt(input: SuggestConnectionsInput): string {
  const { note, candidateNotes, maxSuggestions = 5 } = input;

  const candidateList = candidateNotes
    .slice(0, 20) // Limit candidates for context length
    .map((n, i) => `${i + 1}. "${n.basename}" - 태그: ${n.tags.slice(0, 3).join(', ')}`)
    .join('\n');

  return `다음 노트와 연결할 수 있는 노트들을 제안해주세요.

**현재 노트 제목**: ${note.basename}
**태그**: ${note.metadata.tags?.join(', ') || '없음'}

**노트 내용**:
---
${note.content.slice(0, 2000)}${note.content.length > 2000 ? '...' : ''}
---

**연결 후보 노트들**:
${candidateList}

**응답 형식:**
가장 의미 있는 연결을 ${maxSuggestions}개까지 제안하세요.
\`\`\`json
{
  "connections": [
    {
      "targetNote": "노트 제목 (정확히 일치)",
      "relationshipType": "supports|contradicts|extends|exemplifies|relates",
      "reason": "연결 이유 (1-2문장, 구체적으로)",
      "linkSuggestion": "노트에 추가할 링크 문장 예시"
    }
  ]
}
\`\`\`

**주의사항:**
- targetNote는 후보 목록에 있는 정확한 이름 사용
- 연결 이유는 구체적이고 의미 있게 작성
- 단순 키워드 일치가 아닌 개념적 연결 우선
- linkSuggestion은 실제로 노트에 추가할 수 있는 문장 형태`;
}

function parseConnectionResponse(
  responseText: string
): LLMConnectionResponse | null {
  try {
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : responseText.trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Failed to parse connection response:', error);
    return null;
  }
}

export class SuggestConnectionsUseCase {
  constructor(private readonly llmProvider: ILLMProvider) {}

  async execute(input: SuggestConnectionsInput): Promise<SuggestConnectionsOutput> {
    const { note, candidateNotes } = input;

    if (candidateNotes.length === 0) {
      return {
        suggestions: [],
        error: '연결 후보 노트가 없습니다.',
      };
    }

    if (!note.content || note.content.trim().length < 30) {
      return {
        suggestions: [],
        error: '노트 내용이 너무 짧아 연결 제안이 어렵습니다.',
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
        suggestions: [],
        error: response.error ?? 'LLM 요청에 실패했습니다.',
        rawResponse: response.content,
      };
    }

    const parsed = parseConnectionResponse(response.content);
    if (!parsed) {
      return {
        suggestions: [],
        error: '연결 제안 파싱에 실패했습니다.',
        rawResponse: response.content,
      };
    }

    // Validate and filter suggestions
    const validSuggestions: ConnectionSuggestion[] = parsed.connections
      .filter((conn) => {
        // Verify target note exists in candidates
        return candidateNotes.some(
          (c) => c.basename.toLowerCase() === conn.targetNote.toLowerCase()
        );
      })
      .map((conn) => ({
        targetNote: conn.targetNote,
        relationshipType: conn.relationshipType,
        reason: conn.reason,
        linkSuggestion: conn.linkSuggestion,
      }));

    return {
      suggestions: validSuggestions,
      rawResponse: response.content,
    };
  }
}
