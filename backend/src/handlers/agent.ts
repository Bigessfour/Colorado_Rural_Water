import type { AuthedHandler } from '../shared/apigw.js';
import { parseAuthFromClaims, requireTenantId } from '../shared/auth.js';
import { badRequest, forbidden, ok, unauthorized } from '../shared/http.js';

/**
 * Stub conversational agent endpoint.
 * Enforces tenant scoping; real Bedrock wiring + cost/confirm guardrails are Epic E.
 */
export const handler: AuthedHandler = async (event) => {
  const claims = event.requestContext.authorizer?.jwt?.claims;
  if (!claims || typeof claims !== 'object') {
    return unauthorized();
  }

  const auth = parseAuthFromClaims(claims as Record<string, unknown>);
  let tenantId: string;
  try {
    tenantId = requireTenantId(auth);
  } catch (err) {
    return forbidden(err instanceof Error ? err.message : 'Forbidden');
  }

  if (!event.body) {
    return badRequest('JSON body with message is required');
  }

  let message: string;
  try {
    const parsed = JSON.parse(event.body) as { message?: string };
    if (!parsed.message?.trim()) return badRequest('message is required');
    message = parsed.message.trim();
  } catch {
    return badRequest('Body must be JSON');
  }

  return ok({
    stub: true,
    tenantId,
    reply:
      'Hi — I am the Water Saver assistant stub. Soon I will help with onboarding, column mapping, and alert explanations. I will always explain cost impact and ask before making changes.',
    echo: message,
    guardrails: {
      cheapestFirst: true,
      requireConfirmForConfig: true,
      multiStepConfirmForDeletes: true,
      noCrossTenantData: true,
    },
  });
};
