/**
 * ObsidianNoteRepository
 * Obsidian Vault 연동을 위한 Repository 구현
 *
 * INoteRepository 인터페이스를 구현하여 Domain Layer와 Obsidian 연결
 */

import { normalizePath, type App, type TFile, type CachedMetadata } from 'obsidian';
import type {
  INoteRepository,
  NoteData,
  NoteMetadata,
  NoteSummary,
  NoteSearchOptions,
} from '../../domain/interfaces/note-repository.interface';
import { MaturityLevel, type MaturityLevelEnum } from '../../domain/value-objects/maturity-level';

/**
 * Frontmatter에서 사용하는 성숙도 키
 */
const MATURITY_KEY = 'growth-stage';

export class ObsidianNoteRepository implements INoteRepository {
  constructor(private readonly app: App) {}

  /**
   * 노트 ID로 조회 (Obsidian에서는 path가 ID)
   */
  async getById(id: string): Promise<NoteData | null> {
    return this.getByPath(id);
  }

  /**
   * 노트 경로로 조회 (cross-platform safe)
   */
  async getByPath(path: string): Promise<NoteData | null> {
    const normalizedPath = normalizePath(path);
    const file = this.app.vault.getAbstractFileByPath(normalizedPath);
    if (!(file instanceof this.app.vault.adapter.constructor)) {
      // TFile check - use alternative approach
      const files = this.app.vault.getMarkdownFiles();
      const targetFile = files.find(f => f.path === normalizedPath);
      if (!targetFile) return null;
      return this.fileToNoteData(targetFile);
    }
    return null;
  }

