/**
 * Excel (.xlsx / .xls) workbook ingest for customer meter exports (ticket B3).
 * Prefers "Meter Reads" / July sheets; never auto-uses Clerk Notes.
 */

import * as XLSX from 'xlsx';
import {
  applyMapping,
  guessColumnMapping,
  parseTableMatrix,
  type ColumnMapping,
  type IngestParseResult,
  type MappedReadingRow,
} from './csv-parse.js';

/** Decoded workbook hard cap (rural exports are small; guards Lambda / zip bombs). */
export const MAX_EXCEL_BYTES = 5 * 1024 * 1024;
/** Max base64 characters for excelBase64 (~4/3 of decoded + padding). */
export const MAX_EXCEL_BASE64_CHARS = Math.ceil((MAX_EXCEL_BYTES * 4) / 3) + 128;
export const MAX_EXCEL_SHEETS = 32;
/** Cap rows SheetJS materializes per sheet (zip-bomb / dense-sheet DoS). */
export const MAX_EXCEL_SHEET_ROWS = 50_000;

export interface ExcelSheetInfo {
  name: string;
  /** Likely meter data (not clerk notes / free text). */
  dataSheet: boolean;
  /** Preferred default (Meter Reads / July). */
  preferred: boolean;
  /** Archive / older history sheet. */
  archive: boolean;
}

export interface ExcelParseOptions {
  sheetName?: string;
  /** Also parse an archive sheet and merge rows (default false). */
  mergeArchive?: boolean;
  mapping?: ColumnMapping;
}

export interface ExcelIngestParseResult extends IngestParseResult {
  sheets: ExcelSheetInfo[];
  selectedSheet: string;
  mergedSheets: string[];
}

export function isExcelFileName(name: string): boolean {
  return /\.xlsx?$/i.test(name);
}

export function isClerkNotesSheet(name: string): boolean {
  return /clerk\s*notes|notes\s*only|internal\s*notes|free\s*text/i.test(name);
}

export function isArchiveSheet(name: string): boolean {
  return /archive|older\s*reads|historical|history/i.test(name);
}

export function isPreferredMeterSheet(name: string): boolean {
  if (isClerkNotesSheet(name)) return false;
  return /meter\s*reads|july|current\s*cycle|readings/i.test(name);
}

export function classifySheet(name: string): ExcelSheetInfo {
  const clerk = isClerkNotesSheet(name);
  return {
    name,
    dataSheet: !clerk,
    preferred: isPreferredMeterSheet(name),
    archive: isArchiveSheet(name),
  };
}

export function listWorkbookSheets(buffer: Buffer | ArrayBuffer | Uint8Array): ExcelSheetInfo[] {
  const wb = readWorkbook(buffer);
  return wb.SheetNames.map(classifySheet);
}

/** Pick best default data sheet — never Clerk Notes. */
export function preferDataSheet(sheets: ExcelSheetInfo[]): string | null {
  const data = sheets.filter((s) => s.dataSheet);
  if (!data.length) return null;
  const preferred = data.find((s) => s.preferred && !s.archive);
  if (preferred) return preferred.name;
  const nonArchive = data.find((s) => !s.archive);
  return (nonArchive ?? data[0]).name;
}

export function findArchiveSheet(sheets: ExcelSheetInfo[]): string | null {
  return sheets.find((s) => s.dataSheet && s.archive)?.name ?? null;
}

export function parseCustomerReadingsExcel(
  buffer: Buffer | ArrayBuffer | Uint8Array,
  options: ExcelParseOptions = {},
): ExcelIngestParseResult {
  const wb = readWorkbook(buffer);
  const sheets = wb.SheetNames.map(classifySheet);
  const selected =
    options.sheetName ??
    preferDataSheet(sheets) ??
    sheets.find((s) => s.dataSheet)?.name ??
    '';

  if (!selected) {
    return {
      mapping: {},
      mappingGuessed: false,
      rows: [],
      errors: ['This workbook has no usable meter-data sheets (Clerk Notes alone is ignored).'],
      warnings: [],
      sheets,
      selectedSheet: '',
      mergedSheets: [],
    };
  }

  if (isClerkNotesSheet(selected)) {
    return {
      mapping: {},
      mappingGuessed: false,
      rows: [],
      errors: [
        `Sheet "${selected}" looks like clerk notes (free text), not meter reads. Pick a Meter Reads or archive sheet.`,
      ],
      warnings: [],
      sheets,
      selectedSheet: selected,
      mergedSheets: [],
    };
  }

  const primary = parseSheet(wb, selected, options.mapping);
  const mergedSheets = [selected];
  const warnings = [...primary.warnings];
  let rows: MappedReadingRow[] = [...primary.rows];
  let mapping = primary.mapping;
  let errors = [...primary.errors];

  if (options.mergeArchive) {
    const archiveName = findArchiveSheet(sheets);
    if (archiveName && archiveName !== selected) {
      const archive = parseSheet(wb, archiveName, options.mapping);
      mergedSheets.push(archiveName);
      if (archive.errors.length) {
        warnings.push(
          `Archive sheet "${archiveName}" could not be fully parsed: ${archive.errors.join(' ')}`,
        );
      } else {
        warnings.push(`Merged archive sheet "${archiveName}" (${archive.rows.length} row(s)).`);
      }
      warnings.push(...archive.warnings.map((w) => `[${archiveName}] ${w}`));
      // Copy addresses from primary onto archive rows so history can commit before locations exist.
      const addressByMeter = new Map<string, string>();
      for (const r of rows) {
        if (r.serviceAddress.trim()) addressByMeter.set(r.meterId, r.serviceAddress.trim());
      }
      const enrichedArchive = archive.rows.map((r) =>
        r.serviceAddress.trim()
          ? r
          : { ...r, serviceAddress: addressByMeter.get(r.meterId) ?? '' },
      );
      rows = dedupeRows([...rows, ...enrichedArchive]);
      if (!mapping.meterId && archive.mapping.meterId) mapping = { ...archive.mapping, ...mapping };
    } else if (!archiveName) {
      warnings.push('mergeArchive was requested but no archive sheet was found.');
    }
  }

  return {
    mapping,
    mappingGuessed: primary.mappingGuessed,
    rows,
    errors,
    warnings,
    sheets,
    selectedSheet: selected,
    mergedSheets,
  };
}

