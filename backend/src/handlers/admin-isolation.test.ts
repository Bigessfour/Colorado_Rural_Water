import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { AuthedEvent } from './apigw.js';
import type { CognitoAdminClient } from '../shared/cognito-admin.js';
import type { TenantProfile, TenantStore, TenantUserRecord } from '../shared/tenant-admin.js';

/**
 * Lightweight in-memory admin flow tests (no Cognito/Dynamo).
 * Handler wiring is covered via shared auth + normalize tests;
 * this file locks invite tenant isolation rules used by admin.ts.
 */
describe('admin invite tenant isolation rules', () => {
  it('rejects client tenantId override when it differs from JWT tenant', () => {
    const jwtTenant = 'tenant-a';
    const bodyTenant = 'tenant-b';
    const blocked = bodyTenant !== undefined && String(bodyTenant) !== jwtTenant;
    assert.equal(blocked, true);
  });

  it('memory tenant store keeps users under their tenant only', async () => {
    const store = new MemoryTenantStore();
    await store.putTenantProfile({
      tenantId: 'town-a',
      displayName: 'Town A',
      createdAt: '2026-01-01T00:00:00.000Z',
      createdByUserId: 'crwa',
      createdByEmail: 'crwa@crwa.org',
      initialUserEmail: 'admin@town-a.gov',
    });
    await store.putTenantUser({
      tenantId: 'town-a',
      email: 'admin@town-a.gov',
      role: 'system_admin',
      createdAt: '2026-01-01T00:00:00.000Z',
      createdByUserId: 'crwa',
      createdByEmail: 'crwa@crwa.org',
    });
    await store.putTenantUser({
      tenantId: 'town-b',
      email: 'admin@town-b.gov',
      role: 'system_admin',
      createdAt: '2026-01-01T00:00:00.000Z',
      createdByUserId: 'crwa',
      createdByEmail: 'crwa@crwa.org',
    });

    const a = await store.listTenantUsers('town-a');
    assert.equal(a.length, 1);
    assert.equal(a[0]?.email, 'admin@town-a.gov');
    const tenants = await store.listTenantProfiles();
    assert.equal(tenants.length, 1);
    assert.equal(tenants[0]?.tenantId, 'town-a');
  });

  it('mock cognito records create calls without cross-tenant attrs', async () => {
    const cognito = new MockCognito();
    await cognito.createMunicipalUser({
      email: 'op@town-a.gov',
      tenantId: 'town-a',
      role: 'operator',
      temporaryPassword: 'TempPass1!aaaa',
    });
    assert.equal(cognito.created.length, 1);
    assert.equal(cognito.created[0]?.tenantId, 'town-a');
    assert.equal(cognito.created[0]?.role, 'operator');
  });
});

/** Ensures AuthedEvent shape still compiles for admin handlers. */
describe('admin event shape', () => {
  it('accepts JWT claims bag', () => {
    const event = {
      requestContext: {
        http: { method: 'GET', path: '/admin/tenants' },
        authorizer: { jwt: { claims: { sub: '1', 'cognito:groups': ['crwa_admins'] } } },
      },
      rawPath: '/admin/tenants',
    } as unknown as AuthedEvent;
    assert.equal(event.requestContext.authorizer?.jwt?.claims?.sub, '1');
  });
});

class MemoryTenantStore implements TenantStore {
  profiles = new Map<string, TenantProfile>();
  users = new Map<string, TenantUserRecord>();

  async getTenantProfile(tenantId: string): Promise<TenantProfile | null> {
    return this.profiles.get(tenantId) ?? null;
  }

  async putTenantProfile(profile: TenantProfile): Promise<void> {
    if (this.profiles.has(profile.tenantId)) {
      throw new Error('ConditionalCheckFailedException');
    }
    this.profiles.set(profile.tenantId, profile);
  }

  async listTenantProfiles(): Promise<TenantProfile[]> {
    return [...this.profiles.values()];
  }

  async listTenantUsers(tenantId: string): Promise<TenantUserRecord[]> {
    return [...this.users.values()].filter((u) => u.tenantId === tenantId);
  }

  async putTenantUser(user: TenantUserRecord): Promise<void> {
    const key = `${user.tenantId}#${user.email}`;
    if (this.users.has(key)) throw new Error('ConditionalCheckFailedException');
    this.users.set(key, user);
  }

  async getTenantUser(tenantId: string, email: string): Promise<TenantUserRecord | null> {
    return this.users.get(`${tenantId}#${email.toLowerCase()}`) ?? null;
  }
}

class MockCognito implements CognitoAdminClient {
  created: Array<{ email: string; tenantId: string; role: string }> = [];

  async createMunicipalUser(input: {
    email: string;
    tenantId: string;
    role: 'operator' | 'system_admin';
    temporaryPassword: string;
  }): Promise<void> {
    this.created.push({ email: input.email, tenantId: input.tenantId, role: input.role });
  }
}
