import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { handler } from './ingest.js';
import { authedEvent, statusOf } from './_test-event.js';

describe('POST /ingest', () => {
  it('returns 401 without JWT claims', async () => {
    const res = await handler(
      authedEvent({
        method: 'POST',
        path: '/ingest',
        claims: null,
        body: JSON.stringify({ csvText: 'a,b\n1,2', dryRun: true }),
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
        path: '/ingest',
        claims: {
          sub: 'u1',
          email: 'x@y.z',
          'cognito:groups': 'operators',
        },
        body: JSON.stringify({ csvText: 'a,b\n1,2', dryRun: true }),
      }),
      {} as never,
      () => undefined,
    );
    assert.equal(statusOf(res), 403);
  });

  it('rejects missing body', async () => {
    const res = await handler(
      authedEvent({ method: 'POST', path: '/ingest' }),
      {} as never,
      () => undefined,
    );
    assert.equal(statusOf(res), 400);
  });

  it('dryRun parses CSV under JWT tenant without writing stores', async () => {
    const csv = [
      'account_id,service_address,meter_id,reading,reading_date',
      'A1,100 Main St,M-1,1000,2026-07-01',
    ].join('\n');
    const res = await handler(
      authedEvent({
        method: 'POST',
        path: '/ingest',
        body: JSON.stringify({ csvText: csv, dryRun: true }),
      }),
      {} as never,
      () => undefined,
    );
    assert.equal(statusOf(res), 200);
    const body = JSON.parse((res as { body: string }).body);
    assert.equal(body.dryRun, true);
    assert.equal(body.tenantId, 'town-wiley');
    assert.ok(body.rowCount >= 1);
  });
});
