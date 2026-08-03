import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  billingStatusLabel,
  defaultBillingFields,
  planLabel,
  suggestPlanCode,
  billEventSk,
} from './billing.js';

describe('suggestPlanCode', () => {
  it('maps meter bands', () => {
    assert.equal(suggestPlanCode(undefined), 'meters_0_100');
    assert.equal(suggestPlanCode(50), 'meters_0_100');
    assert.equal(suggestPlanCode(100), 'meters_0_100');
    assert.equal(suggestPlanCode(101), 'meters_101_300');
    assert.equal(suggestPlanCode(300), 'meters_101_300');
    assert.equal(suggestPlanCode(301), 'meters_301_750');
    assert.equal(suggestPlanCode(751), 'meters_750_plus');
  });
});

describe('defaultBillingFields', () => {
  it('defaults to pilot', () => {
    const f = defaultBillingFields({ meterCountEstimate: 150 });
    assert.equal(f.billingStatus, 'pilot');
    assert.equal(f.billingMode, 'pilot');
    assert.equal(f.planCode, 'meters_101_300');
    assert.equal(f.paymentProvider, 'none');
  });

  it('paid path uses manual mode and active', () => {
    const f = defaultBillingFields({ pilotOrPaid: 'paid', meterCountEstimate: 80 });
    assert.equal(f.billingStatus, 'active');
    assert.equal(f.billingMode, 'manual');
    assert.equal(f.planCode, 'meters_0_100');
  });
});

describe('labels', () => {
  it('returns plain-language labels', () => {
    assert.match(planLabel('meters_101_300'), /101/);
    assert.match(billingStatusLabel('pilot'), /Pilot/i);
  });
});

describe('billEventSk', () => {
  it('uses BILL#EVENT#{iso}#{id}', () => {
    assert.equal(
      billEventSk('2026-08-03T12:00:00.000Z', 'abc'),
      'BILL#EVENT#2026-08-03T12:00:00.000Z#abc',
    );
  });
});
