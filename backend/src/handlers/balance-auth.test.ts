import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { AuthedEvent } from '../shared/apigw.js';
import { handler as balanceHandler } from './balance.js';
import { handler as ingestSourcesHandler } from './ingest-sources.js';

function bareEvent(partial?: Partial<AuthedEvent>): AuthedEvent {
  return {
    version: '2.0',
    routeKey: 'GET /balance',
    rawPath: '/balance',
    rawQueryString: '',
    headers: {},
    requestContext: {
      accountId: '1',
      apiId: 'api',
      domainName: 'example',
      domainPrefix: 'example',
      http: {
        method: 'GET',
        path: '/balance',
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'test',
      },
      requestId: 'req',
      routeKey: 'GET /balance',
      stage: '$default',
      time: '01/Jan/2026:00:00:00 +0000',
      timeEpoch: 0,
      authorizer: undefined,
    },
    isBase64Encoded: false,
    ...partial,
  } as AuthedEvent;
}

describe('GET /balance auth', () => {
  it('returns 401 without JWT claims', async () => {
    const res = await balanceHandler(bareEvent(), {} as never, () => undefined);
    assert.ok(res && typeof res === 'object' && 'statusCode' in res);
    assert.equal((res as { statusCode: number }).statusCode, 401);
  });

  it('returns 403 when tenant_id claim is missing', async () => {
    const res = await balanceHandler(
      bareEvent({
        requestContext: {
          ...bareEvent().requestContext,
          authorizer: {
            jwt: {
              claims: { sub: 'u1', email: 'x@y.z', 'cognito:groups': 'operators' },
            },
          },
        },
      }),
      {} as never,
      () => undefined,
    );
    assert.ok(res && typeof res === 'object' && 'statusCode' in res);
    assert.equal((res as { statusCode: number }).statusCode, 403);
  });
});

describe('POST /ingest/sources auth', () => {
  it('returns 401 without JWT claims', async () => {
    const res = await ingestSourcesHandler(
      bareEvent({
        routeKey: 'POST /ingest/sources',
        rawPath: '/ingest/sources',
        body: JSON.stringify({ reading: { sourceId: 'w1', timestamp: '2026-07-01', periodVolume: 1 } }),
        requestContext: {
          ...bareEvent().requestContext,
          http: {
            method: 'POST',
            path: '/ingest/sources',
            protocol: 'HTTP/1.1',
            sourceIp: '127.0.0.1',
            userAgent: 'test',
          },
          routeKey: 'POST /ingest/sources',
          authorizer: undefined,
        },
      }),
      {} as never,
      () => undefined,
    );
    assert.ok(res && typeof res === 'object' && 'statusCode' in res);
    assert.equal((res as { statusCode: number }).statusCode, 401);
  });

  it('returns 403 when tenant_id claim is missing', async () => {
    const res = await ingestSourcesHandler(
      bareEvent({
        routeKey: 'POST /ingest/sources',
        rawPath: '/ingest/sources',
        body: JSON.stringify({ reading: { sourceId: 'w1', timestamp: '2026-07-01', periodVolume: 1 } }),
        requestContext: {
          ...bareEvent().requestContext,
          http: {
            method: 'POST',
            path: '/ingest/sources',
            protocol: 'HTTP/1.1',
            sourceIp: '127.0.0.1',
            userAgent: 'test',
          },
          routeKey: 'POST /ingest/sources',
          authorizer: {
            jwt: {
              claims: { sub: 'u1', email: 'x@y.z', 'cognito:groups': 'operators' },
            },
          },
        },
      }),
      {} as never,
      () => undefined,
    );
    assert.ok(res && typeof res === 'object' && 'statusCode' in res);
    assert.equal((res as { statusCode: number }).statusCode, 403);
  });
});
