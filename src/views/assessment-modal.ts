/**
 * Assessment Modal
 * Modal displaying detailed note quality assessment results
 */

import { App, Modal, Notice, TFile } from 'obsidian';
import type EvergreenNoteCultivatorPlugin from '../main';
import { MaturityLevel, type NoteData, type NoteSummary } from '../core/domain';
import {
  AssessNoteQualityUseCase,
  SuggestConnectionsUseCase,
  UpdateMaturityUseCase,
  GetGrowthGuideUseCase,
  type AssessNoteQualityOutput,
  type SuggestConnectionsOutput,
  type GetGrowthGuideOutput,
} from '../core/application';

type ModalMode = 'assess' | 'growth-guide' | 'update-maturity';

export class AssessmentModal extends Modal {
  private plugin: EvergreenNoteCultivatorPlugin;
  private file: TFile;
  private mode: ModalMode;
  private assessment: AssessNoteQualityOutput | null = null;
  private connections: SuggestConnectionsOutput | null = null;
  private growthGuide: GetGrowthGuideOutput | null = null;
  private isLoading: boolean = false;

  constructor(
    app: App,
    plugin: EvergreenNoteCultivatorPlugin,
    file: TFile,
    mode: ModalMode = 'assess'
  ) {
    super(app);
    this.plugin = plugin;
    this.file = file;
    this.mode = mode;
  }

  async onOpen(): Promise<void> {
    const { contentEl } = this;
    contentEl.addClass('assessment-modal');

    this.renderHeader();
    await this.runAnalysis();
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }

  private renderHeader(): void {
    const { contentEl } = this;

    const headerEl = contentEl.createDiv({ cls: 'assessment-modal-header' });
    headerEl.createEl('h2', { text: '🌱 Evergreen Note Cultivator' });
    headerEl.createEl('p', {
      cls: 'assessment-modal-subtitle',
      text: this.file.basename
    });
  }

  private async buildNoteData(): Promise<NoteData> {
    const content = await this.app.vault.cachedRead(this.file);
    const cache = this.app.metadataCache.getFileCache(this.file);
    const maturityValue = cache?.frontmatter?.[this.plugin.settings.frontmatterKey];

    return {
      id: this.file.path,
      path: this.file.path,
      basename: this.file.basename,
      content,
      metadata: {
        title: this.file.basename,
        tags: cache?.frontmatter?.tags ?? [],
        growthStage: maturityValue,
      },
    };
  }

  private getExistingLinks(): string[] {
    const cache = this.app.metadataCache.getFileCache(this.file);
    return cache?.links?.map(link => link.link) ?? [];
  }

  private getBacklinks(): string[] {
    const resolvedLinks = this.app.metadataCache.resolvedLinks;
    const backlinks: string[] = [];

    for (const [sourcePath, links] of Object.entries(resolvedLinks)) {
      if (links[this.file.path] !== undefined && sourcePath !== this.file.path) {
        backlinks.push(sourcePath);
      }
    }

    return backlinks;
  }

  private async runAnalysis(): Promise<void> {
    const { contentEl } = this;

    // Loading state
    this.isLoading = true;
    const loadingEl = contentEl.createDiv({ cls: 'assessment-loading' });
    loadingEl.createEl('div', { cls: 'assessment-spinner' });
    loadingEl.createEl('p', { text: 'Analyzing...' });

    const aiService = this.plugin.getAIService();
    if (!aiService?.isAvailable()) {
      loadingEl.empty();
      const errorEl = loadingEl.createDiv({ cls: 'assessment-error' });
      errorEl.createEl('p', {
        text: '❌ Please complete AI settings first. (Settings → Evergreen Note Cultivator)'
      });
      this.isLoading = false;
      return;
    }

    const provider = aiService.getCurrentProvider();
    if (!provider) {
      loadingEl.empty();
      const errorEl = loadingEl.createDiv({ cls: 'assessment-error' });
      errorEl.createEl('p', {
        text: '❌ AI provider not found.'
      });
      this.isLoading = false;
      return;
    }

    try {
      const noteData = await this.buildNoteData();
      const existingLinks = this.getExistingLinks();
      const backlinks = this.getBacklinks();

      // Run assessment
      const assessUseCase = new AssessNoteQualityUseCase(provider);
      this.assessment = await assessUseCase.execute({
        note: noteData,
        existingLinks,
        backlinks,
      });

      // Get growth guide if assessment succeeded
      if (this.assessment.assessment) {
        const currentMaturity = this.assessment.assessment.currentMaturity;
        const qualityScore = this.assessment.assessment.qualityScore;

        const guideUseCase = new GetGrowthGuideUseCase(provider);
        this.growthGuide = await guideUseCase.execute({
          note: noteData,
          currentMaturity,
          qualityScore,
        });
      }

      // Get connection suggestions if enabled
      if (this.plugin.settings.assessment.enableConnectionSuggestions && this.assessment.assessment) {
        const noteRepository = this.plugin.getNoteRepository();
        const allSummaries = await noteRepository.getAllNotes();
        const candidateNotes: NoteSummary[] = allSummaries
          .filter(n => n.path !== this.file.path)
          .slice(0, 20);

        if (candidateNotes.length > 0) {
          const connectUseCase = new SuggestConnectionsUseCase(provider);
          this.connections = await connectUseCase.execute({
            note: noteData,
            candidateNotes,
          });
        }
      }

      // Remove loading and render results
      loadingEl.remove();
      this.isLoading = false;
      this.renderResults();

    } catch (error) {
      loadingEl.empty();
      const message = error instanceof Error ? error.message : 'Unknown error';
      const errorEl = loadingEl.createDiv({ cls: 'assessment-error' });
      errorEl.createEl('p', { text: `❌ Analysis failed: ${message}` });
      this.isLoading = false;
    }
  }

