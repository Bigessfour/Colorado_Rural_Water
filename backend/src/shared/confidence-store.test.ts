import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mergeConfidence } from './confidence-store.js';
import { assessTenantConfidence } from './alert-engine.js';

describe('mergeConfidence', () => {
  it('returns live when no stored record', () => {
    const live = assessTenantConfidence([], 0);
    const merged = mergeConfidence(live, null);
    assert.equal(merged.source, 'live');
    assert.equal(merged.level, 'Thin');
  });

  it('prefers stored tier when present', () => {
    const live = assessTenantConfidence([], 0);
    const merged = mergeConfidence(live, {
      tenantId: 'town-a',
      level: 'Solid',
      monthsOfHistory: 8,
      meterCount: 10,
      meterCountConfigured: 10,
      coveragePct: 90,
      displayScore: 85,
      statisticalMode: 'Actionable',
      plainLanguage: 'stored',
      improveHint: 'hint',
      computedAt: '2026-08-01T00:00:00.000Z',
    });
    assert.equal(merged.source, 'stored');
    assert.equal(merged.level, 'Solid');
    assert.equal(merged.computedAt, '2026-08-01T00:00:00.000Z');
  });
});
