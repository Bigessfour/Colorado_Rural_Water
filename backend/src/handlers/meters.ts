import type { AuthedHandler } from '../shared/apigw.js';
import { parseAuthFromClaims, requireTenantId } from '../shared/auth.js';
import { createMeterStoreFromEnv } from '../shared/dynamo-store.js';
import { sanitizeMeterId } from '../shared/flagged-export.js';
import { badRequest, forbidden, json, ok, unauthorized } from '../shared/http.js';

/**
 * GET /meters/{meterId} — basic meter history drill-down (ticket C5).
 * Returns current service address + current occupant name, plus reading stream.
 * Tenant from JWT only.
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

  const rawId = event.pathParameters?.meterId
    ? decodeURIComponent(event.pathParameters.meterId)
    : '';

  let meterId: string;
  try {
    meterId = sanitizeMeterId(rawId);
  } catch (err) {
    return badRequest(err instanceof Error ? err.message : 'Invalid meterId');
  }

  if (event.requestContext.http.method !== 'GET') {
    return badRequest(`Unsupported ${event.requestContext.http.method} on /meters`);
  }

  try {
    const store = createMeterStoreFromEnv();
    const location = await store.getLocation(tenantId, meterId);
    if (!location) {
      return json(404, { error: `Meter ${meterId} not found for this system` });
    }
    const readings = await store.listReadingsForMeter(tenantId, meterId);
    return ok({
      tenantId,
      meterId,
      serviceAddress: location.serviceAddress,
      occupantName: location.occupantName,
      accountNumber: location.accountNumber,
      route: location.route,
      updatedAt: location.updatedAt,
      readings: readings.map((r) => ({
        timestamp: r.timestamp,
        cumulativeReading: r.cumulativeReading,
        unit: r.unit,
        diagnosticFlags: r.diagnosticFlags,
        /** Snapshot at read time — location.occupantName is current. */
        occupantNameAtRead: r.occupantName,
      })),
      readingCount: readings.length,
    });
  } catch (err) {
    return badRequest(err instanceof Error ? err.message : 'Failed to load meter history');
  }
};
