/**
 * Conversational agent context builders + guardrails (Epic E / E4 / E5 / E6 / H7).
 *
 * Isolation: prompts must only contain the caller's tenantId — never other tenants
 * (`assertNoCrossTenantContext` / `findCrossTenantLeaks` are the hard gate).
 * Demo: never say “we found a leak” from Thin Watch — coach Watch vs Actionable.
 */

import type { ConfidenceSnapshot } from "./alert-engine.js";
import { friendlyMunicipalityName, operatorFirstName } from "./persona.js";

export interface AgentGuardrails {
  cheapestFirst: true;
  requireConfirmForConfig: true;
  multiStepConfirmForDeletes: true;
  noCrossTenantData: true;
  estimatedCostNote: string;
}

export interface AgentTurnInput {
  tenantId: string;
  userId: string;
  message: string;
  /** Optional prior turns already scoped to this tenant+user. */
  history: Array<{ role: "user" | "assistant"; text: string }>;
  confidence: ConfidenceSnapshot | null;
  /** When true, treat as a destructive / config-changing request. */
  confirmToken?: string;
  /** Friendly municipality label (e.g. Town of Wiley). */
  municipality?: string | null;
  /** Operator email for first-name greeting. */
  operatorEmail?: string | null;
}

export interface AgentReply {
  reply: string;
  tenantId: string;
  model: "template" | "bedrock";
  modelId: string | null;
  guardrails: AgentGuardrails;
  needsConfirm: boolean;
  confirmPrompt: string | null;
  costNote: string;
  confidenceCoaching: string;
}

const DELETE_RE = /\b(delete|remove|destroy|wipe|drop)\b/i;
const CONFIG_RE =
  /\b(change|update|set|configure|threshold|invite|suspend|provision)\b/i;

export const AGENT_COST_NOTE =
  "I keep answers short and practical. Any AI use is billed to this Water Saver environment — never to your municipal water customers.";

export function confidenceCoachingCopy(
  confidence: ConfidenceSnapshot | null,
): string {
  if (!confidence) {
    return "Upload a few reading cycles so we can show Data Confidence. Thin history still gets useful Watch flags; we never pretend Thin means a confirmed leak.";
  }
  const { level, monthsOfHistory, coveragePct, statisticalMode, improveHint } =
    confidence;
  return [
    `Your system Confidence is ${level} (~${monthsOfHistory} months of history, ~${coveragePct}% meter coverage).`,
    `Statistical alerts are ${statisticalMode} until history is Solid.`,
    improveHint,
    "I will never say “we found a leak” from Thin Watch flags — prefer “worth a look when you can.”",
  ].join(" ");
}

export function buildAgentGuardrails(): AgentGuardrails {
  return {
    cheapestFirst: true,
    requireConfirmForConfig: true,
    multiStepConfirmForDeletes: true,
    noCrossTenantData: true,
    estimatedCostNote: AGENT_COST_NOTE,
  };
}

export function detectNeedsConfirm(message: string): {
  needsConfirm: boolean;
  kind: "delete" | "config" | null;
  confirmPrompt: string | null;
} {
  if (DELETE_RE.test(message)) {
    return {
      needsConfirm: true,
      kind: "delete",
      confirmPrompt:
        "This sounds like a delete. Reply with CONFIRM DELETE and the exact target (e.g. CONFIRM DELETE source well-1) to proceed. I will not delete across tenants.",
    };
  }
  if (CONFIG_RE.test(message)) {
    return {
      needsConfirm: true,
      kind: "config",
      confirmPrompt:
        "This sounds like a configuration change. Reply with CONFIRM CHANGE and a short description of what to change. I will explain cost/impact first and stay inside your system only.",
    };
  }
  return { needsConfirm: false, kind: null, confirmPrompt: null };
}

/** Onboarding inventory / Confidence expectations (H1 thin + E6). */
export function onboardingInventoryReply(operatorName = "there"): string {
  return [
    `Hi ${operatorName} — I can help you get Water Saver set up for your system.`,
    "Quick data inventory (paths A–D):",
    "A) Current cycle only → we start Thin; stuck/diagnostic flags stay useful; statistical stays Watch.",
    "B) About 1–6 months → Confidence Building; bulk upload welcome.",
    "C) ~6–18 months / two seasons → approaching Solid; comparative alerts can become Actionable.",
    "D) Multi-year archive → prefer bulk/multi-file upload; Confidence Strong faster, still check coverage gaps.",
    "What history can you export today? Any past months or years of meter readings?",
  ].join("\n");
}

