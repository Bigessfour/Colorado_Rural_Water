/**
 * Forgiving CSV parse + column mapping for customer meter exports (tickets B3–B5).
 * Tolerates title rows, awkward headers, blank mid-rows, footers, mixed dates/units.
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
  /** 0-based index of the header row in the original matrix (when detected). */
  headerRowIndex: number;
  skippedNoiseRows: number;
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
  meterId: [
    'meter id',
    'meterid',
    'meter #',
    'meter number',
    'meter_no',
    'meter',
    'meter no',
  ],
  serviceAddress: [
    'service address',
    'address',
    'service addr',
    'location',
    'service location',
    'street address',
    'location address',
    'location / address',
  ],
  occupantName: [
    'customer',
    'customer name',
    'occupant',
    'name',
    'owner',
    'account name',
  ],
  accountNumber: [
    'account #',
    'account',
    'account number',
    'acct',
    'acct #',
    'account_no',
  ],
  timestamp: [
    'read date',
    'reading date',
    'date',
    'timestamp',
    'read_dt',
    'read dt',
    'reading datetime',
    'read_date',
  ],
  cumulativeReading: [
    'reading (gal)',
    'reading',
    'cumulative',
    'cumulative reading',
    'usage',
    'gallons',
    'read',
    'current reading',
    'reading gal',
    'reading_gal',
  ],
  unit: ['unit', 'units', 'uom'],
  route: ['route', 'route #', 'book', 'cycle'],
  diagnosticFlags: [
    'diag',
    'diagnostic',
    'diagnostics',
    'flags',
    'flag',
    'flag alarm',
    'flag / alarm',
    'alarm',
  ],
};

const ALL_ALIAS_KEYS = new Set(
  Object.values(HEADER_ALIASES).flatMap((aliases) => aliases.map((a) => normalizeHeader(a))),
);

const FOOTER_PATTERNS = [
  /end\s+of\s+report/i,
  /total\s+meters\s+on\s+route/i,
  /questions\?/i,
  /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/,
  /\bcall\s+office\b/i,
];

export function parseCsvText(text: string): ParsedCsv {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  let skippedCommentLines = 0;
  const matrix: string[][] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      matrix.push([]);
      continue;
    }
    if (trimmed.startsWith('#')) {
      skippedCommentLines += 1;
      continue;
    }
    matrix.push(splitCsvLine(line).map((c) => c.trim()));
  }

  const table = parseTableMatrix(matrix);
  return { ...table, skippedCommentLines: skippedCommentLines + table.skippedCommentLines };
}

/**
 * Detect header among first ~25 rows, skip blanks/footers, build records.
 */
export function parseTableMatrix(matrix: string[][]): ParsedCsv {
  const headerRowIndex = findHeaderRowIndex(matrix);
  if (headerRowIndex < 0) {
    return {
      headers: [],
      rows: [],
      skippedCommentLines: 0,
      headerRowIndex: -1,
      skippedNoiseRows: 0,
    };
  }

  const headers = (matrix[headerRowIndex] ?? []).map((h) => String(h ?? '').trim());
  const rows: Record<string, string>[] = [];
  let skippedNoiseRows = 0;

  for (let i = headerRowIndex + 1; i < matrix.length; i += 1) {
    const cells = (matrix[i] ?? []).map((c) => String(c ?? '').trim());
    if (cells.every((c) => !c)) {
      skippedNoiseRows += 1;
      continue;
    }
    if (isNoiseRow(cells)) {
      skippedNoiseRows += 1;
      continue;
    }
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      if (!header) return;
      row[header] = cells[idx] ?? '';
    });
    rows.push(row);
  }

  return {
    headers: headers.filter(Boolean),
    rows,
    skippedCommentLines: 0,
    headerRowIndex,
    skippedNoiseRows,
  };
}

