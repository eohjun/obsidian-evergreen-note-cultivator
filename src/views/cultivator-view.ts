/**
 * Cultivator View - Sidebar View
 * 노트 성숙도와 품질 정보를 표시하는 사이드바 뷰
 */

import { ItemView, WorkspaceLeaf, TFile, Notice } from 'obsidian';
import type EvergreenNoteCultivatorPlugin from '../main';
import { MaturityLevel, QualityScore, NoteAssessment, type NoteData } from '../core/domain';
import { AssessNoteQualityUseCase, UpdateMaturityUseCase, type AssessNoteQualityOutput } from '../core/application';

export const VIEW_TYPE_CULTIVATOR = 'evergreen-cultivator-view';

// Callout identifier for saved assessments
const ASSESSMENT_CALLOUT_TYPE = 'assessment';
const ASSESSMENT_CALLOUT_REGEX = /^>\s*\[!assessment\][+-]?\s*.*/m;
const ASSESSMENT_CALLOUT_BLOCK_REGEX = /(^>\s*\[!assessment\][+-]?\s*.*\n(?:>.*\n?)*)/m;

export class CultivatorView extends ItemView {
  private plugin: EvergreenNoteCultivatorPlugin;
  private currentFile: TFile | null = null;
  private lastAssessment: AssessNoteQualityOutput | null = null;
  private dynamicContentEl: HTMLElement | null = null;
  private isLoadedFromNote: boolean = false;

  constructor(leaf: WorkspaceLeaf, plugin: EvergreenNoteCultivatorPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_CULTIVATOR;
  }

  getDisplayText(): string {
    return 'Evergreen Cultivator';
  }

  getIcon(): string {
    return 'sprout';
  }

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass('cultivator-view-container');

    // Register file change listener
    this.registerEvent(
      this.app.workspace.on('file-open', (file) => {
        this.onFileOpen(file);
      })
    );

    // Register metadata change listener (for frontmatter updates)
    this.registerEvent(
      this.app.metadataCache.on('changed', (file) => {
        if (this.currentFile && file.path === this.currentFile.path) {
          this.renderNoteInfo(this.currentFile);
        }
      })
    );

