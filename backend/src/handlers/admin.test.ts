import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { handler } from './admin.js';
import { authedEvent, statusOf } from './_test-event.js';

describe('GET /admin/*', () => {
  it('returns 401 without JWT claims', async () => {
    const res = await handler(
      authedEvent({ method: 'GET', path: '/admin/tenants', claims: null }),
      {} as never,
      () => undefined,
    );
    assert.equal(statusOf(res), 401);
  });

  // Role gates (operator vs crwa_admin) are covered in admin-isolation.test.ts
  // after DATA_TABLE is configured — handler creates stores before role checks.
});
