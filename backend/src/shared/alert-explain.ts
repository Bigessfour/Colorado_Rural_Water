/**
 * Plain-language alert explanations (C6).
 * Prefer deterministic templates; optional Bedrock polish when available.
 */

import type { TenantAlert } from './alert-engine.js';
import type { ConfidenceSnapshot } from './alert-engine.js';

export interface AlertExplanation {
  alertId: string;
  plainLanguage: string;
  source: 'template' | 'bedrock';
  neverOverclaim: true;
  confidenceLevel: ConfidenceSnapshot['level'];
}

const TEMPLATES: Record<TenantAlert['type'], (a: TenantAlert, conf: ConfidenceSnapshot) => string> = {
  unusual_high_usage: (a, conf) =>
    conf.statisticalMode === 'Watch'
      ? `Meter ${a.meterId} used more water than usual for this system. With ${conf.level} history (~${conf.monthsOfHistory} months), this is a Watch flag — worth a look when you can, not a dig-now certainty.`
      : `Meter ${a.meterId} used more water than comparable history suggests. Confidence is ${conf.level}, so this can be treated as Actionable: check for leaks, open taps, or a bad read when you next visit.`,
  stuck_meter: (a) =>
    `Meter ${a.meterId} looks stuck (no change between reads). This is usually a hardware or reading issue — Actionable even with thin history. Confirm the register and handheld before digging for a leak.`,
  sudden_drop: (a, conf) =>
    `Meter ${a.meterId} shows a large drop in the cumulative reading. That often means a meter swap, rolled register, or bad entry. Mode is ${a.mode} under ${conf.level} Confidence — verify the numbers before assuming a leak.`,
  diagnostic_flag: (a) =>
    `The handheld reported a diagnostic flag on meter ${a.meterId}. Treat this as Actionable equipment guidance (not a leak model). Follow your usual field check for that flag.`,
  statistical_outlier: (a, conf) =>
    conf.statisticalMode === 'Watch'
      ? `Meter ${a.meterId} is a statistical outlier versus peers. With ${conf.level} Confidence we keep this as Watch so thin history does not push a false dig.`
      : `Meter ${a.meterId} is a clear outlier versus peers with ${conf.level} Confidence. Schedule a field check when practical.`,
};

/** Deterministic rural-operator copy — never claims a confirmed leak. */
export function explainAlertTemplate(
  alert: Pick<TenantAlert, 'id' | 'type' | 'mode' | 'meterId' | 'summary' | 'confidenceNote'>,
  confidence: ConfidenceSnapshot,
): AlertExplanation {
  const builder = TEMPLATES[alert.type];
  const plainLanguage = builder
    ? builder(alert as TenantAlert, confidence)
    : `${alert.summary} (${alert.confidenceNote}). Confidence ${confidence.level} — never treat Thin Watch flags as confirmed leaks.`;

  return {
    alertId: alert.id,
    plainLanguage,
    source: 'template',
    neverOverclaim: true,
    confidenceLevel: confidence.level,
  };
}

export function explainAlertsBatch(
  alerts: Array<Pick<TenantAlert, 'id' | 'type' | 'mode' | 'meterId' | 'summary' | 'confidenceNote'>>,
  confidence: ConfidenceSnapshot,
): AlertExplanation[] {
  return alerts.map((a) => explainAlertTemplate(a, confidence));
}
