/**
 * Water balance calculator — Spec §7a / ticket G3.
 * In (source production) − Out (customer billed usage) = unaccounted.
 *
 * Period keying (MVP): calendar UTC YYYY-MM from reading timestamps.
 * Per Spec §7a, periods should eventually align with each utility’s
 * billing/reading cycle (configurable; G4/G5). Do not treat YYYY-MM as
 * the final product model — it is the pilot default only.
 */

import type { MeterReading } from './meter-location.js';
import type { SourceReading } from './source-reading.js';

export interface WaterBalancePeriod {
  /** YYYY-MM (UTC calendar month — pilot default; see file header). */
  period: string;
  periodLabel: string;
  producedGal: number;
  billedGal: number;
  unaccountedGal: number;
  /** null when In is 0 (cannot divide) or status is insufficient. */
  unaccountedPct: number | null;
  /**
   * insufficient = missing In and/or Out for the period (one-sided or empty).
   * Never surface loss/gain from thin one-sided data — operators must not dig now.
   */
  status: 'loss' | 'gain' | 'ok' | 'insufficient';
  sourceReadingCount: number;
  meterDeltaCount: number;
}

export interface WaterBalanceResult extends WaterBalancePeriod {
  tenantId: string;
  trend: WaterBalancePeriod[];
}

