import type { AuthedHandler } from '../shared/apigw.js';
import { parseAuthFromClaims, requireTenantId } from '../shared/auth.js';
import { badRequest, forbidden, ok, unauthorized } from '../shared/http.js';

/**
 * Stub alert list / acknowledge.
 * POST body { action: 'acknowledge' | 'resolve', alertId } for mutations.
 */
export const handler: AuthedHandler = async (event) => {
  const claims = event.requestContext.authorizer?.jwt?.claims;
  if (!claims || typeof claims !== 'object') {
    return unauthorized();
  }

  let tenantId: string;
  try {
    tenantId = requireTenantId(parseAuthFromClaims(claims as Record<string, unknown>));
  } catch (err) {
    return forbidden(err instanceof Error ? err.message : 'Forbidden');
  }

  if (event.requestContext.http.method === 'POST' && event.body) {
    let body: { action?: string; alertId?: string };
    try {
      body = JSON.parse(event.body) as { action?: string; alertId?: string };
    } catch {
      return badRequest('Body must be JSON');
    }
    return ok({
      stub: true,
      tenantId,
      action: body.action ?? 'acknowledge',
      alertId: body.alertId ?? null,
      message: 'Alert mutation persistence not wired yet',
    });
  }

  return ok({
    stub: true,
    tenantId,
    alerts: [
      {
        id: 'demo-alert-1',
        priority: 'high',
        type: 'unusual_high_usage',
        meterId: '1042',
        serviceAddress: '112 N Main St Wiley CO',
        occupantName: 'A Rivera',
        summary:
          'Usage ~3× typical for this route at 112 N Main St Wiley CO — possible leak or irrigation change',
        status: 'open',
      },
    ],
  });
};
