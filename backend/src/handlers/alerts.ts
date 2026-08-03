import type { AuthedHandler } from '../shared/apigw.js';
import { evaluateAlerts } from '../shared/alert-engine.js';
import {
  applyAlertStatuses,
  isAlertStatusAction,
  sanitizeAlertId,
  statusFromAction,
} from '../shared/alert-status.js';
import { evaluateBalanceAlerts } from '../shared/balance-alerts.js';
import { mergeBalanceThresholds } from '../shared/balance-thresholds.js';
import { buildFlaggedMetersCsv } from '../shared/flagged-export.js';
import { parseAuthFromClaims, requireTenantId } from '../shared/auth.js';
import {
  createAlertStatusStoreFromEnv,
  createBalanceThresholdStoreFromEnv,
  createMeterStoreFromEnv,
  createSourceStoreFromEnv,
} from '../shared/dynamo-store.js';
import { badRequest, csv, forbidden, ok, unauthorized } from '../shared/http.js';
import { calculateWaterBalance } from '../shared/water-balance.js';

/**
 * GET /alerts — evaluate open alerts from tenant readings (+ G4 balance alerts),
 * merged with persisted acknowledge/resolve status (C3).
 * GET /alerts?format=csv — flagged meters only (C4), includes confidenceNote on Watch rows.
 * POST /alerts — acknowledge / resolve with audit who/when under TENANT#.
 */
export const handler: AuthedHandler = async (event) => {
  const claims = event.requestContext.authorizer?.jwt?.claims;
  if (!claims || typeof claims !== 'object') {
    return unauthorized();
  }

  const auth = parseAuthFromClaims(claims as Record<string, unknown>);
  let tenantId: string;
  try {
    tenantId = requireTenantId(auth);
  } catch (err) {
    return forbidden(err instanceof Error ? err.message : 'Forbidden');
  }

  if (event.requestContext.http.method === 'POST') {
    if (!event.body) {
      return badRequest('Body must be JSON with action and alertId');
    }
    let body: { action?: string; alertId?: string };
    try {
      body = JSON.parse(event.body) as { action?: string; alertId?: string };
    } catch {
      return badRequest('Body must be JSON');
    }

    if (!isAlertStatusAction(body.action)) {
      return badRequest('action must be acknowledge or resolve');
    }
    if (typeof body.alertId !== 'string') {
      return badRequest('alertId is required');
    }

    let alertId: string;
    try {
      alertId = sanitizeAlertId(body.alertId);
    } catch (err) {
      return badRequest(err instanceof Error ? err.message : 'Invalid alertId');
    }

    const status = statusFromAction(body.action);
    const updatedAt = new Date().toISOString();
    const record = {
      tenantId,
      alertId,
      status,
      actorUserId: auth.userId,
      actorEmail: auth.email,
      updatedAt,
    };

    try {
      const store = createAlertStatusStoreFromEnv();
      await store.putAlertStatus(record);
    } catch (err) {
      return badRequest(err instanceof Error ? err.message : 'Failed to persist alert status');
    }

    return ok({
      tenantId,
      action: body.action,
      alertId,
      status,
      actorUserId: auth.userId,
      actorEmail: auth.email,
      updatedAt,
      message: `Alert ${status}`,
    });
  }

  try {
    const meterStore = createMeterStoreFromEnv();
    const sourceStore = createSourceStoreFromEnv();
    const statusStore = createAlertStatusStoreFromEnv();
    const thresholdStore = createBalanceThresholdStoreFromEnv();
    const [locations, readings, sourceReadings, statuses, storedThresholds] = await Promise.all([
      meterStore.listLocations(tenantId),
      meterStore.listReadings(tenantId),
      sourceStore.listSourceReadings(tenantId),
      statusStore.listAlertStatuses(tenantId),
      thresholdStore.getBalanceThresholds(tenantId),
    ]);
    const { confidence, alerts } = evaluateAlerts(locations, readings);
    const balance = calculateWaterBalance(tenantId, sourceReadings, readings);
    const thresholds = mergeBalanceThresholds(storedThresholds);
    // Spec §7a: balance alerts stay Watch until H6 balance gating matures.
    const balanceAlerts = evaluateBalanceAlerts(balance, {
      mode: 'Watch',
      thresholds,
    });
    const includeResolved =
      event.queryStringParameters?.includeResolved === '1' ||
      event.queryStringParameters?.includeResolved === 'true';

    const meterAlerts = applyAlertStatuses(alerts, statuses, { includeResolved });

    const format = (event.queryStringParameters?.format ?? '').toLowerCase();
    if (format === 'csv') {
      const body = buildFlaggedMetersCsv(
        meterAlerts.map((a) => ({
          meterId: a.meterId,
          serviceAddress: a.serviceAddress,
          occupantName: a.occupantName,
          mode: a.mode,
          type: a.type,
          summary: a.summary,
          confidenceNote: a.confidenceNote,
          status: a.status,
        })),
      );
      const stamp = new Date().toISOString().slice(0, 10);
      return csv(body, `flagged-meters-${tenantId}-${stamp}.csv`);
    }

    return ok({
      tenantId,
      confidence,
      alerts: meterAlerts,
      balanceAlerts: applyAlertStatuses(balanceAlerts, statuses, { includeResolved }),
      balancePeriod: balance.period,
      balanceThresholds: {
        ...thresholds,
        source: storedThresholds ? 'tenant' : 'default',
      },
    });
  } catch (err) {
    return badRequest(err instanceof Error ? err.message : 'Failed to evaluate alerts');
  }
};
