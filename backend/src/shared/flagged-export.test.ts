import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildFlaggedMetersCsv,
  csvCell,
  sanitizeMeterId,
} from './flagged-export.js';

describe('csvCell', () => {
  it('quotes commas and embedded quotes', () => {
    assert.equal(csvCell('a,b'), '"a,b"');
    assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  });
});

describe('buildFlaggedMetersCsv', () => {
  it('includes confidenceNote on Watch rows', () => {
    const csv = buildFlaggedMetersCsv([
      {
        meterId: '1042',
        serviceAddress: '112 N Main St Wiley CO',
        occupantName: 'A Rivera',
        mode: 'Watch',
        type: 'unusual_high_usage',
        summary: 'High usage vs peers',
        confidenceNote: 'Thin history — Watch',
        status: 'open',
      },
    ]);
    assert.match(csv, /^meterId,serviceAddress,occupantName,mode,type,summary,confidenceNote,status\n/);
    assert.match(csv, /1042/);
    assert.match(csv, /Watch/);
    assert.match(csv, /Thin history — Watch/);
    assert.match(csv, /A Rivera/);
  });

  it('escapes summary commas without dropping confidenceNote', () => {
    const csv = buildFlaggedMetersCsv([
      {
        meterId: '9',
        serviceAddress: '1 Oak',
        occupantName: null,
        mode: 'Actionable',
        type: 'stuck_meter',
        summary: 'Stuck, zero usage',
        confidenceNote: 'Hardware — Actionable',
        status: 'acknowledged',
      },
    ]);
    assert.match(csv, /"Stuck, zero usage"/);
    assert.match(csv, /Hardware — Actionable/);
  });
});

describe('sanitizeMeterId', () => {
  it('accepts simple meter ids', () => {
    assert.equal(sanitizeMeterId(' 1042 '), '1042');
  });

  it('rejects empty or path-like ids', () => {
    assert.throws(() => sanitizeMeterId(''));
    assert.throws(() => sanitizeMeterId('../x'));
    assert.throws(() => sanitizeMeterId('a/b'));
  });
});
