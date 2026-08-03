/** Source / well production readings — Spec §7a / ticket G2. */

import { parseFlexibleDate } from './csv-parse.js';

export type SourceVolumeMode = 'period' | 'cumulative';

export interface SourceReading {
  tenantId: string;
  sourceId: string;
  /** Denormalized display name for operator visibility. */
  sourceName: string;
  timestamp: string;
  /** Always the value as submitted (period volume or cumulative). */
  value: number;
  volumeMode: SourceVolumeMode;
  unit: string;
  notes: string | null;
}

export interface SourceReadingInput {
  sourceId?: unknown;
  sourceName?: unknown;
  timestamp?: unknown;
  periodVolume?: unknown;
  cumulativeReading?: unknown;
  value?: unknown;
  volumeMode?: unknown;
  unit?: unknown;
  notes?: unknown;
}

export function normalizeSourceReadingInput(
  tenantId: string,
  raw: SourceReadingInput,
  resolved: { sourceId: string; sourceName: string },
): { ok: true; reading: SourceReading } | { ok: false; error: string } {
  const tsRaw =
    typeof raw.timestamp === 'string'
      ? raw.timestamp.trim()
      : typeof raw.timestamp === 'number'
        ? String(raw.timestamp)
        : '';
  if (!tsRaw) return { ok: false, error: 'timestamp is required' };

  const timestamp = /^\d{4}-\d{2}-\d{2}T/.test(tsRaw)
    ? new Date(tsRaw).toISOString()
    : parseFlexibleDate(tsRaw);
  if (!timestamp) return { ok: false, error: `Could not understand timestamp "${tsRaw}"` };

  let volumeMode: SourceVolumeMode = 'period';
  let value: number | null = null;

  if (raw.periodVolume !== undefined && raw.periodVolume !== null && raw.periodVolume !== '') {
    volumeMode = 'period';
    value = toNumber(raw.periodVolume);
  } else if (
    raw.cumulativeReading !== undefined &&
    raw.cumulativeReading !== null &&
    raw.cumulativeReading !== ''
  ) {
    volumeMode = 'cumulative';
    value = toNumber(raw.cumulativeReading);
  } else if (raw.value !== undefined && raw.value !== null && raw.value !== '') {
    volumeMode = raw.volumeMode === 'cumulative' ? 'cumulative' : 'period';
    value = toNumber(raw.value);
  }

  if (value === null || !Number.isFinite(value)) {
    return { ok: false, error: 'periodVolume or cumulativeReading is required and must be a number' };
  }
  if (value < 0) return { ok: false, error: 'volume cannot be negative' };

  const unit =
    typeof raw.unit === 'string' && raw.unit.trim() ? raw.unit.trim().slice(0, 16) : 'gal';
  const notes =
    typeof raw.notes === 'string' && raw.notes.trim() ? raw.notes.trim().slice(0, 500) : null;

  return {
    ok: true,
    reading: {
      tenantId,
      sourceId: resolved.sourceId,
      sourceName: resolved.sourceName,
      timestamp,
      value,
      volumeMode,
      unit,
      notes,
    },
  };
}

function toNumber(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const n = Number(raw.replace(/,/g, '').trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
