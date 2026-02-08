/**
 * Evergreen Note Cultivator - Obsidian Plugin
 *
 * A plugin that guides the note-writing process step by step and tracks note growth.
 * Evaluates note quality and manages maturity levels based on Zettelkasten principles.
 */

import { Plugin, Notice, TFile, WorkspaceLeaf } from 'obsidian';
import type { ILLMProvider, LLMProviderType } from './core/domain';
import {
  AIService,
  initializeAIService,
  updateAIServiceSettings,
  getAIService,
  AssessmentHistoryService,
} from './core/application';
import type { AssessmentRecord } from './core/domain';
import {
  ClaudeProvider,
  OpenAIProvider,
  GeminiProvider,
  GrokProvider,
  ObsidianNoteRepository,
} from './core/adapters';
import { AI_PROVIDERS } from './core/domain';
import { CultivatorView, VIEW_TYPE_CULTIVATOR } from './views/cultivator-view';
import { AssessmentModal } from './views/assessment-modal';
import { CultivatorSettingTab } from './views/settings/settings-tab';
import { DEFAULT_SETTINGS, type PluginSettings } from './types';

export default class EvergreenNoteCultivatorPlugin extends Plugin {
  settings!: PluginSettings;
  private aiService: AIService | null = null;
  private noteRepository!: ObsidianNoteRepository;
  private historyService!: AssessmentHistoryService;

  async onload(): Promise<void> {
    await this.loadSettings();

    // Initialize repository
    this.noteRepository = new ObsidianNoteRepository(this.app);

    // Initialize AI Service
    this.initializeAIService();

    // Initialize Assessment History Service
    this.historyService = new AssessmentHistoryService(
      this.settings.history.maxPerNote,
      async () => {
        const data = await this.loadData();
        return data?.assessmentHistory ?? null;
      },
      async (historyData: Record<string, AssessmentRecord[]>) => {
        const data = (await this.loadData()) ?? {};
        data.assessmentHistory = historyData;
        await this.saveData(data);
      },
    );
    await this.historyService.initialize();

    // Register view
    this.registerView(
      VIEW_TYPE_CULTIVATOR,
      (leaf) => new CultivatorView(leaf, this)
    );

    // Register commands
    this.addCommand({
      id: 'assess-current-note',
      name: 'Assess current note quality',
      callback: () => this.assessCurrentNote(),
    });

    this.addCommand({
      id: 'show-growth-guide',
      name: 'Show growth guide',
      callback: () => this.showGrowthGuide(),
    });

    this.addCommand({
      id: 'open-cultivator-sidebar',
      name: 'Open Cultivator sidebar',
      callback: () => this.activateView(),
    });

    this.addCommand({
      id: 'update-maturity',
      name: 'Update note maturity level',
      callback: () => this.updateMaturity(),
    });

    // Add ribbon icon
    this.addRibbonIcon('sprout', 'Evergreen Note Cultivator', () => {
      this.activateView();
    });

    // Add settings tab
    this.addSettingTab(new CultivatorSettingTab(this.app, this));

    // Auto-open sidebar if configured
    if (this.settings.display.autoOpenSidebar) {
      this.app.workspace.onLayoutReady(() => {
        this.activateView();
      });
    }

    console.log('Evergreen Note Cultivator: Plugin loaded');
  }

  async onunload(): Promise<void> {
    console.log('Evergreen Note Cultivator: Plugin unloaded');
    this.aiService = null;
  }

  async loadSettings(): Promise<void> {
    const loaded = await this.loadData();

    // Deep merge settings
    this.settings = {
      ...DEFAULT_SETTINGS,
      ai: {
        ...DEFAULT_SETTINGS.ai,
        apiKeys: { ...DEFAULT_SETTINGS.ai.apiKeys },
        models: { ...DEFAULT_SETTINGS.ai.models },
      },
      display: { ...DEFAULT_SETTINGS.display },
      assessment: { ...DEFAULT_SETTINGS.assessment },
      history: { ...DEFAULT_SETTINGS.history },
    };

    if (loaded) {
      // Merge AI settings
      if (loaded.ai) {
        if (loaded.ai.provider) this.settings.ai.provider = loaded.ai.provider;
        if (loaded.ai.apiKeys) {
          this.settings.ai.apiKeys = { ...this.settings.ai.apiKeys, ...loaded.ai.apiKeys };
        }
        if (loaded.ai.models) {
          this.settings.ai.models = { ...this.settings.ai.models, ...loaded.ai.models };
        }
        if (loaded.ai.maxTokens !== undefined) {
          this.settings.ai.maxTokens = loaded.ai.maxTokens;
        }
        if (loaded.ai.temperature !== undefined) {
          this.settings.ai.temperature = loaded.ai.temperature;
        }
        if (loaded.ai.budgetLimit !== undefined) {
          this.settings.ai.budgetLimit = loaded.ai.budgetLimit;
        }
      }

      // Merge display settings
      if (loaded.display) {
        this.settings.display = { ...this.settings.display, ...loaded.display };
      }

      // Merge assessment settings
      if (loaded.assessment) {
        this.settings.assessment = { ...this.settings.assessment, ...loaded.assessment };
      }

      // Merge history settings
      if (loaded.history) {
        this.settings.history = { ...this.settings.history, ...loaded.history };
      }

      // Merge frontmatter key
      if (loaded.frontmatterKey) {
        this.settings.frontmatterKey = loaded.frontmatterKey;
      }
    }
  }

