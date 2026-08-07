/** Named production / source meters (wells, springs, etc.) — Spec §7a / ticket G1. */

import { parseOptionalCoordinates } from './meter-location.js';

export const SOURCE_TYPES = ['well', 'spring', 'purchase', 'other'] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export interface WaterSource {
  tenantId: string;
  sourceId: string;
  name: string;
  type: SourceType;
  unit: string;
  notes: string | null;
  /** Optional place / road label for geocoding map pins. */
  locationLabel: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface WaterSourceInput {
  name?: unknown;
  type?: unknown;
  unit?: unknown;
  notes?: unknown;
  sourceId?: unknown;
  locationLabel?: unknown;
  latitude?: unknown;
  longitude?: unknown;
}

export function isSourceType(value: unknown): value is SourceType {
  return typeof value === 'string' && (SOURCE_TYPES as readonly string[]).includes(value);
}

/** Stable id from display name; appends short suffix when collision risk matters. */
export function slugifySourceId(name: string, suffix?: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  const core = base || 'source';
  return suffix ? `${core}-${suffix}` : core;
}

export function normalizeWaterSourceInput(
  tenantId: string,
  raw: WaterSourceInput,
  existing?: WaterSource,
): { ok: true; source: WaterSource } | { ok: false; error: string } {
  const name = typeof raw.name === 'string' ? raw.name.trim() : existing?.name ?? '';
  if (!name) return { ok: false, error: 'name is required' };
  if (name.length > 120) return { ok: false, error: 'name must be 120 characters or fewer' };

  const typeRaw = raw.type ?? existing?.type;
  if (!isSourceType(typeRaw)) {
    return { ok: false, error: `type must be one of: ${SOURCE_TYPES.join(', ')}` };
  }

  const unitRaw = raw.unit ?? existing?.unit ?? 'gal';
  const unit = typeof unitRaw === 'string' && unitRaw.trim() ? unitRaw.trim().toLowerCase() : 'gal';
  if (unit.length > 16) return { ok: false, error: 'unit must be 16 characters or fewer' };

  let notes: string | null = existing?.notes ?? null;
  if (raw.notes !== undefined) {
    if (raw.notes === null || raw.notes === '') notes = null;
    else if (typeof raw.notes === 'string') notes = raw.notes.trim().slice(0, 500) || null;
    else return { ok: false, error: 'notes must be a string' };
  }

  let locationLabel: string | null = existing?.locationLabel ?? null;
  if (raw.locationLabel !== undefined) {
    if (raw.locationLabel === null || raw.locationLabel === '') locationLabel = null;
    else if (typeof raw.locationLabel === 'string') {
      locationLabel = raw.locationLabel.trim().slice(0, 200) || null;
    } else {
      return { ok: false, error: 'locationLabel must be a string' };
    }
  }

  const coords = parseOptionalCoordinates(raw as Record<string, unknown>);
  if (!coords.ok) return coords;

  let latitude: number | null = existing?.latitude ?? null;
  let longitude: number | null = existing?.longitude ?? null;
  if (coords.latitude !== undefined) latitude = coords.latitude;
  if (coords.longitude !== undefined) longitude = coords.longitude;

  const now = new Date().toISOString();
  const sourceId =
    existing?.sourceId ??
    (typeof raw.sourceId === 'string' && raw.sourceId.trim()
      ? raw.sourceId.trim().slice(0, 64)
      : slugifySourceId(name, now.slice(11, 19).replace(/:/g, '')));

  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(sourceId)) {
    return { ok: false, error: 'sourceId must be alphanumeric (dashes/underscores ok)' };
  }

  return {
    ok: true,
    source: {
      tenantId,
      sourceId,
      name,
      type: typeRaw,
      unit,
      notes,
      locationLabel,
      latitude,
      longitude,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    },
  };
}
