import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { tenantFromKey } from './s3-ingest.js';

describe('tenantFromKey', () => {
  it('extracts tenant from canonical upload keys', () => {
    assert.equal(tenantFromKey('tenants/town-wiley/uploads/file.xlsx'), 'town-wiley');
    assert.equal(tenantFromKey('tenants/Town-Wiley/uploads/sources/a.csv'), 'town-wiley');
  });

  it('rejects path traversal and invalid tenant segments', () => {
    assert.equal(tenantFromKey('tenants/../uploads/x.csv'), null);
    assert.equal(tenantFromKey('tenants/evil/../uploads/x.csv'), null);
    assert.equal(tenantFromKey('/tenants/town-wiley/uploads/x.csv'), null);
    assert.equal(tenantFromKey('tenants/town_wiley/uploads/x.csv'), null);
    assert.equal(tenantFromKey('tenants//uploads/x.csv'), null);
    assert.equal(tenantFromKey('not-tenants/town-wiley/uploads/x.csv'), null);
  });
});
