/**
 * Meter alert evaluation + Data Confidence (Kelly demo spine).
 *
 * Talk track:
 * - Watch = look when you can; Actionable stuck/diagnostic may need a field check.
 * - Confidence = history depth + coverage — never “leak accuracy %”.
 * - Thin/Building history keeps statistical flags on Watch (Spec §7b).
 * Do not claim “we found a leak” from Thin Watch rows.
 */

import type { MeterLocation, MeterReading } from "./meter-location.js";

export type AlertMode = "Watch" | "Actionable";
export type ConfidenceLevel = "Thin" | "Building" | "Solid" | "Strong";

export interface TenantAlert {
  id: string;
  type:
    | "unusual_high_usage"
    | "stuck_meter"
    | "sudden_drop"
    | "diagnostic_flag"
    | "statistical_outlier";
  priority: "high" | "medium" | "low";
  mode: AlertMode;
  meterId: string;
  serviceAddress: string;
  occupantName: string | null;
  summary: string;
  confidenceNote: string;
  /** Lifecycle status before C3 merge — engine always emits open. */
  status: "open" | "acknowledged" | "resolved";
}

export interface ConfidenceSnapshot {
  level: ConfidenceLevel;
  monthsOfHistory: number;
  meterCount: number;
  /** Share of configured meters that have ≥1 reading (0–100). Spec §7b. */
  coveragePct: number;
  /** 0–100 display heuristic — never label as leak accuracy %. */
  displayScore: number;
  /** Statistical alerts use Watch until Solid. */
  statisticalMode: AlertMode;
  plainLanguage: string;
  /** Calm next step for operators (H4). */
  improveHint: string;
}

interface MeterSeries {
  location: MeterLocation;
  readings: MeterReading[];
  /** Period usage between consecutive cumulatives (gal). */
  usages: Array<{ from: string; to: string; usage: number }>;
}

/**
 * Tenant Confidence from history depth (Spec §7b Kelly freeze).
 * Thin→Building: ≥3 months AND coverage ≥50%.
 * Building→Solid: ≥6 months.
 * Solid→Strong: ≥12 months AND winter+summer seasonality AND coverage ≥80%.
 * Tune via H8 after Kelly feedback.
 */
export function assessTenantConfidence(
  readings: MeterReading[],
  meterCount: number,
): ConfidenceSnapshot {
  const months = uniqueYearMonths(readings.map((r) => r.timestamp));
  const metersWithData = new Set(readings.map((r) => r.meterId)).size;
  const coveragePct =
    meterCount > 0
      ? Math.min(100, Math.round((metersWithData / meterCount) * 100))
      : metersWithData > 0
        ? 100
        : 0;
  const seasonality = hasWinterAndSummer(readings.map((r) => r.timestamp));

  let level: ConfidenceLevel;
  if (months < 3 || coveragePct < 50) level = "Thin";
  else if (months < 6) level = "Building";
  else if (months < 12 || !seasonality || coveragePct < 80) level = "Solid";
  else level = "Strong";

  const statisticalMode: AlertMode =
    level === "Thin" || level === "Building" ? "Watch" : "Actionable";
  const displayScore = displayScoreFor(level, months, coveragePct);
  const plainLanguage =
    level === "Thin"
      ? "Early data — statistical flags are for watching, not digging yet."
      : level === "Building"
        ? "Useful patterns starting — treat statistical alerts as Watch."
        : level === "Solid"
          ? "Strong enough for Actionable statistical alerts (still verify in the field)."
          : "History is deep enough for firm comparative calls.";
  const improveHint = improveHintFor(level, months, coveragePct, seasonality);

  return {
    level,
    monthsOfHistory: months,
    meterCount,
    coveragePct,
    displayScore,
    statisticalMode,
    plainLanguage,
    improveHint,
  };
}

/**
 * Run all meter detectors for one tenant’s locations + readings.
 * Stuck/diagnostic can be Actionable even on Thin data; peer/high-usage
 * and other statistical rules defer to `confidence.statisticalMode`.
 */
export function evaluateAlerts(
  locations: MeterLocation[],
  readings: MeterReading[],
): { confidence: ConfidenceSnapshot; alerts: TenantAlert[] } {
  const confidence = assessTenantConfidence(readings, locations.length);
  const byMeter = buildSeries(locations, readings);
  const alerts: TenantAlert[] = [];

  for (const series of byMeter.values()) {
    alerts.push(...stuckAlerts(series, confidence));
    alerts.push(...diagnosticAlerts(series, confidence));
    alerts.push(...dropAlerts(series, confidence));
  }

  // Peer / statistical outliers — Watch until Confidence is Solid+.
  alerts.push(...highUsagePeerAlerts([...byMeter.values()], confidence));

  alerts.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
  return { confidence, alerts };
}

