import type { AuthedHandler } from "../shared/apigw.js";
import { evaluateAlerts } from "../shared/alert-engine.js";
import { loadTenantConfidence } from "../shared/confidence-refresh.js";
import { mergeConfidence } from "../shared/confidence-store.js";
import {
  explainAlertTemplate,
  explainAlertsBatch,
} from "../shared/alert-explain.js";
import {
  applyAlertStatuses,
  isAlertStatusAction,
  resolveAlertActionTarget,
  sanitizeActionNote,
  sanitizeAlertId,
  statusFromAction,
  type AlertActivityEvent,
  type AlertStatusRecord,
} from "../shared/alert-status.js";
import { randomUUID } from "node:crypto";
import { evaluateBalanceAlerts } from "../shared/balance-alerts.js";
import { mergeBalanceThresholds } from "../shared/balance-thresholds.js";
import { mergeReadingCycle } from "../shared/reading-cycle.js";
import { converseText } from "../shared/bedrock.js";
import { buildFlaggedMetersCsv } from "../shared/flagged-export.js";
import { parseAuthFromClaims, requireTenantId } from "../shared/auth.js";
import {
  createAlertStatusStoreFromEnv,
  createBalanceThresholdStoreFromEnv,
  createLastIngestStoreFromEnv,
  createMeterStoreFromEnv,
  createReadingCycleStoreFromEnv,
  createSourceStoreFromEnv,
} from "../shared/dynamo-store.js";
import {
  badRequest,
  csv,
  forbidden,
  json,
  ok,
  unauthorized,
} from "../shared/http.js";
import { calculateWaterBalance } from "../shared/water-balance.js";

