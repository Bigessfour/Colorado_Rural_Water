import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parseSourceReadingsCsv } from './source-csv-parse.js';
import { commitSourceIngest } from './source-ingest.js';
import { MemorySourceStore } from './source-store.js';

const samplePath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../sample-data/messy-source-readings-july.csv',
);

describe('parseSourceReadingsCsv', () => {
  it('maps messy source fixture with period volumes', async () => {
    const text = readFileSync(samplePath, 'utf8');
    const parsed = parseSourceReadingsCsv(text);
    assert.equal(parsed.errors.length, 0);
    assert.ok(parsed.rows.length >= 6);
    assert.equal(parsed.mapping.sourceName, 'Source Name');
    assert.equal(parsed.mapping.periodVolume, 'Period Volume (gal)');
    assert.equal(parsed.rows[0].volumeMode, 'period');

    const store = new MemorySourceStore();
    const summary = await commitSourceIngest(store, 'town-wiley', parsed);
    assert.ok(summary.readingsWritten >= 6);
    assert.ok(summary.sourcesCreated >= 3);

    const sources = await store.listSources('town-wiley');
    assert.ok(sources.some((s) => /well 1/i.test(s.name)));

    const readings = await store.listSourceReadings('town-wiley');
    assert.ok(readings.some((r) => r.value === 620000));
  });

  it('isolates source readings by tenant on commit', async () => {
    const text = readFileSync(samplePath, 'utf8');
    const parsed = parseSourceReadingsCsv(text);
    const store = new MemorySourceStore();
    await commitSourceIngest(store, 'a', parsed);
    await commitSourceIngest(store, 'b', parsed);

    assert.equal((await store.listSourceReadings('a')).length, parsed.rows.length);
    assert.equal((await store.listSourceReadings('b')).length, parsed.rows.length);
    assert.equal((await store.listSources('a')).length, (await store.listSources('b')).length);
  });
});
