import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { assessTenantConfidence, evaluateAlerts } from './alert-engine.js';
import type { MeterLocation, MeterReading } from './meter-location.js';

function loc(partial: Partial<MeterLocation> & Pick<MeterLocation, 'meterId'>): MeterLocation {
  return {
    tenantId: 't1',
    serviceAddress: `${partial.meterId} Addr`,
    occupantName: 'X',
    accountNumber: null,
    route: 'R3',
    meterSize: null,
    installDate: null,
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...partial,
  };
}

function rdg(
  meterId: string,
  timestamp: string,
  cumulativeReading: number,
  flags: string[] = [],
): MeterReading {
  return {
    tenantId: 't1',
    meterId,
    serviceAddress: `${meterId} Addr`,
    occupantName: 'X',
    timestamp,
    cumulativeReading,
    unit: 'gal',
    diagnosticFlags: flags,
  };
}

describe('assessTenantConfidence', () => {
  it('marks Thin for ~2 months', () => {
    const c = assessTenantConfidence(
      [rdg('1', '2026-06-15T00:00:00.000Z', 1), rdg('1', '2026-07-15T00:00:00.000Z', 2)],
      1,
    );
    assert.equal(c.level, 'Thin');
    assert.equal(c.statisticalMode, 'Watch');
  });
});

describe('evaluateAlerts', () => {
  it('flags stuck meter as Actionable and high usage as Watch when Thin', () => {
    const locations = [
      loc({ meterId: '1042' }),
      loc({ meterId: '1045' }),
      loc({ meterId: '1043' }),
      loc({ meterId: '1044' }),
    ];
    const readings = [
      rdg('1042', '2026-06-15T00:00:00.000Z', 1000),
      rdg('1042', '2026-07-15T00:00:00.000Z', 5000), // +4000
      rdg('1043', '2026-06-15T00:00:00.000Z', 1000),
      rdg('1043', '2026-07-15T00:00:00.000Z', 1100), // +100
      rdg('1044', '2026-06-15T00:00:00.000Z', 1000),
      rdg('1044', '2026-07-15T00:00:00.000Z', 1120), // +120
      rdg('1045', '2026-06-15T00:00:00.000Z', 0),
      rdg('1045', '2026-07-15T00:00:00.000Z', 0, ['NR']),
    ];
    const { confidence, alerts } = evaluateAlerts(locations, readings);
    assert.equal(confidence.level, 'Thin');
    const stuck = alerts.find((a) => a.type === 'stuck_meter');
    assert.ok(stuck);
    assert.equal(stuck.mode, 'Actionable');
    const high = alerts.find((a) => a.type === 'unusual_high_usage' && a.meterId === '1042');
    assert.ok(high, `alerts=${JSON.stringify(alerts.map((a) => a.type + ':' + a.meterId))}`);
    assert.equal(high.mode, 'Watch');
  });
});
