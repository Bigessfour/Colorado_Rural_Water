/**
 * Per-tenant water-balance alert thresholds — Spec §7a / ticket G4 remainder.
 * Defaults stay frozen; Dynamo CFG#balance_thresholds overrides when present.
 */

import {
  DEFAULT_BALANCE_THRESHOLDS,
  type BalanceAlertThresholds,
} from './balance-alerts.js';

export type { BalanceAlertThresholds };

export interface BalanceThresholdConfig extends BalanceAlertThresholds {
  tenantId: string;
  updatedAt: string;
  updatedByUserId: string;
  updatedByEmail: string;
}

export interface BalanceThresholdStore {
  getBalanceThresholds(tenantId: string): Promise<BalanceThresholdConfig | null>;
  putBalanceThresholds(config: BalanceThresholdConfig): Promise<void>;
}

export function mergeBalanceThresholds(
  stored: Partial<BalanceAlertThresholds> | null | undefined,
): BalanceAlertThresholds {
  const base = { ...DEFAULT_BALANCE_THRESHOLDS };
  if (!stored) return base;
  if (typeof stored.lossPct === 'number' && Number.isFinite(stored.lossPct) && stored.lossPct > 0) {
    base.lossPct = stored.lossPct;
  }
  if (
    typeof stored.lossGalMin === 'number' &&
    Number.isFinite(stored.lossGalMin) &&
    stored.lossGalMin >= 0
  ) {
    base.lossGalMin = stored.lossGalMin;
  }
  if (
    typeof stored.gainTolerancePct === 'number' &&
    Number.isFinite(stored.gainTolerancePct) &&
    stored.gainTolerancePct >= 0
  ) {
    base.gainTolerancePct = stored.gainTolerancePct;
  }
  if (
    typeof stored.gainGalMin === 'number' &&
    Number.isFinite(stored.gainGalMin) &&
    stored.gainGalMin >= 0
  ) {
    base.gainGalMin = stored.gainGalMin;
  }
  return base;
}

/** Parse a partial body for PUT; invalid numbers ignored (defaults remain). */
export function parseThresholdPatch(body: unknown): Partial<BalanceAlertThresholds> {
  if (!body || typeof body !== 'object') return {};
  const o = body as Record<string, unknown>;
  const patch: Partial<BalanceAlertThresholds> = {};
  for (const key of ['lossPct', 'lossGalMin', 'gainTolerancePct', 'gainGalMin'] as const) {
    const v = o[key];
    if (typeof v === 'number' && Number.isFinite(v)) patch[key] = v;
    else if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) {
      patch[key] = Number(v);
    }
  }
  return patch;
}