/** Score first ~25 rows; pick the one that looks most like a column header. */
export function findHeaderRowIndex(matrix: string[][], scanLimit = 25): number {
  let bestIdx = -1;
  let bestScore = 0;
  const limit = Math.min(matrix.length, scanLimit);

  for (let i = 0; i < limit; i += 1) {
    const cells = (matrix[i] ?? []).map((c) => String(c ?? '').trim()).filter(Boolean);
    if (cells.length < 2) continue;
    if (isNoiseRow(cells)) continue;

    let score = 0;
    for (const cell of cells) {
      const key = normalizeHeader(cell);
      if (ALL_ALIAS_KEYS.has(key)) score += 3;
      else if (/meter|acct|account|read|date|address|location|customer|flag|unit|gal/i.test(cell)) {
        score += 1;
      }
    }
    // Prefer denser header-looking rows
    if (cells.length >= 4) score += 1;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  return bestScore >= 3 ? bestIdx : bestIdx >= 0 && bestScore >= 2 ? bestIdx : -1;
}

export function isNoiseRow(cells: string[]): boolean {
  const joined = cells.filter(Boolean).join(' ');
  if (!joined) return true;
  return FOOTER_PATTERNS.some((re) => re.test(joined));
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
    const aliasSet = new Set(aliases.map((a) => normalizeHeader(a)));
    const hit = normalized.find((h) => !used.has(h.raw) && aliasSet.has(h.key));
    if (hit) {
      mapping[field] = hit.raw;
      used.add(hit.raw);
    }
  }
  return mapping;
}

export function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[_/#]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function applyMapping(
  parsed: ParsedCsv,
  mapping: ColumnMapping,
  options?: { defaultUnit?: string; requireAddress?: boolean },
): IngestParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const rows: MappedReadingRow[] = [];
  const defaultUnit = options?.defaultUnit ?? 'gal';
  const requireAddress = options?.requireAddress !== false;

  if (!mapping.meterId) {
    errors.push('We could not find a Meter ID column (looked for Meter #, Meter ID, etc.). Please map it.');
  }
  if (!mapping.serviceAddress) {
    if (requireAddress) {
      warnings.push(
        'No Service Address column found. Rows without an address will be skipped unless you map one. Archive sheets can still attach readings to meters already on file when you merge.',
      );
    } else {
      warnings.push(
        'No address column on this sheet — readings will keep each meter’s saved address when one exists.',
      );
    }
  }
  if (!mapping.timestamp) {
    errors.push('We could not find a read date / timestamp column (Read Dt, Read Date, etc.).');
  }
  if (!mapping.cumulativeReading) {
    errors.push('We could not find a meter reading column (Current Reading, Reading, etc.).');
  }

  if (errors.length) {
    return { mapping, mappingGuessed: false, rows, errors, warnings };
  }

  const lineBase = parsed.headerRowIndex >= 0 ? parsed.headerRowIndex + 2 : 2;

  parsed.rows.forEach((raw, idx) => {
    const lineNo = lineBase + idx;
    const meterId = cell(raw, mapping.meterId);
    const serviceAddress = cell(raw, mapping.serviceAddress);
    const readingRaw = cell(raw, mapping.cumulativeReading);
    const tsRaw = cell(raw, mapping.timestamp);

    if (!meterId) {
      warnings.push(
        `Row ${lineNo}: skipped — this row has no Meter ID (blank Meter #). Other rows still import.`,
      );
      return;
    }

    if (!readingRaw || !tsRaw) {
      warnings.push(
        `Row ${lineNo}: skipped — meter ${meterId} is incomplete (missing reading or date).`,
      );
      return;
    }

    if (requireAddress && mapping.serviceAddress && !serviceAddress) {
      warnings.push(
        `Row ${lineNo}: skipped — meter ${meterId} has no service address. Address stays with the meter.`,
      );
      return;
    }

    const cumulativeReading = parseReadingNumber(readingRaw);
    if (cumulativeReading === null) {
      warnings.push(
        `Row ${lineNo}: skipped — reading "${readingRaw}" for meter ${meterId} is not a number.`,
      );
      return;
    }

    const timestamp = parseFlexibleDate(tsRaw);
    if (!timestamp) {
      warnings.push(
        `Row ${lineNo}: skipped — could not understand date "${tsRaw}" for meter ${meterId}.`,
      );
      return;
    }

    const unitRaw = emptyToNull(cell(raw, mapping.unit));
    const { unit, warning: unitWarning } = normalizeUnit(unitRaw, defaultUnit);
    if (unitWarning) {
      warnings.push(`Row ${lineNo} (meter ${meterId}): ${unitWarning}`);
    }

    const diagRaw = cell(raw, mapping.diagnosticFlags);
    rows.push({
      meterId,
      serviceAddress: serviceAddress || '',
      occupantName: emptyToNull(cell(raw, mapping.occupantName)),
      accountNumber: emptyToNull(cell(raw, mapping.accountNumber)),
      timestamp,
      cumulativeReading,
      unit,
      route: emptyToNull(cell(raw, mapping.route)),
      diagnosticFlags: parseDiagnosticFlags(diagRaw),
      sourceLine: lineNo,
    });
  });

  if (!rows.length && !warnings.length) {
    errors.push('No readable meter rows found in this file.');
  } else if (!rows.length) {
    errors.push(
      'No readable meter rows made it through. Check the warnings — often a missing Meter ID column or only footer/title rows.',
    );
  }

  return { mapping, mappingGuessed: false, rows, errors, warnings };
}

