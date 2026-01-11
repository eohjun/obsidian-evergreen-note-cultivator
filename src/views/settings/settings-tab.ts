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
    containerEl.createEl('h2', { text: 'AI Settings' });

    // Provider Selection
    new Setting(containerEl)
      .setName('AI Provider')
      .setDesc('Select the AI service to use')
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
      .setName(`${AI_PROVIDERS[currentProvider].displayName} API Key`)
      .setDesc('Enter your API key')
      .addText((text) => {
        text
          .setPlaceholder('Enter API key')
          .setValue(this.plugin.settings.ai.apiKeys[currentProvider] ?? '')
          .onChange(async (value) => {
            this.plugin.settings.ai.apiKeys[currentProvider] = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.type = 'password';
      })
      .addButton((button) => {
        button
          .setButtonText('Test')
          .onClick(async () => {
            const provider = this.plugin.getCurrentProvider();
            const apiKey = this.plugin.settings.ai.apiKeys[currentProvider];

            if (!provider) {
              new Notice('Provider not found.');
              return;
            }

            if (!apiKey) {
              new Notice('Please enter an API key first.');
              return;
            }

            button.setDisabled(true);
            button.setButtonText('Testing...');

            try {
              const isValid = await provider.testApiKey(apiKey);
              if (isValid) {
                new Notice('✅ API key is valid!');
              } else {
                new Notice('❌ API key is invalid.');
              }
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Unknown error';
              new Notice(`❌ Test failed: ${message}`);
            } finally {
              button.setDisabled(false);
              button.setButtonText('Test');
            }
          });
      });

    // Model Selection
    new Setting(containerEl)
      .setName('Model')
      .setDesc('Select the model to use')
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
      .setName('Budget Limit (USD)')
      .setDesc('Set monthly API usage budget limit (optional)')
      .addText((text) => {
        text
          .setPlaceholder('e.g., 10.00')
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
    containerEl.createEl('h2', { text: 'Display Settings' });

    new Setting(containerEl)
      .setName('Show maturity in explorer')
      .setDesc('Display note maturity icons in file explorer')
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.display.showMaturityInExplorer)
          .onChange(async (value) => {
            this.plugin.settings.display.showMaturityInExplorer = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Show score in sidebar')
      .setDesc('Display quality score in sidebar')
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.display.showScoreInSidebar)
          .onChange(async (value) => {
            this.plugin.settings.display.showScoreInSidebar = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Auto-open sidebar on startup')
      .setDesc('Automatically open sidebar when plugin loads')
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
    containerEl.createEl('h2', { text: 'Assessment Settings' });

    new Setting(containerEl)
      .setName('Auto-assess on note open')
      .setDesc('Automatically run quality assessment when opening a note')
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.assessment.autoAssessOnOpen)
          .onChange(async (value) => {
            this.plugin.settings.assessment.autoAssessOnOpen = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Show detailed feedback')
      .setDesc('Display detailed feedback for each assessment dimension')
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.assessment.showDetailedFeedback)
          .onChange(async (value) => {
            this.plugin.settings.assessment.showDetailedFeedback = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Enable split suggestions')
      .setDesc('Show split suggestions for notes with low atomicity')
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.assessment.enableSplitSuggestions)
          .onChange(async (value) => {
            this.plugin.settings.assessment.enableSplitSuggestions = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Enable connection suggestions')
      .setDesc('Show suggestions for connections to other notes')
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
    containerEl.createEl('h2', { text: 'Advanced Settings' });

    new Setting(containerEl)
      .setName('Frontmatter key')
      .setDesc('Frontmatter key name to store maturity level')
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
      .setName('Max tokens')
      .setDesc('Maximum tokens for AI response')
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
      .setDesc('AI response creativity level (0.0 - 1.0)')
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
