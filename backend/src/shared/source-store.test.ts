import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MemorySourceStore } from './source-store.js';
import type { WaterSource } from './water-source.js';

function src(partial: Partial<WaterSource> & Pick<WaterSource, 'tenantId' | 'sourceId' | 'name'>): WaterSource {
  return {
    type: 'well',
    unit: 'gal',
    notes: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...partial,
  };
}

describe('MemorySourceStore tenant isolation', () => {
  it('lists only the caller tenant sources', async () => {
    const store = new MemorySourceStore();
    await store.putSource(src({ tenantId: 'a', sourceId: 'w1', name: 'Well A' }));
    await store.putSource(src({ tenantId: 'b', sourceId: 'w1', name: 'Well B' }));

    const a = await store.listSources('a');
    const b = await store.listSources('b');
    assert.equal(a.length, 1);
    assert.equal(a[0].name, 'Well A');
    assert.equal(b.length, 1);
    assert.equal(b[0].name, 'Well B');
  });

  it('getSource refuses cross-tenant keys', async () => {
    const store = new MemorySourceStore();
    await store.putSource(src({ tenantId: 'a', sourceId: 'w1', name: 'Well A' }));
    assert.equal(await store.getSource('b', 'w1'), null);
    assert.equal((await store.getSource('a', 'w1'))?.name, 'Well A');
  });

  it('delete is tenant-scoped', async () => {
    const store = new MemorySourceStore();
    await store.putSource(src({ tenantId: 'a', sourceId: 'w1', name: 'Well A' }));
    assert.equal(await store.deleteSource('b', 'w1'), false);
    assert.equal(await store.deleteSource('a', 'w1'), true);
    assert.equal(await store.getSource('a', 'w1'), null);
  });

  it('source readings are tenant-scoped', async () => {
    const store = new MemorySourceStore();
    await store.putSourceReading({
      tenantId: 'a',
      sourceId: 'w1',
      sourceName: 'Well A',
      timestamp: '2026-07-31T00:00:00.000Z',
      value: 100,
      volumeMode: 'period',
      unit: 'gal',
      notes: null,
    });
    await store.putSourceReading({
      tenantId: 'b',
      sourceId: 'w1',
      sourceName: 'Well B',
      timestamp: '2026-07-31T00:00:00.000Z',
      value: 200,
      volumeMode: 'period',
      unit: 'gal',
      notes: null,
    });
    assert.equal((await store.listSourceReadings('a'))[0]?.value, 100);
    assert.equal((await store.listSourceReadings('b'))[0]?.value, 200);
  });
});
