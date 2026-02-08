/**
 * AssessmentHistoryService
 * Manages assessment history records using plugin data storage.
 * Uses callback-based load/save to decouple from Obsidian dependency.
 */

import type { AssessmentRecord, ScoreDelta } from '../../domain';

export class AssessmentHistoryService {
  private history: Map<string, AssessmentRecord[]> = new Map();
  private initialized = false;

  constructor(
    private maxPerNote: number,
    private loadData: () => Promise<Record<string, AssessmentRecord[]> | null>,
    private saveData: (data: Record<string, AssessmentRecord[]>) => Promise<void>,
  ) {}

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const data = await this.loadData();
    this.history.clear();

    if (data) {
      for (const [notePath, records] of Object.entries(data)) {
        this.history.set(notePath, records);
      }
    }

    this.initialized = true;
  }

  async addRecord(record: AssessmentRecord): Promise<void> {
    if (!this.initialized) await this.initialize();

    const records = this.history.get(record.notePath) ?? [];
    records.push(record);

    // Keep only the most recent N records
    if (records.length > this.maxPerNote) {
      records.splice(0, records.length - this.maxPerNote);
    }

    this.history.set(record.notePath, records);
    await this.persist();
  }

  getLatestRecord(notePath: string): AssessmentRecord | null {
    const records = this.history.get(notePath);
    if (!records || records.length === 0) return null;
    return records[records.length - 1];
  }

  getHistory(notePath: string): AssessmentRecord[] {
    return this.history.get(notePath) ?? [];
  }

  calculateDelta(notePath: string, current: AssessmentRecord): ScoreDelta | null {
    const previous = this.getLatestRecord(notePath);
    if (!previous) return null;

    const dimensionDeltas: Partial<Record<string, number>> = {};
    for (const [dim, score] of Object.entries(current.dimensionScores)) {
      const prevScore = previous.dimensionScores[dim as keyof typeof previous.dimensionScores];
      if (prevScore !== undefined) {
        dimensionDeltas[dim] = score - prevScore;
      }
    }

    return {
      totalDelta: current.totalScore - previous.totalScore,
      dimensionDeltas,
      previousAssessedAt: previous.assessedAt,
    };
  }

  private async persist(): Promise<void> {
    const data: Record<string, AssessmentRecord[]> = {};
    for (const [notePath, records] of this.history.entries()) {
      data[notePath] = records;
    }
    await this.saveData(data);
  }
}
