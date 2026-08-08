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
      ? `Meter ${a.meterId} used more than usual. With ${conf.level} history (~${conf.monthsOfHistory} mo), this is Watch — look when you can, not dig-now.`
      : `Meter ${a.meterId} used more than peers suggest. At ${conf.level} Confidence, treat as Actionable: check leaks, open taps, or a bad read on your next visit.`,
  stuck_meter: (a) =>
    `Meter ${a.meterId} looks stuck (no change between reads). Usually hardware or a reading issue — Actionable even with thin history. Confirm the register before digging for a leak.`,
  sudden_drop: (a, conf) =>
    `Meter ${a.meterId} shows a large drop in the cumulative reading — often a swap, rolled register, or bad entry. Mode ${a.mode} under ${conf.level} Confidence; verify numbers before assuming a leak.`,
  diagnostic_flag: (a) =>
    `Handheld diagnostic flag on meter ${a.meterId}. Actionable equipment guidance — follow your usual field check for that flag.`,
  statistical_outlier: (a, conf) =>
    conf.statisticalMode === 'Watch'
      ? `Meter ${a.meterId} is an outlier vs peers. At ${conf.level} Confidence we keep this Watch so thin history does not push a false dig.`
      : `Meter ${a.meterId} is a clear outlier vs peers at ${conf.level} Confidence. Schedule a field check when practical.`,
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
