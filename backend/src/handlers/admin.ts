import { randomUUID } from 'node:crypto';
import type { AuthedHandler } from '../shared/apigw.js';
import {
  isAssignableTenantRole,
  parseAuthFromClaims,
  requireAnyRole,
  requireTenantId,
  type AssignableTenantRole,
  type AuthContext,
} from '../shared/auth.js';
import {
  crwaBillingView,
  defaultBillingFields,
  isBillingStatus,
  isPaymentMethod,
  isPlanCode,
  publicBillingView,
  type BillingEvent,
  type BillingEventType,
  type BillingFields,
  type PaymentMethod,
  type PlanCode,
} from '../shared/billing.js';
import { createCognitoAdminFromEnv, type CognitoAdminClient } from '../shared/cognito-admin.js';
import { buildCrwaRollupRow, sanitizeRollupForResponse } from '../shared/crwa-rollup.js';
import {
  createMeterStoreFromEnv,
  createSourceStoreFromEnv,
  createTenantStoreFromEnv,
} from '../shared/dynamo-store.js';
import { badRequest, forbidden, json, ok, unauthorized } from '../shared/http.js';
import {
  generateTemporaryPassword,
  normalizeDisplayName,
  normalizeEmail,
  normalizeMapCenterFields,
  normalizeMeterCountEstimate,
  normalizeOptionalEmail,
  normalizeOptionalIsoDate,
  normalizeTenantId,
  type TenantProfile,
  type TenantStore,
} from '../shared/tenant-admin.js';

/**
 * Admin APIs (Pilot D1–D3 + Epic I0–I2 + D4 roll-up):
 *   POST /admin/tenants — CRWA Admin provisions municipality + initial user (+ billing)
 *   GET  /admin/tenants — CRWA Admin lists municipalities (incl. billing status)
 *   GET  /admin/rollup — CRWA sanitized roll-up (balance % + Confidence; no PII)
 *   GET  /admin/tenants/{tenantId}/billing — CRWA billing profile + ledger
 *   POST /admin/tenants/{tenantId}/billing/{action} — record-payment | extend-pilot |
 *        mark-past-due | suspend | reactivate
 *   POST /admin/users/invite — System Admin invites within own tenant
 *   GET  /admin/users — System Admin lists users in own tenant
 *   GET  /billing — System Admin read-only membership billing for JWT tenant
 *
 * Tenant for invite/list-users/billing-read always from JWT — never from client body.
 * Path tenantId for CRWA billing actions is validated as a slug only; auth is crwa_admin role.
 */
