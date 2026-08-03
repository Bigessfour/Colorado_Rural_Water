/**
 * Meter location + reading stream shapes for the canonical store (ticket B5).
 *
 * Rule: a meter is tied to a service address that should not change.
 * Occupant / customer name may change (move-in/out, sale) without creating a new meter.
 * Optional asset/metadata fields support rural record-keeping + government reporting.
 */

/** Optional asset / inventory fields on LOC# (all nullable). */
export const METER_ASSET_FIELDS = [
  'manufacturer',
  'model',
  'serialNumber',
  'meterSize',
  'installDate',
  'meterType',
  'locationDetail',
  'radioId',
  'lastTestedAt',
  'notes',
] as const;

export type MeterAssetField = (typeof METER_ASSET_FIELDS)[number];

export interface MeterLocation {
  tenantId: string;
  meterId: string;
  /** Stable service location — primary operator-facing place identity with meterId. */
  serviceAddress: string;
  /** Current billed / occupying party — mutable. */
  occupantName: string | null;
  accountNumber: string | null;
  route: string | null;
  /** Meter manufacturer (optional asset metadata). */
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  meterSize: string | null;
  /** Preferred ISO date YYYY-MM-DD. */
  installDate: string | null;
  /** Free text: e.g. positive displacement, ultrasonic, compound. */
  meterType: string | null;
  /** Pit / basement / curb / etc. */
  locationDetail: string | null;
  /** Endpoint / radio / AMI id — inventory only, not streaming. */
  radioId: string | null;
  /** Optional certification / test date (YYYY-MM-DD preferred). */
  lastTestedAt: string | null;
  /** Operator free text. */
  notes: string | null;
  updatedAt: string;
}

export interface MeterReading {
  tenantId: string;
  meterId: string;
  /** Denormalized for alert/export visibility; must match MeterLocation.serviceAddress. */
  serviceAddress: string;
  /** Occupant at time of reading (snapshot); location.occupantName is current. */
  occupantName: string | null;
  timestamp: string;
  cumulativeReading: number;
  unit: string;
  diagnosticFlags: string[];
}

export type MeterAssetFields = Pick<MeterLocation, MeterAssetField>;

export interface MeterLocationUpsertInput {
  tenantId: string;
  meterId: string;
  serviceAddress: string;
  occupantName?: string | null;
  accountNumber?: string | null;
  route?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  meterSize?: string | null;
  installDate?: string | null;
  meterType?: string | null;
  locationDetail?: string | null;
  radioId?: string | null;
  lastTestedAt?: string | null;
  notes?: string | null;
  updatedAt?: string;
}

/** Partial metadata update for PUT /meters/{id} — does not relocate address. */
export type MeterMetadataPatch = Partial<
  Pick<
    MeterLocation,
    | 'occupantName'
    | 'accountNumber'
    | 'route'
    | MeterAssetField
  >
>;

function emptyAssetDefaults(): MeterAssetFields {
  return {
    manufacturer: null,
    model: null,
    serialNumber: null,
    meterSize: null,
    installDate: null,
    meterType: null,
    locationDetail: null,
    radioId: null,
    lastTestedAt: null,
    notes: null,
  };
}

