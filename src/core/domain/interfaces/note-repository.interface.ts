/**
 * INoteRepository Interface
 * 노트 저장소 인터페이스 (Port)
 *
 * 이 인터페이스는 Domain Layer에서 정의되고,
 * Adapters Layer에서 ObsidianNoteRepository로 구현됩니다.
 */

import { MaturityLevel } from '../value-objects/maturity-level';

/**
 * 노트 메타데이터 (Frontmatter)
 */
export interface NoteMetadata {
  title: string;
  tags?: string[];
  aliases?: string[];
  created?: string;
  modified?: string;
  growthStage?: string;
  [key: string]: unknown;
}

/**
 * 노트 데이터
 */
export interface NoteData {
  id: string;
  path: string;
  basename: string;
  content: string;
  metadata: NoteMetadata;
}

/**
 * 노트 요약 (목록 조회용)
 */
export interface NoteSummary {
  id: string;
  path: string;
  basename: string;
  tags: string[];
  maturityLevel: MaturityLevel;
  linkCount: number;
  backlinkCount: number;
}

/**
 * 노트 검색 옵션
 */
export interface NoteSearchOptions {
  folder?: string;
  tags?: string[];
  maturityLevel?: string;
  hasBacklinks?: boolean;
  modifiedAfter?: Date;
  limit?: number;
}

/**
 * 노트 저장소 인터페이스
 */
export interface INoteRepository {
  /**
   * 노트 ID로 조회
   */
  getById(id: string): Promise<NoteData | null>;

  /**
   * 노트 경로로 조회
   */
  getByPath(path: string): Promise<NoteData | null>;

  /**
   * 현재 활성 노트 조회
   */
  getActiveNote(): Promise<NoteData | null>;

  /**
   * 모든 마크다운 노트 목록 조회
   */
  getAllNotes(): Promise<NoteSummary[]>;

  /**
   * 조건으로 노트 검색
   */
  searchNotes(options: NoteSearchOptions): Promise<NoteSummary[]>;

  /**
   * 노트의 아웃링크 (이 노트가 연결하는 노트들)
   */
  getOutlinks(noteId: string): Promise<string[]>;

  /**
   * 노트의 백링크 (이 노트를 연결하는 노트들)
   */
  getBacklinks(noteId: string): Promise<string[]>;

  /**
   * 노트 Frontmatter 업데이트
   */
  updateMetadata(noteId: string, metadata: Partial<NoteMetadata>): Promise<void>;

  /**
   * 노트 성숙도 업데이트
   */
  updateMaturityLevel(noteId: string, level: MaturityLevel): Promise<void>;

  /**
   * 노트 내용 업데이트
   */
  updateContent(noteId: string, content: string): Promise<void>;

  /**
   * 새 노트 생성
   */
  createNote(path: string, content: string, metadata?: NoteMetadata): Promise<NoteData>;

  /**
   * 노트 존재 여부 확인
   */
  exists(path: string): Promise<boolean>;

  /**
   * 태그로 노트 검색
   */
  getNotesByTag(tag: string): Promise<NoteSummary[]>;

  /**
   * 특정 성숙도의 노트 목록
   */
  getNotesByMaturity(level: MaturityLevel): Promise<NoteSummary[]>;
}
