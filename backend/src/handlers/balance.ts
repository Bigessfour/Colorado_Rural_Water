import type { AuthedHandler } from '../shared/apigw.js';
import { parseAuthFromClaims, requireTenantId } from '../shared/auth.js';
import {
  createMeterStoreFromEnv,
  createSourceStoreFromEnv,
} from '../shared/dynamo-store.js';
import { badRequest, forbidden, ok, unauthorized } from '../shared/http.js';
import { calculateWaterBalance } from '../shared/water-balance.js';

/**
 * GET /balance — live In − Out water balance for a billing period (G3).
 * Query: period=YYYY-MM (optional; defaults to latest month with data).
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

  const periodParam = event.queryStringParameters?.period?.trim();

  try {
    const meterStore = createMeterStoreFromEnv();
    const sourceStore = createSourceStoreFromEnv();
    const [sourceReadings, meterReadings, sources] = await Promise.all([
      sourceStore.listSourceReadings(tenantId),
      meterStore.listReadings(tenantId),
      sourceStore.listSources(tenantId),
    ]);

    const balance = calculateWaterBalance(tenantId, sourceReadings, meterReadings, {
      period: periodParam,
      trendMonths: 5,
    });

    return ok({
      ...balance,
      sourcesConfigured: sources.length,
      live: true,
    });
  } catch (err) {
    return badRequest(err instanceof Error ? err.message : 'Balance calculation failed');
  }
};
