# Evergreen Note Cultivator

> Guide note growth from seed to evergreen with AI-powered assessment and feedback

Obsidian 플러그인으로, 영구 노트(Evergreen Note)의 성장 과정을 시각화하고 AI 기반 품질 평가를 통해 노트의 성숙도를 체계적으로 관리합니다.

## Features

### 1. Maturity Level Tracking

노트의 성숙도를 4단계로 추적합니다:

| 단계 | 아이콘 | 이름 | 설명 |
|------|--------|------|------|
| 1 | 🌱 | Seed | 아이디어 단계 - 초기 생각, 플릿 노트 |
| 2 | 🌿 | Sprout | 발전 중 - 구조화 시작, 연결 형성 |
| 3 | 🌳 | Tree | 성숙 - 충분한 내용, 다수의 연결 |
| 4 | 🌲 | Evergreen | 완성 - 원자적, 잘 연결된 영구 노트 |

### 2. AI-Powered Quality Assessment

5가지 차원에서 노트 품질을 평가합니다:

- **Atomicity (원자성)**: 단일 개념에 집중하는 정도
- **Connectivity (연결성)**: 다른 노트와의 연결 품질
- **Clarity (명확성)**: 표현의 명확성과 구조화
- **Evidence (근거)**: 주장을 뒷받침하는 근거
- **Originality (독창성)**: 자신만의 통찰과 해석

### 3. Growth Guide

현재 단계에서 다음 단계로 성장하기 위한 구체적인 가이드를 제공합니다.

### 4. Multi-LLM Support

다양한 AI 프로바이더를 지원합니다:
- Claude (Anthropic)
- OpenAI (GPT-4, GPT-4o)
- Google Gemini
- Grok

## Installation

### BRAT (Beta Reviewers Auto-update Tester)

1. [BRAT 플러그인](https://github.com/TfTHacker/obsidian42-brat) 설치
2. BRAT 설정 → "Add Beta Plugin" 클릭
3. 저장소 URL 입력: `eohjun/obsidian-evergreen-note-cultivator`
4. "Add Plugin" 클릭

### Manual Installation

1. [Releases](https://github.com/eohjun/obsidian-evergreen-note-cultivator/releases)에서 최신 버전 다운로드
2. `main.js`, `manifest.json`, `styles.css`를 vault의 `.obsidian/plugins/evergreen-note-cultivator/` 폴더에 복사
3. Obsidian 재시작 → Settings → Community plugins → "Evergreen Note Cultivator" 활성화

## Configuration

### AI Settings

1. Settings → Evergreen Note Cultivator
2. **AI 프로바이더** 선택 (Claude, OpenAI, Gemini, Grok)
3. **API 키** 입력
4. "테스트" 버튼으로 연결 확인
5. 원하는 **모델** 선택

### Display Settings

- **탐색기에 성숙도 표시**: 파일 탐색기에서 아이콘 표시
- **사이드바에 점수 표시**: 품질 점수 표시
- **시작 시 사이드바 자동 열기**: 플러그인 로드 시 자동 열기

### Assessment Settings

- **노트 열기 시 자동 평가**: 자동 품질 평가 실행
- **상세 피드백 표시**: 각 차원별 상세 피드백
- **분리 제안 활성화**: 원자성이 낮은 노트에 대한 분리 제안
- **연결 제안 활성화**: 다른 노트와의 연결 제안

## Usage

### Sidebar View

1. 좌측 리본의 🌱 아이콘 클릭 또는 명령어 팔레트에서 "Open Cultivator Sidebar"
2. 현재 노트의 성숙도와 기본 통계 확인
3. "품질 평가하기" 버튼으로 AI 평가 실행

### Commands

| 명령어 | 설명 |
|--------|------|
| Open Cultivator Sidebar | 사이드바 열기 |
| Assess Current Note | 현재 노트 품질 평가 |
| Show Growth Guide | 성장 가이드 보기 |
| Update Note Maturity | 노트 성숙도 업데이트 |

### Assessment Modal

품질 평가 실행 후 모달에서 확인할 수 있는 정보:
- **개요**: 총점, 등급, 요약
- **차원별 점수**: 5가지 차원의 상세 점수와 피드백
- **개선 제안**: 품질 향상을 위한 구체적인 제안
- **연결 제안**: 관련 노트와의 연결 기회
- **성장 가이드**: 다음 단계로 성장하기 위한 안내

## Frontmatter

성숙도는 노트의 frontmatter에 저장됩니다:

```yaml
---
growth-stage: sprout
---
```

기본 키는 `growth-stage`이며, 설정에서 변경 가능합니다.

## Development

```bash
# Clone repository
git clone https://github.com/eohjun/obsidian-evergreen-note-cultivator.git
cd obsidian-evergreen-note-cultivator

# Install dependencies
npm install

# Development mode (watch)
npm run dev

# Production build
npm run build

# Type check
npm run typecheck
```

### Project Structure (Clean Architecture)

```
src/
├── main.ts                    # Plugin entry point
├── types.ts                   # Settings types
├── core/
│   ├── domain/                # Business logic
│   │   ├── entities/          # MaturityLevel, NoteAssessment
│   │   ├── value-objects/     # QualityScore, GrowthGuide
│   │   ├── interfaces/        # INoteRepository, ILLMProvider
│   │   └── constants/         # MODEL_CONFIGS, AI_PROVIDERS
│   ├── application/           # Use cases
│   │   ├── use-cases/         # AssessNoteQuality, UpdateMaturity
│   │   └── services/          # AIService
│   └── adapters/              # External integrations
│       ├── obsidian/          # VaultNoteRepository
│       └── llm/               # Claude, OpenAI, Gemini providers
└── views/                     # UI components
    ├── cultivator-view.ts     # Sidebar view
    ├── assessment-modal.ts    # Assessment results modal
    └── settings/              # Settings tab
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Author

- **eohjun** - [GitHub](https://github.com/eohjun)

## Related Plugins

- [Note Topic Finder](https://github.com/eohjun/obsidian-note-topic-finder) - 노트 주제 추천
- [Reading Queue Manager](https://github.com/eohjun/obsidian-reading-queue-manager) - 읽기 큐 관리
- [PKM Note Recommender](https://github.com/eohjun/obsidian-pkm-note-recommender) - 노트 추천
