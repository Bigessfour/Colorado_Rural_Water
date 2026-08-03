import type { AuthedHandler } from '../shared/apigw.js';
import { parseAuthFromClaims, requireTenantId } from '../shared/auth.js';
import { parseSourceReadingsCsv, type SourceColumnMapping } from '../shared/source-csv-parse.js';
import { createSourceStoreFromEnv } from '../shared/dynamo-store.js';
import { commitSourceIngest } from '../shared/source-ingest.js';
import { normalizeSourceReadingInput } from '../shared/source-reading.js';
import { normalizeWaterSourceInput } from '../shared/water-source.js';
import { badRequest, forbidden, ok, unauthorized } from '../shared/http.js';

/**
 * POST /ingest/sources — CSV or single manual source reading (G2).
 * Body:
 *   { csvText, mapping?, dryRun? } — CSV auto-creates missing named sources
 *   { reading, dryRun?, createSources? } — manual requires an existing source by default;
 *     pass createSources=true (+ sourceName) to create on the fly (aligned with CSV)
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
    return badRequest('JSON body with csvText or reading is required');
  }

  let body: {
    csvText?: string;
    mapping?: SourceColumnMapping;
    dryRun?: boolean;
    createSources?: boolean;
    reading?: Record<string, unknown>;
  };
  try {
    body = JSON.parse(event.body) as typeof body;
  } catch {
    return badRequest('Body must be JSON');
  }

  const dryRun = Boolean(body.dryRun);
  const store = createSourceStoreFromEnv();

  if (body.reading && typeof body.reading === 'object') {
    return handleManualReading(
      store,
      tenantId,
      body.reading,
      dryRun,
      Boolean(body.createSources),
    );
  }

  if (!body.csvText?.trim()) {
    return badRequest('csvText or reading is required');
  }

  const result = parseSourceReadingsCsv(body.csvText, body.mapping);
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
    const summary = await commitSourceIngest(store, tenantId, result);
    const sources = await store.listSources(tenantId);
    return ok({
      tenantId,
      mapping: result.mapping,
      ...summary,
      sourcesTracked: sources.length,
    });
  } catch (err) {
    return badRequest(err instanceof Error ? err.message : 'Source ingest failed');
  }
};

async function handleManualReading(
  store: ReturnType<typeof createSourceStoreFromEnv>,
  tenantId: string,
  raw: Record<string, unknown>,
  dryRun: boolean,
  createSources: boolean,
) {
  const sourceId =
    typeof raw.sourceId === 'string' && raw.sourceId.trim() ? raw.sourceId.trim() : null;
  const sourceName =
    typeof raw.sourceName === 'string' && raw.sourceName.trim() ? raw.sourceName.trim() : null;

  let source = sourceId ? await store.getSource(tenantId, sourceId) : null;
  if (!source && sourceName) {
    const all = await store.listSources(tenantId);
    source =
      all.find((s) => s.name.toLowerCase() === sourceName.toLowerCase()) ??
      all.find((s) => s.sourceId === sourceId) ??
      null;
  }
  let sourcesCreated = 0;
  if (!source && createSources && sourceName) {
    const created = normalizeWaterSourceInput(tenantId, {
      name: sourceName,
      type: typeof raw.sourceType === 'string' ? raw.sourceType : 'well',
      sourceId: sourceId ?? undefined,
      unit: typeof raw.unit === 'string' ? raw.unit : 'gal',
      notes: null,
    });
    if (!created.ok) return badRequest(created.error);
    if (!dryRun) await store.putSource(created.source);
    source = created.source;
    sourcesCreated = 1;
  }
  if (!source) {
    return badRequest(
      'Unknown source — create it on /sources first, pass a valid sourceId / sourceName, ' +
        'or set createSources=true (CSV ingest creates missing sources by default).',
    );
  }

  const normalized = normalizeSourceReadingInput(tenantId, raw, {
    sourceId: source.sourceId,
    sourceName: source.name,
  });
  if (!normalized.ok) return badRequest(normalized.error);

  if (dryRun) {
    return ok({ dryRun: true, tenantId, reading: normalized.reading, sourcesCreated });
  }

  await store.putSourceReading(normalized.reading);
  return ok({
    tenantId,
    reading: normalized.reading,
    readingsWritten: 1,
    sourcesCreated,
  });
}
