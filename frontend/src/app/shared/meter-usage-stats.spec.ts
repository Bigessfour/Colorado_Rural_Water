import { describe, expect, it } from 'vitest';
import {
  buildUsageDeltas,
  buildYearOverYearChart,
  computeMeterAgeMonths,
  computeMeterUsageStats,
  formatAgeLabel,
} from './meter-usage-stats';

const readings = [
  { timestamp: '2024-06-01T00:00:00.000Z', cumulativeReading: 1000 },
  { timestamp: '2024-07-01T00:00:00.000Z', cumulativeReading: 1100 },
  { timestamp: '2025-06-01T00:00:00.000Z', cumulativeReading: 2000 },
  { timestamp: '2025-07-01T00:00:00.000Z', cumulativeReading: 2150 },
  { timestamp: '2026-06-01T00:00:00.000Z', cumulativeReading: 3000 },
  { timestamp: '2026-07-01T00:00:00.000Z', cumulativeReading: 3125 },
];

describe('meter-usage-stats', () => {
  it('buildUsageDeltas skips reverse rolls', () => {
    const deltas = buildUsageDeltas([
      { timestamp: '2026-01-01T00:00:00.000Z', cumulativeReading: 500 },
      { timestamp: '2026-02-01T00:00:00.000Z', cumulativeReading: 100 },
      { timestamp: '2026-03-01T00:00:00.000Z', cumulativeReading: 150 },
    ]);
    expect(deltas).toHaveLength(1);
    expect(deltas[0]!.usage).toBe(50);
  });

  it('formatAgeLabel formats months and years', () => {
    expect(formatAgeLabel(0)).toBe('Under 1 month');
    expect(formatAgeLabel(8)).toBe('8 mo');
    expect(formatAgeLabel(24)).toBe('2 years');
    expect(formatAgeLabel(14)).toBe('1y 2mo');
  });

  it('computeMeterAgeMonths prefers installDate', () => {
    const months = computeMeterAgeMonths(
      '2024-08-01',
      readings,
      Date.parse('2026-08-01T00:00:00.000Z'),
    );
    expect(months).toBeGreaterThanOrEqual(23);
    expect(months).toBeLessThanOrEqual(24);
  });

  it('computeMeterUsageStats fills cycle YTD lifetime', () => {
    const stats = computeMeterUsageStats(readings, '2024-01-01', {
      nowMs: Date.parse('2026-08-01T00:00:00.000Z'),
      asOfYear: 2026,
    });
    expect(stats.sparse).toBe(false);
    expect(stats.cycleGal).toBe(125);
    // 2026-06 delta (850) + 2026-07 delta (125)
    expect(stats.ytdGal).toBe(975);
    expect(stats.lifetimeGal).toBe(2125);
    expect(stats.ageLabel).toMatch(/2y|year/);
  });

  it('buildYearOverYearChart compares two years when both exist', () => {
    const chart = buildYearOverYearChart(readings, {
      asOfYear: 2026,
      nowMs: Date.parse('2026-08-01T00:00:00.000Z'),
    });
    expect(chart.empty).toBe(false);
    expect(chart.data.datasets).toHaveLength(2);
    // Period of to=2026-07-01 → July (index 6)
    expect(chart.data.datasets[0]!.data[6]).toBe(125);
  });

  it('buildYearOverYearChart is empty-hint when only one year', () => {
    const chart = buildYearOverYearChart(
      [
        { timestamp: '2026-05-01T00:00:00.000Z', cumulativeReading: 10 },
        { timestamp: '2026-06-01T00:00:00.000Z', cumulativeReading: 40 },
      ],
      { asOfYear: 2026 },
    );
    expect(chart.empty).toBe(true);
    expect(chart.hint).toMatch(/Need 2025/);
  });
});