export function parseCustomerReadingsCsv(
  text: string,
  mappingOverride?: ColumnMapping,
  options?: { requireAddress?: boolean },
): IngestParseResult {
  const parsed = parseCsvText(text);
  if (!parsed.headers.length) {
    return {
      mapping: {},
      mappingGuessed: false,
      rows: [],
      errors: [
        'This file looks empty, or we could not find a header row (Meter #, Read Dt, etc.) in the first rows.',
      ],
      warnings: [],
    };
  }
  const guessed = guessColumnMapping(parsed.headers);
  const mapping = { ...guessed, ...mappingOverride };
  // Address required on rows only when an address column is mapped (archive sheets often omit it).
  const requireAddress =
    options?.requireAddress ?? Boolean(mapping.serviceAddress);
  const result = applyMapping(parsed, mapping, { requireAddress });
  result.mappingGuessed = !mappingOverride || Object.keys(mappingOverride).length === 0;
  if (parsed.skippedCommentLines) {
    result.warnings.unshift(
      `Ignored ${parsed.skippedCommentLines} comment line(s) starting with #.`,
    );
  }
  if (parsed.skippedNoiseRows) {
    result.warnings.unshift(
      `Skipped ${parsed.skippedNoiseRows} blank or footer row(s) (END OF REPORT, phone numbers, etc.).`,
    );
  }
  if (parsed.headerRowIndex > 0) {
    result.warnings.unshift(
      `Found the header on row ${parsed.headerRowIndex + 1} (title rows above it were ignored).`,
    );
  }
  return result;
}

/** Parse numbers that may include thousands commas or quotes. */
export function parseReadingNumber(raw: string): number | null {
  const cleaned = String(raw).replace(/[",\s]/g, '').trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function normalizeUnit(
  raw: string | null,
  defaultUnit = 'gal',
): { unit: string; warning?: string } {
  if (!raw) return { unit: defaultUnit };
  const key = raw.trim().toLowerCase();
  if (!key) return { unit: defaultUnit };
  if (/^(gal|gallon|gallons|gals)$/.test(key)) return { unit: 'gal' };
  if (/^(cf|cu\s*ft|cu\.?\s*ft\.?|cubic\s*feet|cuf)$/.test(key)) {
    return {
      unit: 'cf',
      warning: `unit is CF (cubic feet), not gallons — we kept it as cf so you can fix or convert later.`,
    };
  }
  return { unit: key };
}

export function parseDiagnosticFlags(raw: string): string[] {
  if (!raw?.trim()) return [];
  // Prefer | ; , as separators; keep multi-word phrases when only spaces.
  if (/[|;,]/.test(raw)) {
    return raw
      .split(/[|;,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  const t = raw.trim();
  // Single token or short phrase — keep whole (e.g. "Leak indicator", "Low battery", "Stuck?")
  return [t];
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
export function parseFlexibleDate(raw: string | number): string | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return excelSerialToIso(raw);
  }

  const s = String(raw).trim();
  if (!s) return null;

  // Excel serial as string
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    const n = Number(s);
    if (n > 20000 && n < 80000) return excelSerialToIso(n);
  }

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

  // Month DD, YYYY (July 15, 2026)
  m = s.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{2,4})$/);
  if (m) {
    const months: Record<string, number> = {
      january: 1,
      february: 2,
      march: 3,
      april: 4,
      may: 5,
      june: 6,
      july: 7,
      august: 8,
      september: 9,
      october: 10,
      november: 11,
      december: 12,
      jan: 1,
      feb: 2,
      mar: 3,
      apr: 4,
      jun: 6,
      jul: 7,
      aug: 8,
      sep: 9,
      oct: 10,
      nov: 11,
      dec: 12,
    };
    const month = months[m[1].toLowerCase()];
    if (!month) return null;
    return toIsoDate(normalizeYear(m[3]), month, Number(m[2]));
  }

  const fallback = Date.parse(s);
  if (!Number.isNaN(fallback)) return new Date(fallback).toISOString();
  return null;
}

function excelSerialToIso(serial: number): string | null {
  // Excel epoch 1899-12-30 (SheetJS / Excel 1900 system)
  const utc = Date.UTC(1899, 11, 30) + Math.round(serial * 86400000);
  const d = new Date(utc);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
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