/** Decode base64 (with optional data-URL prefix) to Buffer. Rejects oversized payloads early. */
export function bufferFromBase64(base64: string): Buffer {
  const cleaned = base64.replace(/^data:[^;]+;base64,/, '').trim();
  if (!cleaned) {
    throw new Error('excelBase64 is empty');
  }
  if (cleaned.length > MAX_EXCEL_BASE64_CHARS) {
    throw new Error(
      `Excel payload is too large (max ${MAX_EXCEL_BYTES} bytes decoded / ~${MAX_EXCEL_BASE64_CHARS} base64 chars).`,
    );
  }
  const buf = Buffer.from(cleaned, 'base64');
  assertExcelBufferWithinLimit(buf);
  return buf;
}

/**
 * True if buffer looks like Excel — OLE `.xls`, or ZIP `.xlsx` with OOXML markers.
 * Plain ZIP magic alone is not enough (avoids treating arbitrary ZIPs as workbooks).
 */
export function looksLikeExcelBuffer(buf: Buffer): boolean {
  if (buf.length < 4) return false;
  // D0 CF 11 E0 OLE compound / xls
  if (buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0) {
    return true;
  }
  // PK.. zip — require OOXML path markers somewhere in the archive bytes
  if (buf[0] === 0x50 && buf[1] === 0x4b) {
    return (
      buf.includes(Buffer.from('[Content_Types].xml')) ||
      buf.includes(Buffer.from('xl/workbook')) ||
      buf.includes(Buffer.from('xl/worksheets'))
    );
  }
  return false;
}

export function assertExcelBufferWithinLimit(buf: Buffer | Uint8Array): void {
  if (!buf.length) {
    throw new Error('Excel file is empty');
  }
  if (buf.length > MAX_EXCEL_BYTES) {
    throw new Error(
      `Excel file is too large (${buf.length} bytes; max ${MAX_EXCEL_BYTES} bytes / 5 MiB). Split the export or wait for bulk history ingest (H2).`,
    );
  }
}

function parseSheet(
  wb: XLSX.WorkBook,
  sheetName: string,
  mappingOverride?: ColumnMapping,
): IngestParseResult {
  const sheet = wb.Sheets[sheetName];
  if (!sheet) {
    return {
      mapping: {},
      mappingGuessed: false,
      rows: [],
      errors: [`Sheet "${sheetName}" was not found in this workbook.`],
      warnings: [],
    };
  }

  const matrix = XLSX.utils.sheet_to_json<Array<string | number | boolean | null>>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  }) as unknown as string[][];

  const stringMatrix = matrix.map((row) =>
    (row ?? []).map((cell) => (cell == null ? '' : String(cell).trim())),
  );

  const parsed = parseTableMatrix(stringMatrix);
  if (!parsed.headers.length) {
    return {
      mapping: {},
      mappingGuessed: false,
      rows: [],
      errors: [
        `Sheet "${sheetName}" looks empty, or we could not find a header row in the first rows.`,
      ],
      warnings: [],
    };
  }

  const guessed = guessColumnMapping(parsed.headers);
  const mapping = { ...guessed, ...mappingOverride };
  const requireAddress = Boolean(mapping.serviceAddress);
  const result = applyMapping(parsed, mapping, { requireAddress });
  result.mappingGuessed = !mappingOverride || Object.keys(mappingOverride).length === 0;

  if (parsed.headerRowIndex > 0) {
    result.warnings.unshift(
      `Sheet "${sheetName}": found the header on row ${parsed.headerRowIndex + 1} (title rows above it were ignored).`,
    );
  }
  if (parsed.skippedNoiseRows) {
    result.warnings.unshift(
      `Sheet "${sheetName}": skipped ${parsed.skippedNoiseRows} blank or footer row(s).`,
    );
  }

  return result;
}

function dedupeRows(rows: MappedReadingRow[]): MappedReadingRow[] {
  const seen = new Set<string>();
  const out: MappedReadingRow[] = [];
  for (const row of rows) {
    const key = `${row.meterId}|${row.timestamp}|${row.cumulativeReading}|${row.unit}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function readWorkbook(buffer: Buffer | ArrayBuffer | Uint8Array): XLSX.WorkBook {
  const data =
    Buffer.isBuffer(buffer)
      ? buffer
      : buffer instanceof ArrayBuffer
        ? Buffer.from(buffer)
        : Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  assertExcelBufferWithinLimit(data);
  const wb = XLSX.read(data, {
    type: 'buffer',
    cellDates: true,
    sheetRows: MAX_EXCEL_SHEET_ROWS,
  });
  if (wb.SheetNames.length > MAX_EXCEL_SHEETS) {
    throw new Error(
      `Workbook has ${wb.SheetNames.length} sheets (max ${MAX_EXCEL_SHEETS}). Export only meter-data sheets.`,
    );
  }
  return wb;
}
