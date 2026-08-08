import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { handler } from './me.js';
import type { AuthedEvent } from '../shared/apigw.js';

function event(partial: {
  method: string;
  path: string;
  body?: string;
}): AuthedEvent {
  return {
    version: '2.0',
    routeKey: `${partial.method} ${partial.path}`,
    rawPath: partial.path,
    rawQueryString: '',
    headers: {},
    requestContext: {
      accountId: '1',
      apiId: 'api',
      domainName: 'example',
      domainPrefix: 'example',
      http: {
        method: partial.method,
        path: partial.path,
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'test',
      },
      requestId: 'req',
      routeKey: `${partial.method} ${partial.path}`,
      stage: '$default',
      time: '',
      timeEpoch: Date.now(),
      authorizer: {
        jwt: {
          claims: {
            sub: 'user-1',
            email: 'kelly.review@example.com',
            'cognito:groups': ['operators'],
            'custom:tenant_id': 'town-wiley',
          },
        },
      },
    },
    isBase64Encoded: false,
    body: partial.body,
  };
}

describe('GET /me', () => {
  it('returns identity from JWT', async () => {
    const res = await handler(event({ method: 'GET', path: '/me' }), {} as never, (() => {}) as never);
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.email, 'kelly.review@example.com');
    assert.equal(body.tenantId, 'town-wiley');
    assert.deepEqual(body.roles, ['operator']);
    assert.equal(body.userId, 'user-1');
  });

  it('returns identity with null tenant when claim missing (SPA still loads)', async () => {
    const ev = event({ method: 'GET', path: '/me' });
    ev.requestContext.authorizer!.jwt!.claims = {
      sub: 'user-1',
      email: 'x@y.z',
      'cognito:groups': ['operators'],
    };
    const res = await handler(ev, {} as never, (() => {}) as never);
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.tenantId, null);
    assert.deepEqual(body.roles, ['operator']);
  });

  it('maps space-separated Cognito groups on GET /me', async () => {
    const ev = event({ method: 'GET', path: '/me' });
    ev.requestContext.authorizer!.jwt!.claims = {
      sub: 'user-1',
      email: 'admin@example.com',
      'custom:tenant_id': 'town-wiley',
      'cognito:groups': 'system_admins operators',
    };
    const res = await handler(ev, {} as never, (() => {}) as never);
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.deepEqual(body.roles.sort(), ['operator', 'system_admin'].sort());
  });
});

describe('POST /telemetry/client-errors', () => {
  it('records client error payload', async () => {
    const res = await handler(
      event({
        method: 'POST',
        path: '/telemetry/client-errors',
        body: JSON.stringify({
          message: 'boom',
          stack: 'Error: boom\n    at x',
          url: 'http://localhost:4200/review',
          source: 'ErrorHandler',
        }),
      }),
      {} as never,
      (() => {}) as never,
    );
    assert.equal(res.statusCode, 200);
    assert.equal(JSON.parse(res.body).recorded, true);
  });

  it('rejects missing body', async () => {
    const res = await handler(
      event({ method: 'POST', path: '/telemetry/client-errors' }),
      {} as never,
      (() => {}) as never,
    );
    assert.equal(res.statusCode, 400);
  });
});
