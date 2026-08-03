/**
 * Water-balance alerts — Spec §7a / ticket G4 (thin start).
 * High unaccounted loss and sold > pumped, with small timing tolerance.
 * Never fires on insufficient / one-sided periods (G3 review).
 */

import type { AlertMode } from './alert-engine.js';
import type { WaterBalancePeriod } from './water-balance.js';

export interface BalanceAlertThresholds {
  /** Fire high-loss when unaccountedPct >= this (default 15). */
  lossPct: number;
  /** Absolute gallons floor for loss alert (default 10_000). */
  lossGalMin: number;
  /**
   * Sold > pumped: fire when Out exceeds In by more than this % of In
   * (timing mismatch tolerance; default 2).
   */
  gainTolerancePct: number;
  /** Absolute gallons floor for gain alert after tolerance (default 5_000). */
  gainGalMin: number;
}

export const DEFAULT_BALANCE_THRESHOLDS: BalanceAlertThresholds = {
  lossPct: 15,
  lossGalMin: 10_000,
  gainTolerancePct: 2,
  gainGalMin: 5_000,
};

export interface BalanceAlert {
  id: string;
  type: 'high_unaccounted_loss' | 'sold_exceeds_produced';
  priority: 'high' | 'medium' | 'low';
  mode: AlertMode;
  period: string;
  periodLabel: string;
  summary: string;
  confidenceNote: string;
  status: 'open';
  unaccountedGal: number;
  unaccountedPct: number | null;
}

/**
 * Evaluate balance alerts for a period. Skips insufficient (thin / one-sided).
 * Mode: Watch when Confidence is thin (caller passes); default Watch for MVP
 * until H6 gates balance signals — pilot uses Watch for all balance alerts.
 */
export function evaluateBalanceAlerts(
  balance: WaterBalancePeriod,
  options?: {
    thresholds?: Partial<BalanceAlertThresholds>;
    mode?: AlertMode;
  },
): BalanceAlert[] {
  if (balance.status === 'insufficient' || balance.status === 'ok') {
    return [];
  }

  const t: BalanceAlertThresholds = {
    ...DEFAULT_BALANCE_THRESHOLDS,
    ...options?.thresholds,
  };
  const mode: AlertMode = options?.mode ?? 'Watch';
  const alerts: BalanceAlert[] = [];

  if (balance.status === 'loss' && balance.unaccountedPct != null) {
    const overPct = balance.unaccountedPct >= t.lossPct;
    const overGal = balance.unaccountedGal >= t.lossGalMin;
    if (overPct && overGal) {
      alerts.push({
        id: `balance-loss-${balance.period}`,
        type: 'high_unaccounted_loss',
        priority: balance.unaccountedPct >= 30 ? 'high' : 'medium',
        mode,
        period: balance.period,
        periodLabel: balance.periodLabel,
        summary: `${balance.periodLabel}: unaccounted ${formatGal(balance.unaccountedGal)} (${balance.unaccountedPct}%) — produced ${formatGal(balance.producedGal)}, billed ${formatGal(balance.billedGal)}.`,
        confidenceNote:
          'Water-balance gap — verify source + customer readings before digging. Watch until history is Solid.',
        status: 'open',
        unaccountedGal: balance.unaccountedGal,
        unaccountedPct: balance.unaccountedPct,
      });
    }
  }

  if (balance.status === 'gain') {
    const excessGal = Math.abs(balance.unaccountedGal);
    const toleranceGal =
      balance.producedGal > 0
        ? (balance.producedGal * t.gainTolerancePct) / 100
        : 0;
    const beyondTolerance = excessGal > toleranceGal;
    const overGal = excessGal >= t.gainGalMin;
    if (beyondTolerance && overGal) {
      const pct =
        balance.producedGal > 0
          ? Math.round((excessGal / balance.producedGal) * 1000) / 10
          : null;
      alerts.push({
        id: `balance-gain-${balance.period}`,
        type: 'sold_exceeds_produced',
        priority: 'medium',
        mode,
        period: balance.period,
        periodLabel: balance.periodLabel,
        summary: `${balance.periodLabel}: billed ${formatGal(balance.billedGal)} exceeds produced ${formatGal(balance.producedGal)} by ${formatGal(excessGal)}${pct != null ? ` (${pct}%)` : ''}.`,
        confidenceNote:
          'Sold > pumped can be timing/meter error — check reading dates before assuming theft or misbill.',
        status: 'open',
        unaccountedGal: balance.unaccountedGal,
        unaccountedPct: pct,
      });
    }
  }

  return alerts;
}

function formatGal(n: number): string {
  return `${Math.round(n).toLocaleString('en-US')} gal`;
}
