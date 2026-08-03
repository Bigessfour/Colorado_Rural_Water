import type { AuthedHandler } from '../shared/apigw.js';
import { parseAuthFromClaims, requireTenantId } from '../shared/auth.js';
import { parseCustomerReadingsCsv, type ColumnMapping } from '../shared/csv-parse.js';
import { createMeterStoreFromEnv } from '../shared/dynamo-store.js';
import { commitCustomerIngest } from '../shared/ingest.js';
import { badRequest, forbidden, ok, unauthorized } from '../shared/http.js';

/**
 * POST /ingest — parse customer CSV text and write meter locations + readings.
 * Body: { csvText: string, mapping?: ColumnMapping, dryRun?: boolean }
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

  if (!event.body) {
    return badRequest('JSON body with csvText is required');
  }

  let csvText: string;
  let mapping: ColumnMapping | undefined;
  let dryRun = false;
  try {
    const parsed = JSON.parse(event.body) as {
      csvText?: string;
      mapping?: ColumnMapping;
      dryRun?: boolean;
    };
    if (!parsed.csvText?.trim()) return badRequest('csvText is required');
    csvText = parsed.csvText;
    mapping = parsed.mapping;
    dryRun = Boolean(parsed.dryRun);
  } catch {
    return badRequest('Body must be JSON');
  }

  const result = parseCustomerReadingsCsv(csvText, mapping);
  if (result.errors.length) {
    return badRequest(result.errors.join(' '), {
      mapping: result.mapping,
      warnings: result.warnings,
    });
  }

  if (dryRun) {
    return ok({
      dryRun: true,
      tenantId,
      mapping: result.mapping,
      rowCount: result.rows.length,
      warnings: result.warnings,
      sample: result.rows.slice(0, 3),
    });
  }

  try {
    const store = createMeterStoreFromEnv();
    const summary = await commitCustomerIngest(store, tenantId, result);
    const locations = await store.listLocations(tenantId);
    return ok({
      tenantId,
      mapping: result.mapping,
      ...summary,
      metersTracked: locations.length,
    });
  } catch (err) {
    return badRequest(err instanceof Error ? err.message : 'Ingest failed');
  }
};
