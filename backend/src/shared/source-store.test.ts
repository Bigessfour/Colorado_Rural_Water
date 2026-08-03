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
});
