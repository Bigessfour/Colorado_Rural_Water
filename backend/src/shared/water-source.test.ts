import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  normalizeWaterSourceInput,
  slugifySourceId,
  type WaterSource,
} from './water-source.js';

describe('slugifySourceId', () => {
  it('normalizes display names', () => {
    assert.equal(slugifySourceId('Well 1 – North'), 'well-1-north');
    assert.equal(slugifySourceId('  Well 2  '), 'well-2');
  });
});

describe('normalizeWaterSourceInput', () => {
  it('creates a well source with defaults', () => {
    const res = normalizeWaterSourceInput('demo-town', {
      name: 'Well 1 – North',
      type: 'well',
      sourceId: 'well-1-north',
    });
    assert.equal(res.ok, true);
    if (!res.ok) return;
    assert.equal(res.source.tenantId, 'demo-town');
    assert.equal(res.source.sourceId, 'well-1-north');
    assert.equal(res.source.type, 'well');
    assert.equal(res.source.unit, 'gal');
    assert.equal(res.source.notes, null);
  });

  it('rejects invalid type', () => {
    const res = normalizeWaterSourceInput('t1', { name: 'X', type: 'tank' });
    assert.equal(res.ok, false);
  });

  it('updates existing without changing sourceId', () => {
    const existing: WaterSource = {
      tenantId: 't1',
      sourceId: 'well-1',
      name: 'Well 1',
      type: 'well',
      unit: 'gal',
      notes: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const res = normalizeWaterSourceInput(
      't1',
      { name: 'Well 1 – Town', type: 'spring' },
      existing,
    );
    assert.equal(res.ok, true);
    if (!res.ok) return;
    assert.equal(res.source.sourceId, 'well-1');
    assert.equal(res.source.name, 'Well 1 – Town');
    assert.equal(res.source.type, 'spring');
    assert.equal(res.source.createdAt, existing.createdAt);
  });

  it('never trusts a different tenantId on update path', () => {
    const existing: WaterSource = {
      tenantId: 'tenant-a',
      sourceId: 'well-1',
      name: 'Well 1',
      type: 'well',
      unit: 'gal',
      notes: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const res = normalizeWaterSourceInput('tenant-b', { name: 'Hijack' }, existing);
    assert.equal(res.ok, true);
    if (!res.ok) return;
    assert.equal(res.source.tenantId, 'tenant-b');
  });
});
