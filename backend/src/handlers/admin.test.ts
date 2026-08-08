import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { gateAdminRoute, handler } from './admin.js';
import { authedEvent, statusOf } from './_test-event.js';

describe('gateAdminRoute', () => {
  it('returns 403 for operator on GET /admin/tenants before DATA_TABLE access', () => {
    const auth = {
      userId: 'u1',
      email: 'demo.operator@watersaver.local',
      tenantId: 'town-wiley',
      roles: ['operator'],
    };
    const res = gateAdminRoute(auth, 'GET', '/admin/tenants');
    assert.ok(res);
    assert.equal(res!.statusCode, 403);
  });
});

describe('GET /admin/*', () => {
  it('returns 401 without JWT claims', async () => {
    const res = await handler(
      authedEvent({ method: 'GET', path: '/admin/tenants', claims: null }),
      {} as never,
      () => undefined,
    );
    assert.equal(statusOf(res), 401);
  });

  it('returns 403 for operator on GET /admin/tenants without DATA_TABLE', async () => {
    const res = await handler(
      authedEvent({
        method: 'GET',
        path: '/admin/tenants',
        claims: {
          sub: 'user-1',
          email: 'demo.operator@watersaver.local',
          'cognito:groups': ['operators'],
          'custom:tenant_id': 'town-wiley',
        },
      }),
      {} as never,
      () => undefined,
    );
    assert.equal(statusOf(res), 403);
  });
});
