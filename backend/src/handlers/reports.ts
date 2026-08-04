import type { AuthedHandler } from '../shared/apigw.js';
import { evaluateAlerts } from '../shared/alert-engine.js';
import { applyAlertStatuses } from '../shared/alert-status.js';
import { parseAuthFromClaims, requireTenantId } from '../shared/auth.js';
import {
  createAlertStatusStoreFromEnv,
  createMeterStoreFromEnv,
  createSourceStoreFromEnv,
  createTenantStoreFromEnv,
} from '../shared/dynamo-store.js';
import { badRequest, csv, forbidden, htmlReport, ok, unauthorized, xlsx } from '../shared/http.js';
import { buildOperationsSummaryHtml } from '../shared/report-summary.js';
import { calculateWaterBalance } from '../shared/water-balance.js';
import {
  buildWorkOrderMapLink,
  buildWorkOrdersCsv,
  buildWorkOrdersXlsxBuffer,
  recommendedActionForRow,
  type WorkOrderRow,
} from '../shared/work-order-export.js';

/**
 * GET /reports/work-orders?format=csv|xlsx — flagged meter work orders with map links.
 * GET /reports/summary?format=html — printable operations summary.
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

  if (event.requestContext.http.method !== 'GET') {
    return badRequest('Only GET is supported');
  }

  const path = event.rawPath ?? event.requestContext.http.path ?? '';
  const appBaseUrl = process.env.APP_BASE_URL ?? '';

  if (path.endsWith('/reports/work-orders')) {
    return workOrdersReport(event, tenantId, appBaseUrl);
  }
  if (path.endsWith('/reports/summary')) {
    return summaryReport(tenantId, appBaseUrl);
  }

  return badRequest('Unknown reports path');
};

async function workOrdersReport(
  event: Parameters<AuthedHandler>[0],
  tenantId: string,
  appBaseUrl: string,
) {
  const format = (event.queryStringParameters?.format ?? 'csv').toLowerCase();
  if (format !== 'csv' && format !== 'xlsx') {
    return badRequest('format must be csv or xlsx');
  }

  const meterStore = createMeterStoreFromEnv();
  const statusStore = createAlertStatusStoreFromEnv();
  const [locations, readings, statuses] = await Promise.all([
    meterStore.listLocations(tenantId),
    meterStore.listReadings(tenantId),
    statusStore.listAlertStatuses(tenantId),
  ]);
  const { alerts } = evaluateAlerts(locations, readings);
  const meterAlerts = applyAlertStatuses(alerts, statuses, { includeResolved: false });

  const locByMeter = new Map(locations.map((l) => [l.meterId, l]));
  const rows: WorkOrderRow[] = meterAlerts.map((a) => {
    const loc = locByMeter.get(a.meterId);
    const base = {
      meterId: a.meterId,
      serviceAddress: a.serviceAddress ?? loc?.serviceAddress,
      occupantName: a.occupantName ?? loc?.occupantName,
      latitude: loc?.latitude ?? null,
      longitude: loc?.longitude ?? null,
      mapLink: buildWorkOrderMapLink(a.meterId, appBaseUrl),
      mode: a.mode,
      type: a.type,
      summary: a.summary,
      confidenceNote: a.confidenceNote,
      status: a.status,
    };
    return {
      ...base,
      recommendedAction: recommendedActionForRow(base),
    };
  });

  const stamp = new Date().toISOString().slice(0, 10);
  if (format === 'xlsx') {
    const buf = buildWorkOrdersXlsxBuffer(rows);
    return xlsx(buf, `work-orders-${tenantId}-${stamp}.xlsx`);
  }
  return csv(buildWorkOrdersCsv(rows), `work-orders-${tenantId}-${stamp}.csv`);
}

async function summaryReport(tenantId: string, _appBaseUrl: string) {
  const meterStore = createMeterStoreFromEnv();
  const sourceStore = createSourceStoreFromEnv();
  const statusStore = createAlertStatusStoreFromEnv();
  const tenantStore = createTenantStoreFromEnv();

  const [locations, readings, sourceReadings, statuses, profile] = await Promise.all([
    meterStore.listLocations(tenantId),
    meterStore.listReadings(tenantId),
    sourceStore.listSourceReadings(tenantId),
    statusStore.listAlertStatuses(tenantId),
    tenantStore.getTenantProfile(tenantId),
  ]);

  const { confidence, alerts } = evaluateAlerts(locations, readings);
  const meterAlerts = applyAlertStatuses(alerts, statuses, { includeResolved: false });
  const balance = calculateWaterBalance(tenantId, sourceReadings, readings);

  const actionableCount = meterAlerts.filter((a) => a.mode === 'Actionable').length;
  const watchCount = meterAlerts.filter((a) => a.mode === 'Watch').length;
  const topAlerts = meterAlerts.slice(0, 10).map((a) => ({
    meterId: a.meterId,
    serviceAddress: a.serviceAddress,
    mode: a.mode,
    summary: a.summary,
    confidenceNote: a.confidenceNote,
  }));

  const html = buildOperationsSummaryHtml({
    tenantId,
    displayName: profile?.displayName ?? tenantId,
    generatedAt: new Date().toISOString(),
    confidence,
    balance,
    openAlertCount: meterAlerts.length,
    actionableCount,
    watchCount,
    topAlerts,
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return htmlReport(html, `operations-summary-${tenantId}-${stamp}.html`);
}
