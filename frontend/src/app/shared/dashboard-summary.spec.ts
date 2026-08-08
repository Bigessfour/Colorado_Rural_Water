import { describe, expect, it } from 'vitest';
import {
  DEFAULT_METER_AGE_YEARS,
  buildMeterHealthSummary,
  buildUnaccountedSparkline,
  countOlderMeters,
  formatLastIngestLine,
  isThinConfidence,
  pickTopOutliers,
  softBalanceKpiHint,
  softBalanceStatusLabel,
  formatBalanceKpiValue,
} from './dashboard-summary';

describe('dashboard-summary', () => {
  it('counts stuck and diagnostic meters without double-counting', () => {
    const summary = buildMeterHealthSummary({
      alerts: [
        { type: 'stuck_meter', meterId: '1', mode: 'Actionable' },
        { type: 'stuck_meter', meterId: '1', mode: 'Actionable' },
        {
          type: 'diagnostic_flag',
          meterId: '2',
          diagnosticFlags: ['LOW_BATTERY', 'TAMPER'],
        },
        { type: 'unusual_high_usage', meterId: '3' },
      ],
      meters: [
        { installDate: '2000-01-01' },
        { installDate: '2020-01-01' },
        { installDate: null },
      ],
      now: new Date('2026-08-07T00:00:00.000Z'),
      thresholdYears: 15,
    });
    expect(summary.stuckCount).toBe(1);
    expect(summary.diagnosticCount).toBe(1);
    expect(summary.olderCount).toBe(1);
    expect(summary.withInstallDate).toBe(2);
    expect(summary.olderThresholdYears).toBe(DEFAULT_METER_AGE_YEARS);
  });

  it('counts older meters only when install date is known', () => {
    const r = countOlderMeters(
      [{ installDate: '1999-06-01' }, { installDate: null }, { installDate: '2022-01-01' }],
      15,
      new Date('2026-08-01T00:00:00.000Z'),
    );
    expect(r.olderCount).toBe(1);
    expect(r.withInstallDate).toBe(2);
  });

  it('hides outliers when Confidence is Thin', () => {
    const rows = pickTopOutliers(
      [
        {
          type: 'unusual_high_usage',
          meterId: '1046',
          usageGal: 100_000,
          usageRatio: 20,
          summary: 'high',
        },
      ],
      'Thin',
    );
    expect(rows).toEqual([]);
  });

  it('softens loss claims when Confidence is Thin', () => {
    expect(isThinConfidence('Thin')).toBe(true);
    expect(softBalanceStatusLabel('loss', 'Thin')).toMatch(/Watch|early/i);
    expect(softBalanceStatusLabel('loss', 'Solid')).toBe('Unaccounted loss');
    expect(softBalanceKpiHint('gain', 'Thin')).toMatch(/Watch|history/i);
    expect(softBalanceKpiHint('gain', 'Solid')).toBe('Sold > pumped');
  });

  it('formats Water balance KPI calmly for gain and extreme loss', () => {
    expect(formatBalanceKpiValue('gain', -2146.1, 'Solid')).toBe('Sold > pumped');
    expect(formatBalanceKpiValue('loss', 2146.1, 'Solid')).toBe('High unaccounted');
    expect(formatBalanceKpiValue('loss', 10, 'Solid')).toBe('10%');
    expect(formatBalanceKpiValue('gain', -50, 'Thin')).toBe('Early');
    expect(formatBalanceKpiValue('insufficient', null, 'Solid')).toBe('—');
  });

  it('ranks top outliers by ratio then volume', () => {
    const rows = pickTopOutliers(
      [
        {
          type: 'unusual_high_usage',
          meterId: 'a',
          usageGal: 50_000,
          usageRatio: 3,
          summary: 'a',
        },
        {
          type: 'unusual_high_usage',
          meterId: 'b',
          usageGal: 200_000,
          usageRatio: 10,
          summary: 'b',
        },
        {
          type: 'unusual_high_usage',
          meterId: 'c',
          usageGal: 90_000,
          usageRatio: 10,
          summary: 'c',
        },
      ],
      'Solid',
      2,
    );
    expect(rows.map((r) => r.meterId)).toEqual(['b', 'c']);
  });

  it('formats last ingest status line', () => {
    const line = formatLastIngestLine({
      at: '2026-08-07T01:40:00.000Z',
      goodRows: 29,
      badRows: 2,
    });
    expect(line?.label).toMatch(/Last upload:/);
    expect(line?.label).toMatch(/29 rows/);
    expect(line?.label).toMatch(/2 issues/);
    expect(formatLastIngestLine(null)).toBeNull();
  });

  it('builds unaccounted sparkline only from both-sides periods', () => {
    const { empty, insufficientOnly, data } = buildUnaccountedSparkline([
      { period: '2026-05', status: 'insufficient', unaccountedPct: null },
      { period: '2026-06', status: 'loss', unaccountedPct: 12 },
      { period: '2026-07', status: 'gain', unaccountedPct: -5 },
    ]);
    expect(empty).toBe(false);
    expect(insufficientOnly).toBe(false);
    expect(data.datasets[0]!.data).toEqual([12, -5]);
  });

  it('marks sparkline insufficient when only one-sided history exists', () => {
    const r = buildUnaccountedSparkline([
      { period: '2026-07', status: 'insufficient', unaccountedPct: null, billedGal: 1 },
    ]);
    expect(r.empty).toBe(true);
    expect(r.insufficientOnly).toBe(true);
  });
});
