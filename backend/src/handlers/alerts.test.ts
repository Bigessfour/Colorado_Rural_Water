import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { handler } from './alerts.js';
import { authedEvent, statusOf } from './_test-event.js';

describe('GET/POST /alerts', () => {
  it('returns 401 without JWT claims', async () => {
    const res = await handler(
      authedEvent({ method: 'GET', path: '/alerts', claims: null }),
      {} as never,
      () => undefined,
    );
    assert.equal(statusOf(res), 401);
  });

  it('returns 403 when tenant_id claim is missing', async () => {
    const res = await handler(
      authedEvent({
        method: 'GET',
        path: '/alerts',
        claims: { sub: 'u1', email: 'x@y.z', 'cognito:groups': 'operators' },
      }),
      {} as never,
      () => undefined,
    );
    assert.equal(statusOf(res), 403);
  });

  it('POST rejects missing body', async () => {
    const res = await handler(
      authedEvent({ method: 'POST', path: '/alerts' }),
      {} as never,
      () => undefined,
    );
    assert.equal(statusOf(res), 400);
  });

  it('POST rejects invalid action', async () => {
    const res = await handler(
      authedEvent({
        method: 'POST',
        path: '/alerts',
        body: JSON.stringify({ action: 'delete', alertId: 'a1' }),
      }),
      {} as never,
      () => undefined,
    );
    assert.equal(statusOf(res), 400);
  });
});
