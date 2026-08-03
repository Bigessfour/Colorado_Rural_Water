import type { AuthedHandler } from '../shared/apigw.js';
import { parseAuthFromClaims, requireTenantId } from '../shared/auth.js';
import { createSourceStoreFromEnv } from '../shared/dynamo-store.js';
import { badRequest, forbidden, json, ok, unauthorized } from '../shared/http.js';
import { normalizeWaterSourceInput } from '../shared/water-source.js';

/**
 * Named sources CRUD — Spec §7a / ticket G1.
 * GET /sources | POST /sources | PUT /sources/{sourceId} | DELETE /sources/{sourceId}
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
  const sourceIdParam = event.pathParameters?.sourceId
    ? decodeURIComponent(event.pathParameters.sourceId)
    : null;

  try {
    const store = createSourceStoreFromEnv();

    if (method === 'GET' && !sourceIdParam) {
      const sources = await store.listSources(tenantId);
      return ok({ tenantId, sources, count: sources.length });
    }

    if (method === 'POST' && !sourceIdParam) {
      if (!event.body) return badRequest('JSON body is required');
      let body: Record<string, unknown>;
      try {
        body = JSON.parse(event.body) as Record<string, unknown>;
      } catch {
        return badRequest('Body must be JSON');
      }
      const normalized = normalizeWaterSourceInput(tenantId, body);
      if (!normalized.ok) return badRequest(normalized.error);
      const existing = await store.getSource(tenantId, normalized.source.sourceId);
      if (existing) {
        return badRequest(`Source ${normalized.source.sourceId} already exists — use PUT to update`);
      }
      await store.putSource(normalized.source);
      return json(201, { tenantId, source: normalized.source });
    }

    if (method === 'PUT' && sourceIdParam) {
      if (!event.body) return badRequest('JSON body is required');
      let body: Record<string, unknown>;
      try {
        body = JSON.parse(event.body) as Record<string, unknown>;
      } catch {
        return badRequest('Body must be JSON');
      }
      const existing = await store.getSource(tenantId, sourceIdParam);
      if (!existing) return json(404, { error: `Source ${sourceIdParam} not found` });
      const normalized = normalizeWaterSourceInput(tenantId, body, existing);
      if (!normalized.ok) return badRequest(normalized.error);
      await store.putSource(normalized.source);
      return ok({ tenantId, source: normalized.source });
    }

    if (method === 'DELETE' && sourceIdParam) {
      const deleted = await store.deleteSource(tenantId, sourceIdParam);
      if (!deleted) return json(404, { error: `Source ${sourceIdParam} not found` });
      return ok({ tenantId, deleted: sourceIdParam });
    }

    return badRequest(`Unsupported ${method} on /sources`);
  } catch (err) {
    return badRequest(err instanceof Error ? err.message : 'Sources request failed');
  }
};
