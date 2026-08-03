/**
 * Forgiving CSV parse + column mapping for customer meter exports (tickets B3–B5).
 */

export type CanonicalField =
  | 'meterId'
  | 'serviceAddress'
  | 'occupantName'
  | 'accountNumber'
  | 'timestamp'
  | 'cumulativeReading'
  | 'unit'
  | 'route'
  | 'diagnosticFlags';

export type ColumnMapping = Partial<Record<CanonicalField, string>>;

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
  skippedCommentLines: number;
}

export interface MappedReadingRow {
  meterId: string;
  serviceAddress: string;
  occupantName: string | null;
  accountNumber: string | null;
  timestamp: string;
  cumulativeReading: number;
  unit: string;
  route: string | null;
  diagnosticFlags: string[];
  sourceLine: number;
}

export interface IngestParseResult {
  mapping: ColumnMapping;
  mappingGuessed: boolean;
  rows: MappedReadingRow[];
  errors: string[];
  warnings: string[];
}

const HEADER_ALIASES: Record<CanonicalField, string[]> = {
  meterId: ['meter id', 'meterid', 'meter #', 'meter number', 'meter_no', 'meter'],
  serviceAddress: [
    'service address',
    'address',
    'service addr',
    'location',
    'service location',
    'street address',
  ],
  occupantName: ['customer', 'customer name', 'occupant', 'name', 'owner', 'account name'],
  accountNumber: ['account #', 'account', 'account number', 'acct', 'acct #', 'account_no'],
  timestamp: ['read date', 'reading date', 'date', 'timestamp', 'read_dt', 'reading datetime'],
  cumulativeReading: [
    'reading (gal)',
    'reading',
    'cumulative',
    'cumulative reading',
    'usage',
    'gallons',
    'read',
  ],
  unit: ['unit', 'units', 'uom'],
  route: ['route', 'route #', 'book', 'cycle'],
  diagnosticFlags: ['diag', 'diagnostic', 'diagnostics', 'flags', 'flag'],
};

export function parseCsvText(text: string): ParsedCsv {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  let skippedCommentLines = 0;
  const dataLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('#')) {
      skippedCommentLines += 1;
      continue;
    }
    dataLines.push(line);
  }

  if (dataLines.length === 0) {
    return { headers: [], rows: [], skippedCommentLines };
  }

  const headers = splitCsvLine(dataLines[0]).map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < dataLines.length; i += 1) {
    const cells = splitCsvLine(dataLines[i]);
    if (cells.every((c) => !c.trim())) continue;
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = (cells[idx] ?? '').trim();
    });
    rows.push(row);
  }

  return { headers, rows, skippedCommentLines };
}

/** Minimal CSV splitter: commas + double-quoted fields. */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

export function guessColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const normalized = headers.map((h) => ({ raw: h, key: normalizeHeader(h) }));
  const used = new Set<string>();

  for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [CanonicalField, string[]][]) {
    const hit = normalized.find((h) => !used.has(h.raw) && aliases.includes(h.key));
    if (hit) {
      mapping[field] = hit.raw;
      used.add(hit.raw);
    }
  }
  return mapping;
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[_/]+/g, ' ').replace(/\s+/g, ' ');
}

