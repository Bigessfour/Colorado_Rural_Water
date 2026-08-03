/**
 * Meter location + reading stream shapes for the canonical store (ticket B5).
 *
 * Rule: a meter is tied to a service address that should not change.
 * Occupant / customer name may change (move-in/out, sale) without creating a new meter.
 */

export interface MeterLocation {
  tenantId: string;
  meterId: string;
  /** Stable service location — primary operator-facing place identity with meterId. */
  serviceAddress: string;
  /** Current billed / occupying party — mutable. */
  occupantName: string | null;
  accountNumber: string | null;
  route: string | null;
  meterSize: string | null;
  installDate: string | null;
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

export interface MeterLocationUpsertInput {
  tenantId: string;
  meterId: string;
  serviceAddress: string;
  occupantName?: string | null;
  accountNumber?: string | null;
  route?: string | null;
  meterSize?: string | null;
  installDate?: string | null;
  updatedAt?: string;
}

/**
 * Merge an ingest row into an existing meter location.
 * - Address mismatch is a conflict (do not silently relocate the meter).
 * - Name / account / route updates are allowed in place.
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
        meterSize: input.meterSize ?? null,
        installDate: input.installDate ?? null,
        updatedAt,
      },
    };
  }

  const addressConflict =
    normalizeAddressKey(existing.serviceAddress) !== normalizeAddressKey(normalizedAddress);

  if (addressConflict) {
    return { location: existing, addressConflict: true };
  }

  return {
    addressConflict: false,
    location: {
      ...existing,
      occupantName:
        input.occupantName !== undefined ? input.occupantName : existing.occupantName,
      accountNumber:
        input.accountNumber !== undefined ? input.accountNumber : existing.accountNumber,
      route: input.route !== undefined ? input.route : existing.route,
      meterSize: input.meterSize !== undefined ? input.meterSize : existing.meterSize,
      installDate: input.installDate !== undefined ? input.installDate : existing.installDate,
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
