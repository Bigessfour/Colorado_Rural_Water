/**
 * Forgiving CSV parse + column mapping for named source / well readings (ticket G2).
 * Tolerates period volume or cumulative columns (Spec §7a open decision).
 */

import {
  parseCsvText,
  parseFlexibleDate,
  type ParsedCsv,
} from './csv-parse.js';
import { isSourceType, type SourceType } from './water-source.js';
import type { SourceVolumeMode } from './source-reading.js';

export type SourceCanonicalField =
  | 'sourceName'
  | 'sourceId'
  | 'sourceType'
  | 'timestamp'
  | 'periodVolume'
  | 'cumulativeReading'
  | 'unit'
  | 'notes';

export type SourceColumnMapping = Partial<Record<SourceCanonicalField, string>>;

export interface MappedSourceReadingRow {
  sourceName: string;
  sourceId: string | null;
  sourceType: SourceType | null;
  timestamp: string;
  value: number;
  volumeMode: SourceVolumeMode;
  unit: string;
  notes: string | null;
  sourceLine: number;
}

export interface SourceIngestParseResult {
  mapping: SourceColumnMapping;
  mappingGuessed: boolean;
  rows: MappedSourceReadingRow[];
  errors: string[];
  warnings: string[];
}

const HEADER_ALIASES: Record<SourceCanonicalField, string[]> = {
  sourceName: [
    'source name',
    'source',
    'well name',
    'well',
    'name',
    'production source',
    'meter name',
  ],
  sourceId: ['source id', 'sourceid', 'well id', 'id'],
  sourceType: ['source type', 'type', 'well type'],
  timestamp: ['read date', 'reading date', 'date', 'timestamp', 'period end', 'end date'],
  periodVolume: [
    'period volume (gal)',
    'period volume',
    'period gal',
    'production',
    'produced',
    'volume',
    'gallons',
    'gal',
  ],
  cumulativeReading: [
    'cumulative',
    'cumulative reading',
    'reading (gal)',
    'reading',
    'meter reading',
  ],
  unit: ['unit', 'units', 'uom'],
  notes: ['notes', 'note', 'comment', 'comments'],
};

export function guessSourceColumnMapping(headers: string[]): SourceColumnMapping {
  const mapping: SourceColumnMapping = {};
  const normalized = headers.map((h) => ({ raw: h, key: normalizeHeader(h) }));
  const used = new Set<string>();

  for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [
    SourceCanonicalField,
    string[],
  ][]) {
    const hit = normalized.find((h) => !used.has(h.raw) && aliases.includes(h.key));
    if (hit) {
      mapping[field] = hit.raw;
      used.add(hit.raw);
    }
  }
  return mapping;
}

export function applySourceMapping(
  parsed: ParsedCsv,
  mapping: SourceColumnMapping,
  options?: { defaultUnit?: string },
): SourceIngestParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const rows: MappedSourceReadingRow[] = [];
  const defaultUnit = options?.defaultUnit ?? 'gal';

  if (!mapping.sourceName && !mapping.sourceId) {
    errors.push('We could not find a Source Name or Source ID column. Please map it.');
  }
  if (!mapping.timestamp) errors.push('We could not find a read date / timestamp column.');
  if (!mapping.periodVolume && !mapping.cumulativeReading) {
    errors.push('We could not find a period volume or cumulative reading column.');
  }

  if (errors.length) {
    return { mapping, mappingGuessed: false, rows, errors, warnings };
  }

  parsed.rows.forEach((raw, idx) => {
    const lineNo = idx + 2;
    const sourceName = cell(raw, mapping.sourceName);
    const sourceIdRaw = cell(raw, mapping.sourceId);
    const tsRaw = cell(raw, mapping.timestamp);
    const periodRaw = cell(raw, mapping.periodVolume);
    const cumRaw = cell(raw, mapping.cumulativeReading);

    if ((!sourceName && !sourceIdRaw) || !tsRaw || (!periodRaw && !cumRaw)) {
      warnings.push(`Row ${lineNo}: skipped — missing source, date, or volume.`);
      return;
    }

    let volumeMode: SourceVolumeMode = 'period';
    let valueRaw = periodRaw;
    if (periodRaw) {
      volumeMode = 'period';
      valueRaw = periodRaw;
    } else {
      volumeMode = 'cumulative';
      valueRaw = cumRaw;
    }

    const value = Number(String(valueRaw).replace(/,/g, ''));
    if (!Number.isFinite(value)) {
      warnings.push(`Row ${lineNo}: skipped — volume "${valueRaw}" is not a number.`);
      return;
    }

    const timestamp = parseFlexibleDate(tsRaw);
    if (!timestamp) {
      warnings.push(`Row ${lineNo}: skipped — could not understand date "${tsRaw}".`);
      return;
    }

    const typeRaw = cell(raw, mapping.sourceType).toLowerCase();
    const sourceType = isSourceType(typeRaw) ? typeRaw : null;
    if (typeRaw && !sourceType) {
      warnings.push(`Row ${lineNo}: unknown source type "${typeRaw}" — will use well if creating.`);
    }

    rows.push({
      sourceName: sourceName || sourceIdRaw,
      sourceId: sourceIdRaw || null,
      sourceType,
      timestamp,
      value,
      volumeMode,
      unit: emptyToNull(cell(raw, mapping.unit)) ?? defaultUnit,
      notes: emptyToNull(cell(raw, mapping.notes)),
      sourceLine: lineNo,
    });
  });

  if (!rows.length && !warnings.length) {
    errors.push('No readable source reading rows found in this file.');
  }

  return { mapping, mappingGuessed: false, rows, errors, warnings };
}

export function parseSourceReadingsCsv(
  text: string,
  mappingOverride?: SourceColumnMapping,
): SourceIngestParseResult {
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
  const guessed = guessSourceColumnMapping(parsed.headers);
  const mapping = { ...guessed, ...mappingOverride };
  const result = applySourceMapping(parsed, mapping);
  result.mappingGuessed = !mappingOverride || Object.keys(mappingOverride).length === 0;
  if (parsed.skippedCommentLines) {
    result.warnings.unshift(
      `Ignored ${parsed.skippedCommentLines} comment line(s) starting with #.`,
    );
  }
  return result;
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[_/]+/g, ' ').replace(/\s+/g, ' ');
}

function cell(row: Record<string, string>, header: string | undefined): string {
  if (!header) return '';
  return row[header] ?? '';
}

function emptyToNull(value: string): string | null {
  const t = value.trim();
  return t ? t : null;
}