export function applyMapping(
  parsed: ParsedCsv,
  mapping: ColumnMapping,
  options?: { defaultUnit?: string },
): IngestParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const rows: MappedReadingRow[] = [];
  const defaultUnit = options?.defaultUnit ?? 'gal';

  if (!mapping.meterId) errors.push('We could not find a Meter ID column. Please map it.');
  if (!mapping.serviceAddress) {
    errors.push('We could not find a Service Address column. Address stays with the meter.');
  }
  if (!mapping.timestamp) errors.push('We could not find a read date / timestamp column.');
  if (!mapping.cumulativeReading) errors.push('We could not find a meter reading column.');

  if (errors.length) {
    return { mapping, mappingGuessed: false, rows, errors, warnings };
  }

  parsed.rows.forEach((raw, idx) => {
    const lineNo = idx + 2; // header is line 1 in data section approximation
    const meterId = cell(raw, mapping.meterId);
    const serviceAddress = cell(raw, mapping.serviceAddress);
    const readingRaw = cell(raw, mapping.cumulativeReading);
    const tsRaw = cell(raw, mapping.timestamp);

    if (!meterId || !serviceAddress || !readingRaw || !tsRaw) {
      warnings.push(`Row ${lineNo}: skipped — missing meter, address, reading, or date.`);
      return;
    }

    const cumulativeReading = Number(String(readingRaw).replace(/,/g, ''));
    if (!Number.isFinite(cumulativeReading)) {
      warnings.push(`Row ${lineNo}: skipped — reading "${readingRaw}" is not a number.`);
      return;
    }

    const timestamp = parseFlexibleDate(tsRaw);
    if (!timestamp) {
      warnings.push(`Row ${lineNo}: skipped — could not understand date "${tsRaw}".`);
      return;
    }

    const diag = cell(raw, mapping.diagnosticFlags);
    rows.push({
      meterId,
      serviceAddress,
      occupantName: emptyToNull(cell(raw, mapping.occupantName)),
      accountNumber: emptyToNull(cell(raw, mapping.accountNumber)),
      timestamp,
      cumulativeReading,
      unit: emptyToNull(cell(raw, mapping.unit)) ?? defaultUnit,
      route: emptyToNull(cell(raw, mapping.route)),
      diagnosticFlags: diag ? diag.split(/[|;,\s]+/).filter(Boolean) : [],
      sourceLine: lineNo,
    });
  });

  if (!rows.length && !warnings.length) {
    errors.push('No readable meter rows found in this file.');
  }

  return { mapping, mappingGuessed: false, rows, errors, warnings };
}

export function parseCustomerReadingsCsv(
  text: string,
  mappingOverride?: ColumnMapping,
): IngestParseResult {
  const parsed = parseCsvText(text);
  if (!parsed.headers.length) {
    return {
      mapping: {},
      mappingGuessed: false,
      rows: [],
      errors: ['This file looks empty. Please upload a CSV with a header row.'],
      warnings: [],
    };
  }
  const guessed = guessColumnMapping(parsed.headers);
  const mapping = { ...guessed, ...mappingOverride };
  const result = applyMapping(parsed, mapping);
  result.mappingGuessed = !mappingOverride || Object.keys(mappingOverride).length === 0;
  if (parsed.skippedCommentLines) {
    result.warnings.unshift(
      `Ignored ${parsed.skippedCommentLines} comment line(s) starting with #.`,
    );
  }
  return result;
}

function cell(row: Record<string, string>, header: string | undefined): string {
  if (!header) return '';
  return row[header] ?? '';
}

function emptyToNull(value: string): string | null {
  const t = value.trim();
  return t ? t : null;
}

/** Accepts common clerk handheld / Excel date shapes. */
export function parseFlexibleDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  const iso = Date.parse(s);
  if (!Number.isNaN(iso) && /^\d{4}-\d{2}-\d{2}/.test(s)) {
    return new Date(iso).toISOString();
  }

  // M/D/YYYY or MM/DD/YY
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const year = normalizeYear(m[3]);
    const month = Number(m[1]);
    const day = Number(m[2]);
    return toIsoDate(year, month, day);
  }

  // D-Mon-YYYY (15-Jul-2026)
  m = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
  if (m) {
    const months: Record<string, number> = {
      jan: 1,
      feb: 2,
      mar: 3,
      apr: 4,
      may: 5,
      jun: 6,
      jul: 7,
      aug: 8,
      sep: 9,
      oct: 10,
      nov: 11,
      dec: 12,
    };
    const month = months[m[2].toLowerCase()];
    if (!month) return null;
    return toIsoDate(normalizeYear(m[3]), month, Number(m[1]));
  }

  const fallback = Date.parse(s);
  if (!Number.isNaN(fallback)) return new Date(fallback).toISOString();
  return null;
}

function normalizeYear(y: string): number {
  const n = Number(y);
  if (y.length <= 2) return n >= 70 ? 1900 + n : 2000 + n;
  return n;
}

function toIsoDate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
    return null;
  }
  return d.toISOString();
}