/** True when value is a non-empty string (after trim). */
export function isNonEmptyAssetValue(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Ingest merge: only overwrite an optional asset field when the incoming value is non-empty.
 * Omitting a CSV column (undefined/null/blank) must not wipe a previously saved manufacturer, etc.
 */
export function mergeAssetField(
  existing: string | null,
  incoming: string | null | undefined,
): string | null {
  if (isNonEmptyAssetValue(incoming)) return incoming.trim();
  return existing;
}

/**
 * Operator PUT: apply only keys present on the body.
 * Explicit null or blank string clears the field.
 */
export function applyMeterMetadataPatch(
  existing: MeterLocation,
  patch: MeterMetadataPatch,
  updatedAt?: string,
): MeterLocation {
  const next: MeterLocation = { ...existing, updatedAt: updatedAt ?? new Date().toISOString() };

  const applyOptionalString = (key: keyof MeterMetadataPatch, value: unknown): void => {
    if (value === undefined) return;
    if (value === null) {
      (next as Record<string, unknown>)[key] = null;
      return;
    }
    if (typeof value !== 'string') return;
    const trimmed = value.trim();
    (next as Record<string, unknown>)[key] = trimmed.length ? trimmed : null;
  };

  applyOptionalString('occupantName', patch.occupantName);
  applyOptionalString('accountNumber', patch.accountNumber);
  applyOptionalString('route', patch.route);
  for (const field of METER_ASSET_FIELDS) {
    applyOptionalString(field, patch[field]);
  }

  return next;
}

/**
 * Parse a PUT /meters body into a metadata patch (ignores unknown keys / address relocate).
 */
export function parseMeterMetadataPatch(body: Record<string, unknown>): {
  ok: true;
  patch: MeterMetadataPatch;
} | { ok: false; error: string } {
  if (body.serviceAddress !== undefined || body.meterId !== undefined || body.tenantId !== undefined) {
    return {
      ok: false,
      error:
        'Cannot change serviceAddress, meterId, or tenantId via this endpoint (meters are not relocated here).',
    };
  }

  const allowed = new Set<string>([
    'occupantName',
    'accountNumber',
    'route',
    ...METER_ASSET_FIELDS,
  ]);
  const patch: MeterMetadataPatch = {};
  let any = false;

  for (const [key, value] of Object.entries(body)) {
    if (!allowed.has(key)) continue;
    if (value !== null && typeof value !== 'string') {
      return { ok: false, error: `Field ${key} must be a string or null` };
    }
    (patch as Record<string, string | null>)[key] = value as string | null;
    any = true;
  }

  if (!any) {
    return { ok: false, error: 'Body must include at least one metadata field to update' };
  }

  return { ok: true, patch };
}

/**
 * Merge an ingest row into an existing meter location.
 * - Address mismatch is a conflict (do not silently relocate the meter).
 * - Name / account / route updates are allowed in place.
 * - Optional asset fields only overwrite when the incoming value is non-empty.
 */
export function applyMeterLocationUpsert(
  existing: MeterLocation | null,
  input: MeterLocationUpsertInput,
): { location: MeterLocation; addressConflict: boolean } {
  const updatedAt = input.updatedAt ?? new Date().toISOString();
  const normalizedAddress = input.serviceAddress.trim();

  if (!existing) {
    return {
      addressConflict: false,
      location: {
        tenantId: input.tenantId,
        meterId: input.meterId,
        serviceAddress: normalizedAddress,
        occupantName: input.occupantName ?? null,
        accountNumber: input.accountNumber ?? null,
        route: input.route ?? null,
        manufacturer: isNonEmptyAssetValue(input.manufacturer) ? input.manufacturer.trim() : null,
        model: isNonEmptyAssetValue(input.model) ? input.model.trim() : null,
        serialNumber: isNonEmptyAssetValue(input.serialNumber) ? input.serialNumber.trim() : null,
        meterSize: isNonEmptyAssetValue(input.meterSize) ? input.meterSize.trim() : null,
        installDate: isNonEmptyAssetValue(input.installDate) ? input.installDate.trim() : null,
        meterType: isNonEmptyAssetValue(input.meterType) ? input.meterType.trim() : null,
        locationDetail: isNonEmptyAssetValue(input.locationDetail)
          ? input.locationDetail.trim()
          : null,
        radioId: isNonEmptyAssetValue(input.radioId) ? input.radioId.trim() : null,
        lastTestedAt: isNonEmptyAssetValue(input.lastTestedAt) ? input.lastTestedAt.trim() : null,
        notes: isNonEmptyAssetValue(input.notes) ? input.notes.trim() : null,
        updatedAt,
      },
    };
  }

  const addressConflict =
    normalizeAddressKey(existing.serviceAddress) !== normalizeAddressKey(normalizedAddress);

  // Keep the saved address on conflict, but still apply mutable attributes (name, account, route).
  return {
    addressConflict,
    location: {
      ...existing,
      serviceAddress: existing.serviceAddress,
      occupantName:
        input.occupantName !== undefined ? input.occupantName : existing.occupantName,
      accountNumber:
        input.accountNumber !== undefined ? input.accountNumber : existing.accountNumber,
      route: input.route !== undefined ? input.route : existing.route,
      manufacturer: mergeAssetField(existing.manufacturer, input.manufacturer),
      model: mergeAssetField(existing.model, input.model),
      serialNumber: mergeAssetField(existing.serialNumber, input.serialNumber),
      meterSize: mergeAssetField(existing.meterSize, input.meterSize),
      installDate: mergeAssetField(existing.installDate, input.installDate),
      meterType: mergeAssetField(existing.meterType, input.meterType),
      locationDetail: mergeAssetField(existing.locationDetail, input.locationDetail),
      radioId: mergeAssetField(existing.radioId, input.radioId),
      lastTestedAt: mergeAssetField(existing.lastTestedAt, input.lastTestedAt),
      notes: mergeAssetField(existing.notes, input.notes),
      updatedAt,
    },
  };
}

/** Loose normalize for comparing rural addresses without over-fitting. */
export function normalizeAddressKey(address: string): string {
  return address
    .trim()
    .toLowerCase()
    .replace(/[.,#]/g, ' ')
    .replace(/\s+/g, ' ');
}

/** Prefer YYYY-MM-DD for install/test dates when given a full ISO timestamp. */
export function toDateOnly(isoOrDate: string | null | undefined): string | null {
  if (!isNonEmptyAssetValue(isoOrDate)) return null;
  const m = isoOrDate.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : isoOrDate.trim();
}

export function locationAssetSnapshot(location: MeterLocation): MeterAssetFields {
  const out = emptyAssetDefaults();
  for (const field of METER_ASSET_FIELDS) {
    out[field] = location[field];
  }
  return out;
}
