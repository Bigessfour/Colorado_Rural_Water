import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { handler } from './sources.js';
import { authedEvent, statusOf } from './_test-event.js';

describe('GET/POST /sources', () => {
  it('returns 401 without JWT claims', async () => {
    const res = await handler(
      authedEvent({ method: 'GET', path: '/sources', claims: null }),
      {} as never,
      () => undefined,
    );
    assert.equal(statusOf(res), 401);
  });

  it('returns 403 when tenant_id claim is missing', async () => {
    const res = await handler(
      authedEvent({
        method: 'GET',
        path: '/sources',
        claims: { sub: 'u1', email: 'x@y.z', 'cognito:groups': 'operators' },
      }),
      {} as never,
      () => undefined,
    );
    assert.equal(statusOf(res), 403);
  });
});
