import type { AuthedHandler } from '../shared/apigw.js';
import { parseAuthFromClaims, requireTenantId } from '../shared/auth.js';
import { createAlertStatusStoreFromEnv, createMeterStoreFromEnv } from '../shared/dynamo-store.js';
import { sanitizeMeterId } from '../shared/flagged-export.js';
import { badRequest, forbidden, json, ok, unauthorized } from '../shared/http.js';
import {
  applyMeterMetadataPatch,
  parseMeterCreateBody,
  parseMeterMetadataPatch,
  sanitizeMeterLocationForResponse,
} from '../shared/meter-location.js';

/**
 * Meter inventory CRUD (ticket C7 / B9).
 * GET /meters — list locations for JWT tenant
 * POST /meters — create location without a reading
 * GET /meters/{meterId} — history + asset metadata (C5)
 * PUT /meters/{meterId} — partial metadata (not address relocate)
 * DELETE /meters/{meterId} — LOC# + cascade RDG#
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

  const method = event.requestContext.http.method;
  const rawId = event.pathParameters?.meterId
    ? decodeURIComponent(event.pathParameters.meterId)
    : '';
  const meterIdParam = rawId.trim() ? rawId : null;

  try {
    const store = createMeterStoreFromEnv();

    if (method === 'GET' && !meterIdParam) {
      const [locations, readings] = await Promise.all([
        store.listLocations(tenantId),
        store.listReadings(tenantId),
      ]);
      const counts = new Map<string, number>();
      for (const r of readings) {
        counts.set(r.meterId, (counts.get(r.meterId) ?? 0) + 1);
      }
      const meters = locations
        .map((loc) => ({
          ...sanitizeMeterLocationForResponse(loc),
          readingCount: counts.get(loc.meterId) ?? 0,
        }))
        .sort((a, b) => a.meterId.localeCompare(b.meterId));
      return ok({ tenantId, meters, count: meters.length });
    }

    if (method === 'POST' && !meterIdParam) {
      if (!event.body) return badRequest('JSON body is required');
      let body: Record<string, unknown>;
      try {
        body = JSON.parse(event.body) as Record<string, unknown>;
      } catch {
        return badRequest('Body must be JSON');
      }
      const parsed = parseMeterCreateBody(tenantId, body);
      if (!parsed.ok) return badRequest(parsed.error);

      const existing = await store.getLocation(tenantId, parsed.location.meterId);
      if (existing) {
        return json(409, {
          error: `Meter ${parsed.location.meterId} already exists — use PUT to update metadata`,
        });
      }
      await store.putLocation(parsed.location);
      return json(201, {
        tenantId,
        meter: sanitizeMeterLocationForResponse(parsed.location),
      });
    }

    if (!meterIdParam) {
      return badRequest(`Unsupported ${method} on /meters`);
    }

    let meterId: string;
    try {
      meterId = sanitizeMeterId(meterIdParam);
    } catch (err) {
      return badRequest(err instanceof Error ? err.message : 'Invalid meterId');
    }

    if (method === 'DELETE') {
      const deleted = await store.deleteLocation(tenantId, meterId);
      if (!deleted) {
        return json(404, { error: `Meter ${meterId} not found for this system` });
      }
      return ok({
        tenantId,
        deleted: meterId,
        message: `Meter ${meterId} and its readings were removed`,
      });
    }

    const location = await store.getLocation(tenantId, meterId);
    if (!location) {
      return json(404, { error: `Meter ${meterId} not found for this system` });
    }

    if (method === 'GET') {
      const readings = await store.listReadingsForMeter(tenantId, meterId);
      const statusStore = createAlertStatusStoreFromEnv();
      const alertActivity = await statusStore.listAlertActivityForMeter(tenantId, meterId);
      return ok({
        tenantId,
        ...sanitizeMeterLocationForResponse(location),
        readings: readings.map((r) => ({
          timestamp: r.timestamp,
          cumulativeReading: r.cumulativeReading,
          unit: r.unit,
          diagnosticFlags: r.diagnosticFlags,
          /** Snapshot at read time — location.occupantName is current. */
          occupantNameAtRead: r.occupantName,
        })),
        readingCount: readings.length,
        alertActivity: alertActivity.map((e) => ({
          eventId: e.eventId,
          alertId: e.alertId,
          action: e.action,
          status: e.status,
          actorEmail: e.actorEmail,
          note: e.note,
          summary: e.summary,
          createdAt: e.createdAt,
        })),
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
        ...sanitizeMeterLocationForResponse(updated),
      });
    }

    return badRequest(`Unsupported ${method} on /meters`);
  } catch (err) {
    return badRequest(err instanceof Error ? err.message : 'Failed to process meters request');
  }
};
