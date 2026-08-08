import type { AuthedEvent } from '../shared/apigw.js';

/** Minimal API Gateway HTTP API v2 event for handler unit tests. */
export function authedEvent(opts: {
  method: string;
  path: string;
  body?: string;
  claims?: Record<string, unknown> | null;
  query?: Record<string, string>;
  pathParameters?: Record<string, string>;
}): AuthedEvent {
  const claims =
    opts.claims === null
      ? undefined
      : (opts.claims ?? {
          sub: 'user-1',
          email: 'demo.operator@watersaver.local',
          'cognito:groups': ['operators'],
          'custom:tenant_id': 'town-wiley',
        });

  return {
    version: '2.0',
    routeKey: `${opts.method} ${opts.path}`,
    rawPath: opts.path,
    rawQueryString: '',
    headers: {},
    queryStringParameters: opts.query,
    pathParameters: opts.pathParameters,
    requestContext: {
      accountId: '1',
      apiId: 'api',
      domainName: 'example',
      domainPrefix: 'example',
      http: {
        method: opts.method,
        path: opts.path,
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'test',
      },
      requestId: 'req',
      routeKey: `${opts.method} ${opts.path}`,
      stage: '$default',
      time: '01/Jan/2026:00:00:00 +0000',
      timeEpoch: 0,
      authorizer: claims
        ? {
            jwt: {
              claims,
            },
          }
        : undefined,
    },
    isBase64Encoded: false,
    body: opts.body,
  } as AuthedEvent;
}

export function statusOf(res: unknown): number {
  if (res && typeof res === 'object' && 'statusCode' in res) {
    return (res as { statusCode: number }).statusCode;
  }
  throw new Error('Expected API Gateway result with statusCode');
}
