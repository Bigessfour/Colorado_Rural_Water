import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  mergeReadingCycle,
  normalizeCycleCloseDay,
  periodKeyFromIso,
} from './reading-cycle.js';

describe('reading cycle', () => {
  it('defaults to UTC calendar month', () => {
    assert.equal(periodKeyFromIso('2026-01-20T12:00:00.000Z', 0), '2026-01');
    assert.deepEqual(mergeReadingCycle(null), {
      cycleCloseDay: 0,
      source: 'default',
    });
  });

  it('assigns period by cycle close day', () => {
    assert.equal(periodKeyFromIso('2026-01-10T12:00:00.000Z', 15), '2026-01');
    assert.equal(periodKeyFromIso('2026-01-20T12:00:00.000Z', 15), '2026-02');
    assert.equal(periodKeyFromIso('2026-12-20T12:00:00.000Z', 15), '2027-01');
  });

  it('validates cycleCloseDay', () => {
    assert.equal(normalizeCycleCloseDay(0), 0);
    assert.equal(normalizeCycleCloseDay(15), 15);
    assert.equal(normalizeCycleCloseDay(1), null);
    assert.equal(normalizeCycleCloseDay(29), null);
  });
});