function buildSeries(
  locations: MeterLocation[],
  readings: MeterReading[],
): Map<string, MeterSeries> {
  const locById = new Map(locations.map((l) => [l.meterId, l]));
  const grouped = new Map<string, MeterReading[]>();
  for (const r of readings) {
    const list = grouped.get(r.meterId) ?? [];
    list.push(r);
    grouped.set(r.meterId, list);
  }

  const out = new Map<string, MeterSeries>();
  for (const [meterId, list] of grouped) {
    const location =
      locById.get(meterId) ??
      ({
        tenantId: list[0]?.tenantId ?? "",
        meterId,
        serviceAddress: list[0]?.serviceAddress ?? "Unknown address",
        occupantName: list[0]?.occupantName ?? null,
        accountNumber: null,
        route: null,
        manufacturer: null,
        model: null,
        serialNumber: null,
        meterSize: null,
        installDate: null,
        meterType: null,
        locationDetail: null,
        radioId: null,
        lastTestedAt: null,
        notes: null,
        latitude: null,
        longitude: null,
        updatedAt: new Date().toISOString(),
      } satisfies MeterLocation);

    const sorted = [...list].sort((a, b) =>
      a.timestamp.localeCompare(b.timestamp),
    );
    const usages: MeterSeries["usages"] = [];
    for (let i = 1; i < sorted.length; i += 1) {
      usages.push({
        from: sorted[i - 1].timestamp,
        to: sorted[i].timestamp,
        usage: sorted[i].cumulativeReading - sorted[i - 1].cumulativeReading,
      });
    }
    out.set(meterId, { location, readings: sorted, usages });
  }
  return out;
}

function stuckAlerts(
  series: MeterSeries,
  confidence: ConfidenceSnapshot,
): TenantAlert[] {
  const { location, readings, usages } = series;
  const latest = readings[readings.length - 1];
  if (!latest) return [];

  const zeroAcross =
    readings.length >= 2 && readings.every((r) => r.cumulativeReading === 0);
  const flatUsage =
    usages.length >= 1 &&
    usages.every((u) => u.usage === 0) &&
    latest.cumulativeReading === 0;
  const nrFlag = latest.diagnosticFlags.some((f) => /^nr$/i.test(f));

  if (!zeroAcross && !flatUsage && !nrFlag) return [];

  return [
    {
      id: `stuck-${location.meterId}`,
      type: "stuck_meter",
      priority: "high",
      mode: "Actionable",
      meterId: location.meterId,
      serviceAddress: location.serviceAddress,
      occupantName: location.occupantName,
      summary: `Meter ${location.meterId} at ${location.serviceAddress} looks stuck or non-registering (0 / NR).`,
      confidenceNote:
        "Deterministic meter signal — Actionable even with thin history",
      status: "open",
    },
  ];
}

function diagnosticAlerts(
  series: MeterSeries,
  _confidence: ConfidenceSnapshot,
): TenantAlert[] {
  const { location, readings } = series;
  const latest = readings[readings.length - 1];
  if (!latest) return [];
  const leakish = latest.diagnosticFlags.filter(
    (f) => /^l$/i.test(f) || /leak/i.test(f),
  );
  if (!leakish.length) return [];

  return [
    {
      id: `diag-${location.meterId}-${latest.timestamp}`,
      type: "diagnostic_flag",
      priority: "medium",
      // Spec §7b / H6: hardware diag bits stay Actionable with a clear why (not a leak model).
      mode: "Actionable",
      meterId: location.meterId,
      serviceAddress: location.serviceAddress,
      occupantName: location.occupantName,
      summary: `Handheld diagnostic flag on meter ${location.meterId} at ${location.serviceAddress}: ${leakish.join(", ")}.`,
      confidenceNote:
        "Hardware diagnostic bit — Actionable even with thin history (not a leak model)",
      status: "open",
    },
  ];
}

function dropAlerts(
  series: MeterSeries,
  confidence: ConfidenceSnapshot,
): TenantAlert[] {
  const { location, usages } = series;
  const last = usages[usages.length - 1];
  if (!last || last.usage >= 0) return [];
  // Large reverse of cumulative usually means meter swap / bad read — flag it.
  if (Math.abs(last.usage) < 1000) return [];

  return [
    {
      id: `drop-${location.meterId}-${last.to}`,
      type: "sudden_drop",
      priority: "medium",
      mode: confidence.statisticalMode,
      meterId: location.meterId,
      serviceAddress: location.serviceAddress,
      occupantName: location.occupantName,
      summary: `Sudden drop in cumulative reading for meter ${location.meterId} at ${location.serviceAddress} (${last.usage} ${"gal"}). Check for meter change or bad read.`,
      confidenceNote: `${confidence.level} history — ${confidence.statisticalMode}`,
      status: "open",
    },
  ];
}