/**
 * Alerts API — Kelly demo: feed → Act (accept/acknowledge) → status + audit.
 *
 * GET /alerts — evaluate open alerts from tenant readings (+ G4 balance alerts),
 * merged with persisted acknowledge/resolve status (C3).
 * GET /alerts?format=csv — flagged meters only (C4), includes confidenceNote on Watch rows.
 * GET /alerts?explain=1 — attach plainLanguage explanations (C6 templates; Bedrock optional).
 * POST /alerts — accept / acknowledge / dispatch / resolve with note + audit (C3).
 * POST /alerts/explain — explain one alertId with optional Bedrock polish.
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

  if (event.requestContext.http.method === "POST") {
    const path = event.rawPath ?? event.requestContext.http.path ?? "";
    if (path.endsWith("/alerts/explain")) {
      return explainOneAlert(event.body, tenantId);
    }
    if (!event.body) {
      return badRequest("Body must be JSON with action and alertId");
    }
    let body: {
      action?: string;
      alertId?: string;
      note?: unknown;
      summary?: unknown;
    };
    try {
      body = JSON.parse(event.body) as typeof body;
    } catch {
      return badRequest("Body must be JSON");
    }

    if (!isAlertStatusAction(body.action)) {
      return badRequest(
        "action must be accept, acknowledge, dispatch, or resolve",
      );
    }
    if (typeof body.alertId !== "string") {
      return badRequest("alertId is required");
    }

    let alertId: string;
    let note: string | null;
    try {
      alertId = sanitizeAlertId(body.alertId);
      note = sanitizeActionNote(body.note);
    } catch (err) {
      return badRequest(
        err instanceof Error ? err.message : "Invalid alert fields",
      );
    }

    // Resolve meter/summary from live evaluation — never trust client meterId.
    let target: ReturnType<typeof resolveAlertActionTarget>;
    try {
      const meterStore = createMeterStoreFromEnv();
      const sourceStore = createSourceStoreFromEnv();
      const thresholdStore = createBalanceThresholdStoreFromEnv();
      const cycleStore = createReadingCycleStoreFromEnv();
      const [locations, readings, sourceReadings, storedThresholds, storedCycle] =
        await Promise.all([
          meterStore.listLocations(tenantId),
          meterStore.listReadings(tenantId),
          sourceStore.listSourceReadings(tenantId),
          thresholdStore.getBalanceThresholds(tenantId),
          cycleStore.getReadingCycle(tenantId),
        ]);
      const storedConfidence = await loadTenantConfidence(tenantId);
      const { alerts } = evaluateAlerts(locations, readings, {
        confidence: storedConfidence,
      });
      const readingCycle = mergeReadingCycle(storedCycle);
      const balance = calculateWaterBalance(tenantId, sourceReadings, readings, {
        cycleCloseDay: readingCycle.cycleCloseDay,
      });
      const thresholds = mergeBalanceThresholds(storedThresholds);
      const balanceAlerts = evaluateBalanceAlerts(balance, {
        mode: "Watch",
        thresholds,
      });
      target = resolveAlertActionTarget(alertId, alerts, balanceAlerts);
    } catch (err) {
      return badRequest(
        err instanceof Error ? err.message : "Failed to resolve alert",
      );
    }

    if (!target) {
      return json(404, {
        error:
          "Alert not found for this system (it may have cleared after new readings)",
      });
    }

    const clientSummary =
      typeof body.summary === "string"
        ? body.summary.trim().slice(0, 500) || null
        : null;
    const summary = target.summary.slice(0, 500) || clientSummary;
    const meterId = target.meterId;

    const status = statusFromAction(body.action);
    const updatedAt = new Date().toISOString();
    const record: AlertStatusRecord = {
      tenantId,
      alertId,
      status,
      actorUserId: auth.userId,
      actorEmail: auth.email,
      updatedAt,
      note,
      meterId,
      summary,
    };

    const activity: AlertActivityEvent | null =
      meterId == null
        ? null
        : {
            tenantId,
            eventId: randomUUID(),
            alertId,
            meterId,
            action: body.action,
            status,
            actorUserId: auth.userId,
            actorEmail: auth.email,
            note,
            summary,
            createdAt: updatedAt,
          };

    try {
      const store = createAlertStatusStoreFromEnv();
      await store.putAlertStatusAndActivity(record, activity);
    } catch (err) {
      return badRequest(
        err instanceof Error ? err.message : "Failed to persist alert status",
      );
    }

    return ok({
      tenantId,
      action: body.action,
      alertId,
      status,
      note,
      meterId,
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
    const cycleStore = createReadingCycleStoreFromEnv();
    const lastIngestStore = createLastIngestStoreFromEnv();
    const [
      locations,
      readings,
      sourceReadings,
      statuses,
      storedThresholds,
      storedCycle,
      lastIngest,
      storedConfidence,
    ] = await Promise.all([
      meterStore.listLocations(tenantId),
      meterStore.listReadings(tenantId),
      sourceStore.listSourceReadings(tenantId),
      statusStore.listAlertStatuses(tenantId),
      thresholdStore.getBalanceThresholds(tenantId),
      cycleStore.getReadingCycle(tenantId),
      lastIngestStore.getLastIngest(tenantId),
      loadTenantConfidence(tenantId),
    ]);
    const { confidence: liveConfidence, alerts } = evaluateAlerts(
      locations,
      readings,
      { confidence: storedConfidence },
    );
    const confidence = mergeConfidence(liveConfidence, storedConfidence);
    const readingCycle = mergeReadingCycle(storedCycle);
    const balance = calculateWaterBalance(tenantId, sourceReadings, readings, {
      cycleCloseDay: readingCycle.cycleCloseDay,
    });
    const thresholds = mergeBalanceThresholds(storedThresholds);
    // Spec §7a: balance alerts stay Watch until H6 balance gating matures.
    const balanceAlerts = evaluateBalanceAlerts(balance, {
      mode: "Watch",
      thresholds,
    });
    const includeResolved =
      event.queryStringParameters?.includeResolved === "1" ||
      event.queryStringParameters?.includeResolved === "true";

    const meterAlerts = applyAlertStatuses(alerts, statuses, {
      includeResolved,
    });

    const format = (event.queryStringParameters?.format ?? "").toLowerCase();
    if (format === "csv") {
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

    const wantExplain =
      event.queryStringParameters?.explain === "1" ||
      event.queryStringParameters?.explain === "true";
    const explanations = wantExplain
      ? explainAlertsBatch(meterAlerts, confidence)
      : undefined;

    return ok({
      tenantId,
      confidence,
      alerts: meterAlerts.map((a) => {
        const exp = explanations?.find((e) => e.alertId === a.id);
        return exp
          ? {
              ...a,
              plainLanguage: exp.plainLanguage,
              explanationSource: exp.source,
            }
          : a;
      }),
      balanceAlerts: applyAlertStatuses(balanceAlerts, statuses, {
        includeResolved,
      }),
      balancePeriod: balance.period,
      balanceThresholds: {
        ...thresholds,
        source: storedThresholds ? "tenant" : "default",
      },
      lastIngest,
      explanations,
    });
  } catch (err) {
    return badRequest(
      err instanceof Error ? err.message : "Failed to evaluate alerts",
    );
  }
};

async function explainOneAlert(bodyRaw: string | undefined, tenantId: string) {
  if (!bodyRaw) return badRequest("JSON body with alertId is required");
  let alertId: string;
  let useBedrock = true;
  try {
    const body = JSON.parse(bodyRaw) as { alertId?: string; bedrock?: boolean };
    if (typeof body.alertId !== "string")
      return badRequest("alertId is required");
    alertId = sanitizeAlertId(body.alertId);
    if (body.bedrock === false) useBedrock = false;
  } catch {
    return badRequest("Body must be JSON");
  }

  try {
    const meterStore = createMeterStoreFromEnv();
    const [locations, readings] = await Promise.all([
      meterStore.listLocations(tenantId),
      meterStore.listReadings(tenantId),
    ]);
    const { confidence, alerts } = evaluateAlerts(locations, readings);
    const alert = alerts.find((a) => a.id === alertId);
    if (!alert)
      return badRequest(
        "Alert not found for this system (or already resolved)",
      );

    let explanation = explainAlertTemplate(alert, confidence);
    if (useBedrock) {
      const polished = await converseText({
        system: [
          "Rewrite this water-utility alert for a rural Colorado clerk in calm plain language.",
          `Tenant ${tenantId} only. Never invent other towns or customer names beyond what is given.`,
          "Never claim a confirmed leak when Confidence is Thin or mode is Watch.",
          `Confidence level: ${confidence.level}.`,
        ].join(" "),
        user: `Summary: ${alert.summary}\nNote: ${alert.confidenceNote}\nTemplate: ${explanation.plainLanguage}`,
        maxTokens: 220,
      });
      if (polished) {
        explanation = {
          ...explanation,
          plainLanguage: polished.text,
          source: "bedrock",
        };
      }
    }
    return ok({
      tenantId,
      explanation,
      bedrockAvailable: explanation.source === "bedrock",
    });
  } catch (err) {
    return badRequest(err instanceof Error ? err.message : "Explain failed");
  }
}
