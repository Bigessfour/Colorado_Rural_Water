import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildLastIngestRecord } from './last-ingest.js';

describe('last ingest record', () => {
  it('normalizes row counts for dashboard status line', () => {
    const rec = buildLastIngestRecord({
      tenantId: 'town-wiley',
      at: '2026-08-07T00:00:00.000Z',
      rowsAccepted: 29,
      rowsSkipped: 2,
      readingsWritten: 29,
      filename: 'messy.xlsx',
    });
    assert.equal(rec.goodRows, 29);
    assert.equal(rec.badRows, 2);
    assert.equal(rec.filename, 'messy.xlsx');
    assert.equal(rec.tenantId, 'town-wiley');
  });
});