  /**
   * 현재 활성 노트 조회
   */
  async getActiveNote(): Promise<NoteData | null> {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) return null;
    return this.fileToNoteData(activeFile);
  }

  /**
   * 모든 마크다운 노트 목록 조회
   */
  async getAllNotes(): Promise<NoteSummary[]> {
    const files = this.app.vault.getMarkdownFiles();
    return Promise.all(files.map(file => this.fileToNoteSummary(file)));
  }

  /**
   * 조건으로 노트 검색
   */
  async searchNotes(options: NoteSearchOptions): Promise<NoteSummary[]> {
    let files = this.app.vault.getMarkdownFiles();

    // 폴더 필터 (cross-platform safe)
    if (options.folder) {
      const normalizedFolder = normalizePath(options.folder);
      files = files.filter(f => f.path.startsWith(normalizedFolder));
    }

    // 태그 필터
    if (options.tags && options.tags.length > 0) {
      files = files.filter(f => {
        const cache = this.app.metadataCache.getFileCache(f);
        const fileTags = this.extractTags(cache);
        return options.tags!.some(tag => fileTags.includes(tag));
      });
    }

    // 성숙도 필터
    if (options.maturityLevel) {
      files = files.filter(f => {
        const cache = this.app.metadataCache.getFileCache(f);
        const stage = cache?.frontmatter?.[MATURITY_KEY];
        return stage === options.maturityLevel;
      });
    }

    // 백링크 존재 필터
    if (options.hasBacklinks !== undefined) {
      files = files.filter(f => {
        const backlinkCount = this.countBacklinks(f.path);
        const hasBacklinks = backlinkCount > 0;
        return options.hasBacklinks === hasBacklinks;
      });
    }

    // 수정일 필터
    if (options.modifiedAfter) {
      const afterTimestamp = options.modifiedAfter.getTime();
      files = files.filter(f => f.stat.mtime >= afterTimestamp);
    }

    // 제한
    if (options.limit && options.limit > 0) {
      files = files.slice(0, options.limit);
    }

    return Promise.all(files.map(file => this.fileToNoteSummary(file)));
  }

  /**
   * 노트의 아웃링크 (이 노트가 연결하는 노트들)
   */
  async getOutlinks(noteId: string): Promise<string[]> {
    const file = this.getFileByPath(noteId);
    if (!file) return [];

    const cache = this.app.metadataCache.getFileCache(file);
    if (!cache?.links) return [];

    return cache.links
      .map(link => {
        const linkedFile = this.app.metadataCache.getFirstLinkpathDest(link.link, file.path);
        return linkedFile?.path;
      })
      .filter((path): path is string => !!path);
  }

  /**
   * 노트의 백링크 (이 노트를 연결하는 노트들)
   */
  async getBacklinks(noteId: string): Promise<string[]> {
    const file = this.getFileByPath(noteId);
    if (!file) return [];

    const backlinkPaths: string[] = [];
    const resolvedLinks = this.app.metadataCache.resolvedLinks;

    // resolvedLinks를 순회하여 이 파일을 가리키는 노트 찾기
    for (const [sourcePath, links] of Object.entries(resolvedLinks)) {
      if (links[file.path] !== undefined) {
        backlinkPaths.push(sourcePath);
      }
    }

    return backlinkPaths;
  }

  /**
   * 노트 Frontmatter 업데이트
   */
  async updateMetadata(noteId: string, metadata: Partial<NoteMetadata>): Promise<void> {
    const file = this.getFileByPath(noteId);
    if (!file) throw new Error(`Note not found: ${noteId}`);

    await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
      Object.assign(frontmatter, metadata);
    });
  }

  /**
   * 노트 성숙도 업데이트
   */
  async updateMaturityLevel(noteId: string, level: MaturityLevel): Promise<void> {
    await this.updateMetadata(noteId, {
      [MATURITY_KEY]: level.level,
    } as Partial<NoteMetadata>);
  }

  /**
   * 노트 내용 업데이트
   */
  async updateContent(noteId: string, content: string): Promise<void> {
    const file = this.getFileByPath(noteId);
    if (!file) throw new Error(`Note not found: ${noteId}`);

    await this.app.vault.modify(file, content);
  }

  /**
   * 새 노트 생성 (cross-platform safe)
   */
  async createNote(path: string, content: string, metadata?: NoteMetadata): Promise<NoteData> {
    const normalizedPath = normalizePath(path);

    // Frontmatter 포함한 내용 생성
    let fullContent = content;
    if (metadata) {
      const frontmatter = this.metadataToFrontmatter(metadata);
      fullContent = `---\n${frontmatter}---\n\n${content}`;
    }

    try {
      const file = await this.app.vault.create(normalizedPath, fullContent);
      const noteData = await this.fileToNoteData(file);
      if (!noteData) throw new Error(`Failed to create note: ${normalizedPath}`);
      return noteData;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      // File exists from sync - use adapter.write fallback
      if (msg.toLowerCase().includes('already exists')) {
        await this.app.vault.adapter.write(normalizedPath, fullContent);
        const file = this.getFileByPath(normalizedPath);
        if (!file) throw new Error(`Failed to create note: ${normalizedPath}`);
        const noteData = await this.fileToNoteData(file);
        if (!noteData) throw new Error(`Failed to create note: ${normalizedPath}`);
        return noteData;
      }
      throw error;
    }
  }

  /**
   * 노트 존재 여부 확인 (cross-platform safe with adapter fallback)
   */
  async exists(path: string): Promise<boolean> {
    const normalizedPath = normalizePath(path);
    const file = this.app.vault.getAbstractFileByPath(normalizedPath);
    if (file !== null) return true;

    // Adapter fallback for sync scenarios
    try {
      return await this.app.vault.adapter.exists(normalizedPath);
    } catch {
      return false;
    }
  }

  /**
   * 태그로 노트 검색
   */
  async getNotesByTag(tag: string): Promise<NoteSummary[]> {
    return this.searchNotes({ tags: [tag] });
  }

  /**
   * 특정 성숙도의 노트 목록
   */
  async getNotesByMaturity(level: MaturityLevel): Promise<NoteSummary[]> {
    return this.searchNotes({ maturityLevel: level.level });
  }

  // ============ Private Helpers ============

  /**
   * 경로로 파일 가져오기 (cross-platform safe)
   */
  private getFileByPath(path: string): TFile | null {
    const normalizedPath = normalizePath(path);
    const files = this.app.vault.getMarkdownFiles();
    return files.find(f => f.path === normalizedPath) ?? null;
  }

  /**
   * TFile을 NoteData로 변환
   */
  private async fileToNoteData(file: TFile): Promise<NoteData | null> {
    try {
      const content = await this.app.vault.cachedRead(file);
      const cache = this.app.metadataCache.getFileCache(file);
      const metadata = this.extractMetadata(cache, file);

      return {
        id: file.path,
        path: file.path,
        basename: file.basename,
        content,
        metadata,
      };
    } catch {
      return null;
    }
  }

  /**
   * TFile을 NoteSummary로 변환
   */
  private async fileToNoteSummary(file: TFile): Promise<NoteSummary> {
    const cache = this.app.metadataCache.getFileCache(file);
    const tags = this.extractTags(cache);
    const maturityLevel = this.extractMaturityLevel(cache);

    const outlinks = cache?.links?.length ?? 0;
    const backlinkCount = this.countBacklinks(file.path);

    return {
      id: file.path,
      path: file.path,
      basename: file.basename,
      tags,
      maturityLevel,
      linkCount: outlinks,
      backlinkCount,
    };
  }

  /**
   * 파일의 백링크 수 계산
   */
  private countBacklinks(filePath: string): number {
    const resolvedLinks = this.app.metadataCache.resolvedLinks;
    let count = 0;

    for (const links of Object.values(resolvedLinks)) {
      if (links[filePath] !== undefined) {
        count++;
      }
    }

    return count;
  }

  /**
   * 캐시에서 메타데이터 추출
   */
  private extractMetadata(cache: CachedMetadata | null, file: TFile): NoteMetadata {
    const frontmatter = cache?.frontmatter ?? {};

    return {
      title: frontmatter.title ?? file.basename,
      tags: this.extractTags(cache),
      aliases: frontmatter.aliases ?? [],
      created: frontmatter.created ?? file.stat.ctime.toString(),
      modified: frontmatter.modified ?? file.stat.mtime.toString(),
      growthStage: frontmatter[MATURITY_KEY],
      ...frontmatter,
    };
  }

  /**
   * 캐시에서 태그 추출 (frontmatter + inline 태그 모두)
   */
  private extractTags(cache: CachedMetadata | null): string[] {
    const tags: string[] = [];

    // Frontmatter 태그
    if (cache?.frontmatter?.tags) {
      const fmTags = cache.frontmatter.tags;
      if (Array.isArray(fmTags)) {
        tags.push(...fmTags);
      } else if (typeof fmTags === 'string') {
        tags.push(fmTags);
      }
    }

    // Inline 태그
    if (cache?.tags) {
      tags.push(...cache.tags.map(t => t.tag.replace('#', '')));
    }

    return [...new Set(tags)]; // 중복 제거
  }

  /**
   * 캐시에서 성숙도 추출
   */
  private extractMaturityLevel(cache: CachedMetadata | null): MaturityLevel {
    const stage = cache?.frontmatter?.[MATURITY_KEY] as MaturityLevelEnum | undefined;
    if (stage && ['seed', 'sprout', 'tree', 'evergreen'].includes(stage)) {
      return MaturityLevel.create(stage);
    }
    return MaturityLevel.default(); // 기본값: seed
  }

  /**
   * 메타데이터를 YAML frontmatter 문자열로 변환
   */
  private metadataToFrontmatter(metadata: NoteMetadata): string {
    const lines: string[] = [];

    for (const [key, value] of Object.entries(metadata)) {
      if (value === undefined || value === null) continue;

      if (Array.isArray(value)) {
        if (value.length > 0) {
          lines.push(`${key}:`);
          value.forEach(v => lines.push(`  - ${v}`));
        }
      } else if (typeof value === 'object') {
        // Skip complex objects for now
        continue;
      } else {
        lines.push(`${key}: ${value}`);
      }
    }

    return lines.join('\n') + '\n';
  }
}
