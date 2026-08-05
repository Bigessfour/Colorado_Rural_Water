/**
 * Feature 014 / Pilot+ — live tenant-scoped tools for Cognito /agent.
 * Mutating actions stay out of default tools; confirm gates remain in agent-context.
 */

import { assessTenantConfidence, evaluateAlerts } from "./alert-engine.js";
import { applyAlertStatuses } from "./alert-status.js";
import { evaluateBalanceAlerts } from "./balance-alerts.js";
import { guessColumnMapping } from "./csv-parse.js";
import {
  createAlertStatusStoreFromEnv,
  createMeterStoreFromEnv,
  createSourceStoreFromEnv,
} from "./dynamo-store.js";
import { friendlyMunicipalityName } from "./persona.js";
import { calculateWaterBalance } from "./water-balance.js";

export type AgentToolName =
  | "list_alerts"
  | "get_alert"
  | "get_meter_summary"
  | "usage_summary"
  | "suggest_column_map"
  | "none";

export interface AgentToolResult {
  tool: AgentToolName;
  observation: string;
  /** True when the tool looked up a specific id and found nothing. */
  notFound?: boolean;
}

export function parseAlertId(message: string): string | null {
  const m = message.match(/\balertId\s*[:=]\s*([A-Za-z0-9._-]+)/i);
  return m?.[1]?.trim() || null;
}

export function parseMeterId(message: string): string | null {
  const m = message.match(/\bmeterId\s*[:=]\s*([A-Za-z0-9._-]+)/i);
  return m?.[1]?.trim() || null;
}

