import type { AuthedHandler } from '../shared/apigw.js';
import { parseAuthFromClaims, requireTenantId } from '../shared/auth.js';
import { createMeterStoreFromEnv } from '../shared/dynamo-store.js';
import { sanitizeMeterId } from '../shared/flagged-export.js';
import { badRequest, forbidden, json, ok, unauthorized } from '../shared/http.js';
import {
  applyMeterMetadataPatch,
  parseMeterMetadataPatch,
} from '../shared/meter-location.js';

/**
 * GET /meters/{meterId} — meter history + asset metadata (ticket C5).
 * PUT /meters/{meterId} — partial metadata update (not address relocate).
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

  const method = event.requestContext.http.method;

  try {
    const store = createMeterStoreFromEnv();
    const location = await store.getLocation(tenantId, meterId);
    if (!location) {
      return json(404, { error: `Meter ${meterId} not found for this system` });
    }

    if (method === 'GET') {
      const readings = await store.listReadingsForMeter(tenantId, meterId);
      return ok({
        tenantId,
        meterId,
        serviceAddress: location.serviceAddress,
        occupantName: location.occupantName,
        accountNumber: location.accountNumber,
        route: location.route,
        manufacturer: location.manufacturer,
        model: location.model,
        serialNumber: location.serialNumber,
        meterSize: location.meterSize,
        installDate: location.installDate,
        meterType: location.meterType,
        locationDetail: location.locationDetail,
        radioId: location.radioId,
        lastTestedAt: location.lastTestedAt,
        notes: location.notes,
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
    }

    if (method === 'PUT') {
      if (!event.body) return badRequest('JSON body is required');
      let body: Record<string, unknown>;
      try {
        body = JSON.parse(event.body) as Record<string, unknown>;
      } catch {
        return badRequest('Body must be JSON');
      }
      const parsed = parseMeterMetadataPatch(body);
      if (!parsed.ok) return badRequest(parsed.error);
      const updated = applyMeterMetadataPatch(location, parsed.patch);
      await store.putLocation(updated);
      return ok({
        tenantId,
        meterId: updated.meterId,
        serviceAddress: updated.serviceAddress,
        occupantName: updated.occupantName,
        accountNumber: updated.accountNumber,
        route: updated.route,
        manufacturer: updated.manufacturer,
        model: updated.model,
        serialNumber: updated.serialNumber,
        meterSize: updated.meterSize,
        installDate: updated.installDate,
        meterType: updated.meterType,
        locationDetail: updated.locationDetail,
        radioId: updated.radioId,
        lastTestedAt: updated.lastTestedAt,
        notes: updated.notes,
        updatedAt: updated.updatedAt,
      });
    }

    return badRequest(`Unsupported ${method} on /meters`);
  } catch (err) {
    return badRequest(err instanceof Error ? err.message : 'Failed to load meter history');
  }
};
