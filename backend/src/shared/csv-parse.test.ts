import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parseCustomerReadingsCsv, parseFlexibleDate } from './csv-parse.js';
import { commitCustomerIngest } from './ingest.js';
import { MemoryMeterStore } from './memory-store.js';

const samplePath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../sample-data/messy-readings-july.csv',
);

describe('parseFlexibleDate', () => {
  it('parses mixed clerk formats', () => {
    assert.equal(parseFlexibleDate('07/15/2026')?.slice(0, 10), '2026-07-15');
    assert.equal(parseFlexibleDate('7/15/26')?.slice(0, 10), '2026-07-15');
    assert.equal(parseFlexibleDate('15-Jul-2026')?.slice(0, 10), '2026-07-15');
    assert.equal(parseFlexibleDate('July 15, 2026')?.slice(0, 10), '2026-07-15');
  });
});

describe('parseCustomerReadingsCsv', () => {
  it('maps messy sample and keeps address with meter across name change', async () => {
    const text = readFileSync(samplePath, 'utf8');
    const parsed = parseCustomerReadingsCsv(text);
    assert.equal(parsed.errors.length, 0);
    assert.ok(parsed.rows.length >= 10);
    assert.equal(parsed.mapping.serviceAddress, 'Service Address');
    assert.equal(parsed.mapping.occupantName, 'Customer');

    const store = new MemoryMeterStore();
    const summary = await commitCustomerIngest(store, 'town-wiley', parsed);
    assert.equal(summary.addressConflicts.length, 0);
    assert.ok(summary.readingsWritten >= 10);

    const loc = await store.getLocation('town-wiley', '1042');
    assert.ok(loc);
    assert.equal(loc.serviceAddress, '112 N Main St Wiley CO');
    assert.equal(loc.occupantName, 'A Rivera');
  });

  it('does not relocate meter on address conflict', async () => {
    const store = new MemoryMeterStore();
    const first = parseCustomerReadingsCsv(
      'Meter ID,Customer,Service Address,Read Date,Reading (gal)\n1042,J Smith,112 N Main,06/15/2026,100\n',
    );
    await commitCustomerIngest(store, 't1', first);

    const second = parseCustomerReadingsCsv(
      'Meter ID,Customer,Service Address,Read Date,Reading (gal)\n1042,A Rivera,999 Other Rd,07/15/2026,200\n',
    );
    const summary = await commitCustomerIngest(store, 't1', second);
    assert.equal(summary.addressConflicts.length, 1);
    const loc = await store.getLocation('t1', '1042');
    assert.equal(loc?.serviceAddress, '112 N Main');
    assert.equal(loc?.occupantName, 'A Rivera');
  });
});