  private renderResults(): void {
    const { contentEl } = this;

    if (!this.assessment?.assessment) {
      const errorEl = contentEl.createDiv({ cls: 'assessment-error' });
      errorEl.createEl('p', {
        text: `❌ Assessment failed: ${this.assessment?.error ?? 'Unknown error'}`
      });
      return;
    }

    const assessment = this.assessment.assessment;

    // Tab navigation
    const tabsEl = contentEl.createDiv({ cls: 'assessment-tabs' });
    const tabs = [
      { id: 'overview', label: '📊 Overview' },
      { id: 'dimensions', label: '📏 Dimension Analysis' },
      { id: 'suggestions', label: '💡 Improvements' },
      { id: 'connections', label: '🔗 Connections' },
      { id: 'growth', label: '🌱 Growth Guide' },
    ];

    const contentContainer = contentEl.createDiv({ cls: 'assessment-tab-content' });

    tabs.forEach((tab, index) => {
      const tabBtn = tabsEl.createEl('button', {
        cls: 'assessment-tab' + (index === 0 ? ' is-active' : ''),
        text: tab.label
      });
      tabBtn.addEventListener('click', () => {
        tabsEl.querySelectorAll('.assessment-tab').forEach(t => t.removeClass('is-active'));
        tabBtn.addClass('is-active');
        this.renderTabContent(contentContainer, tab.id);
      });
    });

    // Initial tab content
    this.renderTabContent(contentContainer, 'overview');
  }

  private renderTabContent(container: HTMLElement, tabId: string): void {
    container.empty();

    switch (tabId) {
      case 'overview':
        this.renderOverviewTab(container);
        break;
      case 'dimensions':
        this.renderDimensionsTab(container);
        break;
      case 'suggestions':
        this.renderSuggestionsTab(container);
        break;
      case 'connections':
        this.renderConnectionsTab(container);
        break;
      case 'growth':
        this.renderGrowthTab(container);
        break;
    }
  }

  private renderOverviewTab(container: HTMLElement): void {
    if (!this.assessment?.assessment) return;
    const assessment = this.assessment.assessment;

    // Overall score
    const scoreCard = container.createDiv({ cls: 'assessment-score-card' });
    const scoreCircle = scoreCard.createDiv({ cls: 'assessment-score-circle' });
    scoreCircle.createEl('span', { text: `${assessment.qualityScore.totalScore}` });

    const scoreInfo = scoreCard.createDiv({ cls: 'assessment-score-info' });
    scoreInfo.createEl('h4', { text: `Grade: ${assessment.qualityScore.getGrade()}` });
    scoreInfo.createEl('p', { text: assessment.qualityScore.getStatusText() });

    // Current vs Recommended maturity
    const currentMaturity = assessment.currentMaturity;
    const recommendedMaturity = assessment.recommendedMaturity;

    const maturitySection = container.createDiv({ cls: 'assessment-current-stage' });
    maturitySection.createDiv({ cls: 'stage-icon', text: currentMaturity.icon });
    maturitySection.createEl('h4', { text: currentMaturity.displayName });
    maturitySection.createEl('p', { text: currentMaturity.description });

    if (recommendedMaturity && recommendedMaturity.isHigherThan(currentMaturity)) {
      const upgradeSection = container.createDiv({ cls: 'cultivator-recommendation' });
      upgradeSection.createEl('p', {
        text: `✨ Recommended: ${recommendedMaturity.icon} ${recommendedMaturity.displayName}`
      });

      const updateBtn = container.createEl('button', {
        cls: 'assessment-update-btn',
        text: `Upgrade Maturity: ${recommendedMaturity.getDisplayText()}`
      });
      updateBtn.addEventListener('click', () => this.updateMaturity(recommendedMaturity));
    }

    // Quick summary
    const summarySection = container.createDiv({ cls: 'assessment-summary' });
    summarySection.createEl('h4', { text: 'Summary' });
    summarySection.createEl('p', { text: assessment.getSummaryText() });
  }

