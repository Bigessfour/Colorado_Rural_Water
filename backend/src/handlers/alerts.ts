import type { AuthedHandler } from '../shared/apigw.js';
import { evaluateAlerts } from '../shared/alert-engine.js';
import { evaluateBalanceAlerts } from '../shared/balance-alerts.js';
import { parseAuthFromClaims, requireTenantId } from '../shared/auth.js';
import {
  createMeterStoreFromEnv,
  createSourceStoreFromEnv,
} from '../shared/dynamo-store.js';
import { badRequest, forbidden, ok, unauthorized } from '../shared/http.js';
import { calculateWaterBalance } from '../shared/water-balance.js';

/**
 * GET /alerts — evaluate open alerts from tenant readings (+ G4 balance alerts).
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
    const meterStore = createMeterStoreFromEnv();
    const sourceStore = createSourceStoreFromEnv();
    const [locations, readings, sourceReadings] = await Promise.all([
      meterStore.listLocations(tenantId),
      meterStore.listReadings(tenantId),
      sourceStore.listSourceReadings(tenantId),
    ]);
    const { confidence, alerts } = evaluateAlerts(locations, readings);
    const balance = calculateWaterBalance(tenantId, sourceReadings, readings);
    const balanceAlerts = evaluateBalanceAlerts(balance, {
      mode: confidence.statisticalMode,
    });
    return ok({
      tenantId,
      confidence,
      alerts,
      balanceAlerts,
      balancePeriod: balance.period,
    });
  } catch (err) {
    return badRequest(err instanceof Error ? err.message : 'Failed to evaluate alerts');
  }
};
