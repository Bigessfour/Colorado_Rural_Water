import { randomUUID } from 'node:crypto';
import type { AuthedHandler } from '../shared/apigw.js';
import {
  assertNoCrossTenantContext,
  templateAgentReply,
  type AgentTurnInput,
} from '../shared/agent-context.js';
import { assessTenantConfidence } from '../shared/alert-engine.js';
import { parseAuthFromClaims, requireTenantId } from '../shared/auth.js';
import { converseText, DEFAULT_BEDROCK_MODEL_ID } from '../shared/bedrock.js';
import {
  createConversationStoreFromEnv,
  createMeterStoreFromEnv,
} from '../shared/dynamo-store.js';
import { badRequest, forbidden, ok, unauthorized } from '../shared/http.js';

/**
 * Conversational agent (Epic E):
 *   GET  /agent — recent tenant-scoped conversation history for the caller
 *   POST /agent — message + optional confirm; persists history under TENANT# / CONV#
 *
 * Guardrails: cheapest first, cost note, confirm for delete/config, no cross-tenant context.
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

  const conv = createConversationStoreFromEnv();
  const method = event.requestContext.http.method;

  if (method === 'GET') {
    const history = await conv.listRecent(tenantId, auth.userId, 40);
    return ok({
      tenantId,
      userId: auth.userId,
      messages: history.map((m) => ({
        role: m.role,
        text: m.text,
        createdAt: m.createdAt,
        model: m.model ?? null,
      })),
    });
  }

  if (method !== 'POST') {
    return badRequest(`Unsupported ${method}`);
  }

  if (!event.body) {
    return badRequest('JSON body with message is required');
  }

  let message: string;
  try {
    const parsed = JSON.parse(event.body) as { message?: string };
    if (!parsed.message?.trim()) return badRequest('message is required');
    message = parsed.message.trim().slice(0, 4000);
  } catch {
    return badRequest('Body must be JSON');
  }

  const meterStore = createMeterStoreFromEnv();
  const [locations, readings, prior] = await Promise.all([
    meterStore.listLocations(tenantId),
    meterStore.listReadings(tenantId),
    conv.listRecent(tenantId, auth.userId, 12),
  ]);
  const confidence = assessTenantConfidence(readings, locations.length);

  const input: AgentTurnInput = {
    tenantId,
    userId: auth.userId,
    message,
    history: prior.map((m) => ({ role: m.role, text: m.text })),
    confidence,
  };

  // E5: assembled context must not mention other tenant ids.
  try {
    assertNoCrossTenantContext({
      callerTenantId: tenantId,
      textParts: [
        message,
        ...input.history.map((h) => h.text),
        confidence.plainLanguage,
        confidence.improveHint,
      ],
      otherTenantIds: [], // live path does not load other tenants into context
    });
  } catch (err) {
    return forbidden(err instanceof Error ? err.message : 'Isolation violation');
  }

  let reply = templateAgentReply(input);

  // Optional Bedrock polish for free-form questions (cheapest Nova Lite).
  const wantsAi =
    !reply.needsConfirm &&
    !/\b(onboard|confidence|watch|actionable|thin|solid|cost|billing|price)\b/i.test(message);

  if (wantsAi) {
    const system = [
      'You are Water Saver, a calm assistant for rural Colorado water operators.',
      `Stay inside tenant ${tenantId} only. Never invent other municipalities or customer PII.`,
      'Never claim a confirmed leak from Thin Watch flags. Prefer “worth a look when you can.”',
      'Keep answers short and plain-language. Explain cost briefly if suggesting AI-heavy work.',
      reply.confidenceCoaching,
    ].join('\n');
    const historyText = input.history
      .slice(-6)
      .map((h) => `${h.role}: ${h.text}`)
      .join('\n');
    const polished = await converseText({
      system,
      user: `${historyText}\nuser: ${message}`.trim(),
      maxTokens: 350,
    });
    if (polished) {
      reply = {
        ...reply,
        reply: polished.text,
        model: 'bedrock',
        modelId: polished.modelId,
      };
    }
  }

  const now = new Date().toISOString();
  const userMsgId = randomUUID();
  const asstMsgId = randomUUID();
  await conv.putMessage({
    tenantId,
    userId: auth.userId,
    messageId: userMsgId,
    role: 'user',
    text: message,
    createdAt: now,
  });
  await conv.putMessage({
    tenantId,
    userId: auth.userId,
    messageId: asstMsgId,
    role: 'assistant',
    text: reply.reply,
    createdAt: new Date(Date.now() + 1).toISOString(),
    model: reply.modelId ?? reply.model,
  });

  return ok({
    tenantId,
    reply: reply.reply,
    model: reply.model,
    modelId: reply.modelId ?? (reply.model === 'bedrock' ? DEFAULT_BEDROCK_MODEL_ID : null),
    guardrails: reply.guardrails,
    needsConfirm: reply.needsConfirm,
    confirmPrompt: reply.confirmPrompt,
    costNote: reply.costNote,
    confidenceCoaching: reply.confidenceCoaching,
    confidence: {
      level: confidence.level,
      monthsOfHistory: confidence.monthsOfHistory,
      coveragePct: confidence.coveragePct,
      displayScore: confidence.displayScore,
    },
  });
};
