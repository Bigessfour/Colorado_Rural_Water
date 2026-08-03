/**
 * Per-meter usage statistics from cumulative readings + optional installDate.
 * Pilot period model: UTC calendar months (same spirit as water-balance).
 */

import {
  buildMeterSparkline,
  CHART_COLORS,
  type ChartData,
  type MeterReadingPoint,
} from './chart-builders';

export type { MeterReadingPoint };

export interface MeterUsageDelta {
  from: string;
  to: string;
  usage: number;
  period: string; // YYYY-MM of `to`
}

export interface MeterUsageStats {
  ageLabel: string | null;
  ageMonths: number | null;
  /** Gallons between the two most recent reads (latest cycle). */
  cycleGal: number | null;
  cycleLabel: string;
  ytdGal: number | null;
  lifetimeGal: number | null;
  readingCount: number;
  asOfYear: number;
  sparse: boolean;
}

function periodKeyFromIso(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function parseDateMs(value: string | null | undefined): number | null {
  if (!value?.trim()) return null;
  // Date-only installDate (YYYY-MM-DD) — treat as UTC midnight.
  const raw = value.trim();
  const d = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? new Date(`${raw}T00:00:00.000Z`)
    : new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.getTime();
}

/** Positive inter-read usage deltas (skips reverse/roll negatives). */
export function buildUsageDeltas(readings: MeterReadingPoint[]): MeterUsageDelta[] {
  const sorted = [...readings].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const out: MeterUsageDelta[] = [];
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1]!;
    const cur = sorted[i]!;
    const usage = cur.cumulativeReading - prev.cumulativeReading;
    if (usage < 0) continue;
    const period = periodKeyFromIso(cur.timestamp);
    if (!period) continue;
    out.push({ from: prev.timestamp, to: cur.timestamp, usage, period });
  }
  return out;
}

export function formatAgeLabel(ageMonths: number): string {
  if (ageMonths < 1) return 'Under 1 month';
  if (ageMonths < 12) return `${ageMonths} mo`;
  const years = Math.floor(ageMonths / 12);
  const rem = ageMonths % 12;
  if (rem === 0) return years === 1 ? '1 year' : `${years} years`;
  return `${years}y ${rem}mo`;
}

/**
 * Age from installDate, else first reading date.
 * Returns null when neither is available.
 */
export function computeMeterAgeMonths(
  installDate: string | null | undefined,
  readings: MeterReadingPoint[],
  nowMs = Date.now(),
): number | null {
  const sorted = [...readings].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const start =
    parseDateMs(installDate) ?? (sorted[0] ? parseDateMs(sorted[0].timestamp) : null);
  if (start == null) return null;
  const months = Math.floor((nowMs - start) / (1000 * 60 * 60 * 24 * 30.4375));
  return Math.max(0, months);
}

export function computeMeterUsageStats(
  readings: MeterReadingPoint[],
  installDate: string | null | undefined,
  options?: { nowMs?: number; asOfYear?: number },
): MeterUsageStats {
  const nowMs = options?.nowMs ?? Date.now();
  const asOfYear = options?.asOfYear ?? new Date(nowMs).getUTCFullYear();
  const deltas = buildUsageDeltas(readings);
  const ageMonths = computeMeterAgeMonths(installDate, readings, nowMs);

  const last = deltas[deltas.length - 1];
  let cycleLabel = 'Latest read cycle';
  if (last) {
    const from = last.from.slice(0, 10);
    const to = last.to.slice(0, 10);
    cycleLabel = `Latest cycle (${from} → ${to})`;
  }

  const ytdGal = deltas
    .filter((d) => d.period.startsWith(`${asOfYear}-`))
    .reduce((sum, d) => sum + d.usage, 0);

  const lifetimeGal =
    deltas.length > 0 ? deltas.reduce((sum, d) => sum + d.usage, 0) : null;

  return {
    ageLabel: ageMonths == null ? null : formatAgeLabel(ageMonths),
    ageMonths,
    cycleGal: last ? last.usage : null,
    cycleLabel,
    ytdGal: deltas.some((d) => d.period.startsWith(`${asOfYear}-`)) ? ytdGal : null,
    lifetimeGal,
    readingCount: readings.length,
    asOfYear,
    sparse: readings.length < 2,
  };
}

/**
 * Year-over-year monthly usage (calendar months).
 * Requires at least one month with data in both years to show chart.
 */
export function buildYearOverYearChart(
  readings: MeterReadingPoint[],
  options?: { asOfYear?: number; nowMs?: number },
): { data: ChartData; empty: boolean; hint: string } {
  const nowMs = options?.nowMs ?? Date.now();
  const thisYear = options?.asOfYear ?? new Date(nowMs).getUTCFullYear();
  const lastYear = thisYear - 1;
  const deltas = buildUsageDeltas(readings);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const thisSeries = Array.from({ length: 12 }, () => 0);
  const lastSeries = Array.from({ length: 12 }, () => 0);
  let thisHits = 0;
  let lastHits = 0;

  for (const d of deltas) {
    const [yStr, mStr] = d.period.split('-');
    const y = Number(yStr);
    const m = Number(mStr) - 1;
    if (m < 0 || m > 11) continue;
    if (y === thisYear) {
      thisSeries[m]! += d.usage;
      thisHits += 1;
    } else if (y === lastYear) {
      lastSeries[m]! += d.usage;
      lastHits += 1;
    }
  }

  if (thisHits === 0 && lastHits === 0) {
    return {
      empty: true,
      hint: 'Need monthly reads to chart usage over the year.',
      data: { labels: [], datasets: [] },
    };
  }
  if (lastHits === 0) {
    return {
      empty: true,
      hint: `Need ${lastYear} history for a year-over-year comparison. Showing ${thisYear} alone is available after another season.`,
      data: {
        labels: months,
        datasets: [
          {
            label: String(thisYear),
            data: thisSeries,
            borderColor: CHART_COLORS.teal,
            backgroundColor: CHART_COLORS.tealFill,
            tension: 0.3,
            fill: false,
            pointRadius: 2,
            borderWidth: 2,
          },
        ],
      },
    };
  }

  return {
    empty: false,
    hint: `${thisYear} vs ${lastYear} — monthly period usage from stored reads (not a leak model).`,
    data: {
      labels: months,
      datasets: [
        {
          label: String(thisYear),
          data: thisSeries,
          borderColor: CHART_COLORS.teal,
          backgroundColor: 'transparent',
          tension: 0.3,
          fill: false,
          pointRadius: 2,
          borderWidth: 2,
        },
        {
          label: String(lastYear),
          data: lastSeries,
          borderColor: CHART_COLORS.terracotta,
          backgroundColor: 'transparent',
          borderDash: [5, 4],
          tension: 0.3,
          fill: false,
          pointRadius: 2,
          borderWidth: 2,
        },
      ],
    },
  };
}

export function buildMeterSparklineFromReadings(readings: MeterReadingPoint[]) {
  return buildMeterSparkline(readings);
}

export const yearOverYearChartOptions = {
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom' as const },
    tooltip: {
      callbacks: {
        label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) => {
          const y = ctx.parsed.y;
          if (y == null) return '';
          return `${ctx.dataset.label ?? ''}: ${y.toLocaleString()} gal`;
        },
      },
    },
  },
  scales: {
    y: {
      title: { display: true, text: 'Gallons' },
      beginAtZero: true,
    },
  },
};
