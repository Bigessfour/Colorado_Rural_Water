import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { evaluateBalanceAlerts } from './balance-alerts.js';
import type { WaterBalancePeriod } from './water-balance.js';

function bal(partial: Partial<WaterBalancePeriod> & Pick<WaterBalancePeriod, 'status'>): WaterBalancePeriod {
  return {
    period: '2026-07',
    periodLabel: 'July 2026',
    producedGal: 100_000,
    billedGal: 80_000,
    unaccountedGal: 20_000,
    unaccountedPct: 20,
    sourceReadingCount: 2,
    meterDeltaCount: 10,
    ...partial,
  };
}

describe('evaluateBalanceAlerts', () => {
  it('skips insufficient and ok periods', () => {
    assert.deepEqual(
      evaluateBalanceAlerts(bal({ status: 'insufficient', unaccountedPct: null })),
      [],
    );
    assert.deepEqual(evaluateBalanceAlerts(bal({ status: 'ok', unaccountedGal: 0, unaccountedPct: 0 })), []);
  });

  it('flags high unaccounted loss above defaults', () => {
    const alerts = evaluateBalanceAlerts(
      bal({
        status: 'loss',
        producedGal: 1_000_000,
        billedGal: 800_000,
        unaccountedGal: 200_000,
        unaccountedPct: 20,
      }),
    );
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].type, 'high_unaccounted_loss');
    assert.equal(alerts[0].mode, 'Watch');
  });

  it('does not flag small loss under threshold', () => {
    const alerts = evaluateBalanceAlerts(
      bal({
        status: 'loss',
        producedGal: 100_000,
        billedGal: 95_000,
        unaccountedGal: 5_000,
        unaccountedPct: 5,
      }),
    );
    assert.equal(alerts.length, 0);
  });

  it('flags sold > pumped beyond timing tolerance', () => {
    const alerts = evaluateBalanceAlerts(
      bal({
        status: 'gain',
        producedGal: 100_000,
        billedGal: 120_000,
        unaccountedGal: -20_000,
        unaccountedPct: null,
      }),
    );
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].type, 'sold_exceeds_produced');
  });

  it('tolerates small sold > pumped mismatch', () => {
    const alerts = evaluateBalanceAlerts(
      bal({
        status: 'gain',
        producedGal: 100_000,
        billedGal: 101_000,
        unaccountedGal: -1_000,
        unaccountedPct: null,
      }),
    );
    assert.equal(alerts.length, 0);
  });
});
