import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  parseFlexibleDate,
  parseCustomerReadingsCsv,
  parseReadingNumber,
  normalizeUnit,
} from './csv-parse.js';
import {
  MAX_EXCEL_BYTES,
  assertExcelBufferWithinLimit,
  bufferFromBase64,
  classifySheet,
  listWorkbookSheets,
  parseCustomerReadingsExcel,
  preferDataSheet,
} from './excel-parse.js';
import { commitCustomerIngest } from './ingest.js';
import { MemoryMeterStore } from './memory-store.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const excelPath = join(root, 'sample-data/Town_of_Steve_Meter_Export_MESSY.xlsx');
const csvPath = join(root, 'sample-data/messy-readings-july.csv');

describe('parseFlexibleDate', () => {
  it('parses mixed clerk formats including Month DD, YYYY', () => {
    assert.equal(parseFlexibleDate('07/15/2026')?.slice(0, 10), '2026-07-15');
    assert.equal(parseFlexibleDate('7/15/26')?.slice(0, 10), '2026-07-15');
    assert.equal(parseFlexibleDate('15-Jul-2026')?.slice(0, 10), '2026-07-15');
    assert.equal(parseFlexibleDate('July 15, 2026')?.slice(0, 10), '2026-07-15');
    assert.equal(parseFlexibleDate('2026-07-15')?.slice(0, 10), '2026-07-15');
    assert.equal(parseFlexibleDate('05/15/2026')?.slice(0, 10), '2026-05-15');
  });
});

describe('parseReadingNumber / normalizeUnit', () => {
  it('strips commas and normalizes gallons / CF', () => {
    assert.equal(parseReadingNumber('27,420'), 27420);
    assert.equal(parseReadingNumber('"22,800"'), 22800);
    assert.equal(normalizeUnit('Gallons').unit, 'gal');
    assert.equal(normalizeUnit('GALLONS').unit, 'gal');
    assert.equal(normalizeUnit('gal').unit, 'gal');
    const cf = normalizeUnit('CF');
    assert.equal(cf.unit, 'cf');
    assert.match(cf.warning ?? '', /cubic feet/i);
  });
});

