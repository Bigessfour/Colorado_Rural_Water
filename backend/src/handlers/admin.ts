import type { AuthedHandler } from '../shared/apigw.js';
import {
  isAssignableTenantRole,
  parseAuthFromClaims,
  requireAnyRole,
  requireTenantId,
  type AssignableTenantRole,
  type AuthContext,
} from '../shared/auth.js';
import { createCognitoAdminFromEnv, type CognitoAdminClient } from '../shared/cognito-admin.js';
import { createTenantStoreFromEnv } from '../shared/dynamo-store.js';
import { badRequest, forbidden, json, ok, unauthorized } from '../shared/http.js';
import {
  generateTemporaryPassword,
  normalizeDisplayName,
  normalizeEmail,
  normalizeTenantId,
  type TenantStore,
} from '../shared/tenant-admin.js';

/**
 * Admin APIs (Pilot D1–D3):
 *   POST /admin/tenants — CRWA Admin provisions municipality + initial user
 *   GET  /admin/tenants — CRWA Admin lists municipalities (sanitized)
 *   POST /admin/users/invite — System Admin invites within own tenant
 *   GET  /admin/users — System Admin lists users in own tenant
 *
 * Tenant for invite/list-users always from JWT — never from client body.
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
    return badRequest('Body must be JSON');
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

  const profile = {
    tenantId: id.tenantId,
    displayName: name.displayName,
    createdAt: now,
    createdByUserId: auth.userId,
    createdByEmail: auth.email,
    initialUserEmail: email.email,
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
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Dynamo write failed';
    if (/ConditionalCheckFailed/i.test(msg)) {
      return badRequest(`Tenant ${id.tenantId} already exists`);
    }
    throw err;
  }

  return json(201, {
    tenant: profile,
    initialUser: {
      email: email.email,
      role,
      temporaryPassword,
      note: 'Share this temporary password out-of-band. User must change it on first sign-in.',
    },
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
    tenants: tenants.map((t) => ({
      tenantId: t.tenantId,
      displayName: t.displayName,
      createdAt: t.createdAt,
      initialUserEmail: t.initialUserEmail,
    })),
    count: tenants.length,
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
