/**
 * Evergreen Note Cultivator - Obsidian Plugin
 *
 * 영구 노트 작성 과정을 단계별로 가이드하고 노트의 성장을 추적하는 플러그인
 * Phase 1: Domain Layer 구현 완료
 *
 * TODO (Phase 2+):
 * - Application Layer: Use Cases
 * - Adapters Layer: Obsidian, LLM Providers
 * - Infrastructure Layer: Views, Settings
 */

import { Plugin } from 'obsidian';
import { PluginSettings, DEFAULT_SETTINGS } from './types';

export default class EvergreenNoteCultivatorPlugin extends Plugin {
  settings!: PluginSettings;

  async onload(): Promise<void> {
    await this.loadSettings();

    console.log('Evergreen Note Cultivator: Plugin loaded (Phase 1 - Domain Layer)');

    // Phase 4에서 구현 예정:
    // - 사이드바 뷰 등록
    // - 명령어 등록
    // - 설정 탭 등록
    // - 리본 아이콘 추가
  }

  async onunload(): Promise<void> {
    console.log('Evergreen Note Cultivator: Plugin unloaded');
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