describe('parseCustomerReadingsCsv', () => {
  it('maps messy sample and keeps address with meter across name change', async () => {
    const text = readFileSync(csvPath, 'utf8');
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

  it('skips missing meter id without failing the whole file', () => {
    const text = [
      'Town Export',
      '',
      'Meter #,Acct,Location / Address,Read Dt,Current Reading,Units,Flag / Alarm',
      'STEVE-001,A-1,100 Main,7/15/2026,"27,420",Gallons,',
      ',A-99,99 Mystery,7/15/2026,500,Gallons,',
      'STEVE-002,A-2,200 Main,"July 15, 2026",111800,gal,LEAK',
      '*** END OF REPORT ***',
      'Questions? Call office 555-0199',
    ].join('\n');
    const parsed = parseCustomerReadingsCsv(text);
    assert.equal(parsed.errors.length, 0);
    assert.equal(parsed.rows.length, 2);
    assert.ok(parsed.warnings.some((w) => /no Meter ID/i.test(w)));
    assert.ok(parsed.rows.some((r) => r.diagnosticFlags.some((f) => /leak/i.test(f))));
    assert.equal(parsed.rows.find((r) => r.meterId === 'STEVE-001')?.cumulativeReading, 27420);
  });
});

describe('Town of Steve Excel fixture', () => {
  const buf = readFileSync(excelPath);

  it('lists sheets and never prefers Clerk Notes', () => {
    const sheets = listWorkbookSheets(buf);
    assert.deepEqual(
      sheets.map((s) => s.name),
      ['Meter Reads July 2026', 'Older Reads (archive)', 'Clerk Notes'],
    );
    assert.equal(preferDataSheet(sheets), 'Meter Reads July 2026');
    assert.equal(classifySheet('Clerk Notes').dataSheet, false);
  });

  it('parses July sheet with STEVE-004 leak, STEVE-005 stuck, STEVE-012 failing flags', () => {
    const parsed = parseCustomerReadingsExcel(buf);
    assert.equal(parsed.errors.length, 0);
    assert.equal(parsed.selectedSheet, 'Meter Reads July 2026');
    assert.ok(parsed.rows.length >= 25, `expected >=25 rows, got ${parsed.rows.length}`);

    const steve004 = parsed.rows.filter((r) => r.meterId === 'STEVE-004');
    assert.ok(steve004.length >= 3);
    assert.ok(
      steve004.some((r) => r.diagnosticFlags.some((f) => /leak/i.test(f))),
      'STEVE-004 should carry leak diagnosticFlags',
    );

    const steve005 = parsed.rows.filter((r) => r.meterId === 'STEVE-005');
    assert.ok(steve005.length >= 3);
    assert.ok(steve005.every((r) => r.cumulativeReading === 4200));
    assert.ok(steve005.some((r) => r.diagnosticFlags.some((f) => /stuck/i.test(f))));

    const steve012 = parsed.rows.filter((r) => r.meterId === 'STEVE-012');
    assert.ok(steve012.length >= 3);
    assert.ok(
      steve012.some((r) => r.diagnosticFlags.some((f) => /battery/i.test(f))),
      'STEVE-012 should carry low battery flag',
    );

    assert.ok(parsed.warnings.some((w) => /no Meter ID/i.test(w)));
    assert.ok(parsed.warnings.some((w) => /cubic feet|cf/i.test(w)));
    assert.ok(parsed.warnings.some((w) => /incomplete/i.test(w)));
    assert.equal(parsed.mapping.meterId, 'Meter #');
    assert.equal(parsed.mapping.timestamp, 'Read Dt');
    assert.equal(parsed.mapping.diagnosticFlags, 'Flag / Alarm');
  });

  it('parses archive sheet and can merge with July', () => {
    const archiveOnly = parseCustomerReadingsExcel(buf, {
      sheetName: 'Older Reads (archive)',
    });
    assert.equal(archiveOnly.errors.length, 0);
    assert.ok(archiveOnly.rows.some((r) => r.meterId === 'STEVE-012'));
    assert.ok(archiveOnly.rows.every((r) => r.serviceAddress === ''));

    const merged = parseCustomerReadingsExcel(buf, { mergeArchive: true });
    assert.equal(merged.errors.length, 0);
    assert.ok(merged.mergedSheets.includes('Older Reads (archive)'));
    assert.ok(merged.rows.length > archiveOnly.rows.length);
  });

  it('rejects Clerk Notes as selected sheet', () => {
    const parsed = parseCustomerReadingsExcel(buf, { sheetName: 'Clerk Notes' });
    assert.ok(parsed.errors.length);
    assert.match(parsed.errors[0], /clerk notes/i);
  });

  it('commits July+archive into store with anomaly meters present', async () => {
    const parsed = parseCustomerReadingsExcel(buf, { mergeArchive: true });
    const store = new MemoryMeterStore();
    const summary = await commitCustomerIngest(store, 'town-steve', parsed);
    assert.ok(summary.readingsWritten >= 30);
    assert.ok(await store.getLocation('town-steve', 'STEVE-004'));
    assert.ok(await store.getLocation('town-steve', 'STEVE-005'));
    assert.ok(await store.getLocation('town-steve', 'STEVE-012'));

    const r004 = await store.listReadingsForMeter('town-steve', 'STEVE-004');
    assert.ok(r004.some((r) => r.diagnosticFlags.some((f) => /leak/i.test(f))));
  });
});

describe('Excel size / DoS guards', () => {
  it('rejects oversized decoded buffers', () => {
    const huge = Buffer.alloc(MAX_EXCEL_BYTES + 1, 0x50);
    assert.throws(() => assertExcelBufferWithinLimit(huge), /too large/i);
  });

  it('rejects oversized excelBase64 before decode allocates wildly', () => {
    const oversized = 'A'.repeat(MAX_EXCEL_BYTES * 2);
    assert.throws(() => bufferFromBase64(oversized), /too large/i);
  });

  it('accepts the Town of Steve fixture under the limit', () => {
    const buf = readFileSync(excelPath);
    assert.ok(buf.length < MAX_EXCEL_BYTES);
    assert.doesNotThrow(() => assertExcelBufferWithinLimit(buf));
  });
});
