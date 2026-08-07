import type { AuthedHandler } from "../shared/apigw.js";
import { DEFAULT_BALANCE_THRESHOLDS } from "../shared/balance-alerts.js";
import {
  mergeBalanceThresholds,
  parseThresholdPatch,
} from "../shared/balance-thresholds.js";
import { parseAuthFromClaims, requireTenantId } from "../shared/auth.js";
import {
  createBalanceThresholdStoreFromEnv,
  createMeterStoreFromEnv,
  createSourceStoreFromEnv,
} from "../shared/dynamo-store.js";
import { badRequest, forbidden, ok, unauthorized } from "../shared/http.js";
import { calculateWaterBalance } from "../shared/water-balance.js";

/**
 * Water balance API — Kelly dashboard “In / Out / Unaccounted” live path.
 *
 * GET /balance — live In − Out for a billing period (G3).
 *   Query: period=YYYY-MM (optional; defaults to latest month with data).
 *   Includes effective balanceThresholds (defaults or tenant CFG#).
 * PUT /balance/thresholds — persist per-tenant G4 thresholds (audit who/when).
 * Demo: skip threshold editing for Kelly Stay; show insufficient until both sides exist.
 */
export const handler: AuthedHandler = async (event) => {
  const claims = event.requestContext.authorizer?.jwt?.claims;
  if (!claims || typeof claims !== "object") {
    return unauthorized();
  }

  const auth = parseAuthFromClaims(claims as Record<string, unknown>);
  let tenantId: string;
  try {
    tenantId = requireTenantId(auth);
  } catch (err) {
    return forbidden(err instanceof Error ? err.message : "Forbidden");
  }

  const method = event.requestContext.http.method;
  const path = event.rawPath ?? event.requestContext.http.path ?? "";

  if (method === "PUT" && path.endsWith("/balance/thresholds")) {
    if (!event.body) {
      return badRequest("Body must be JSON with threshold fields");
    }
    let raw: unknown;
    try {
      raw = JSON.parse(event.body);
    } catch {
      return badRequest("Body must be JSON");
    }
    const patch = parseThresholdPatch(raw);
    if (!Object.keys(patch).length) {
      return badRequest(
        "Provide at least one of lossPct, lossGalMin, gainTolerancePct, gainGalMin",
      );
    }

    try {
      const store = createBalanceThresholdStoreFromEnv();
      const existing = await store.getBalanceThresholds(tenantId);
      const merged = mergeBalanceThresholds({ ...existing, ...patch });
      const updatedAt = new Date().toISOString();
      const config = {
        tenantId,
        ...merged,
        updatedAt,
        updatedByUserId: auth.userId,
        updatedByEmail: auth.email,
      };
      await store.putBalanceThresholds(config);
      return ok({
        tenantId,
        thresholds: merged,
        source: "tenant",
        updatedAt,
        updatedByEmail: auth.email,
        defaults: DEFAULT_BALANCE_THRESHOLDS,
      });
    } catch (err) {
      return badRequest(
        err instanceof Error ? err.message : "Failed to save thresholds",
      );
    }
  }

  if (method !== "GET") {
    return badRequest("Method not allowed");
  }

  const periodParam = event.queryStringParameters?.period?.trim();
  // Dashboard prior-year overlay needs up to 24 months; default stays 12 for lighter clients.
  const trendRaw = event.queryStringParameters?.trendMonths?.trim();
  let trendMonths = 12;
  if (trendRaw) {
    const n = Number(trendRaw);
    if (Number.isFinite(n)) {
      trendMonths = Math.min(24, Math.max(6, Math.floor(n)));
    }
  }

  try {
    const meterStore = createMeterStoreFromEnv();
    const sourceStore = createSourceStoreFromEnv();
    const thresholdStore = createBalanceThresholdStoreFromEnv();
    const [sourceReadings, meterReadings, sources, storedThresholds] =
      await Promise.all([
        sourceStore.listSourceReadings(tenantId),
        meterStore.listReadings(tenantId),
        sourceStore.listSources(tenantId),
        thresholdStore.getBalanceThresholds(tenantId),
      ]);

    const balance = calculateWaterBalance(
      tenantId,
      sourceReadings,
      meterReadings,
      {
        period: periodParam,
        trendMonths,
      },
    );
    const thresholds = mergeBalanceThresholds(storedThresholds);
    const nameById = new Map(sources.map((s) => [s.sourceId, s.name]));
    const productionBySource = (balance.productionBySource ?? []).map((row) => ({
      ...row,
      sourceName: nameById.get(row.sourceId) ?? row.sourceName ?? row.sourceId,
    }));
    const trend = balance.trend.map((t) => ({
      ...t,
      productionBySource: (t.productionBySource ?? []).map((row) => ({
        ...row,
        sourceName: nameById.get(row.sourceId) ?? row.sourceName ?? row.sourceId,
      })),
    }));

    return ok({
      ...balance,
      productionBySource,
      trend,
      sourcesConfigured: sources.length,
      live: true,
      balanceThresholds: {
        ...thresholds,
        source: storedThresholds ? "tenant" : "default",
        updatedAt: storedThresholds?.updatedAt ?? null,
        updatedByEmail: storedThresholds?.updatedByEmail ?? null,
      },
    });
  } catch (err) {
    return badRequest(
      err instanceof Error ? err.message : "Balance calculation failed",
    );
  }
};
