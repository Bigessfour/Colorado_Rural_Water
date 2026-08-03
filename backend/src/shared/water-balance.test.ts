import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { MeterReading } from './meter-location.js';
import type { SourceReading } from './source-reading.js';
import {
  calculatePeriodBalance,
  calculateWaterBalance,
  sumCustomerUsage,
  sumSourceProduction,
} from './water-balance.js';

function src(
  partial: Partial<SourceReading> & Pick<SourceReading, 'sourceId' | 'timestamp' | 'value'>,
): SourceReading {
  return {
    tenantId: 't1',
    sourceName: partial.sourceId,
    volumeMode: 'period',
    unit: 'gal',
    notes: null,
    ...partial,
  };
}

function meter(
  meterId: string,
  timestamp: string,
  cumulativeReading: number,
): MeterReading {
  return {
    tenantId: 't1',
    meterId,
    serviceAddress: '1 Main',
    occupantName: 'X',
    timestamp,
    cumulativeReading,
    unit: 'gal',
    diagnosticFlags: [],
  };
}

describe('water balance calculator', () => {
  it('computes In − Out and unaccounted % for a period', () => {
    const sources = [
      src({ sourceId: 'w1', timestamp: '2026-07-31T00:00:00.000Z', value: 620_000 }),
      src({ sourceId: 'w2', timestamp: '2026-07-31T00:00:00.000Z', value: 410_000 }),
      src({ sourceId: 'w1', timestamp: '2026-06-30T00:00:00.000Z', value: 605_000 }),
    ];
    const meters = [
      meter('1042', '2026-06-15T00:00:00.000Z', 100_000),
      meter('1042', '2026-07-15T00:00:00.000Z', 110_000),
      meter('1043', '2026-06-15T00:00:00.000Z', 50_000),
      meter('1043', '2026-07-15T00:00:00.000Z', 55_000),
    ];

    const july = calculatePeriodBalance(sources, meters, '2026-07');
    assert.equal(july.producedGal, 1_030_000);
    assert.equal(july.billedGal, 15_000);
    assert.equal(july.unaccountedGal, 1_015_000);
    assert.equal(july.unaccountedPct, 98.5);
    assert.equal(july.status, 'loss');
  });

  it('flags sold > pumped as gain (negative unaccounted)', () => {
    const sources = [
      src({ sourceId: 'w1', timestamp: '2026-07-31T00:00:00.000Z', value: 10_000 }),
    ];
    const meters = [
      meter('1', '2026-06-01T00:00:00.000Z', 0),
      meter('1', '2026-07-01T00:00:00.000Z', 25_000),
    ];
    const bal = calculatePeriodBalance(sources, meters, '2026-07');
    assert.equal(bal.unaccountedGal, -15_000);
    assert.equal(bal.status, 'gain');
  });

  it('uses cumulative source deltas when volumeMode is cumulative', () => {
    const sources = [
      src({
        sourceId: 'w1',
        timestamp: '2026-06-30T00:00:00.000Z',
        value: 1_000_000,
        volumeMode: 'cumulative',
      }),
      src({
        sourceId: 'w1',
        timestamp: '2026-07-31T00:00:00.000Z',
        value: 1_100_000,
        volumeMode: 'cumulative',
      }),
    ];
    const { gallons, count } = sumSourceProduction(sources, '2026-07');
    assert.equal(gallons, 100_000);
    assert.equal(count, 1);
  });

  it('defaults to latest period and builds a trend', () => {
    const sources = [
      src({ sourceId: 'w1', timestamp: '2026-06-30T00:00:00.000Z', value: 100 }),
      src({ sourceId: 'w1', timestamp: '2026-07-31T00:00:00.000Z', value: 200 }),
    ];
    const meters = [
      meter('1', '2026-05-01T00:00:00.000Z', 0),
      meter('1', '2026-06-01T00:00:00.000Z', 40),
      meter('1', '2026-07-01T00:00:00.000Z', 90),
    ];
    const result = calculateWaterBalance('t1', sources, meters);
    assert.equal(result.period, '2026-07');
    assert.equal(result.producedGal, 200);
    assert.equal(result.billedGal, 50);
    assert.ok(result.trend.length >= 2);
    assert.equal(sumCustomerUsage(meters, '2026-06').gallons, 40);
  });

  it('treats one-sided data as insufficient (not loss/gain)', () => {
    const sourcesOnly = [
      src({ sourceId: 'w1', timestamp: '2026-07-31T00:00:00.000Z', value: 500_000 }),
    ];
    const sourcesOnlyBal = calculatePeriodBalance(sourcesOnly, [], '2026-07');
    assert.equal(sourcesOnlyBal.sourceReadingCount, 1);
    assert.equal(sourcesOnlyBal.meterDeltaCount, 0);
    assert.equal(sourcesOnlyBal.status, 'insufficient');
    assert.equal(sourcesOnlyBal.unaccountedPct, null);

    const metersOnly = [
      meter('1', '2026-06-01T00:00:00.000Z', 0),
      meter('1', '2026-07-01T00:00:00.000Z', 10_000),
    ];
    const metersOnlyBal = calculatePeriodBalance([], metersOnly, '2026-07');
    assert.equal(metersOnlyBal.sourceReadingCount, 0);
    assert.equal(metersOnlyBal.meterDeltaCount, 1);
    assert.equal(metersOnlyBal.status, 'insufficient');
    assert.equal(metersOnlyBal.unaccountedPct, null);

    const empty = calculatePeriodBalance([], [], '2026-07');
    assert.equal(empty.status, 'insufficient');
  });

  it('dedupes period-mode re-ingest for same sourceId + period (latest wins)', () => {
    const sources = [
      src({ sourceId: 'w1', timestamp: '2026-07-15T00:00:00.000Z', value: 100_000 }),
      src({ sourceId: 'w1', timestamp: '2026-07-31T00:00:00.000Z', value: 105_000 }),
      src({ sourceId: 'w2', timestamp: '2026-07-31T00:00:00.000Z', value: 50_000 }),
    ];
    const { gallons, count } = sumSourceProduction(sources, '2026-07');
    assert.equal(gallons, 155_000);
    assert.equal(count, 2);

    const meters = [
      meter('1', '2026-06-01T00:00:00.000Z', 0),
      meter('1', '2026-07-01T00:00:00.000Z', 40_000),
    ];
    const bal = calculatePeriodBalance(sources, meters, '2026-07');
    assert.equal(bal.producedGal, 155_000);
    assert.equal(bal.billedGal, 40_000);
    assert.equal(bal.status, 'loss');
  });

  it('prefers period volume over cumulative for same source in a month', () => {
    const sources: SourceReading[] = [
      src({
        sourceId: 'w1',
        timestamp: '2026-07-31T00:00:00.000Z',
        value: 100_000,
        volumeMode: 'period',
      }),
      src({
        sourceId: 'w1',
        timestamp: '2026-06-30T00:00:00.000Z',
        value: 900_000,
        volumeMode: 'cumulative',
      }),
      src({
        sourceId: 'w1',
        timestamp: '2026-07-31T00:00:00.000Z',
        value: 1_050_000,
        volumeMode: 'cumulative',
      }),
    ];
    const { gallons, count } = sumSourceProduction(sources, '2026-07');
    // Period 100k wins; cumulative delta 150k must not also apply.
    assert.equal(gallons, 100_000);
    assert.equal(count, 1);
  });
});
