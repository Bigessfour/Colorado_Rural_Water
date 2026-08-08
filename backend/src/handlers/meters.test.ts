import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { handler } from './meters.js';
import { authedEvent, statusOf } from './_test-event.js';

describe('GET/POST /meters', () => {
  it('returns 401 without JWT claims', async () => {
    const res = await handler(
      authedEvent({ method: 'GET', path: '/meters', claims: null }),
      {} as never,
      () => undefined,
    );
    assert.equal(statusOf(res), 401);
  });

  it('returns 403 when tenant_id claim is missing', async () => {
    const res = await handler(
      authedEvent({
        method: 'GET',
        path: '/meters',
        claims: { sub: 'u1', email: 'x@y.z', 'cognito:groups': 'operators' },
      }),
      {} as never,
      () => undefined,
    );
    assert.equal(statusOf(res), 403);
  });
});