  async saveSettings(): Promise<void> {
    // Preserve assessmentHistory when saving settings
    const existing = (await this.loadData()) ?? {};
    const dataToSave = {
      ...this.settings,
      assessmentHistory: existing.assessmentHistory,
    };
    await this.saveData(dataToSave);
    this.updateAIService();
  }

  private initializeAIService(): void {
    this.aiService = initializeAIService({
      provider: this.settings.ai.provider,
      apiKeys: this.settings.ai.apiKeys,
      models: this.settings.ai.models,
    });

    // Register all providers
    const providers: [LLMProviderType, ILLMProvider][] = [
      ['claude', new ClaudeProvider()],
      ['openai', new OpenAIProvider()],
      ['gemini', new GeminiProvider()],
      ['grok', new GrokProvider()],
    ];

    providers.forEach(([type, provider]) => {
      // Set API key if available
      const apiKey = this.settings.ai.apiKeys[type];
      if (apiKey) {
        provider.setApiKey(apiKey);
      }

      // Set model
      const model = this.settings.ai.models[type] ?? AI_PROVIDERS[type].defaultModel;
      provider.setModel(model);

      this.aiService?.registerProvider(type, provider);
    });
  }

  private updateAIService(): void {
    updateAIServiceSettings({
      provider: this.settings.ai.provider,
      apiKeys: this.settings.ai.apiKeys,
      models: this.settings.ai.models,
    });

    // Update provider configurations
    const service = getAIService();
    if (!service) return;

    (['claude', 'openai', 'gemini', 'grok'] as LLMProviderType[]).forEach((type) => {
      const provider = service.getProvider(type);
      if (provider) {
        const apiKey = this.settings.ai.apiKeys[type];
        if (apiKey) {
          provider.setApiKey(apiKey);
        }

        const model = this.settings.ai.models[type] ?? AI_PROVIDERS[type].defaultModel;
        provider.setModel(model);
      }
    });
  }

  getCurrentProvider(): ILLMProvider | undefined {
    return this.aiService?.getCurrentProvider();
  }

  getAIService(): AIService | null {
    return this.aiService;
  }

  getNoteRepository(): ObsidianNoteRepository {
    return this.noteRepository;
  }

  getHistoryService(): AssessmentHistoryService {
    return this.historyService;
  }

  async activateView(): Promise<void> {
    const { workspace } = this.app;

    let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_CULTIVATOR);

    if (leaves.length > 0) {
      leaf = leaves[0];
    } else {
      leaf = workspace.getRightLeaf(false);
      if (leaf) {
        await leaf.setViewState({ type: VIEW_TYPE_CULTIVATOR, active: true });
      }
    }

    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }

  private async assessCurrentNote(): Promise<void> {
    const activeFile = this.app.workspace.getActiveFile();

    if (!activeFile) {
      new Notice('Please open a note.');
      return;
    }

    if (!this.aiService?.isAvailable()) {
      new Notice('Please complete AI settings first. (Settings → Evergreen Note Cultivator)');
      return;
    }

    try {
      const content = await this.app.vault.read(activeFile);

      if (!content.trim()) {
        new Notice('Note content is empty.');
        return;
      }

      const modal = new AssessmentModal(this.app, this, activeFile);
      modal.open();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to read note.';
      new Notice(`Error: ${message}`);
    }
  }

  private async showGrowthGuide(): Promise<void> {
    const activeFile = this.app.workspace.getActiveFile();

    if (!activeFile) {
      new Notice('Please open a note.');
      return;
    }

    if (!this.aiService?.isAvailable()) {
      new Notice('Please complete AI settings first.');
      return;
    }

    // Open modal with growth guide focus
    const modal = new AssessmentModal(this.app, this, activeFile, 'growth-guide');
    modal.open();
  }

  private async updateMaturity(): Promise<void> {
    const activeFile = this.app.workspace.getActiveFile();

    if (!activeFile) {
      new Notice('Please open a note.');
      return;
    }

    // Open modal with maturity update focus
    const modal = new AssessmentModal(this.app, this, activeFile, 'update-maturity');
    modal.open();
  }
}
