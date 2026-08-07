import { describe, expect, it } from 'vitest';
import {
  buildBalanceBarChart,
  buildConfidenceChart,
  buildHealthDonut,
  buildMeterSparkline,
  buildUsageTrendChart,
  computeHealthCounts,
  computeTypicalBand,
  median,
  shortPeriodLabel,
} from './chart-builders';

describe('chart-builders', () => {
  it('shortPeriodLabel parses month names and YYYY-MM', () => {
    expect(shortPeriodLabel('July 2026')).toBe('Jul');
    expect(shortPeriodLabel('2026-07')).toBe('Jul');
  });

  it('median handles odd and even lengths', () => {
    expect(median([1, 3, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBe(0);
  });

  it('computeTypicalBand returns null under 3 points', () => {
    expect(computeTypicalBand([1, 2])).toBeNull();
  });

  it('computeTypicalBand builds constant low/high around median', () => {
    const band = computeTypicalBand([1, 1, 1, 1]);
    expect(band).not.toBeNull();
    expect(band!.low.every((v) => v === band!.low[0])).toBe(true);
    expect(band!.high[0]!).toBeGreaterThan(band!.low[0]!);
  });

  it('buildUsageTrendChart omits band with sparse trend', () => {
    const result = buildUsageTrendChart([
      { period: '2026-06', billedGal: 100_000 },
      { period: '2026-07', billedGal: 110_000 },
    ]);
    expect(result.empty).toBe(false);
    expect(result.hasBand).toBe(false);
    expect(result.data.datasets.some((d) => d.label === 'Billed usage')).toBe(true);
    expect(result.priorYearAvailable).toBe(false);
  });

  it('buildUsageTrendChart adds band with 3+ months', () => {
    const result = buildUsageTrendChart([
      { period: '2026-05', billedGal: 100_000 },
      { period: '2026-06', billedGal: 105_000 },
      { period: '2026-07', billedGal: 200_000 },
    ]);
    expect(result.hasBand).toBe(true);
    expect(result.data.datasets.some((d) => d.label === 'Typical high')).toBe(true);
    expect(result.data.datasets.some((d) => d.label === 'Typical low')).toBe(true);
  });

  it('buildUsageTrendChart can overlay prior year when history exists', () => {
    const trend = [];
    for (let y of [2025, 2026]) {
      for (let m = 1; m <= 7; m++) {
        trend.push({
          period: `${y}-${String(m).padStart(2, '0')}`,
          billedGal: y === 2026 ? 200_000 + m * 1000 : 100_000 + m * 1000,
        });
      }
    }
    const off = buildUsageTrendChart(trend, { comparePriorYear: false, windowMonths: 7 });
    expect(off.priorYearAvailable).toBe(true);
    expect(off.data.datasets.some((d) => d.label === 'Prior year')).toBe(false);

    const on = buildUsageTrendChart(trend, { comparePriorYear: true, windowMonths: 7 });
    expect(on.hasBand).toBe(false);
    expect(on.data.datasets.some((d) => d.label === 'This year')).toBe(true);
    expect(on.data.datasets.some((d) => d.label === 'Prior year')).toBe(true);
    const prior = on.data.datasets.find((d) => d.label === 'Prior year')!;
    expect(prior.data.filter((v) => v != null).length).toBe(7);
  });

  it('buildBalanceBarChart marks insufficient and zeros unaccounted', () => {
    const { insufficient, data } = buildBalanceBarChart({
      periodLabel: 'July 2026',
      producedGal: 50_000,
      billedGal: 0,
      unaccountedGal: 50_000,
      status: 'insufficient',
    });
    expect(insufficient).toBe(true);
    expect(data.datasets[2]!.data[0]).toBe(0);
  });

  it('buildBalanceBarChart uses absolute unaccounted for bars', () => {
    const { insufficient, data } = buildBalanceBarChart({
      periodLabel: '2026-07',
      producedGal: 1_000_000,
      billedGal: 900_000,
      unaccountedGal: 100_000,
      status: 'loss',
    });
    expect(insufficient).toBe(false);
    expect(data.datasets[0]!.data[0]).toBe(1);
    expect(data.datasets[1]!.data[0]).toBeCloseTo(0.9);
    expect(data.datasets[2]!.data[0]).toBeCloseTo(0.1);
  });

  it('buildConfidenceChart highlights active level', () => {
    const data = buildConfidenceChart('Solid');
    expect(data.labels).toEqual(['Thin', 'Building', 'Solid', 'Strong']);
    expect(data.datasets[0]!.data[2]).toBeGreaterThan(data.datasets[0]!.data[0]!);
  });

  it('buildHealthDonut maps counts in order', () => {
    const data = buildHealthDonut({ normal: 10, watch: 2, actionable: 1 });
    expect(data.datasets[0]!.data).toEqual([10, 2, 1]);
  });

  it('buildMeterSparkline prefers period usage deltas', () => {
    const { empty, data, singleCycle } = buildMeterSparkline([
      { timestamp: '2026-05-01T00:00:00.000Z', cumulativeReading: 1000 },
      { timestamp: '2026-06-01T00:00:00.000Z', cumulativeReading: 1100 },
      { timestamp: '2026-07-01T00:00:00.000Z', cumulativeReading: 1100 },
    ]);
    expect(empty).toBe(false);
    expect(singleCycle).toBe(false);
    expect(data.datasets[0]!.data).toEqual([100, 0]);
  });

  it('buildMeterSparkline treats a single cycle as empty (no lone-dot chart)', () => {
    const { empty, singleCycle, data } = buildMeterSparkline([
      { timestamp: '2026-06-01T00:00:00.000Z', cumulativeReading: 1000 },
      { timestamp: '2026-07-01T00:00:00.000Z', cumulativeReading: 4350 },
    ]);
    expect(empty).toBe(true);
    expect(singleCycle).toBe(true);
    expect(data.datasets).toEqual([]);
  });

  it('computeHealthCounts prioritizes Actionable per meter', () => {
    const counts = computeHealthCounts(5, [
      { meterId: '1', mode: 'Watch' },
      { meterId: '1', mode: 'Actionable' },
      { meterId: '2', mode: 'Watch' },
    ]);
    expect(counts).toEqual({ normal: 3, watch: 1, actionable: 1 });
  });
});