  private renderDimensionsTab(container: HTMLElement): void {
    if (!this.assessment?.assessment) return;
    const assessment = this.assessment.assessment;

    const dimensionList = container.createDiv({ cls: 'assessment-dimension-list' });

    assessment.qualityScore.getAllDimensions().forEach(dim => {
      const dimCard = dimensionList.createDiv({ cls: 'assessment-dimension-card' });

      const headerEl = dimCard.createDiv({ cls: 'assessment-dimension-header' });
      const titleEl = headerEl.createDiv({ cls: 'assessment-dimension-title' });
      titleEl.createEl('span', { text: `${dim.icon} ${dim.displayName}` });
      headerEl.createEl('span', { cls: 'assessment-dimension-score', text: `${dim.score}pts` });

      // Progress bar
      const barBg = dimCard.createDiv({ cls: 'cultivator-dimension-bar-bg' });
      const barFill = barBg.createDiv({ cls: 'cultivator-dimension-bar-fill' });
      barFill.style.width = `${dim.score}%`;

      if (dim.score >= 80) barFill.addClass('cultivator-bar-excellent');
      else if (dim.score >= 60) barFill.addClass('cultivator-bar-good');
      else if (dim.score >= 40) barFill.addClass('cultivator-bar-fair');
      else barFill.addClass('cultivator-bar-poor');

      // Feedback
      if (dim.feedback) {
        dimCard.createEl('p', { cls: 'assessment-dimension-feedback', text: dim.feedback });
      }
    });
  }

  private renderSuggestionsTab(container: HTMLElement): void {
    if (!this.assessment?.assessment) return;
    const assessment = this.assessment.assessment;

    // Improvement suggestions
    const improvements = assessment.improvements;
    if (improvements && improvements.length > 0) {
      const suggestionList = container.createDiv({ cls: 'assessment-suggestion-list' });

      improvements.forEach(imp => {
        const card = suggestionList.createDiv({ cls: 'assessment-suggestion-card' });
        card.createEl('h4', { text: `[${imp.priority.toUpperCase()}] ${imp.dimension}` });
        card.createEl('p', { text: imp.suggestion });

        if (imp.example) {
          card.createEl('p', {
            cls: 'assessment-dimension-feedback',
            text: `Example: ${imp.example}`
          });
        }
      });
    }

    // Split suggestion (singular)
    const splitSuggestion = assessment.splitSuggestion;
    if (splitSuggestion) {
      const splitSection = container.createDiv({ cls: 'assessment-suggestion-list' });
      splitSection.createEl('h4', { text: '✂️ Split Suggestion' });
      splitSection.createEl('p', {
        cls: 'assessment-dimension-feedback',
        text: 'This note covers multiple topics and splitting is recommended.'
      });

      const reasonCard = splitSection.createDiv({ cls: 'assessment-suggestion-card' });
      reasonCard.createEl('h4', { text: 'Reason for Split' });
      reasonCard.createEl('p', { text: splitSuggestion.reason });

      if (splitSuggestion.suggestedNotes && splitSuggestion.suggestedNotes.length > 0) {
        const notesSection = splitSection.createDiv({ cls: 'assessment-suggestion-card' });
        notesSection.createEl('h4', { text: 'Suggested New Notes' });

        splitSuggestion.suggestedNotes.forEach((note, idx) => {
          const noteEl = notesSection.createDiv();
          noteEl.createEl('p', { text: `${idx + 1}. ${note.title}` });
          noteEl.createEl('p', {
            cls: 'assessment-dimension-feedback',
            text: note.description
          });
        });
      }
    }

    if ((!improvements || improvements.length === 0) && !splitSuggestion) {
      container.createEl('p', {
        cls: 'cultivator-empty',
        text: 'No improvement suggestions. Excellent note!'
      });
    }
  }

