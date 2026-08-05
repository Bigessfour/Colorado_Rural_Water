/**
 * Feature 014 — live tenant-scoped tools for Cognito /agent (deterministic router).
 * Mutating actions stay out of default tools; confirm gates remain in agent-context.
 */

import { assessTenantConfidence, evaluateAlerts } from "./alert-engine.js";
import { applyAlertStatuses } from "./alert-status.js";
import { guessColumnMapping } from "./csv-parse.js";
import {
  createAlertStatusStoreFromEnv,
  createMeterStoreFromEnv,
} from "./dynamo-store.js";
import { friendlyMunicipalityName } from "./persona.js";

export type AgentToolName =
  "list_alerts" | "usage_summary" | "suggest_column_map" | "none";

export interface AgentToolResult {
  tool: AgentToolName;
  observation: string;
}

export function pickAgentTool(message: string): AgentToolName {
  const m = message.toLowerCase();
  if (/\b(column|map|csv|header|acct|messy upload)\b/.test(m)) {
    return "suggest_column_map";
  }
  if (/\b(usage|trend|gallon|confidence|history depth)\b/.test(m)) {
    return "usage_summary";
  }
  if (/\b(alert|watch|actionable|leak|stuck|flag)\b/.test(m)) {
    return "list_alerts";
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
      message.match(/headers?\s*[:=]?\s*([^\n.]+)/i)?.[1]?.trim() ||
      "acct, addr, read, date";
    const parts = headers
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
  const [locations, readings] = await Promise.all([
    meterStore.listLocations(tenantId),
    meterStore.listReadings(tenantId),
  ]);
  const confidence = assessTenantConfidence(readings, locations.length);

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

  // list_alerts
  const statusStore = createAlertStatusStoreFromEnv();
  const statuses = await statusStore.listAlertStatuses(tenantId);
  const { alerts } = evaluateAlerts(locations, readings);
  const open = applyAlertStatuses(alerts, statuses).filter(
    (a) => a.status === "open" || a.status === "acknowledged",
  );
  const watch = open.filter((a) => a.mode === "Watch").length;
  const actionable = open.filter((a) => a.mode === "Actionable").length;
  const samples = open
    .slice(0, 5)
    .map(
      (a) =>
        `- ${a.mode} ${a.type} @ ${a.serviceAddress || a.meterId}: ${a.summary}`,
    );
  return {
    tool,
    observation: [
      `[${place}] Open alerts: ${open.length} (${watch} Watch, ${actionable} Actionable). Confidence ${confidence.level}.`,
      samples.length ? samples.join("\n") : "No open meter alerts right now.",
      "Watch = look when you can; Actionable stuck/diagnostic may need a field check.",
    ].join("\n"),
  };
}
