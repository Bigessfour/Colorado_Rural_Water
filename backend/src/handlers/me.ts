import type { AuthedHandler } from '../shared/apigw.js';
import { parseAuthFromClaims } from '../shared/auth.js';
import { ok, unauthorized } from '../shared/http.js';

export const handler: AuthedHandler = async (event) => {
  const claims = event.requestContext.authorizer?.jwt?.claims;
  if (!claims || typeof claims !== 'object') {
    return unauthorized();
  }

  const auth = parseAuthFromClaims(claims as Record<string, unknown>);
  return ok({
    userId: auth.userId,
    email: auth.email,
    tenantId: auth.tenantId,
    roles: auth.roles,
  });
};