  private renderConnectionsTab(container: HTMLElement): void {
    const suggestions = this.connections?.suggestions;
    if (!suggestions || suggestions.length === 0) {
      container.createEl('p', {
        cls: 'cultivator-empty',
        text: 'No connection suggestions.'
      });
      return;
    }

    const connectionList = container.createDiv({ cls: 'assessment-connection-list' });

    suggestions.forEach(conn => {
      const connItem = connectionList.createDiv({ cls: 'assessment-connection-item' });

      const relevance = connItem.createDiv({ cls: 'assessment-connection-relevance' });
      relevance.createEl('span', { text: conn.relationshipType });

      const info = connItem.createDiv({ cls: 'assessment-connection-info' });
      info.createEl('div', { cls: 'assessment-connection-title', text: conn.targetNote });
      info.createEl('div', { cls: 'assessment-connection-reason', text: conn.reason });

      if (conn.linkSuggestion) {
        const linkEl = info.createDiv({ cls: 'assessment-connection-reason' });
        linkEl.createEl('span', { text: 'Suggestion: ' });
        linkEl.createEl('code', { text: conn.linkSuggestion });
      }

      connItem.addEventListener('click', () => {
        const targetFile = this.app.metadataCache.getFirstLinkpathDest(conn.targetNote, this.file.path);
        if (targetFile) {
          this.app.workspace.getLeaf().openFile(targetFile);
        }
      });
    });
  }

  private renderGrowthTab(container: HTMLElement): void {
    const guide = this.growthGuide?.guide;
    if (!guide) {
      const errorMsg = this.growthGuide?.error ?? 'Unable to generate growth guide.';
      container.createEl('p', {
        cls: 'cultivator-empty',
        text: errorMsg
      });
      return;
    }

    const growthGuide = container.createDiv({ cls: 'assessment-growth-guide' });

    // Target level info
    const currentStage = growthGuide.createDiv({ cls: 'assessment-current-stage' });
    const targetLevel = MaturityLevel.create(guide.targetLevel);
    currentStage.createDiv({ cls: 'stage-icon', text: targetLevel.icon });
    currentStage.createEl('h4', { text: `Target: ${targetLevel.displayName}` });
    currentStage.createEl('p', {
      text: `Current ${guide.currentScore}pts → Target ${guide.requiredScore}pts`
    });

    // Steps
    if (guide.steps && guide.steps.length > 0) {
      const stepsSection = growthGuide.createDiv({ cls: 'assessment-next-steps' });
      stepsSection.createEl('h4', { text: '📋 Action Steps' });

      const stepList = stepsSection.createDiv({ cls: 'assessment-step-list' });

      guide.steps.forEach(step => {
        const stepItem = stepList.createDiv({ cls: 'assessment-step-item' });
        const stepNum = stepItem.createDiv({ cls: 'assessment-step-number' });
        stepNum.createEl('span', { text: `${step.step}` });

        const stepContent = stepItem.createDiv({ cls: 'assessment-step-content' });
        stepContent.createEl('h5', { text: step.action });
        stepContent.createEl('p', { text: step.expectedImpact });
      });
    }

    // Estimated effort
    if (guide.estimatedEffort) {
      const effortTexts: Record<string, string> = {
        low: 'Low (10-30 min)',
        medium: 'Medium (30 min - 1 hour)',
        high: 'High (1+ hour)',
      };

      const effortSection = growthGuide.createDiv({ cls: 'assessment-suggestion-card' });
      effortSection.createEl('h4', { text: '⏱️ Estimated Effort' });
      effortSection.createEl('p', { text: effortTexts[guide.estimatedEffort] ?? guide.estimatedEffort });
    }
  }

  private async updateMaturity(newMaturity: MaturityLevel): Promise<void> {
    const cache = this.app.metadataCache.getFileCache(this.file);
    const currentMaturityValue = cache?.frontmatter?.[this.plugin.settings.frontmatterKey];
    const currentMaturity = currentMaturityValue
      ? MaturityLevel.fromFrontmatter(currentMaturityValue)
      : MaturityLevel.default();

    const noteRepository = this.plugin.getNoteRepository();

    try {
      const useCase = new UpdateMaturityUseCase(noteRepository);

      const result = await useCase.execute({
        noteId: this.file.path,
        currentMaturity,
        targetMaturity: newMaturity,
      });

      if (result.success) {
        new Notice(`✅ Maturity updated to ${result.newLevel.getDisplayText()}!`);
        this.close();
      } else {
        new Notice(`❌ Update failed: ${result.error ?? 'Unknown error'}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      new Notice(`❌ Error: ${message}`);
    }
  }
}
