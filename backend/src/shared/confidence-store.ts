/**
 * Persisted tenant Data Confidence (H3 Pilot).
 * Snapshot written after ingest; handlers may refresh when missing/stale.
 */

import type { ConfidenceSnapshot } from './alert-engine.js';

export interface ConfidenceRecord extends ConfidenceSnapshot {
  tenantId: string;
  /** Configured meter count at compute time. */
  meterCountConfigured: number;
  computedAt: string;
}

export interface ConfidenceStore {
  getConfidence(tenantId: string): Promise<ConfidenceRecord | null>;
  putConfidence(record: ConfidenceRecord): Promise<void>;
}

export function confidenceRecordFromSnapshot(
  tenantId: string,
  snapshot: ConfidenceSnapshot,
  meterCountConfigured: number,
  computedAt = new Date().toISOString(),
): ConfidenceRecord {
  return {
    tenantId,
    ...snapshot,
    meterCountConfigured,
    computedAt,
  };
}

/** Prefer stored tier when fresh; otherwise use live snapshot fields. */
export function mergeConfidence(
  live: ConfidenceSnapshot,
  stored: ConfidenceRecord | null | undefined,
): ConfidenceSnapshot & { source: 'live' | 'stored'; computedAt?: string } {
  if (!stored) {
    return { ...live, source: 'live' };
  }
  return {
    level: stored.level,
    monthsOfHistory: stored.monthsOfHistory,
    meterCount: stored.meterCount,
    coveragePct: stored.coveragePct,
    displayScore: stored.displayScore,
    statisticalMode: stored.statisticalMode,
    plainLanguage: stored.plainLanguage,
    improveHint: stored.improveHint,
    source: 'stored',
    computedAt: stored.computedAt,
  };
}
