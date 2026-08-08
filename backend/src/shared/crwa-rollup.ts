/**
 * Sanitized CRWA enterprise roll-up (D4 + G6 + H5).
 * Per-municipality balance % + Confidence only — no customer PII.
 */

import { assessTenantConfidence, type ConfidenceLevel, type ConfidenceSnapshot } from './alert-engine.js';
import type { MeterLocation, MeterReading } from './meter-location.js';
import type { SourceReading } from './source-reading.js';
import type { TenantProfile } from './tenant-admin.js';
import { calculateWaterBalance } from './water-balance.js';

export interface CrwaRollupRow {
  tenantId: string;
  system: string;
  meterCount: number;
  billingStatus: string;
  planCode: string;
  /** Latest period unaccounted % or null when insufficient. */
  unaccountedPct: number | null;
  balanceStatus: 'loss' | 'gain' | 'ok' | 'insufficient';
  periodLabel: string;
  confidence: ConfidenceLevel;
  monthsOfHistory: number;
  coveragePct: number;
  displayScore: number;
  note: string;
}

function coachingNote(level: ConfidenceLevel, balanceStatus: CrwaRollupRow['balanceStatus']): string {
  if (level === 'Thin' || level === 'Building') {
    return 'Coach for more history; keep statistical flags as Watch';
  }
  if (balanceStatus === 'insufficient') {
    return 'Need both source In and customer Out for balance';
  }
  if (balanceStatus === 'loss') {
    return 'Unaccounted loss — review with Solid+ Confidence';
  }
  if (balanceStatus === 'gain') {
    return 'Sold > pumped — verify source reads / units';
  }
  return 'Actionable comparative alerts OK when Solid+';
}

export function buildCrwaRollupRow(
  profile: TenantProfile,
  locations: MeterLocation[],
  readings: MeterReading[],
  sourceReadings: SourceReading[],
  options?: {
    confidence?: ConfidenceSnapshot | null;
    cycleCloseDay?: number;
  },
): CrwaRollupRow {
  const confidence =
    options?.confidence ??
    assessTenantConfidence(readings, locations.length);
  const balance = calculateWaterBalance(profile.tenantId, sourceReadings, readings, {
    cycleCloseDay: options?.cycleCloseDay,
  });
  return {
    tenantId: profile.tenantId,
    system: profile.displayName,
    meterCount: locations.length || profile.meterCountEstimate || 0,
    billingStatus: profile.billingStatus,
    planCode: profile.planCode,
    unaccountedPct: balance.unaccountedPct,
    balanceStatus: balance.status,
    periodLabel: balance.periodLabel,
    confidence: confidence.level,
    monthsOfHistory: confidence.monthsOfHistory,
    coveragePct: confidence.coveragePct,
    displayScore: confidence.displayScore,
    note: coachingNote(confidence.level, balance.status),
  };
}

/** Strip anything that could leak municipal customer PII from a roll-up payload. */
export function sanitizeRollupForResponse(rows: CrwaRollupRow[]): CrwaRollupRow[] {
  return rows.map((r) => ({
    tenantId: r.tenantId,
    system: r.system,
    meterCount: r.meterCount,
    billingStatus: r.billingStatus,
    planCode: r.planCode,
    unaccountedPct: r.unaccountedPct,
    balanceStatus: r.balanceStatus,
    periodLabel: r.periodLabel,
    confidence: r.confidence,
    monthsOfHistory: r.monthsOfHistory,
    coveragePct: r.coveragePct,
    displayScore: r.displayScore,
    note: r.note,
  }));
}