    // Initial render
    const activeFile = this.app.workspace.getActiveFile();
    if (activeFile) {
      await this.onFileOpen(activeFile);
    } else {
      this.renderEmptyState();
    }
  }

  async onClose(): Promise<void> {
    // Cleanup
  }

  private async onFileOpen(file: TFile | null): Promise<void> {
    this.currentFile = file;
    this.lastAssessment = null;
    this.isLoadedFromNote = false;

    if (!file) {
      this.renderEmptyState();
      return;
    }

    if (file.extension !== 'md') {
      this.renderNonMarkdownState();
      return;
    }

    // Try to load existing assessment from note
    await this.loadAssessmentFromNote(file);

    await this.renderNoteInfo(file);
  }

  private renderEmptyState(): void {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();

    const emptyEl = container.createDiv({ cls: 'cultivator-empty' });
    emptyEl.createEl('div', { cls: 'cultivator-icon', text: '🌱' });
    emptyEl.createEl('p', { text: '노트를 열어 성장 상태를 확인하세요' });
  }

  private renderNonMarkdownState(): void {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();

    const emptyEl = container.createDiv({ cls: 'cultivator-empty' });
    emptyEl.createEl('div', { cls: 'cultivator-icon', text: '📄' });
    emptyEl.createEl('p', { text: '마크다운 노트에서만 사용 가능합니다' });
  }

  private async renderNoteInfo(file: TFile): Promise<void> {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();

    // === STATIC SECTION (stays during loading) ===

    // Header with maturity
    const headerEl = container.createDiv({ cls: 'cultivator-header' });

    // Get current maturity from frontmatter
    const cache = this.app.metadataCache.getFileCache(file);
    const maturityValue = cache?.frontmatter?.[this.plugin.settings.frontmatterKey];
    const maturity = maturityValue
      ? MaturityLevel.fromFrontmatter(maturityValue)
      : MaturityLevel.default();

    headerEl.createEl('div', {
      cls: 'cultivator-maturity-icon',
      text: maturity.icon
    });
    headerEl.createEl('h3', {
      cls: 'cultivator-maturity-text',
      text: maturity.displayName
    });
    headerEl.createEl('p', {
      cls: 'cultivator-maturity-desc',
      text: maturity.description
    });

    // Note title
    container.createEl('h4', {
      cls: 'cultivator-note-title',
      text: file.basename
    });

    // Stats section
    const statsEl = container.createDiv({ cls: 'cultivator-stats' });

    const content = await this.app.vault.cachedRead(file);
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
    const linkCount = cache?.links?.length ?? 0;
    const tagCount = this.countTags(cache);

    this.renderStat(statsEl, '📝', '단어 수', wordCount.toString());
    this.renderStat(statsEl, '🔗', '링크', linkCount.toString());
    this.renderStat(statsEl, '🏷️', '태그', tagCount.toString());

    // Actions section
    const actionsEl = container.createDiv({ cls: 'cultivator-actions' });

    const assessBtn = actionsEl.createEl('button', {
      cls: 'cultivator-btn cultivator-btn-primary',
      text: '🔍 품질 평가하기'
    });
    assessBtn.addEventListener('click', () => this.runAssessment());

    // === DYNAMIC SECTION (changes during loading/results) ===
    this.dynamicContentEl = container.createDiv({ cls: 'cultivator-dynamic-content' });
    this.renderDynamicContent();
  }

  private renderDynamicContent(): void {
    if (!this.dynamicContentEl) return;
    this.dynamicContentEl.empty();

    // Assessment results (if available)
    if (this.lastAssessment?.assessment) {
      // Show "loaded from note" indicator if applicable
      if (this.isLoadedFromNote) {
        const loadedIndicator = this.dynamicContentEl.createDiv({ cls: 'cultivator-loaded-indicator' });
        loadedIndicator.createEl('span', { text: '📂 저장된 평가 불러옴' });
      }

      this.renderAssessmentResults(this.dynamicContentEl, this.lastAssessment);
      this.renderGrowthGuideSection(this.dynamicContentEl);

      // Save button
      const saveActionsEl = this.dynamicContentEl.createDiv({ cls: 'cultivator-save-actions' });
      const saveBtn = saveActionsEl.createEl('button', {
        cls: 'cultivator-btn cultivator-btn-save',
        text: '📝 노트에 저장'
      });
      saveBtn.addEventListener('click', () => this.saveAssessmentToNote());
    } else {
      // Default hint
      const guideEl = this.dynamicContentEl.createDiv({ cls: 'cultivator-guide' });
      guideEl.createEl('h4', { text: '🌱 성장 가이드' });
      const tipEl = guideEl.createDiv({ cls: 'cultivator-tip' });
      tipEl.createEl('p', {
        text: '품질 평가를 실행하면 다음 단계로 성장하기 위한 구체적인 가이드를 받을 수 있습니다.'
      });
    }
  }

  private renderLoadingInDynamicArea(): void {
    if (!this.dynamicContentEl) return;
    this.dynamicContentEl.empty();

    const loadingEl = this.dynamicContentEl.createDiv({ cls: 'cultivator-loading' });

    // Spinner element - using a wrapper for better control
    const spinnerWrapper = loadingEl.createDiv({ cls: 'cultivator-spinner-wrapper' });
    spinnerWrapper.createDiv({ cls: 'cultivator-spinner' });

    loadingEl.createEl('p', {
      cls: 'cultivator-loading-text',
      text: 'AI가 노트 품질을 평가하고 있습니다...'
    });
  }

  private renderStat(container: HTMLElement, icon: string, label: string, value: string): void {
    const statEl = container.createDiv({ cls: 'cultivator-stat' });
    statEl.createEl('span', { cls: 'cultivator-stat-icon', text: icon });
    statEl.createEl('span', { cls: 'cultivator-stat-label', text: label });
    statEl.createEl('span', { cls: 'cultivator-stat-value', text: value });
  }

  private countTags(cache: ReturnType<typeof this.app.metadataCache.getFileCache>): number {
    let count = 0;

    if (cache?.frontmatter?.tags) {
      const fmTags = cache.frontmatter.tags;
      if (Array.isArray(fmTags)) {
        count += fmTags.length;
      } else if (typeof fmTags === 'string') {
        count += 1;
      }
    }

    if (cache?.tags) {
      count += cache.tags.length;
    }

    return count;
  }

  private async buildNoteData(file: TFile): Promise<NoteData> {
    const content = await this.app.vault.cachedRead(file);
    const cache = this.app.metadataCache.getFileCache(file);
    const maturityValue = cache?.frontmatter?.[this.plugin.settings.frontmatterKey];

    return {
      id: file.path,
      path: file.path,
      basename: file.basename,
      content,
      metadata: {
        title: file.basename,
        tags: cache?.frontmatter?.tags ?? [],
        growthStage: maturityValue,
      },
    };
  }

  private getExistingLinks(file: TFile): string[] {
    const cache = this.app.metadataCache.getFileCache(file);
    return cache?.links?.map(link => link.link) ?? [];
  }

  private getBacklinks(file: TFile): string[] {
    const resolvedLinks = this.app.metadataCache.resolvedLinks;
    const backlinks: string[] = [];

    for (const [sourcePath, links] of Object.entries(resolvedLinks)) {
      if (links[file.path] !== undefined && sourcePath !== file.path) {
        backlinks.push(sourcePath);
      }
    }

    return backlinks;
  }

  private async runAssessment(): Promise<void> {
    if (!this.currentFile) {
      new Notice('노트를 먼저 열어주세요.');
      return;
    }

    const aiService = this.plugin.getAIService();
    if (!aiService?.isAvailable()) {
      new Notice('AI 설정을 먼저 완료해주세요.');
      return;
    }

    const provider = aiService.getCurrentProvider();
    if (!provider) {
      new Notice('AI 프로바이더를 찾을 수 없습니다.');
      return;
    }

    // Show loading state ONLY in dynamic area (keeps header/stats visible)
    this.renderLoadingInDynamicArea();

    try {
      const noteData = await this.buildNoteData(this.currentFile);
      const existingLinks = this.getExistingLinks(this.currentFile);
      const backlinks = this.getBacklinks(this.currentFile);

      const useCase = new AssessNoteQualityUseCase(provider);

      const result = await useCase.execute({
        note: noteData,
        existingLinks,
        backlinks,
      });

      if (result.assessment) {
        this.lastAssessment = result;
        this.renderDynamicContent();
        new Notice('✅ 평가 완료!');
      } else {
        this.renderDynamicContent();
        new Notice(`❌ 평가 실패: ${result.error ?? '알 수 없는 오류'}`);
      }
    } catch (error) {
      this.renderDynamicContent();
      const message = error instanceof Error ? error.message : '알 수 없는 오류';
      new Notice(`❌ 오류: ${message}`);
    }
  }

  private renderAssessmentResults(container: HTMLElement, result: AssessNoteQualityOutput): void {
    if (!result.assessment) return;

    const resultsEl = container.createDiv({ cls: 'cultivator-results' });
    resultsEl.createEl('h4', { text: '📊 평가 결과' });

    const assessment = result.assessment;
    const qualityScore = assessment.qualityScore;

    // Overall score
    const scoreEl = resultsEl.createDiv({ cls: 'cultivator-score' });
    scoreEl.createEl('span', { cls: 'cultivator-score-value', text: `${qualityScore.totalScore}점` });
    scoreEl.createEl('span', { cls: 'cultivator-score-grade', text: qualityScore.getGrade() });

    // Dimension scores
    const dimensionsEl = resultsEl.createDiv({ cls: 'cultivator-dimensions' });

    qualityScore.getAllDimensions().forEach(dim => {
      this.renderDimensionBar(dimensionsEl, dim);
    });

    // Recommended maturity with update button (inline layout)
    const recommendedMaturity = assessment.recommendedMaturity;
    if (recommendedMaturity) {
      const recEl = resultsEl.createDiv({ cls: 'cultivator-recommendation' });

      // Left side: label and value
      const recLeftEl = recEl.createDiv({ cls: 'cultivator-recommendation-left' });
      recLeftEl.createEl('span', {
        cls: 'cultivator-recommendation-label',
        text: '추천 성숙도:'
      });
      recLeftEl.createEl('span', {
        cls: 'cultivator-recommendation-value',
        text: `${recommendedMaturity.icon} ${recommendedMaturity.displayName}`
      });

      // Right side: button or match indicator
      const cache = this.app.metadataCache.getFileCache(this.currentFile!);
      const currentMaturityValue = cache?.frontmatter?.[this.plugin.settings.frontmatterKey];
      const currentMaturity = currentMaturityValue
        ? MaturityLevel.fromFrontmatter(currentMaturityValue)
        : MaturityLevel.default();

      if (currentMaturity.level !== recommendedMaturity.level) {
        const updateBtn = recEl.createEl('button', {
          cls: 'cultivator-btn-update',
          text: '업데이트'
        });
        updateBtn.addEventListener('click', () => this.updateMaturityToRecommended(recommendedMaturity));
      } else {
        recEl.createEl('span', {
          cls: 'cultivator-recommendation-match',
          text: '✓ 일치'
        });
      }
    }
  }

  private async updateMaturityToRecommended(targetMaturity: MaturityLevel): Promise<void> {
    if (!this.currentFile) return;

    try {
      // Get current maturity
      const cache = this.app.metadataCache.getFileCache(this.currentFile);
      const currentMaturityValue = cache?.frontmatter?.[this.plugin.settings.frontmatterKey];
      const currentMaturity = currentMaturityValue
        ? MaturityLevel.fromFrontmatter(currentMaturityValue)
        : MaturityLevel.default();

      const useCase = new UpdateMaturityUseCase(this.plugin.getNoteRepository());

      const result = await useCase.execute({
        noteId: this.currentFile.path,
        currentMaturity: currentMaturity,
        targetMaturity: targetMaturity,
        forceUpdate: true, // Allow any level change based on recommendation
      });

      if (result.success) {
        new Notice(`✅ 성숙도가 ${targetMaturity.icon} ${targetMaturity.displayName}(으)로 업데이트되었습니다.`);
        // Re-render the entire view to reflect the change
        await this.renderNoteInfo(this.currentFile);
      } else {
        new Notice(`❌ 업데이트 실패: ${result.error ?? '알 수 없는 오류'}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류';
      new Notice(`❌ 오류: ${message}`);
    }
  }

  private renderDimensionBar(
    container: HTMLElement,
    dim: { icon: string; displayName: string; score: number }
  ): void {
    const barContainer = container.createDiv({ cls: 'cultivator-dimension' });

    const labelEl = barContainer.createDiv({ cls: 'cultivator-dimension-label' });
    labelEl.createEl('span', { text: `${dim.icon} ${dim.displayName}` });
    labelEl.createEl('span', { text: `${dim.score}점` });

    const barBg = barContainer.createDiv({ cls: 'cultivator-dimension-bar-bg' });
    const barFill = barBg.createDiv({ cls: 'cultivator-dimension-bar-fill' });
    barFill.style.width = `${dim.score}%`;

    // Color based on score
    if (dim.score >= 80) {
      barFill.addClass('cultivator-bar-excellent');
    } else if (dim.score >= 60) {
      barFill.addClass('cultivator-bar-good');
    } else if (dim.score >= 40) {
      barFill.addClass('cultivator-bar-fair');
    } else {
      barFill.addClass('cultivator-bar-poor');
    }
  }

  private renderGrowthGuideSection(container: HTMLElement): void {
    const guideEl = container.createDiv({ cls: 'cultivator-guide' });
    guideEl.createEl('h4', { text: '🌱 성장 가이드' });

    // Check if we have assessment results with improvements
    if (this.lastAssessment?.assessment?.improvements && this.lastAssessment.assessment.improvements.length > 0) {
      this.renderImprovementsList(guideEl, this.lastAssessment.assessment.improvements);
    } else {
      const tipEl = guideEl.createDiv({ cls: 'cultivator-tip' });
      tipEl.createEl('p', {
        text: '개선 제안이 없습니다. 훌륭한 노트입니다!'
      });
    }
  }

  private renderImprovementsList(container: HTMLElement, improvements: readonly {
    dimension: string;
    priority: 'high' | 'medium' | 'low';
    suggestion: string;
    example?: string;
  }[]): void {
    const listEl = container.createDiv({ cls: 'cultivator-improvements' });

    improvements.forEach((imp, index) => {
      const itemEl = listEl.createDiv({ cls: 'cultivator-improvement-item' });

      // Priority indicator
      const priorityIcon = imp.priority === 'high' ? '🔴' : imp.priority === 'medium' ? '🟡' : '🟢';
      const priorityText = imp.priority === 'high' ? '높음' : imp.priority === 'medium' ? '보통' : '낮음';

      // Header with dimension and priority
      const headerEl = itemEl.createDiv({ cls: 'cultivator-improvement-header' });
      headerEl.createEl('span', { cls: 'cultivator-improvement-number', text: `${index + 1}` });
      headerEl.createEl('span', { cls: 'cultivator-improvement-dimension', text: imp.dimension });
      headerEl.createEl('span', {
        cls: `cultivator-improvement-priority cultivator-priority-${imp.priority}`,
        text: `${priorityIcon} ${priorityText}`
      });

      // Suggestion
      itemEl.createEl('p', {
        cls: 'cultivator-improvement-suggestion',
        text: imp.suggestion
      });

      // Example if available
      if (imp.example) {
        const exampleEl = itemEl.createDiv({ cls: 'cultivator-improvement-example' });
        exampleEl.createEl('span', { cls: 'cultivator-example-label', text: '💡 예시: ' });
        exampleEl.createEl('span', { text: imp.example });
      }
    });
  }

  // ============================================
  // Assessment Persistence (Save/Load from Note)
  // ============================================

  private generateAssessmentCallout(): string {
    if (!this.lastAssessment?.assessment) return '';

    const assessment = this.lastAssessment.assessment;
    const qualityScore = assessment.qualityScore;
    const date = new Date().toISOString().split('T')[0];

    const lines: string[] = [];
    lines.push(`> [!${ASSESSMENT_CALLOUT_TYPE}]- 📊 품질 평가 결과 (${date})`);
    lines.push(`> **총점**: ${qualityScore.totalScore}점 (${qualityScore.getGrade()})`);

    if (assessment.recommendedMaturity) {
      lines.push(`> **추천 성숙도**: ${assessment.recommendedMaturity.icon} ${assessment.recommendedMaturity.displayName}`);
    }

    lines.push(`>`);
    lines.push(`> | 차원 | 점수 | 피드백 |`);
    lines.push(`> |------|------|--------|`);

    assessment.improvements.forEach(imp => {
      // Escape pipe characters in feedback
      const feedback = imp.suggestion.replace(/\|/g, '\\|').replace(/\n/g, ' ');
      const truncatedFeedback = feedback.length > 100 ? feedback.substring(0, 100) + '...' : feedback;
      lines.push(`> | ${imp.dimension} | ${this.getScoreForDimension(imp.dimension)}점 | ${truncatedFeedback} |`);
    });

    return lines.join('\n');
  }

  private getScoreForDimension(dimensionName: string): number {
    if (!this.lastAssessment?.assessment) return 0;

    const qualityScore = this.lastAssessment.assessment.qualityScore;
    const dimensions = qualityScore.getAllDimensions();

    const dimensionMap: Record<string, string> = {
      '원자성': '원자성',
      '연결성': '연결성',
      '명확성': '명확성',
      '근거': '근거',
      '독창성': '독창성',
    };

    const dim = dimensions.find(d => d.displayName === dimensionName);
    return dim?.score ?? 0;
  }

  private async saveAssessmentToNote(): Promise<void> {
    if (!this.currentFile || !this.lastAssessment?.assessment) {
      new Notice('저장할 평가 결과가 없습니다.');
      return;
    }

    try {
      const callout = this.generateAssessmentCallout();
      if (!callout) {
        new Notice('콜아웃 생성에 실패했습니다.');
        return;
      }

      let content = await this.app.vault.read(this.currentFile);

      // Check if assessment callout already exists
      if (ASSESSMENT_CALLOUT_BLOCK_REGEX.test(content)) {
        // Replace existing callout
        content = content.replace(ASSESSMENT_CALLOUT_BLOCK_REGEX, callout);
        new Notice('✅ 평가 결과가 업데이트되었습니다.');
      } else {
        // Append to end of note
        content = content.replace(/\s+$/, '') + '\n\n' + callout + '\n';
        new Notice('✅ 평가 결과가 노트에 저장되었습니다.');
      }

      await this.app.vault.modify(this.currentFile, content);
      this.isLoadedFromNote = true;

    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류';
      new Notice(`❌ 저장 실패: ${message}`);
    }
  }

  private async loadAssessmentFromNote(file: TFile): Promise<void> {
    try {
      const content = await this.app.vault.cachedRead(file);

      // Check if assessment callout exists
      const match = content.match(ASSESSMENT_CALLOUT_BLOCK_REGEX);
      if (!match) return;

      const calloutBlock = match[1];
      const parsed = this.parseAssessmentCallout(calloutBlock);

      if (parsed) {
        this.lastAssessment = parsed;
        this.isLoadedFromNote = true;
      }
    } catch (error) {
      console.error('Failed to load assessment from note:', error);
    }
  }

  private parseAssessmentCallout(calloutBlock: string): AssessNoteQualityOutput | null {
    try {
      const lines = calloutBlock.split('\n').map(l => l.replace(/^>\s?/, ''));

      // Parse total score from line like "**총점**: 72점 (양호)"
      const totalScoreLine = lines.find(l => l.includes('**총점**'));
      const totalScoreMatch = totalScoreLine?.match(/(\d+)점/);
      const totalScore = totalScoreMatch ? parseInt(totalScoreMatch[1]) : 0;

      // Parse recommended maturity
      const maturityLine = lines.find(l => l.includes('**추천 성숙도**'));
      let recommendedMaturity: MaturityLevel | null = null;
      if (maturityLine) {
        if (maturityLine.includes('Evergreen')) recommendedMaturity = MaturityLevel.create('evergreen');
        else if (maturityLine.includes('Tree')) recommendedMaturity = MaturityLevel.create('tree');
        else if (maturityLine.includes('Sprout')) recommendedMaturity = MaturityLevel.create('sprout');
        else recommendedMaturity = MaturityLevel.create('seed');
      }

      // Parse dimension scores from table
      const tableLines = lines.filter(l => l.startsWith('|') && !l.includes('---') && !l.includes('차원'));
      const improvements: { dimension: string; priority: 'high' | 'medium' | 'low'; suggestion: string }[] = [];
      const dimensionScores: Record<string, { score: number; feedback: string }> = {};

      tableLines.forEach(line => {
        const cells = line.split('|').map(c => c.trim()).filter(c => c);
        if (cells.length >= 3) {
          const dimension = cells[0];
          const scoreMatch = cells[1].match(/(\d+)/);
          const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;
          const feedback = cells[2].replace(/\\\|/g, '|');

          dimensionScores[dimension] = { score, feedback };

          const priority: 'high' | 'medium' | 'low' =
            score >= 80 ? 'low' : score >= 60 ? 'medium' : 'high';

          improvements.push({ dimension, priority, suggestion: feedback });
        }
      });

      // Build a minimal assessment object for display
      const qualityScore = QualityScore.fromScores({
        atomicity: dimensionScores['원자성'] || { score: 0, feedback: '' },
        connectivity: dimensionScores['연결성'] || { score: 0, feedback: '' },
        clarity: dimensionScores['명확성'] || { score: 0, feedback: '' },
        evidence: dimensionScores['근거'] || { score: 0, feedback: '' },
        originality: dimensionScores['독창성'] || { score: 0, feedback: '' },
      });

      const currentMaturity = MaturityLevel.default();

      const assessment = NoteAssessment.create({
        noteId: this.currentFile?.path ?? '',
        notePath: this.currentFile?.path ?? '',
        qualityScore,
        currentMaturity,
        improvements,
        splitSuggestion: null,
      });

      return { assessment };
    } catch (error) {
      console.error('Failed to parse assessment callout:', error);
      return null;
    }
  }
}