export function periodKeyFromIso(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function periodLabel(period: string): string {
  const m = period.match(/^(\d{4})-(\d{2})$/);
  if (!m) return period;
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const idx = Number(m[2]) - 1;
  return `${monthNames[idx] ?? m[2]} ${m[1]}`;
}

/**
 * Sum source production for a YYYY-MM period (period volumes + cumulative deltas).
 *
 * Period-mode: one contribution per sourceId — latest timestamp wins.
 * Re-ingest of the same (sourceId, period) replaces rather than sums duplicates.
 * Cumulative-mode: deltas between successive cumulative readings (unchanged).
 */
export function sumSourceProduction(readings: SourceReading[], period: string): {
  gallons: number;
  count: number;
} {
  const inPeriod = readings.filter((r) => periodKeyFromIso(r.timestamp) === period);
  let gallons = 0;
  let count = 0;

  const bySource = new Map<string, SourceReading[]>();
  for (const r of readings) {
    const list = bySource.get(r.sourceId) ?? [];
    list.push(r);
    bySource.set(r.sourceId, list);
  }

  // Period volumes: latest reading per source in this calendar month.
  const periodLatest = new Map<string, SourceReading>();
  for (const r of inPeriod) {
    if (r.volumeMode !== 'period') continue;
    const prev = periodLatest.get(r.sourceId);
    if (!prev || r.timestamp >= prev.timestamp) {
      periodLatest.set(r.sourceId, r);
    }
  }
  for (const r of periodLatest.values()) {
    gallons += r.value;
    count += 1;
  }

  // Prefer period volumes when both modes exist for the same source in this month
  // (avoids double-counting period CSV + cumulative logger for one well).
  const periodSourceIds = new Set(periodLatest.keys());

  for (const r of inPeriod) {
    if (r.volumeMode !== 'cumulative') continue;
    if (periodSourceIds.has(r.sourceId)) continue;
    // Cumulative: usage for this reading = delta from previous cumulative for same source.
    const series = (bySource.get(r.sourceId) ?? [])
      .filter((x) => x.volumeMode === 'cumulative')
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const idx = series.findIndex(
      (x) => x.timestamp === r.timestamp && x.value === r.value,
    );
    if (idx <= 0) continue;
    const delta = series[idx].value - series[idx - 1].value;
    if (delta >= 0) {
      gallons += delta;
      count += 1;
    }
  }

  return { gallons, count };
}

/** Sum customer billed usage whose "to" reading falls in YYYY-MM. */
export function sumCustomerUsage(readings: MeterReading[], period: string): {
  gallons: number;
  deltaCount: number;
} {
  const byMeter = new Map<string, MeterReading[]>();
  for (const r of readings) {
    const list = byMeter.get(r.meterId) ?? [];
    list.push(r);
    byMeter.set(r.meterId, list);
  }

  let gallons = 0;
  let deltaCount = 0;

  for (const series of byMeter.values()) {
    const sorted = [...series].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    for (let i = 1; i < sorted.length; i += 1) {
      if (periodKeyFromIso(sorted[i].timestamp) !== period) continue;
      const usage = sorted[i].cumulativeReading - sorted[i - 1].cumulativeReading;
      if (usage < 0) continue;
      gallons += usage;
      deltaCount += 1;
    }
  }

  return { gallons, deltaCount };
}

export function calculatePeriodBalance(
  sourceReadings: SourceReading[],
  meterReadings: MeterReading[],
  period: string,
): WaterBalancePeriod {
  const produced = sumSourceProduction(sourceReadings, period);
  const billed = sumCustomerUsage(meterReadings, period);
  const unaccountedGal = produced.gallons - billed.gallons;

  // One-sided or empty: never label as loss/gain (would look like ~±100% dig-now).
  const thin = produced.count === 0 || billed.deltaCount === 0;
  const unaccountedPct =
    thin || produced.gallons <= 0
      ? null
      : round1((unaccountedGal / produced.gallons) * 100);

  let status: WaterBalancePeriod['status'] = 'insufficient';
  if (thin) {
    status = 'insufficient';
  } else if (unaccountedGal > 0) {
    status = 'loss';
  } else if (unaccountedGal < 0) {
    status = 'gain';
  } else {
    status = 'ok';
  }

  return {
    period,
    periodLabel: periodLabel(period),
    producedGal: produced.gallons,
    billedGal: billed.gallons,
    unaccountedGal,
    unaccountedPct,
    status,
    sourceReadingCount: produced.count,
    meterDeltaCount: billed.deltaCount,
  };
}

export function calculateWaterBalance(
  tenantId: string,
  sourceReadings: SourceReading[],
  meterReadings: MeterReading[],
  options?: { period?: string; trendMonths?: number },
): WaterBalanceResult {
  const trendMonths = options?.trendMonths ?? 5;
  const periods = collectPeriods(sourceReadings, meterReadings);
  let period = options?.period?.trim() || '';
  if (!period || !/^\d{4}-\d{2}$/.test(period)) {
    period = periods[periods.length - 1] ?? currentUtcPeriod();
  }

  const current = calculatePeriodBalance(sourceReadings, meterReadings, period);
  const trendPeriods = expandTrendPeriods(period, trendMonths, periods);
  const trend = trendPeriods.map((p) =>
    calculatePeriodBalance(sourceReadings, meterReadings, p),
  );

  return {
    tenantId,
    ...current,
    trend,
  };
}

function collectPeriods(
  sourceReadings: SourceReading[],
  meterReadings: MeterReading[],
): string[] {
  const set = new Set<string>();
  for (const r of sourceReadings) {
    const p = periodKeyFromIso(r.timestamp);
    if (p) set.add(p);
  }
  for (const r of meterReadings) {
    const p = periodKeyFromIso(r.timestamp);
    if (p) set.add(p);
  }
  return [...set].sort();
}

function expandTrendPeriods(
  endPeriod: string,
  count: number,
  known: string[],
): string[] {
  const out: string[] = [];
  let [y, m] = endPeriod.split('-').map(Number);
  for (let i = 0; i < count; i += 1) {
    const key = `${y}-${String(m).padStart(2, '0')}`;
    out.unshift(key);
    m -= 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
  }
  // Prefer known data months when sparse — keep chronological unique.
  const merged = [...new Set([...known.filter((p) => p <= endPeriod), ...out])]
    .sort()
    .filter((p) => p <= endPeriod);
  return merged.slice(-count);
}

function currentUtcPeriod(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