function highUsagePeerAlerts(
  seriesList: MeterSeries[],
  confidence: ConfidenceSnapshot,
): TenantAlert[] {
  const latestUsages: Array<{
    series: MeterSeries;
    usage: number;
    to: string;
  }> = [];
  for (const s of seriesList) {
    const last = s.usages[s.usages.length - 1];
    if (!last || last.usage <= 0) continue;
    latestUsages.push({ series: s, usage: last.usage, to: last.to });
  }
  if (latestUsages.length < 2) return [];

  // Peer by route when available; else all meters.
  const byRoute = new Map<string, typeof latestUsages>();
  for (const row of latestUsages) {
    const route = row.series.location.route?.trim() || "_all";
    const list = byRoute.get(route) ?? [];
    list.push(row);
    byRoute.set(route, list);
  }

  const alerts: TenantAlert[] = [];
  for (const peers of byRoute.values()) {
    if (peers.length < 2) continue;
    const median = medianOf(peers.map((p) => p.usage));
    if (median <= 0) continue;
    for (const p of peers) {
      if (p.usage < median * 2.5) continue;
      const ratio = (p.usage / median).toFixed(1);
      const { location } = p.series;
      alerts.push({
        id: `high-${location.meterId}-${p.to}`,
        type: "unusual_high_usage",
        priority: "high",
        mode: confidence.statisticalMode,
        meterId: location.meterId,
        serviceAddress: location.serviceAddress,
        occupantName: location.occupantName,
        summary: `Meter ${location.meterId} at ${location.serviceAddress} used ~${ratio}× typical for this route (${p.usage.toLocaleString()} gal). Possible leak or irrigation change.`,
        confidenceNote: `${confidence.level} (~${confidence.monthsOfHistory} mo) — ${confidence.statisticalMode}`,
        status: "open",
      });
    }
  }
  return alerts;
}

function uniqueYearMonths(timestamps: string[]): number {
  const set = new Set<string>();
  for (const ts of timestamps) {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) continue;
    set.add(`${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`);
  }
  return set.size;
}

/** Winter (Dec–Feb) and summer (Jun–Aug) both represented — Spec §7b Strong gate. */
function hasWinterAndSummer(timestamps: string[]): boolean {
  let winter = false;
  let summer = false;
  for (const ts of timestamps) {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) continue;
    const m = d.getUTCMonth(); // 0–11
    if (m === 11 || m <= 1) winter = true;
    if (m >= 5 && m <= 7) summer = true;
  }
  return winter && summer;
}

function displayScoreFor(
  level: ConfidenceLevel,
  months: number,
  coveragePct: number,
): number {
  const base =
    level === "Thin"
      ? 28
      : level === "Building"
        ? 55
        : level === "Solid"
          ? 82
          : 94;
  const monthBump = Math.min(8, Math.max(0, months - 1));
  const coverBump = Math.min(6, Math.round(coveragePct / 20));
  return Math.min(99, base + monthBump + coverBump);
}

function improveHintFor(
  level: ConfidenceLevel,
  months: number,
  coveragePct: number,
  seasonality: boolean,
): string {
  if (coveragePct < 50) {
    return "Upload readings for more meters so coverage reaches about 50%.";
  }
  if (level === "Thin") {
    const need = Math.max(1, 3 - months);
    return `Upload about ${need} more monthly cycle${need === 1 ? "" : "s"} to reach Building.`;
  }
  if (level === "Building") {
    const need = Math.max(1, 6 - months);
    return `About ${need} more similar month${need === 1 ? "" : "s"} toward Solid confidence for usage outliers.`;
  }
  if (level === "Solid" && !seasonality) {
    return "Add a colder-season and warmer-season cycle to reach Strong.";
  }
  if (level === "Solid" && coveragePct < 80) {
    return "Raise meter coverage toward 80% for Strong confidence.";
  }
  if (level === "Solid") {
    return "Keep loading monthly cycles — Strong needs ~12 months plus both seasons.";
  }
  return "Keep verifying Actionable flags in the field; history is already deep.";
}

function medianOf(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (!sorted.length) return 0;
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

function priorityRank(p: TenantAlert["priority"]): number {
  return p === "high" ? 0 : p === "medium" ? 1 : 2;
}
