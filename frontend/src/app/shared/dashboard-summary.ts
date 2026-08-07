/**
 * Pure helpers for Dashboard Meter Health, outliers, age, and last-ingest copy.
 * Calm operator language — never “leak certainty”.
 */

import {
  CHART_COLORS,
  shortPeriodLabel,
  type BalanceTrendPoint,
  type ChartData,
} from './chart-builders';

/** Default install-age threshold for “older meters” (years). */
export const DEFAULT_METER_AGE_YEARS = 15;

export interface MeterHealthSummary {
  stuckCount: number;
  diagnosticCount: number;
  olderCount: number;
  olderThresholdYears: number;
  /** Meters with install date known (for calm “n known ages” hint). */
  withInstallDate: number;
}

export interface OutlierRow {
  meterId: string;
  serviceAddress?: string;
  /** Absolute period usage gal when known. */
  usageGal: number | null;
  /** Peer ratio when known. */
  usageRatio: number | null;
  summary: string;
}

export interface LastIngestView {
  at: string;
  goodRows: number;
  badRows: number;
  label: string;
}

export interface SourceProductionRow {
  sourceId: string;
  sourceName?: string | null;
  gallons: number;
}

/** Stuck / flat Actionable meters from alert engine. */
export function countStuckMeters(
  alerts: Array<{ type?: string; meterId?: string; mode?: string }>,
): number {
  const ids = new Set<string>();
  for (const a of alerts) {
    if (a.type !== 'stuck_meter' || !a.meterId) continue;
    ids.add(a.meterId);
  }
  return ids.size;
}

/** Meters with LOW_BATTERY / TAMPER / REVERSE_FLOW (or LEAK hardware bit). */
export function countDiagnosticMeters(
  alerts: Array<{
    type?: string;
    meterId?: string;
    diagnosticFlags?: string[];
    summary?: string;
  }>,
): number {
  const ids = new Set<string>();
  for (const a of alerts) {
    if (a.type !== 'diagnostic_flag' || !a.meterId) continue;
    const flags = (a.diagnosticFlags ?? []).map((f) => f.toUpperCase());
    const summary = a.summary ?? '';
    const hit =
      flags.some((f) =>
        ['LOW_BATTERY', 'TAMPER', 'REVERSE_FLOW', 'LEAK'].includes(f),
      ) ||
      /LOW_BATTERY|TAMPER|REVERSE_FLOW|\bLEAK\b/i.test(summary);
    if (hit) ids.add(a.meterId);
  }
  return ids.size;
}

/**
 * Count meters whose install date is older than thresholdYears.
 * Missing install dates are ignored (not counted as old).
 */
export function countOlderMeters(
  meters: Array<{ installDate?: string | null }>,
  thresholdYears = DEFAULT_METER_AGE_YEARS,
  now: Date = new Date(),
): { olderCount: number; withInstallDate: number } {
  let olderCount = 0;
  let withInstallDate = 0;
  const cutoff = new Date(now);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - thresholdYears);
  for (const m of meters) {
    const raw = m.installDate?.trim();
    if (!raw) continue;
    const d = new Date(raw.length === 10 ? `${raw}T00:00:00.000Z` : raw);
    if (Number.isNaN(d.getTime())) continue;
    withInstallDate += 1;
    if (d.getTime() <= cutoff.getTime()) olderCount += 1;
  }
  return { olderCount, withInstallDate };
}

export function buildMeterHealthSummary(input: {
  alerts: Array<{
    type?: string;
    meterId?: string;
    mode?: string;
    diagnosticFlags?: string[];
    summary?: string;
  }>;
  meters: Array<{ installDate?: string | null }>;
  thresholdYears?: number;
  now?: Date;
}): MeterHealthSummary {
  const years = input.thresholdYears ?? DEFAULT_METER_AGE_YEARS;
  const age = countOlderMeters(input.meters, years, input.now ?? new Date());
  return {
    stuckCount: countStuckMeters(input.alerts),
    diagnosticCount: countDiagnosticMeters(input.alerts),
    olderCount: age.olderCount,
    olderThresholdYears: years,
    withInstallDate: age.withInstallDate,
  };
}

/**
 * Top N high-usage outliers for dashboard — only when Confidence is not Thin.
 * Prefer usageGal / usageRatio fields; fall back to parsing summary.
 */
/**
 * True when Confidence is Thin — match alert-engine caution:
 * statistical / loss *claims* stay Watch-soft; no dig-now framing.
 */
export function isThinConfidence(level: string | undefined | null): boolean {
  return (level ?? '').trim() === 'Thin';
}

/**
 * Soften loss/gain KPI and balance status copy when Confidence is Thin
 * (same spirit as statisticalMode: Watch on Thin history).
 */
export function softBalanceStatusLabel(
  status: 'loss' | 'gain' | 'ok' | 'insufficient',
  confidenceLevel: string,
): string {
  const thin = isThinConfidence(confidenceLevel);
  switch (status) {
    case 'insufficient':
      return 'Need both sides';
    case 'ok':
      return thin ? 'Balanced (early)' : 'Balanced';
    case 'loss':
      return thin ? 'Unaccounted (early — Watch)' : 'Unaccounted loss';
    case 'gain':
      return thin ? 'Sold > pumped (early — Watch)' : 'Sold > pumped';
  }
}

export function softBalanceKpiHint(
  status: 'loss' | 'gain' | 'ok' | 'insufficient',
  confidenceLevel: string,
): string {
  const thin = isThinConfidence(confidenceLevel);
  if (thin && (status === 'loss' || status === 'gain' || status === 'ok')) {
    return 'Early figure — more history keeps this on Watch, not dig-now';
  }
  switch (status) {
    case 'gain':
      return 'Sold > pumped';
    case 'loss':
      return 'Unaccounted loss';
    case 'ok':
      return 'Balanced';
    case 'insufficient':
      return 'Insufficient data';
  }
}

