import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseAuthFromClaims, requireTenantId } from './auth.js';

describe('parseAuthFromClaims', () => {
  it('reads tenant and roles from Cognito-style claims', () => {
    const auth = parseAuthFromClaims({
      sub: 'user-1',
      email: 'clerk@example-town.co.us',
      'custom:tenant_id': 'tenant-wiley',
      'cognito:groups': ['operators', 'system_admins'],
    });

    assert.equal(auth.userId, 'user-1');
    assert.equal(auth.tenantId, 'tenant-wiley');
    assert.deepEqual(auth.roles, ['operator', 'system_admin']);
  });

  it('requireTenantId blocks missing tenant for operators', () => {
    const auth = parseAuthFromClaims({
      sub: 'user-2',
      email: 'x@y.z',
      'cognito:groups': ['operators'],
    });
    assert.throws(() => requireTenantId(auth), /Missing tenant_id/);
  });
});
