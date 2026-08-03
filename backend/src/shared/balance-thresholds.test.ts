import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_BALANCE_THRESHOLDS } from './balance-alerts.js';
import { mergeBalanceThresholds, parseThresholdPatch } from './balance-thresholds.js';

describe('mergeBalanceThresholds', () => {
  it('returns Spec §7a defaults when empty', () => {
    assert.deepEqual(mergeBalanceThresholds(null), DEFAULT_BALANCE_THRESHOLDS);
    assert.deepEqual(mergeBalanceThresholds(undefined), DEFAULT_BALANCE_THRESHOLDS);
  });

  it('overrides only valid tenant values', () => {
    const merged = mergeBalanceThresholds({
      lossPct: 20,
      lossGalMin: -1,
      gainTolerancePct: 5,
    });
    assert.equal(merged.lossPct, 20);
    assert.equal(merged.lossGalMin, DEFAULT_BALANCE_THRESHOLDS.lossGalMin);
    assert.equal(merged.gainTolerancePct, 5);
    assert.equal(merged.gainGalMin, DEFAULT_BALANCE_THRESHOLDS.gainGalMin);
  });
});

describe('parseThresholdPatch', () => {
  it('accepts numbers and numeric strings', () => {
    assert.deepEqual(parseThresholdPatch({ lossPct: 18, gainGalMin: '6000' }), {
      lossPct: 18,
      gainGalMin: 6000,
    });
  });

  it('ignores junk', () => {
    assert.deepEqual(parseThresholdPatch({ lossPct: 'nope', extra: 1 }), {});
  });
});