export const handler: AuthedHandler = async (event) => {
  const claims = event.requestContext.authorizer?.jwt?.claims;
  if (!claims || typeof claims !== 'object') {
    return unauthorized();
  }

  const auth = parseAuthFromClaims(claims as Record<string, unknown>);
  const method = event.requestContext.http.method;
  const path = event.rawPath ?? event.requestContext.http.path ?? '';

  try {
    const store = createTenantStoreFromEnv();
    const cognito = createCognitoAdminFromEnv();

    if (method === 'GET' && (path === '/billing' || path.endsWith('/billing')) && !path.includes('/admin/')) {
      return getMunicipalityBilling(auth, store);
    }

    if (method === 'GET' && (path === '/admin/rollup' || path.endsWith('/admin/rollup'))) {
      return getCrwaRollup(auth, store);
    }

    const adminBillingMatch = path.match(
      /^\/admin\/tenants\/([^/]+)\/billing(?:\/([^/]+))?$/,
    );
    if (adminBillingMatch) {
      const pathTenant = normalizeTenantId(decodeURIComponent(adminBillingMatch[1] ?? ''));
      if (!pathTenant.ok) return badRequest(pathTenant.error);
      const action = adminBillingMatch[2];
      if (method === 'GET' && !action) {
        return getCrwaTenantBilling(auth, pathTenant.tenantId, store);
      }
      if (method === 'POST' && action) {
        return applyBillingAction(auth, pathTenant.tenantId, action, event.body, store);
      }
      return badRequest(`Unsupported ${method} ${path}`);
    }

    if (method === 'POST' && path.endsWith('/admin/tenants')) {
      return provisionTenant(auth, event.body, store, cognito);
    }
    if (method === 'GET' && path.endsWith('/admin/tenants')) {
      return listTenants(auth, store);
    }
    if (method === 'POST' && path.endsWith('/admin/users/invite')) {
      return inviteUser(auth, event.body, store, cognito);
    }
    if (method === 'GET' && path.endsWith('/admin/users')) {
      return listUsers(auth, store);
    }

    return badRequest(`Unsupported ${method} ${path}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Admin request failed';
    if (/Requires one of|Forbidden|Missing tenant/i.test(message)) {
      return forbidden(message);
    }
    if (/ConditionalCheckFailed|already exists/i.test(message)) {
      return badRequest(message);
    }
    return badRequest(message);
  }
};

async function provisionTenant(
  auth: AuthContext,
  bodyRaw: string | undefined,
  store: TenantStore,
  cognito: CognitoAdminClient,
) {
  try {
    requireAnyRole(auth, ['crwa_admin']);
  } catch (err) {
    return forbidden(err instanceof Error ? err.message : 'Forbidden');
  }

  if (!bodyRaw) return badRequest('JSON body is required');
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(bodyRaw) as Record<string, unknown>;
  } catch {
    return badRequest('JSON body is required');
  }

  const id = normalizeTenantId(body.tenantId);
  if (!id.ok) return badRequest(id.error);
  const name = normalizeDisplayName(body.displayName);
  if (!name.ok) return badRequest(name.error);
  const email = normalizeEmail(body.initialUserEmail);
  if (!email.ok) return badRequest(email.error);

  let role: AssignableTenantRole = 'system_admin';
  if (body.initialUserRole !== undefined) {
    if (!isAssignableTenantRole(body.initialUserRole)) {
      return badRequest('initialUserRole must be operator or system_admin');
    }
    role = body.initialUserRole;
  }

  const billingParsed = parseProvisionBilling(body);
  if (!billingParsed.ok) return badRequest(billingParsed.error);

  const mapParsed = normalizeMapCenterFields(body, name.displayName);
  if (!mapParsed.ok) return badRequest(mapParsed.error);

  const existing = await store.getTenantProfile(id.tenantId);
  if (existing) {
    return badRequest(`Tenant ${id.tenantId} already exists`);
  }

  const now = new Date().toISOString();
  const temporaryPassword = generateTemporaryPassword();

  try {
    await cognito.createMunicipalUser({
      email: email.email,
      tenantId: id.tenantId,
      role,
      temporaryPassword,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Cognito create failed';
    if (/UsernameExistsException|already exists/i.test(msg)) {
      return badRequest(`User ${email.email} already exists in Cognito`);
    }
    throw err;
  }

  const profile: TenantProfile = {
    tenantId: id.tenantId,
    displayName: name.displayName,
    createdAt: now,
    createdByUserId: auth.userId,
    createdByEmail: auth.email,
    initialUserEmail: email.email,
    mapTown: mapParsed.mapTown,
    mapCenterLat: mapParsed.mapCenterLat,
    mapCenterLng: mapParsed.mapCenterLng,
    mapZoom: mapParsed.mapZoom,
    ...billingParsed.fields,
  };

  try {
    await store.putTenantProfile(profile);
    await store.putTenantUser({
      tenantId: id.tenantId,
      email: email.email,
      role,
      createdAt: now,
      createdByUserId: auth.userId,
      createdByEmail: auth.email,
    });
    await store.putBillingEvent({
      tenantId: id.tenantId,
      eventId: randomUUID(),
      createdAt: now,
      eventType: 'provision',
      source: 'admin_manual',
      billingStatusAfter: profile.billingStatus,
      actorUserId: auth.userId,
      actorEmail: auth.email,
      note: `Provisioned as ${profile.billingStatus} / ${profile.planCode}`,
      pilotExpiresAt: profile.pilotExpiresAt,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Dynamo write failed';
    if (/ConditionalCheckFailed/i.test(msg)) {
      return badRequest(`Tenant ${id.tenantId} already exists`);
    }
    throw err;
  }

  return json(201, {
    tenant: sanitizeCrwaTenant(profile),
    initialUser: {
      email: email.email,
      role,
      temporaryPassword,
      note: 'Share this temporary password out-of-band. User must change it on first sign-in.',
    },
  });
}

async function getCrwaRollup(auth: AuthContext, store: TenantStore) {
  try {
    requireAnyRole(auth, ['crwa_admin']);
  } catch (err) {
    return forbidden(err instanceof Error ? err.message : 'Forbidden');
  }

  const profiles = await store.listTenantProfiles();
  const meterStore = createMeterStoreFromEnv();
  const sourceStore = createSourceStoreFromEnv();

  const rows = [];
  for (const profile of profiles) {
    const [locations, readings, sourceReadings] = await Promise.all([
      meterStore.listLocations(profile.tenantId),
      meterStore.listReadings(profile.tenantId),
      sourceStore.listSourceReadings(profile.tenantId),
    ]);
    rows.push(buildCrwaRollupRow(profile, locations, readings, sourceReadings));
  }

  return ok({
    generatedAt: new Date().toISOString(),
    sanitized: true,
    noCustomerPii: true,
    systems: sanitizeRollupForResponse(rows),
  });
}

async function listTenants(auth: AuthContext, store: TenantStore) {
  try {
    requireAnyRole(auth, ['crwa_admin']);
  } catch (err) {
    return forbidden(err instanceof Error ? err.message : 'Forbidden');
  }
  const tenants = await store.listTenantProfiles();
  return ok({
    tenants: tenants.map(sanitizeCrwaTenant),
    count: tenants.length,
  });
}

async function getCrwaTenantBilling(auth: AuthContext, tenantId: string, store: TenantStore) {
  try {
    requireAnyRole(auth, ['crwa_admin']);
  } catch (err) {
    return forbidden(err instanceof Error ? err.message : 'Forbidden');
  }
  const profile = await store.getTenantProfile(tenantId);
  if (!profile) {
    return json(404, { error: `Tenant ${tenantId} not found` });
  }
  const events = await store.listBillingEvents(tenantId, 100);
  return ok({
    tenantId,
    displayName: profile.displayName,
    billing: crwaBillingView(profile),
    events: events.map(sanitizeEvent),
  });
}

async function getMunicipalityBilling(auth: AuthContext, store: TenantStore) {
  try {
    requireAnyRole(auth, ['system_admin']);
  } catch (err) {
    return forbidden(err instanceof Error ? err.message : 'Forbidden');
  }

  let tenantId: string;
  try {
    tenantId = requireTenantId(auth);
  } catch (err) {
    return forbidden(err instanceof Error ? err.message : 'Forbidden');
  }

  const profile = await store.getTenantProfile(tenantId);
  if (!profile) {
    return json(404, { error: 'Billing profile not found for this system' });
  }
  const events = await store.listBillingEvents(tenantId, 50);
  return ok({
    tenantId,
    displayName: profile.displayName,
    billing: publicBillingView(profile),
    events: events.map(sanitizePublicEvent),
  });
}

async function applyBillingAction(
  auth: AuthContext,
  tenantId: string,
  action: string,
  bodyRaw: string | undefined,
  store: TenantStore,
) {
  try {
    requireAnyRole(auth, ['crwa_admin']);
  } catch (err) {
    return forbidden(err instanceof Error ? err.message : 'Forbidden');
  }

  const profile = await store.getTenantProfile(tenantId);
  if (!profile) {
    return json(404, { error: `Tenant ${tenantId} not found` });
  }

  let body: Record<string, unknown> = {};
  if (bodyRaw) {
    try {
      body = JSON.parse(bodyRaw) as Record<string, unknown>;
    } catch {
      return badRequest('Body must be JSON');
    }
  }

  // Never honor client tenant override.
  if (body.tenantId !== undefined && String(body.tenantId) !== tenantId) {
    return forbidden('tenantId cannot be overridden by the client');
  }

  const now = new Date().toISOString();
  let next: TenantProfile = { ...profile };
  let eventType: BillingEventType;
  let amountCents: number | undefined;
  let currency: string | undefined;
  let method: PaymentMethod | undefined;
  let note: string | undefined;
  let pilotExpiresAt: string | undefined;

  switch (action) {
    case 'record-payment': {
      eventType = 'record_payment';
      next = {
        ...next,
        billingStatus: 'active',
        billingMode: next.billingMode === 'processor' ? 'processor' : 'manual',
        lastPaymentAt: now,
        pilotExpiresAt: undefined,
      };
      if (body.amountCents !== undefined && body.amountCents !== null && body.amountCents !== '') {
        const n = typeof body.amountCents === 'number' ? body.amountCents : Number(body.amountCents);
        if (!Number.isFinite(n) || n < 0 || n > 100_000_000) {
          return badRequest('amountCents must be a non-negative number');
        }
        amountCents = Math.round(n);
      }
      currency = typeof body.currency === 'string' && body.currency.trim() ? body.currency.trim().toUpperCase() : 'USD';
      if (body.method !== undefined) {
        if (!isPaymentMethod(body.method)) {
          return badRequest('method must be check, ach, card, or other');
        }
        method = body.method;
      } else {
        method = 'other';
      }
      note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) : undefined;
      break;
    }
    case 'extend-pilot': {
      eventType = 'extend_pilot';
      const exp = normalizeOptionalIsoDate(body.pilotExpiresAt);
      if (!exp.ok) return badRequest(exp.error);
      if (!exp.iso) return badRequest('pilotExpiresAt is required to extend pilot');
      next = {
        ...next,
        billingStatus: 'pilot',
        billingMode: 'pilot',
        pilotExpiresAt: exp.iso,
      };
      pilotExpiresAt = exp.iso;
      note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) : undefined;
      break;
    }
    case 'mark-past-due': {
      eventType = 'mark_past_due';
      next = { ...next, billingStatus: 'past_due' };
      note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) : undefined;
      break;
    }
    case 'suspend': {
      eventType = 'suspend';
      next = { ...next, billingStatus: 'suspended' };
      note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) : undefined;
      break;
    }
    case 'reactivate': {
      eventType = 'reactivate';
      const asPilot = body.asPilot === true || body.billingStatus === 'pilot';
      next = {
        ...next,
        billingStatus: asPilot ? 'pilot' : 'active',
        billingMode: asPilot ? 'pilot' : next.billingMode === 'processor' ? 'processor' : 'manual',
      };
      note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) : undefined;
      break;
    }
    default:
      return badRequest(
        'Unknown billing action. Use record-payment, extend-pilot, mark-past-due, suspend, or reactivate',
      );
  }

  if (typeof body.billingNotes === 'string') {
    next = { ...next, billingNotes: body.billingNotes.trim().slice(0, 1000) || undefined };
  }
  if (body.planCode !== undefined) {
    if (!isPlanCode(body.planCode)) return badRequest('planCode is invalid');
    next = { ...next, planCode: body.planCode };
  }

  const event: BillingEvent = {
    tenantId,
    eventId: randomUUID(),
    createdAt: now,
    eventType,
    source: 'admin_manual',
    billingStatusAfter: next.billingStatus,
    amountCents,
    currency,
    method,
    actorUserId: auth.userId,
    actorEmail: auth.email,
    note,
    pilotExpiresAt,
  };

  // Ledger first so a profile update never lands without an audit row (I1).
  // Residual: if profile update fails after the event write, CRWA sees the intent in BILL#EVENT
  // and can retry; opposite order left status changed with no audit.
  await store.putBillingEvent(event);
  await store.updateTenantProfile(next);

  return ok({
    tenant: sanitizeCrwaTenant(next),
    event: sanitizeEvent(event),
  });
}

async function inviteUser(
  auth: AuthContext,
  bodyRaw: string | undefined,
  store: TenantStore,
  cognito: CognitoAdminClient,
) {
  try {
    requireAnyRole(auth, ['system_admin']);
  } catch (err) {
    return forbidden(err instanceof Error ? err.message : 'Forbidden');
  }

  let tenantId: string;
  try {
    tenantId = requireTenantId(auth);
  } catch (err) {
    return forbidden(err instanceof Error ? err.message : 'Forbidden');
  }

  if (!bodyRaw) return badRequest('JSON body is required');
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(bodyRaw) as Record<string, unknown>;
  } catch {
    return badRequest('Body must be JSON');
  }

  // Never honor client-supplied tenantId for invite.
  if (body.tenantId !== undefined && String(body.tenantId) !== tenantId) {
    return forbidden('tenantId cannot be overridden by the client');
  }

  const email = normalizeEmail(body.email);
  if (!email.ok) return badRequest(email.error);

  let role: AssignableTenantRole = 'operator';
  if (body.role !== undefined) {
    if (!isAssignableTenantRole(body.role)) {
      return badRequest('role must be operator or system_admin');
    }
    role = body.role;
  }

  const existingUser = await store.getTenantUser(tenantId, email.email);
  if (existingUser) {
    return badRequest(`User ${email.email} is already in this system`);
  }

  const temporaryPassword = generateTemporaryPassword();
  try {
    await cognito.createMunicipalUser({
      email: email.email,
      tenantId,
      role,
      temporaryPassword,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Cognito create failed';
    if (/UsernameExistsException|already exists/i.test(msg)) {
      return badRequest(`User ${email.email} already exists in Cognito`);
    }
    throw err;
  }

  const now = new Date().toISOString();
  try {
    await store.putTenantUser({
      tenantId,
      email: email.email,
      role,
      createdAt: now,
      createdByUserId: auth.userId,
      createdByEmail: auth.email,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Dynamo write failed';
    if (/ConditionalCheckFailed/i.test(msg)) {
      return badRequest(`User ${email.email} is already in this system`);
    }
    throw err;
  }

  return json(201, {
    tenantId,
    user: {
      email: email.email,
      role,
      temporaryPassword,
      note: 'Share this temporary password out-of-band. User must change it on first sign-in.',
    },
  });
}

async function listUsers(auth: AuthContext, store: TenantStore) {
  try {
    requireAnyRole(auth, ['system_admin', 'crwa_admin']);
  } catch (err) {
    return forbidden(err instanceof Error ? err.message : 'Forbidden');
  }

  let tenantId: string;
  try {
    tenantId = requireTenantId(auth);
  } catch (err) {
    return forbidden(err instanceof Error ? err.message : 'Forbidden');
  }

  const users = await store.listTenantUsers(tenantId);
  return ok({
    tenantId,
    users: users.map((u) => ({
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
    })),
    count: users.length,
  });
}

function parseProvisionBilling(
  body: Record<string, unknown>,
): { ok: true; fields: BillingFields } | { ok: false; error: string } {
  let pilotOrPaid: 'pilot' | 'paid' | undefined;
  if (body.pilotOrPaid !== undefined) {
    if (body.pilotOrPaid !== 'pilot' && body.pilotOrPaid !== 'paid') {
      return { ok: false, error: 'pilotOrPaid must be pilot or paid' };
    }
    pilotOrPaid = body.pilotOrPaid;
  }

  let billingStatus = undefined as BillingFields['billingStatus'] | undefined;
  if (body.billingStatus !== undefined) {
    if (!isBillingStatus(body.billingStatus)) {
      return { ok: false, error: 'billingStatus must be pilot, active, past_due, or suspended' };
    }
    billingStatus = body.billingStatus;
  }

  let planCode: PlanCode | undefined;
  if (body.planCode !== undefined) {
    if (!isPlanCode(body.planCode)) {
      return { ok: false, error: 'planCode is invalid' };
    }
    planCode = body.planCode;
  }

  const meters = normalizeMeterCountEstimate(body.meterCountEstimate);
  if (!meters.ok) return meters;

  const contact = normalizeOptionalEmail(body.billingContactEmail);
  if (!contact.ok) return contact;

  const pilotExp = normalizeOptionalIsoDate(body.pilotExpiresAt);
  if (!pilotExp.ok) return pilotExp;

  let retentionMonths: number | undefined;
  if (body.retentionMonths !== undefined && body.retentionMonths !== null && body.retentionMonths !== '') {
    const n =
      typeof body.retentionMonths === 'number' ? body.retentionMonths : Number(body.retentionMonths);
    if (!Number.isFinite(n) || n < 1 || n > 120) {
      return { ok: false, error: 'retentionMonths must be between 1 and 120' };
    }
    retentionMonths = Math.floor(n);
  }

  const billingNotes =
    typeof body.billingNotes === 'string' ? body.billingNotes.trim().slice(0, 1000) || undefined : undefined;

  return {
    ok: true,
    fields: defaultBillingFields({
      pilotOrPaid,
      billingStatus,
      planCode,
      meterCountEstimate: meters.value,
      retentionMonths,
      billingContactEmail: contact.email,
      pilotExpiresAt: pilotExp.iso,
      billingNotes,
    }),
  };
}

function sanitizeCrwaTenant(t: TenantProfile) {
  return {
    tenantId: t.tenantId,
    displayName: t.displayName,
    createdAt: t.createdAt,
    initialUserEmail: t.initialUserEmail,
    mapTown: t.mapTown ?? null,
    mapCenterLat: t.mapCenterLat ?? null,
    mapCenterLng: t.mapCenterLng ?? null,
    mapZoom: t.mapZoom ?? null,
    ...crwaBillingView(t),
  };
}

function sanitizeEvent(e: BillingEvent) {
  return {
    eventId: e.eventId,
    createdAt: e.createdAt,
    eventType: e.eventType,
    source: e.source,
    billingStatusAfter: e.billingStatusAfter,
    amountCents: e.amountCents,
    currency: e.currency,
    method: e.method,
    actorEmail: e.actorEmail,
    note: e.note,
    pilotExpiresAt: e.pilotExpiresAt,
  };
}

/** Municipality view — no actor email PII beyond necessary; hide internal notes. */
function sanitizePublicEvent(e: BillingEvent) {
  return {
    eventId: e.eventId,
    createdAt: e.createdAt,
    eventType: e.eventType,
    billingStatusAfter: e.billingStatusAfter,
    amountCents: e.amountCents,
    currency: e.currency,
    method: e.method,
    note: e.eventType === 'record_payment' ? e.note : undefined,
    pilotExpiresAt: e.pilotExpiresAt,
  };
}
