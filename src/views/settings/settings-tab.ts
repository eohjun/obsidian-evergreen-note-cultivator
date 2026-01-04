/**
 * Evergreen Note Cultivator Settings Tab
 */

import { App, PluginSettingTab, Setting, DropdownComponent, Notice } from 'obsidian';
import type EvergreenNoteCultivatorPlugin from '../../main';
import type { LLMProviderType } from '../../core/domain';
import { AI_PROVIDERS, getModelsByProvider } from '../../core/domain';

export class CultivatorSettingTab extends PluginSettingTab {
  plugin: EvergreenNoteCultivatorPlugin;
  private modelDropdown: DropdownComponent | null = null;

  constructor(app: App, plugin: EvergreenNoteCultivatorPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h1', { text: 'Evergreen Note Cultivator' });

    this.renderAISettings(containerEl);
    this.renderDisplaySettings(containerEl);
    this.renderAssessmentSettings(containerEl);
    this.renderAdvancedSettings(containerEl);
  }

  private renderAISettings(containerEl: HTMLElement): void {
    containerEl.createEl('h2', { text: 'AI 설정' });

    // Provider Selection
    new Setting(containerEl)
      .setName('AI 프로바이더')
      .setDesc('사용할 AI 서비스를 선택하세요')
      .addDropdown((dropdown) => {
        Object.entries(AI_PROVIDERS).forEach(([key, config]) => {
          dropdown.addOption(key, config.displayName);
        });
        dropdown.setValue(this.plugin.settings.ai.provider);
        dropdown.onChange(async (value) => {
          this.plugin.settings.ai.provider = value as LLMProviderType;
          await this.plugin.saveSettings();
          this.updateModelDropdown();
          this.display();
        });
      });

    // API Key
    const currentProvider = this.plugin.settings.ai.provider;
    new Setting(containerEl)
      .setName(`${AI_PROVIDERS[currentProvider].displayName} API 키`)
      .setDesc('API 키를 입력하세요')
      .addText((text) => {
        text
          .setPlaceholder('API 키 입력')
          .setValue(this.plugin.settings.ai.apiKeys[currentProvider] ?? '')
          .onChange(async (value) => {
            this.plugin.settings.ai.apiKeys[currentProvider] = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.type = 'password';
      })
      .addButton((button) => {
        button
          .setButtonText('테스트')
          .onClick(async () => {
            const provider = this.plugin.getCurrentProvider();
            const apiKey = this.plugin.settings.ai.apiKeys[currentProvider];

            if (!provider) {
              new Notice('프로바이더를 찾을 수 없습니다.');
              return;
            }

            if (!apiKey) {
              new Notice('API 키를 먼저 입력해주세요.');
              return;
            }

            button.setDisabled(true);
            button.setButtonText('테스트 중...');

            try {
              const isValid = await provider.testApiKey(apiKey);
              if (isValid) {
                new Notice('✅ API 키가 유효합니다!');
              } else {
                new Notice('❌ API 키가 유효하지 않습니다.');
              }
            } catch (error) {
              const message = error instanceof Error ? error.message : '알 수 없는 오류';
              new Notice(`❌ 테스트 실패: ${message}`);
            } finally {
              button.setDisabled(false);
              button.setButtonText('테스트');
            }
          });
      });

    // Model Selection
    new Setting(containerEl)
      .setName('모델')
      .setDesc('사용할 모델을 선택하세요')
      .addDropdown((dropdown) => {
        this.modelDropdown = dropdown;
        this.populateModelDropdown(dropdown, currentProvider);
        dropdown.setValue(
          this.plugin.settings.ai.models[currentProvider] ??
            AI_PROVIDERS[currentProvider].defaultModel
        );
        dropdown.onChange(async (value) => {
          this.plugin.settings.ai.models[currentProvider] = value;
          await this.plugin.saveSettings();
        });
      });

    // Budget Limit
    new Setting(containerEl)
      .setName('예산 한도 (USD)')
      .setDesc('월간 API 사용 예산 한도를 설정하세요 (선택 사항)')
      .addText((text) => {
        text
          .setPlaceholder('예: 10.00')
          .setValue(
            this.plugin.settings.ai.budgetLimit?.toString() ?? ''
          )
          .onChange(async (value) => {
            const numValue = parseFloat(value);
            this.plugin.settings.ai.budgetLimit = isNaN(numValue)
              ? undefined
              : numValue;
            await this.plugin.saveSettings();
          });
      });
  }

  private renderDisplaySettings(containerEl: HTMLElement): void {
    containerEl.createEl('h2', { text: '표시 설정' });

    new Setting(containerEl)
      .setName('탐색기에 성숙도 표시')
      .setDesc('파일 탐색기에서 노트 성숙도 아이콘을 표시합니다')
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.display.showMaturityInExplorer)
          .onChange(async (value) => {
            this.plugin.settings.display.showMaturityInExplorer = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('사이드바에 점수 표시')
      .setDesc('사이드바에서 품질 점수를 표시합니다')
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.display.showScoreInSidebar)
          .onChange(async (value) => {
            this.plugin.settings.display.showScoreInSidebar = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('시작 시 사이드바 자동 열기')
      .setDesc('플러그인 로드 시 사이드바를 자동으로 엽니다')
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.display.autoOpenSidebar)
          .onChange(async (value) => {
            this.plugin.settings.display.autoOpenSidebar = value;
            await this.plugin.saveSettings();
          });
      });
  }

  private renderAssessmentSettings(containerEl: HTMLElement): void {
    containerEl.createEl('h2', { text: '평가 설정' });

    new Setting(containerEl)
      .setName('노트 열기 시 자동 평가')
      .setDesc('노트를 열 때 자동으로 품질 평가를 실행합니다')
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.assessment.autoAssessOnOpen)
          .onChange(async (value) => {
            this.plugin.settings.assessment.autoAssessOnOpen = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('상세 피드백 표시')
      .setDesc('각 평가 차원에 대한 상세 피드백을 표시합니다')
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.assessment.showDetailedFeedback)
          .onChange(async (value) => {
            this.plugin.settings.assessment.showDetailedFeedback = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('분리 제안 활성화')
      .setDesc('원자성이 낮은 노트에 대해 분리 제안을 표시합니다')
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.assessment.enableSplitSuggestions)
          .onChange(async (value) => {
            this.plugin.settings.assessment.enableSplitSuggestions = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('연결 제안 활성화')
      .setDesc('다른 노트와의 연결 제안을 표시합니다')
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.assessment.enableConnectionSuggestions)
          .onChange(async (value) => {
            this.plugin.settings.assessment.enableConnectionSuggestions = value;
            await this.plugin.saveSettings();
          });
      });
  }

  private renderAdvancedSettings(containerEl: HTMLElement): void {
    containerEl.createEl('h2', { text: '고급 설정' });

    new Setting(containerEl)
      .setName('Frontmatter 키')
      .setDesc('성숙도를 저장할 frontmatter 키 이름')
      .addText((text) => {
        text
          .setPlaceholder('growth-stage')
          .setValue(this.plugin.settings.frontmatterKey)
          .onChange(async (value) => {
            this.plugin.settings.frontmatterKey = value || 'growth-stage';
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('최대 토큰 수')
      .setDesc('AI 응답의 최대 토큰 수')
      .addText((text) => {
        text
          .setPlaceholder('4096')
          .setValue(this.plugin.settings.ai.maxTokens.toString())
          .onChange(async (value) => {
            const numValue = parseInt(value);
            if (!isNaN(numValue) && numValue > 0) {
              this.plugin.settings.ai.maxTokens = numValue;
              await this.plugin.saveSettings();
            }
          });
      });

    new Setting(containerEl)
      .setName('Temperature')
      .setDesc('AI 응답의 창의성 수준 (0.0 - 1.0)')
      .addSlider((slider) => {
        slider
          .setLimits(0, 1, 0.1)
          .setValue(this.plugin.settings.ai.temperature)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.ai.temperature = value;
            await this.plugin.saveSettings();
          });
      });
  }

  private populateModelDropdown(
    dropdown: DropdownComponent,
    provider: LLMProviderType
  ): void {
    const models = getModelsByProvider(provider);
    models.forEach((model) => {
      dropdown.addOption(model.id, model.displayName);
    });
  }

  private updateModelDropdown(): void {
    if (!this.modelDropdown) return;

    const provider = this.plugin.settings.ai.provider;

    // Clear existing options
    this.modelDropdown.selectEl.empty();

    // Add new options
    this.populateModelDropdown(this.modelDropdown, provider);

    // Set default value
    this.modelDropdown.setValue(
      this.plugin.settings.ai.models[provider] ??
        AI_PROVIDERS[provider].defaultModel
    );
  }
}
