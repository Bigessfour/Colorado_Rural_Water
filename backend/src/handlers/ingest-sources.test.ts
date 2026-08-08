import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { handler } from './ingest-sources.js';
import { authedEvent, statusOf } from './_test-event.js';

describe('POST /ingest/sources', () => {
  it('returns 401 without JWT claims', async () => {
    const res = await handler(
      authedEvent({
        method: 'POST',
        path: '/ingest/sources',
        claims: null,
        body: JSON.stringify({
          reading: { sourceId: 'w1', timestamp: '2026-07-01', periodVolume: 1 },
        }),
      }),
      {} as never,
      () => undefined,
    );
    assert.equal(statusOf(res), 401);
  });

  it('returns 403 when tenant_id claim is missing', async () => {
    const res = await handler(
      authedEvent({
        method: 'POST',
        path: '/ingest/sources',
        claims: { sub: 'u1', email: 'x@y.z', 'cognito:groups': 'operators' },
        body: JSON.stringify({
          reading: { sourceId: 'w1', timestamp: '2026-07-01', periodVolume: 1 },
        }),
      }),
      {} as never,
      () => undefined,
    );
    assert.equal(statusOf(res), 403);
  });

  it('rejects missing body', async () => {
    const res = await handler(
      authedEvent({ method: 'POST', path: '/ingest/sources' }),
      {} as never,
      () => undefined,
    );
    assert.equal(statusOf(res), 400);
  });
});
