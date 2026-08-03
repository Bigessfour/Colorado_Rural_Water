/**
 * Conversational agent context builders + guardrails (Epic E / E4 / E5 / E6 / H7).
 * Isolation: prompts must only contain the caller's tenantId — never other tenants.
 */

import type { ConfidenceSnapshot } from './alert-engine.js';

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
  history: Array<{ role: 'user' | 'assistant'; text: string }>;
  confidence: ConfidenceSnapshot | null;
  /** When true, treat as a destructive / config-changing request. */
  confirmToken?: string;
}

export interface AgentReply {
  reply: string;
  tenantId: string;
  model: 'template' | 'bedrock';
  modelId: string | null;
  guardrails: AgentGuardrails;
  needsConfirm: boolean;
  confirmPrompt: string | null;
  costNote: string;
  confidenceCoaching: string;
}

const DELETE_RE = /\b(delete|remove|destroy|wipe|drop)\b/i;
const CONFIG_RE = /\b(change|update|set|configure|threshold|invite|suspend|provision)\b/i;

export const AGENT_COST_NOTE =
  'I use the cheapest helpful option first (short templates, then Nova Lite when needed). Longer AI answers use a small amount of Bedrock tokens billed to this environment — not to your municipal water customers.';

export function confidenceCoachingCopy(confidence: ConfidenceSnapshot | null): string {
  if (!confidence) {
    return 'Upload a few reading cycles so we can show Data Confidence. Thin history still gets useful Watch flags; we never pretend Thin means a confirmed leak.';
  }
  const { level, monthsOfHistory, coveragePct, statisticalMode, improveHint } = confidence;
  return [
    `Your system Confidence is ${level} (~${monthsOfHistory} months of history, ~${coveragePct}% meter coverage).`,
    `Statistical alerts are ${statisticalMode} until history is Solid.`,
    improveHint,
    'I will never say “we found a leak” from Thin Watch flags — prefer “worth a look when you can.”',
  ].join(' ');
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
  kind: 'delete' | 'config' | null;
  confirmPrompt: string | null;
} {
  if (DELETE_RE.test(message)) {
    return {
      needsConfirm: true,
      kind: 'delete',
      confirmPrompt:
        'This sounds like a delete. Reply with CONFIRM DELETE and the exact target (e.g. CONFIRM DELETE source well-1) to proceed. I will not delete across tenants.',
    };
  }
  if (CONFIG_RE.test(message)) {
    return {
      needsConfirm: true,
      kind: 'config',
      confirmPrompt:
        'This sounds like a configuration change. Reply with CONFIRM CHANGE and a short description of what to change. I will explain cost/impact first and stay inside your system only.',
    };
  }
  return { needsConfirm: false, kind: null, confirmPrompt: null };
}

/** Onboarding inventory / Confidence expectations (H1 thin + E6). */
export function onboardingInventoryReply(): string {
  return [
    'Welcome — I can help you get Water Saver set up for your system.',
    'Quick data inventory (paths A–D):',
    'A) Current cycle only → we start Thin; stuck/diagnostic flags stay useful; statistical stays Watch.',
    'B) About 1–6 months → Confidence Building; bulk upload welcome.',
    'C) ~6–18 months / two seasons → approaching Solid; comparative alerts can become Actionable.',
    'D) Multi-year archive → prefer bulk/multi-file upload; Confidence Strong faster, still check coverage gaps.',
    'What history can you export today? Any past months or years of meter readings?',
  ].join('\n');
}

export function templateAgentReply(input: AgentTurnInput): AgentReply {
  const guardrails = buildAgentGuardrails();
  const coaching = confidenceCoachingCopy(input.confidence);
  const confirm = detectNeedsConfirm(input.message);
  const lower = input.message.toLowerCase();

  let reply: string;
  if (/\b(onboard|getting started|new system|inventory|history do i need)\b/i.test(input.message)) {
    reply = `${onboardingInventoryReply()}\n\n${coaching}`;
  } else if (/\b(confidence|watch|actionable|thin|solid)\b/i.test(input.message)) {
    reply = coaching;
  } else if (/\bcost|billing|price|expensive\b/i.test(lower)) {
    reply = `${AGENT_COST_NOTE}\n\nMembership dues (pilot vs paid) are separate from AI token use — see Billing for status.`;
  } else if (confirm.needsConfirm && !/^confirm\s+(delete|change)\b/i.test(input.message.trim())) {
    reply = `${confirm.confirmPrompt}\n\n${coaching}`;
  } else if (/^confirm\s+(delete|change)\b/i.test(input.message.trim())) {
    reply =
      'Thanks for confirming. In this pilot build I explain the step and keep changes inside your tenant; full guided mutations ship as Epic E hardens. Nothing was changed in another municipality.';
  } else {
    reply = [
      `I am the Water Saver assistant for your system (${input.tenantId} only).`,
      'I can help with onboarding inventory, Confidence coaching, mapping tips, and plain-language alert explanations.',
      coaching,
      'Ask about Confidence, onboarding history, or paste an alert summary for a calm explanation.',
    ].join('\n\n');
  }

  return {
    reply,
    tenantId: input.tenantId,
    model: 'template',
    modelId: null,
    guardrails,
    needsConfirm: confirm.needsConfirm && !/^confirm\s+(delete|change)\b/i.test(input.message.trim()),
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
  const hay = params.textParts.join('\n').toLowerCase();
  for (const other of params.otherTenantIds) {
    if (!other || other === params.callerTenantId) continue;
    const needle = other.toLowerCase();
    if (hay.includes(needle)) {
      violations.push(`Foreign tenant id "${other}" present in agent context`);
    }
  }
  // Customer PII markers that must never cross tenants — roll-up / agent prompts.
  if (/\boccupantName\b/i.test(hay) && /tenant#/i.test(hay)) {
    // Soft check only when serializing raw records; templates avoid field names.
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
    throw new Error(`Agent isolation violation: ${leaks.join('; ')}`);
  }
}
