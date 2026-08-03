/**
 * Water Saver chart builders for PrimeNG Chart (Chart.js 4).
 * Palette and calm empty states for rural-operator dashboards.
 */

export const CHART_COLORS = {
  teal: '#1a6b73',
  tealFill: 'rgba(26, 107, 115, 0.14)',
  terracotta: '#c45c26',
  slate: '#5c6b73',
  bandFill: 'rgba(26, 107, 115, 0.12)',
  bandBorder: 'rgba(26, 107, 115, 0.05)',
  watch: '#8a7a4a',
  actionable: '#a33b1a',
  normal: '#2f6b4f',
  muted: '#b8c5c8',
} as const;

export type ConfidenceLevel = 'Thin' | 'Building' | 'Solid' | 'Strong';

export interface BalanceTrendPoint {
  periodLabel?: string;
  period?: string;
  producedGal?: number;
  billedGal?: number;
  unaccountedGal?: number;
  status?: string;
}

export interface ChartDataset {
  label: string;
  data: number[];
  borderColor?: string;
  backgroundColor?: string | string[];
  tension?: number;
  fill?: boolean | string | number;
  borderDash?: number[];
  pointRadius?: number;
  pointHoverRadius?: number;
  borderWidth?: number;
  order?: number;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface MeterReadingPoint {
  timestamp: string;
  cumulativeReading: number;
}

const CONFIDENCE_ORDER: ConfidenceLevel[] = ['Thin', 'Building', 'Solid', 'Strong'];

/** Short month label for axis ticks. */
export function shortPeriodLabel(label: string): string {
  const m = label.match(/^([A-Za-z]{3})/);
  if (m) return m[1]!;
  const ym = label.match(/^\d{4}-(\d{2})$/);
  if (ym) {
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return names[Number(ym[1]) - 1] ?? label;
  }
  return label.slice(0, 3) || label;
}

/** Median of a numeric series (empty → 0). */
export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

/**
 * Typical band half-width: max(1.5 × MAD, 15% of median).
 * Returns null when fewer than 3 billed points (omit band).
 */
export function computeTypicalBand(billedMgal: number[]): { low: number[]; high: number[] } | null {
  const usable = billedMgal.filter((v) => Number.isFinite(v) && v >= 0);
  if (usable.length < 3) return null;
  const med = median(usable);
  const mad = median(usable.map((v) => Math.abs(v - med)));
  const half = Math.max(1.5 * mad, med * 0.15);
  return {
    low: billedMgal.map(() => Math.max(0, med - half)),
    high: billedMgal.map(() => med + half),
  };
}

/**
 * System billed usage over months + translucent typical band.
 * Band omitted when &lt;3 points — caller should show calm hint.
 */
export function buildUsageTrendChart(trend: BalanceTrendPoint[]): {
  data: ChartData;
  hasBand: boolean;
  empty: boolean;
} {
  if (!trend.length) {
    return { data: { labels: [], datasets: [] }, hasBand: false, empty: true };
  }

  const labels = trend.map((t) => shortPeriodLabel(t.periodLabel ?? t.period ?? ''));
  const billed = trend.map((t) => Number(t.billedGal ?? 0) / 1_000_000);
  const band = computeTypicalBand(billed);

  const datasets: ChartDataset[] = [];
  if (band) {
    datasets.push({
      label: 'Typical high',
      data: band.high,
      borderColor: CHART_COLORS.bandBorder,
      backgroundColor: CHART_COLORS.bandFill,
      pointRadius: 0,
      borderWidth: 0,
      fill: '+1',
      order: 2,
      tension: 0.25,
    });
    datasets.push({
      label: 'Typical low',
      data: band.low,
      borderColor: CHART_COLORS.bandBorder,
      backgroundColor: CHART_COLORS.bandFill,
      pointRadius: 0,
      borderWidth: 0,
      fill: false,
      order: 2,
      tension: 0.25,
    });
  }
  datasets.push({
    label: 'Billed usage',
    data: billed,
    borderColor: CHART_COLORS.teal,
    backgroundColor: CHART_COLORS.tealFill,
    tension: 0.35,
    fill: false,
    pointRadius: 3,
    borderWidth: 2,
    order: 1,
  });

  return { data: { labels, datasets }, hasBand: !!band, empty: false };
}

/** Current-period grouped bars: Produced | Billed | Unaccounted (Mgal). */
export function buildBalanceBarChart(input: {
  periodLabel: string;
  producedGal: number;
  billedGal: number;
  unaccountedGal: number;
  status: string;
}): { data: ChartData; insufficient: boolean } {
  const insufficient = input.status === 'insufficient';
  if (insufficient) {
    return {
      insufficient: true,
      data: {
        labels: [shortPeriodLabel(input.periodLabel) || 'Period'],
        datasets: [
          {
            label: 'Produced (in)',
            data: [Number(input.producedGal) / 1_000_000],
            backgroundColor: CHART_COLORS.muted,
          },
          {
            label: 'Billed (out)',
            data: [Number(input.billedGal) / 1_000_000],
            backgroundColor: 'rgba(184, 197, 200, 0.65)',
          },
          {
            label: 'Unaccounted',
            data: [0],
            backgroundColor: 'rgba(184, 197, 200, 0.4)',
          },
        ],
      },
    };
  }

  return {
    insufficient: false,
    data: {
      labels: [shortPeriodLabel(input.periodLabel) || 'Period'],
      datasets: [
        {
          label: 'Produced (in)',
          data: [Number(input.producedGal) / 1_000_000],
          backgroundColor: CHART_COLORS.teal,
        },
        {
          label: 'Billed (out)',
          data: [Number(input.billedGal) / 1_000_000],
          backgroundColor: CHART_COLORS.terracotta,
        },
        {
          label: 'Unaccounted',
          data: [Math.abs(Number(input.unaccountedGal)) / 1_000_000],
          backgroundColor: CHART_COLORS.slate,
        },
      ],
    },
  };
}

/** Doughnut highlighting current Confidence level (instrument, not leak %). */
export function buildConfidenceChart(level: ConfidenceLevel): ChartData {
  const idx = CONFIDENCE_ORDER.indexOf(level);
  const active = idx >= 0 ? idx : 0;
  const colors = CONFIDENCE_ORDER.map((_, i) =>
    i === active ? CHART_COLORS.teal : 'rgba(184, 197, 200, 0.45)',
  );
  return {
    labels: [...CONFIDENCE_ORDER],
    datasets: [
      {
        label: 'Confidence',
        data: CONFIDENCE_ORDER.map((_, i) => (i === active ? 1.35 : 1)),
        backgroundColor: colors,
        borderWidth: 0,
      },
    ],
  };
}

export function buildHealthDonut(counts: {
  normal: number;
  watch: number;
  actionable: number;
}): ChartData {
  return {
    labels: ['Normal', 'Watch', 'Actionable'],
    datasets: [
      {
        label: 'Meters',
        data: [counts.normal, counts.watch, counts.actionable],
        backgroundColor: [CHART_COLORS.normal, CHART_COLORS.watch, CHART_COLORS.actionable],
        borderWidth: 0,
      },
    ],
  };
}

/**
 * Meter sparkline from cumulative readings → period usage deltas.
 * Flat line = stuck / no change; spikes = usage spikes.
 */
export function buildMeterSparkline(readings: MeterReadingPoint[]): {
  data: ChartData;
  empty: boolean;
} {
  const sorted = [...readings].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  if (sorted.length < 2) {
    // Fall back to cumulative points if only one read.
    if (sorted.length === 1) {
      return {
        empty: false,
        data: {
          labels: [sorted[0]!.timestamp.slice(0, 10)],
          datasets: [
            {
              label: 'Reading',
              data: [sorted[0]!.cumulativeReading],
              borderColor: CHART_COLORS.teal,
              backgroundColor: 'transparent',
              tension: 0.25,
              pointRadius: 2,
              borderWidth: 2,
              fill: false,
            },
          ],
        },
      };
    }
    return { data: { labels: [], datasets: [] }, empty: true };
  }

  const labels: string[] = [];
  const usage: number[] = [];
  for (let i = 1; i < sorted.length; i += 1) {
    const delta = sorted[i]!.cumulativeReading - sorted[i - 1]!.cumulativeReading;
    labels.push(sorted[i]!.timestamp.slice(0, 10));
    usage.push(Math.max(0, delta));
  }

  return {
    empty: false,
    data: {
      labels,
      datasets: [
        {
          label: 'Period usage',
          data: usage,
          borderColor: CHART_COLORS.teal,
          backgroundColor: CHART_COLORS.tealFill,
          tension: 0.3,
          pointRadius: 2,
          borderWidth: 2,
          fill: true,
        },
      ],
    },
  };
}

/** Health counts from meter inventory + open meter alerts. */
export function computeHealthCounts(
  meterCount: number,
  meterAlerts: Array<{ meterId?: string; mode: 'Watch' | 'Actionable' }>,
): { normal: number; watch: number; actionable: number } {
  const byMeter = new Map<string, 'Watch' | 'Actionable'>();
  for (const a of meterAlerts) {
    if (!a.meterId) continue;
    const prev = byMeter.get(a.meterId);
    if (a.mode === 'Actionable' || prev === 'Actionable') {
      byMeter.set(a.meterId, 'Actionable');
    } else {
      byMeter.set(a.meterId, 'Watch');
    }
  }
  let watch = 0;
  let actionable = 0;
  for (const mode of byMeter.values()) {
    if (mode === 'Actionable') actionable += 1;
    else watch += 1;
  }
  const flagged = byMeter.size;
  const normal = Math.max(0, meterCount - flagged);
  return { normal, watch, actionable };
}

export const usageChartOptions = {
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        filter: (item: { text?: string }) =>
          item.text !== 'Typical high' && item.text !== 'Typical low',
      },
    },
    tooltip: {
      callbacks: {
        label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) => {
          const y = ctx.parsed.y;
          if (y == null) return '';
          const label = ctx.dataset.label ?? '';
          if (label === 'Typical high' || label === 'Typical low') {
            return `Typical ${label.includes('high') ? 'high' : 'low'}: ${(y * 1_000_000).toLocaleString()} gal`;
          }
          return `${label}: ${(y * 1_000_000).toLocaleString()} gal`;
        },
      },
    },
  },
  scales: {
    y: {
      title: { display: true, text: 'Million gallons' },
      beginAtZero: true,
    },
  },
};

export const balanceBarOptions = {
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom' as const },
    tooltip: {
      callbacks: {
        label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) => {
          const y = ctx.parsed.y;
          if (y == null) return '';
          return `${ctx.dataset.label ?? ''}: ${(y * 1_000_000).toLocaleString()} gal`;
        },
      },
    },
  },
  scales: {
    y: {
      title: { display: true, text: 'Million gallons' },
      beginAtZero: true,
    },
  },
};

export const doughnutOptions = {
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom' as const },
  },
};

export const sparklineOptions = {
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { enabled: true },
  },
  scales: {
    x: { display: false },
    y: { display: false, beginAtZero: true },
  },
};
