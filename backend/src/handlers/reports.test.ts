import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { handler } from './reports.js';
import { authedEvent, statusOf } from './_test-event.js';

describe('GET /reports/*', () => {
  it('returns 401 without JWT claims', async () => {
    const res = await handler(
      authedEvent({
        method: 'GET',
        path: '/reports/work-orders',
        claims: null,
      }),
      {} as never,
      () => undefined,
    );
    assert.equal(statusOf(res), 401);
  });

  it('returns 403 when tenant_id claim is missing', async () => {
    const res = await handler(
      authedEvent({
        method: 'GET',
        path: '/reports/work-orders',
        claims: { sub: 'u1', email: 'x@y.z', 'cognito:groups': 'operators' },
      }),
      {} as never,
      () => undefined,
    );
    assert.equal(statusOf(res), 403);
  });

  it('rejects unknown path', async () => {
    const res = await handler(
      authedEvent({ method: 'GET', path: '/reports/unknown' }),
      {} as never,
      () => undefined,
    );
    assert.equal(statusOf(res), 400);
  });

  it('rejects non-GET', async () => {
    const res = await handler(
      authedEvent({ method: 'POST', path: '/reports/work-orders' }),
      {} as never,
      () => undefined,
    );
    assert.equal(statusOf(res), 400);
  });
});
