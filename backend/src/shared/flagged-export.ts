/**
 * CSV export of flagged (meter) alerts — ticket C4.
 * Always includes confidenceNote so Watch rows carry the thin-history caveat.
 */

export interface FlaggedMeterExportRow {
  meterId: string;
  serviceAddress?: string | null;
  occupantName?: string | null;
  mode: 'Watch' | 'Actionable' | string;
  type?: string | null;
  summary: string;
  confidenceNote: string;
  status?: string | null;
}

const CSV_HEADERS = [
  'meterId',
  'serviceAddress',
  'occupantName',
  'mode',
  'type',
  'summary',
  'confidenceNote',
  'status',
] as const;

/** Escape a CSV cell (RFC 4180-ish). */
export function csvCell(value: string | null | undefined): string {
  const s = value ?? '';
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Build a CSV string for flagged meter alerts.
 * Confidence note is always present (required for Watch rows per C4).
 */
export function buildFlaggedMetersCsv(rows: FlaggedMeterExportRow[]): string {
  const lines = [CSV_HEADERS.join(',')];
  for (const row of rows) {
    lines.push(
      [
        csvCell(row.meterId),
        csvCell(row.serviceAddress),
        csvCell(row.occupantName),
        csvCell(row.mode),
        csvCell(row.type),
        csvCell(row.summary),
        csvCell(row.confidenceNote),
        csvCell(row.status ?? 'open'),
      ].join(','),
    );
  }
  return `${lines.join('\n')}\n`;
}

/** Sanitize meterId for path / Dynamo SK fragments. */
export function sanitizeMeterId(meterId: string): string {
  const trimmed = meterId.trim();
  if (!trimmed || trimmed.length > 64) {
    throw new Error('meterId must be 1–64 characters');
  }
  if (/[\u0000-\u001f\\/#?]/.test(trimmed)) {
    throw new Error('meterId contains invalid characters');
  }
  return trimmed;
}