export function templateAgentReply(input: AgentTurnInput): AgentReply {
  const guardrails = buildAgentGuardrails();
  const coaching = confidenceCoachingCopy(input.confidence);
  const confirm = detectNeedsConfirm(input.message);
  const lower = input.message.toLowerCase();
  const place = friendlyMunicipalityName(
    input.tenantId,
    input.municipality ?? null,
  );
  const first = operatorFirstName({ email: input.operatorEmail ?? null });

  let reply: string;
  if (
    /\b(onboard|getting started|new system|inventory|history do i need)\b/i.test(
      input.message,
    )
  ) {
    reply = `${onboardingInventoryReply(first)}\n\nFor a guided setup wizard with your town, contacts, meter counts, and export habits, open **Onboarding** in the main menu (or /onboarding).\n\n${coaching}`;
  } else if (
    /\b(confidence|watch|actionable|thin|solid)\b/i.test(input.message)
  ) {
    reply = coaching;
  } else if (/\bcost|billing|price|expensive\b/i.test(lower)) {
    reply = `${AGENT_COST_NOTE}\n\nMembership dues (pilot vs paid) are separate from AI usage — see Billing for status.`;
  } else if (
    confirm.needsConfirm &&
    !/^confirm\s+(delete|change)\b/i.test(input.message.trim())
  ) {
    reply = `${confirm.confirmPrompt}\n\n${coaching}`;
  } else if (/^confirm\s+(delete|change)\b/i.test(input.message.trim())) {
    reply = `Thanks for confirming, ${first}. In this pilot build I explain the step and keep changes inside ${place}; full guided mutations ship as Epic E hardens. Nothing was changed in another municipality.`;
  } else if (
    /^(hi|hello|hey)\b/i.test(input.message.trim()) ||
    /\bjust say (a )?(short )?hello\b/i.test(input.message)
  ) {
    reply = [
      `Hi ${first} — I'm Water Saver, here for day-to-day operations at ${place}.`,
      "Ask about alerts, uploads, water balance, reports, or what to enter on a page.",
      "If something is unclear, tell me which screen you're on and I'll walk through it.",
    ].join("\n\n");
  } else if (
    /\b(tell me more|know more|explain (the )?feature|what can i enter|how (do|can) i get a report)\b/i.test(
      lower,
    ) ||
    /\bfeature:\s*/i.test(input.message)
  ) {
    reply = [
      `Happy to go deeper, ${first}. For ${place}, I'll cover: what you can enter, what it does, and how to get a report or export when one exists.`,
      "Ask a follow-up anytime — or name the page (Dashboard, Upload, Alerts, Meters, Sources, Reports).",
      coaching,
    ].join("\n\n");
  } else {
    // Never embed raw tenantId / TENANT# slugs in operator-facing copy.
    reply = [
      `Hi ${first} — I'm the Water Saver assistant for ${place}.`,
      "I can help with onboarding inventory, Confidence coaching, mapping tips, and plain-language alert explanations.",
      coaching,
      "Ask about Confidence, onboarding history, or paste an alert summary for a calm explanation.",
    ].join("\n\n");
  }

  return {
    reply,
    tenantId: input.tenantId,
    model: "template",
    modelId: null,
    guardrails,
    needsConfirm:
      confirm.needsConfirm &&
      !/^confirm\s+(delete|change)\b/i.test(input.message.trim()),
    confirmPrompt: confirm.confirmPrompt,
    costNote: AGENT_COST_NOTE,
    confidenceCoaching: coaching,
  };
}

/**
 * E5 safety: fail if another tenant id appears in assembled prompt/context.
 * Returns list of violations (empty = ok).
 */
export function findCrossTenantLeaks(params: {
  callerTenantId: string;
  textParts: string[];
  otherTenantIds: string[];
}): string[] {
  const violations: string[] = [];
  const caller = params.callerTenantId.toLowerCase();
  const hay = params.textParts.join("\n").toLowerCase();
  for (const other of params.otherTenantIds) {
    if (!other || other.toLowerCase() === caller) continue;
    const needle = other.toLowerCase();
    if (hay.includes(needle)) {
      violations.push(`Foreign tenant id "${other}" present in agent context`);
    }
  }
  // Belt-and-suspenders: catch KB/S3 URIs even when otherTenantIds was incomplete.
  const pathRe = /tenants\/([a-z0-9][a-z0-9-]*)\//gi;
  let pathMatch: RegExpExecArray | null;
  while ((pathMatch = pathRe.exec(hay)) !== null) {
    const id = pathMatch[1];
    if (id && id !== caller) {
      const msg = `Foreign tenant path "tenants/${id}/" present in agent context`;
      if (!violations.includes(msg)) violations.push(msg);
    }
  }
  const pkRe = /tenant#([a-z0-9][a-z0-9-]*)/gi;
  let pkMatch: RegExpExecArray | null;
  while ((pkMatch = pkRe.exec(hay)) !== null) {
    const id = pkMatch[1];
    if (id && id !== caller) {
      const msg = `Foreign tenant key "TENANT#${id}" present in agent context`;
      if (!violations.includes(msg)) violations.push(msg);
    }
  }
  return violations;
}

export function assertNoCrossTenantContext(params: {
  callerTenantId: string;
  textParts: string[];
  otherTenantIds: string[];
}): void {
  const leaks = findCrossTenantLeaks(params);
  if (leaks.length) {
    throw new Error(`Agent isolation violation: ${leaks.join("; ")}`);
  }
}
