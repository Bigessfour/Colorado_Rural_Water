import type { AuthedHandler } from '../shared/apigw.js';
import { evaluateAlerts } from '../shared/alert-engine.js';
import { parseAuthFromClaims, requireTenantId } from '../shared/auth.js';
import { createMeterStoreFromEnv } from '../shared/dynamo-store.js';
import { badRequest, forbidden, ok, unauthorized } from '../shared/http.js';

/**
 * GET /alerts — evaluate open alerts from tenant readings.
 * POST /alerts — acknowledge / resolve (status persistence TBD C3).
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
      tenantId,
      action: body.action ?? 'acknowledge',
      alertId: body.alertId ?? null,
      message: 'Acknowledged in session only — persistence lands in ticket C3',
    });
  }

  try {
    const store = createMeterStoreFromEnv();
    const [locations, readings] = await Promise.all([
      store.listLocations(tenantId),
      store.listReadings(tenantId),
    ]);
    const { confidence, alerts } = evaluateAlerts(locations, readings);
    return ok({
      tenantId,
      confidence,
      alerts,
    });
  } catch (err) {
    return badRequest(err instanceof Error ? err.message : 'Failed to evaluate alerts');
  }
};