export function pickTopOutliers(
  alerts: Array<{
    type?: string;
    meterId?: string;
    serviceAddress?: string;
    summary?: string;
    usageGal?: number;
    usageRatio?: number;
    mode?: string;
  }>,
  confidenceLevel: string,
  limit = 5,
): OutlierRow[] {
  // Spec §7b / alert engine: statistical outliers stay off the “top claims” list on Thin.
  if (isThinConfidence(confidenceLevel)) return [];
  const rows: OutlierRow[] = [];
  for (const a of alerts) {
    if (a.type !== 'unusual_high_usage' && a.type !== 'statistical_outlier') continue;
    if (!a.meterId) continue;
    let usageGal = typeof a.usageGal === 'number' ? a.usageGal : null;
    let usageRatio = typeof a.usageRatio === 'number' ? a.usageRatio : null;
    if (usageGal == null && a.summary) {
      const m = a.summary.match(/\(([\d,]+)\s*gal\)/i);
      if (m) usageGal = Number(m[1]!.replace(/,/g, ''));
    }
    if (usageRatio == null && a.summary) {
      const m = a.summary.match(/~([\d.]+)×/);
      if (m) usageRatio = Number(m[1]);
    }
    rows.push({
      meterId: a.meterId,
      serviceAddress: a.serviceAddress,
      usageGal,
      usageRatio,
      summary: a.summary ?? `Meter ${a.meterId} used more than typical for its route.`,
    });
  }
  rows.sort((a, b) => {
    const ra = a.usageRatio ?? 0;
    const rb = b.usageRatio ?? 0;
    if (rb !== ra) return rb - ra;
    return (b.usageGal ?? 0) - (a.usageGal ?? 0);
  });
  // De-dupe by meterId keeping highest rank.
  const seen = new Set<string>();
  const out: OutlierRow[] = [];
  for (const r of rows) {
    if (seen.has(r.meterId)) continue;
    seen.add(r.meterId);
    out.push(r);
    if (out.length >= limit) break;
  }
  return out;
}

export function formatLastIngestLine(
  last: { at?: string; goodRows?: number; badRows?: number } | null | undefined,
): LastIngestView | null {
  if (!last?.at) return null;
  const d = new Date(last.at);
  if (Number.isNaN(d.getTime())) return null;
  const date = d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  const good = Math.max(0, Number(last.goodRows ?? 0));
  const bad = Math.max(0, Number(last.badRows ?? 0));
  return {
    at: last.at,
    goodRows: good,
    badRows: bad,
    label: `Last upload: ${date} · ${good.toLocaleString()} rows · ${bad.toLocaleString()} issues`,
  };
}

/** Horizontal bar chart for production-by-source (gallons). */
export function buildSourceProductionChart(
  rows: SourceProductionRow[],
): { data: ChartData; empty: boolean } {
  if (!rows.length) {
    return { data: { labels: [], datasets: [] }, empty: true };
  }
  const labels = rows.map((r) => r.sourceName?.trim() || r.sourceId);
  const data = rows.map((r) => Number(r.gallons) / 1_000_000);
  return {
    empty: false,
    data: {
      labels,
      datasets: [
        {
          label: 'Produced',
          data,
          backgroundColor: CHART_COLORS.teal,
        },
      ],
    },
  };
}

/**
 * 6–12 month unaccounted % sparkline/bar series.
 * Only points with a real unaccountedPct (both sides of balance) are plotted.
 */
export function buildUnaccountedSparkline(
  trend: BalanceTrendPoint[],
  maxPoints = 12,
): { data: ChartData; empty: boolean; insufficientOnly: boolean } {
  const slice = trend.slice(-maxPoints);
  const points = slice
    .map((t) => ({
      label: shortPeriodLabel(t.periodLabel ?? t.period ?? ''),
      pct:
        t.unaccountedPct == null || t.status === 'insufficient'
          ? null
          : Number(t.unaccountedPct),
    }))
    .filter((p) => p.pct != null && Number.isFinite(p.pct));

  if (!points.length) {
    return {
      data: { labels: [], datasets: [] },
      empty: true,
      insufficientOnly: slice.length > 0,
    };
  }

  return {
    empty: false,
    insufficientOnly: false,
    data: {
      labels: points.map((p) => p.label),
      datasets: [
        {
          label: 'Unaccounted %',
          data: points.map((p) => p.pct as number),
          borderColor: CHART_COLORS.slate,
          backgroundColor: 'rgba(92, 107, 115, 0.2)',
          tension: 0.3,
          fill: true,
          pointRadius: 2,
          borderWidth: 2,
        },
      ],
    },
  };
}

export const sourceBarOptions = {
  indexAxis: 'y' as const,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: { parsed: { x: number | null } }) => {
          const x = ctx.parsed.x;
          if (x == null) return '';
          return `${(x * 1_000_000).toLocaleString()} gal`;
        },
      },
    },
  },
  scales: {
    x: {
      beginAtZero: true,
      title: { display: true, text: 'Million gallons' },
    },
  },
};

export const unaccountedSparkOptions = {
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: { parsed: { y: number | null } }) => {
          const y = ctx.parsed.y;
          if (y == null) return '';
          return `Unaccounted: ${y}%`;
        },
      },
    },
  },
  scales: {
    y: {
      title: { display: true, text: '%' },
    },
  },
};
