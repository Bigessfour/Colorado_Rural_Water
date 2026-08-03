import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { commitCustomerIngest } from './ingest.js';
import { MemoryMeterStore } from './memory-store.js';
import { parseCustomerReadingsCsv } from './csv-parse.js';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const samplePath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../sample-data/messy-readings-july.csv',
);

describe('listReadingsForMeter (C5)', () => {
  it('returns only that meter readings with location address + occupant', async () => {
    const text = readFileSync(samplePath, 'utf8');
    const parsed = parseCustomerReadingsCsv(text);
    const store = new MemoryMeterStore();
    await commitCustomerIngest(store, 'town-wiley', parsed);

    const loc = await store.getLocation('town-wiley', '1042');
    assert.ok(loc);
    assert.equal(loc.serviceAddress, '112 N Main St Wiley CO');
    assert.equal(loc.occupantName, 'A Rivera');

    const readings = await store.listReadingsForMeter('town-wiley', '1042');
    assert.ok(readings.length >= 1);
    assert.ok(readings.every((r) => r.meterId === '1042' && r.tenantId === 'town-wiley'));
    assert.ok(readings.every((r) => r.serviceAddress === loc.serviceAddress));

    const other = await store.listReadingsForMeter('town-wiley', 'no-such-meter');
    assert.equal(other.length, 0);
  });
});