/** True when observation (or empty string) must not be filled in by the model. */
export function isEmptyOrNotFoundObservation(
  observation: string,
  notFound?: boolean,
): boolean {
  if (notFound) return true;
  const t = observation.trim();
  if (!t) return true;
  if (
    /\b(not found|no alert with id|no meter with id|not in (your|this) (system'?s? )?data)\b/i.test(
      t,
    )
  ) {
    return true;
  }
  return false;
}

export function pickAgentTool(message: string): AgentToolName {
  const m = message.toLowerCase();
  if (parseAlertId(message) || /\bexplain this (alert|watch)\b/i.test(m)) {
    return "get_alert";
  }
  if (
    parseMeterId(message) &&
    /\b(meter|summary|reading|stuck|usage|explain)\b/i.test(m)
  ) {
    return "get_meter_summary";
  }
  if (/\b(column|map|csv|header|acct|messy upload)\b/.test(m)) {
    return "suggest_column_map";
  }
  if (/\b(usage|trend|gallon|confidence|history depth)\b/.test(m)) {
    return "usage_summary";
  }
  if (/\b(alert|watch|actionable|leak|stuck|flag|balance)\b/.test(m)) {
    return "list_alerts";
  }
  if (parseMeterId(message)) {
    return "get_meter_summary";
  }
  return "none";
}

export async function runAgentTool(
  tool: AgentToolName,
  tenantId: string,
  message: string,
): Promise<AgentToolResult> {
  const place = friendlyMunicipalityName(tenantId);
  if (tool === "none") {
    return { tool, observation: "" };
  }

  if (tool === "suggest_column_map") {
    const headers =
      message.match(/headers?\s*[:=]?\s*([^\n]+)/i)?.[1]?.trim() ||
      "acct, addr, read, date";
    // Stop at sentence end if operator added prose after the list.
    const headerList = headers.split(/(?<=\w)\.\s+/)[0] ?? headers;
    const parts = headerList
      .split(/[,|;]+/)
      .map((h) => h.trim())
      .filter(Boolean);
    const mapping = guessColumnMapping(parts);
    const suggestions = Object.entries(mapping).map(
      ([canonical, raw]) => `${canonical}←${raw}`,
    );
    const unmapped = parts.filter((h) => !Object.values(mapping).includes(h));
    return {
      tool,
      observation: [
        `[${place}] Suggested map for headers [${parts.join(", ")}]:`,
        suggestions.length ? suggestions.join(", ") : "(no confident matches)",
        unmapped.length ? `Unmapped: ${unmapped.join(", ")}` : "",
        "Confirm in Upload before import.",
      ]
        .filter(Boolean)
        .join(" "),
    };
  }

  const meterStore = createMeterStoreFromEnv();
  const sourceStore = createSourceStoreFromEnv();
  const statusStore = createAlertStatusStoreFromEnv();
  const [locations, readings, sourceReadings, statuses] = await Promise.all([
    meterStore.listLocations(tenantId),
    meterStore.listReadings(tenantId),
    sourceStore.listSourceReadings(tenantId),
    statusStore.listAlertStatuses(tenantId),
  ]);
  const confidence = assessTenantConfidence(readings, locations.length);
  const { alerts: meterAlerts } = evaluateAlerts(locations, readings);
  const balance = calculateWaterBalance(tenantId, sourceReadings, readings);
  const balanceAlerts = evaluateBalanceAlerts(balance, {
    mode: "Watch",
  });
  const openMeter = applyAlertStatuses(meterAlerts, statuses).filter(
    (a) => a.status === "open" || a.status === "acknowledged",
  );
  const openBalance = applyAlertStatuses(balanceAlerts, statuses).filter(
    (a) => a.status === "open" || a.status === "acknowledged",
  );

  if (tool === "usage_summary") {
    return {
      tool,
      observation: [
        `[${place}] Data Confidence is ${confidence.level} (~${confidence.monthsOfHistory} months, ~${confidence.coveragePct}% coverage).`,
        `Statistical alerts are ${confidence.statisticalMode} until history is Solid.`,
        confidence.improveHint,
        "Upload recent reading cycles to deepen Confidence — never treat Thin Watch as a confirmed leak.",
      ].join(" "),
    };
  }

  if (tool === "get_alert") {
    const alertId = parseAlertId(message);
    if (!alertId) {
      return {
        tool,
        notFound: true,
        observation: `[${place}] No alertId in the question — not in this system's data for a specific alert.`,
      };
    }
    const meterHit = openMeter.find((a) => a.id === alertId);
    const balanceHit = openBalance.find((a) => a.id === alertId);
    if (meterHit) {
      return {
        tool,
        observation: [
          `[${place}] Alert ${meterHit.id}: ${meterHit.mode} ${meterHit.type}`,
          `Meter ${meterHit.meterId} @ ${meterHit.serviceAddress}.`,
          meterHit.summary,
          meterHit.confidenceNote,
          "Watch = look when you can; never call Thin Watch a confirmed leak.",
        ].join(" "),
      };
    }
    if (balanceHit) {
      return {
        tool,
        observation: [
          `[${place}] Balance alert ${balanceHit.id}: ${balanceHit.mode} ${balanceHit.type}`,
          `Period ${balanceHit.periodLabel}.`,
          balanceHit.summary,
          balanceHit.confidenceNote,
          "Balance Watch is worth verifying readings — not a dig-now order.",
        ].join(" "),
      };
    }
    return {
      tool,
      notFound: true,
      observation: `[${place}] No alert with id ${alertId} in open/acknowledged alerts — not in this system's data.`,
    };
  }

  if (tool === "get_meter_summary") {
    const meterId = parseMeterId(message);
    if (!meterId) {
      return {
        tool,
        notFound: true,
        observation: `[${place}] No meterId in the question — not in this system's data for a specific meter.`,
      };
    }
    const loc = locations.find((l) => l.meterId === meterId);
    if (!loc) {
      return {
        tool,
        notFound: true,
        observation: `[${place}] No meter with id ${meterId} — not in this system's data.`,
      };
    }
    const series = readings
      .filter((r) => r.meterId === meterId)
      .slice()
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const latest = series[series.length - 1];
    const flags = openMeter.filter((a) => a.meterId === meterId);
    return {
      tool,
      observation: [
        `[${place}] Meter ${loc.meterId} @ ${loc.serviceAddress}.`,
        `Readings on file: ${series.length}.`,
        latest
          ? `Latest ${latest.timestamp}: cumulative ${latest.cumulativeReading} ${latest.unit || "gal"}.`
          : "No readings yet.",
        flags.length
          ? `Open flags: ${flags.map((f) => `${f.mode} ${f.type} (${f.id})`).join("; ")}.`
          : "No open meter alerts for this meter.",
        "Never treat Thin Watch as a confirmed leak.",
      ].join(" "),
    };
  }

  // list_alerts — meter + balance
  const watch =
    openMeter.filter((a) => a.mode === "Watch").length +
    openBalance.filter((a) => a.mode === "Watch").length;
  const actionable = openMeter.filter((a) => a.mode === "Actionable").length;
  const meterSamples = openMeter
    .slice(0, 4)
    .map(
      (a) =>
        `- ${a.mode} ${a.type} @ ${a.serviceAddress || a.meterId} [${a.id}]: ${a.summary}`,
    );
  const balanceSamples = openBalance
    .slice(0, 2)
    .map(
      (a) =>
        `- ${a.mode} balance ${a.type} [${a.id}]: ${a.summary}`,
    );
  const samples = [...meterSamples, ...balanceSamples];
  const total = openMeter.length + openBalance.length;
  return {
    tool,
    observation: [
      `[${place}] Open alerts: ${total} (${watch} Watch, ${actionable} Actionable; ${openBalance.length} balance). Confidence ${confidence.level}.`,
      samples.length
        ? samples.join("\n")
        : "No open meter or balance alerts right now.",
      "Watch = look when you can; Actionable stuck/diagnostic may need a field check.",
    ].join("\n"),
  };
}
