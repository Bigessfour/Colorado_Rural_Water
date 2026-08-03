import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { AuthedEvent } from '../shared/apigw.js';
import { buildUploadObjectKey, handler, sanitizeFilename } from './upload-url.js';

function bareEvent(partial?: Partial<AuthedEvent>): AuthedEvent {
  return {
    version: '2.0',
    routeKey: 'POST /uploads/presign',
    rawPath: '/uploads/presign',
    rawQueryString: '',
    headers: {},
    requestContext: {
      accountId: '1',
      apiId: 'api',
      domainName: 'example',
      domainPrefix: 'example',
      http: {
        method: 'POST',
        path: '/uploads/presign',
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'test',
      },
      requestId: 'req',
      routeKey: 'POST /uploads/presign',
      stage: '$default',
      time: '01/Jan/2026:00:00:00 +0000',
      timeEpoch: 0,
      authorizer: undefined,
    },
    isBase64Encoded: false,
    ...partial,
  } as AuthedEvent;
}

describe('sanitizeFilename / buildUploadObjectKey', () => {
  it('strips path segments and unsafe chars', () => {
    assert.equal(sanitizeFilename('../../evil.csv'), 'evil.csv');
    assert.equal(sanitizeFilename('Town of Steve.xlsx'), 'Town_of_Steve.xlsx');
  });

  it('scopes customer and source keys under tenants/{id}/uploads', () => {
    assert.equal(
      buildUploadObjectKey({
        tenantId: 'town-wiley',
        kind: 'customer',
        filename: 'a.csv',
        nowMs: 1000,
      }),
      'tenants/town-wiley/uploads/1000-a.csv',
    );
    assert.equal(
      buildUploadObjectKey({
        tenantId: 'town-wiley',
        kind: 'source',
        filename: 'wells.csv',
        nowMs: 2000,
      }),
      'tenants/town-wiley/uploads/sources/2000-wells.csv',
    );
  });
});

describe('POST /uploads/presign auth', () => {
  it('returns 401 without JWT claims', async () => {
    const res = await handler(bareEvent(), {} as never, () => undefined);
    assert.ok(res && typeof res === 'object' && 'statusCode' in res);
    assert.equal((res as { statusCode: number }).statusCode, 401);
  });

  it('returns 403 when tenant_id claim is missing', async () => {
    const res = await handler(
      bareEvent({
        body: JSON.stringify({ filename: 'x.csv' }),
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

  it('returns 400 for invalid kind', async () => {
    process.env.UPLOAD_BUCKET = 'test-bucket';
    const res = await handler(
      bareEvent({
        body: JSON.stringify({ kind: 'other' }),
        requestContext: {
          ...bareEvent().requestContext,
          authorizer: {
            jwt: {
              claims: {
                sub: 'u1',
                email: 'op@town.gov',
                'cognito:groups': 'operators',
                'custom:tenant_id': 'town-wiley',
              },
            },
          },
        },
      }),
      {} as never,
      () => undefined,
    );
    assert.ok(res && typeof res === 'object' && 'statusCode' in res);
    assert.equal((res as { statusCode: number }).statusCode, 400);
  });
});
