import type { AuthedHandler } from '../shared/apigw.js';
import { parseAuthFromClaims } from '../shared/auth.js';
import { badRequest, ok, unauthorized } from '../shared/http.js';

const MAX_MESSAGE = 2000;
const MAX_STACK = 4000;
const MAX_URL = 500;

/**
 * GET /me — caller identity from JWT.
 * POST /telemetry/client-errors — SPA runtime errors → CloudWatch (structured JSON).
 */
export const handler: AuthedHandler = async (event) => {
  const claims = event.requestContext.authorizer?.jwt?.claims;
  if (!claims || typeof claims !== 'object') {
    return unauthorized();
  }

  const auth = parseAuthFromClaims(claims as Record<string, unknown>);
  const method = event.requestContext.http.method;
  const path = event.rawPath ?? event.requestContext.http.path ?? '';

  if (method === 'GET' && /\/me\/?$/.test(path)) {
    return ok({
      userId: auth.userId,
      email: auth.email,
      tenantId: auth.tenantId,
      roles: auth.roles,
    });
  }

  if (method === 'POST' && path.includes('/telemetry/client-errors')) {
    return reportClientError(event.body, auth);
  }

  return badRequest('Unknown me/telemetry route');
};

function reportClientError(
  bodyRaw: string | undefined,
  auth: ReturnType<typeof parseAuthFromClaims>,
) {
  if (!bodyRaw) return badRequest('JSON body is required');
  let body: unknown;
  try {
    body = JSON.parse(bodyRaw);
  } catch {
    return badRequest('Body must be JSON');
  }
  if (!body || typeof body !== 'object') return badRequest('Body must be an object');

  const rec = body as Record<string, unknown>;
  const message =
    typeof rec.message === 'string' ? rec.message.slice(0, MAX_MESSAGE) : 'unknown';
  const stack = typeof rec.stack === 'string' ? rec.stack.slice(0, MAX_STACK) : undefined;
  const url = typeof rec.url === 'string' ? rec.url.slice(0, MAX_URL) : undefined;
  const source = typeof rec.source === 'string' ? rec.source.slice(0, 80) : 'spa';

  // Structured line for CloudWatch Logs Insights / filter on CLIENT_ERROR
  console.error(
    JSON.stringify({
      level: 'error',
      type: 'CLIENT_ERROR',
      source,
      message,
      stack,
      url,
      userId: auth.userId,
      email: auth.email,
      tenantId: auth.tenantId,
      at: new Date().toISOString(),
    }),
  );

  return ok({ recorded: true });
}
