import type { AssignableTenantRole } from './auth.js';
import type { BillingEvent, BillingFields } from './billing.js';

export interface TenantProfile extends BillingFields {
  tenantId: string;
  displayName: string;
  createdAt: string;
  createdByUserId: string;
  createdByEmail: string;
  initialUserEmail: string;
  /** Town/municipality label used for map centering (e.g. "Town of Wiley, CO"). */
  mapTown?: string | null;
  /** Optional WGS84 map default when the tenant has few/no meter pins. */
  mapCenterLat?: number | null;
  mapCenterLng?: number | null;
  /** Leaflet zoom when using mapCenter* (default 12). */
  mapZoom?: number | null;
}

export interface TenantUserRecord {
  tenantId: string;
  email: string;
  role: AssignableTenantRole;
  createdAt: string;
  createdByUserId: string;
  createdByEmail: string;
}

export interface TenantStore {
  getTenantProfile(tenantId: string): Promise<TenantProfile | null>;
  putTenantProfile(profile: TenantProfile): Promise<void>;
  /** Overwrite META#profile + registry mirror (billing updates). */
  updateTenantProfile(profile: TenantProfile): Promise<void>;
  listTenantProfiles(): Promise<TenantProfile[]>;
  listTenantUsers(tenantId: string): Promise<TenantUserRecord[]>;
  putTenantUser(user: TenantUserRecord): Promise<void>;
  getTenantUser(tenantId: string, email: string): Promise<TenantUserRecord | null>;
  putBillingEvent(event: BillingEvent): Promise<void>;
  listBillingEvents(tenantId: string, limit?: number): Promise<BillingEvent[]>;
}

const TENANT_ID_RE = /^[a-z0-9][a-z0-9-]{1,62}$/;

/** Slug id for municipalities — never trust client for auth; only for new provision. */
export function normalizeTenantId(raw: unknown): { ok: true; tenantId: string } | { ok: false; error: string } {
  if (typeof raw !== 'string' || !raw.trim()) {
    return { ok: false, error: 'tenantId is required' };
  }
  const tenantId = raw.trim().toLowerCase();
  if (tenantId.startsWith('_')) {
    return { ok: false, error: 'tenantId cannot start with underscore (reserved)' };
  }
  if (!TENANT_ID_RE.test(tenantId)) {
    return {
      ok: false,
      error: 'tenantId must be 2–63 chars: lowercase letters, digits, hyphens',
    };
  }
  return { ok: true, tenantId };
}

export function normalizeDisplayName(raw: unknown): { ok: true; displayName: string } | { ok: false; error: string } {
  if (typeof raw !== 'string' || !raw.trim()) {
    return { ok: false, error: 'displayName is required' };
  }
  const displayName = raw.trim().slice(0, 120);
  return { ok: true, displayName };
}

export function normalizeEmail(raw: unknown): { ok: true; email: string } | { ok: false; error: string } {
  if (typeof raw !== 'string' || !raw.trim()) {
    return { ok: false, error: 'email is required' };
  }
  const email = raw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 128) {
    return { ok: false, error: 'email looks invalid' };
  }
  return { ok: true, email };
}

/** Optional contact email — empty clears. */
export function normalizeOptionalEmail(
  raw: unknown,
): { ok: true; email: string | undefined } | { ok: false; error: string } {
  if (raw === undefined || raw === null || raw === '') {
    return { ok: true, email: undefined };
  }
  return normalizeEmail(raw);
}

export function normalizeOptionalIsoDate(
  raw: unknown,
): { ok: true; iso: string | undefined } | { ok: false; error: string } {
  if (raw === undefined || raw === null || raw === '') {
    return { ok: true, iso: undefined };
  }
  if (typeof raw !== 'string') {
    return { ok: false, error: 'date must be an ISO-8601 string' };
  }
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) {
    return { ok: false, error: 'date must be a valid ISO-8601 timestamp' };
  }
  return { ok: true, iso: new Date(ms).toISOString() };
}

export function normalizeMeterCountEstimate(
  raw: unknown,
): { ok: true; value: number | undefined } | { ok: false; error: string } {
  if (raw === undefined || raw === null || raw === '') {
    return { ok: true, value: undefined };
  }
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000) {
    return { ok: false, error: 'meterCountEstimate must be a number between 0 and 1000000' };
  }
  return { ok: true, value: Math.floor(n) };
}

/**
 * Optional map centering for a municipality (Feature 011 follow-on).
 * - mapTown defaults to displayName when omitted
 * - lat/lng both required together; zoom optional (default 12 when coords set)
 */
export function normalizeMapCenterFields(
  body: Record<string, unknown>,
  displayName: string,
):
  | {
      ok: true;
      mapTown: string | null;
      mapCenterLat: number | null;
      mapCenterLng: number | null;
      mapZoom: number | null;
    }
  | { ok: false; error: string } {
  const townRaw = body.mapTown;
  let mapTown: string | null =
    typeof townRaw === 'string' && townRaw.trim()
      ? townRaw.trim().slice(0, 160)
      : displayName.trim().slice(0, 160) || null;

  const hasLat = 'mapCenterLat' in body && body.mapCenterLat !== undefined && body.mapCenterLat !== '';
  const hasLng = 'mapCenterLng' in body && body.mapCenterLng !== undefined && body.mapCenterLng !== '';
  if (hasLat !== hasLng) {
    return {
      ok: false,
      error: 'mapCenterLat and mapCenterLng must be set together (or both omitted)',
    };
  }

  if (!hasLat && !hasLng) {
    return { ok: true, mapTown, mapCenterLat: null, mapCenterLng: null, mapZoom: null };
  }

  const lat = Number(body.mapCenterLat);
  const lng = Number(body.mapCenterLng);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return { ok: false, error: 'mapCenterLat must be a number between -90 and 90' };
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    return { ok: false, error: 'mapCenterLng must be a number between -180 and 180' };
  }

  let mapZoom: number | null = 12;
  if (body.mapZoom !== undefined && body.mapZoom !== null && body.mapZoom !== '') {
    const z = Number(body.mapZoom);
    if (!Number.isFinite(z) || z < 1 || z > 19) {
      return { ok: false, error: 'mapZoom must be between 1 and 19' };
    }
    mapZoom = Math.round(z);
  }

  return {
    ok: true,
    mapTown,
    mapCenterLat: lat,
    mapCenterLng: lng,
    mapZoom,
  };
}

/** Cognito-safe temporary password (meets pool policy). Not logged. */
export function generateTemporaryPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%^&*';
  const all = upper + lower + digits + symbols;
  const pick = (set: string) => set[Math.floor(Math.random() * set.length)]!;
  const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  for (let i = 0; i < 12; i++) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join('');
}
