import { randomUUID } from "node:crypto";
import type { AuthedHandler } from "../shared/apigw.js";
import {
  assertNoCrossTenantContext,
  templateAgentReply,
  type AgentTurnInput,
} from "../shared/agent-context.js";
import { checkAndIncrementAgentRate } from "../shared/agent-rate-limit.js";
import { pickAgentTool, runAgentTool } from "../shared/agent-tools.js";
import { assessTenantConfidence } from "../shared/alert-engine.js";
import { parseAuthFromClaims, requireTenantId } from "../shared/auth.js";
import { converseText, DEFAULT_BEDROCK_MODEL_ID } from "../shared/bedrock.js";
import {
  createConversationStoreFromEnv,
  createMeterStoreFromEnv,
  createTenantStoreFromEnv,
} from "../shared/dynamo-store.js";
import {
  badRequest,
  forbidden,
  json,
  ok,
  unauthorized,
} from "../shared/http.js";
import { retrieveKnowledge } from "../shared/kb-retrieve.js";
import {
  friendlyMunicipalityName,
  operatorFirstName,
} from "../shared/persona.js";

/** Demo / known slugs when Dynamo tenant list is unavailable. */
const FALLBACK_OTHER_TENANTS = [
  "town-wiley",
  "town-steve",
  "town-of-steve",
  "crwa",
];

async function loadOtherTenantIds(callerTenantId: string): Promise<string[]> {
  try {
    const store = createTenantStoreFromEnv();
    const profiles = await store.listTenantProfiles();
    const ids = profiles
      .map((p) => p.tenantId)
      .filter((id) => id && id !== callerTenantId);
    if (ids.length > 0) return ids;
  } catch {
    // Fall through to static list — isolation still scans URI/path patterns.
  }
  return FALLBACK_OTHER_TENANTS.filter((id) => id !== callerTenantId);
}

/**
 * Conversational agent (Epic E + Feature 014 Cognito JWT RAG).
 *   GET  /agent — Dynamo CONV# history for the caller
 *   POST /agent — isolation → (optional KB/tools) → rate-limit → Converse → CONV#
 *
 * Compose LangChain/FAISS remains Assessment-only at POST /api/rag.
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

  const conv = createConversationStoreFromEnv();
  const method = event.requestContext.http.method;
  const requestId =
    event.headers?.["x-request-id"] ||
    event.requestContext.requestId ||
    randomUUID();

  if (method === "GET") {
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
      request_id: requestId,
    });
  }

  if (method !== "POST") {
    return badRequest(`Unsupported ${method}`);
  }

  if (!event.body) {
    return badRequest("JSON body with message is required");
  }

  let message: string;
  try {
    const parsed = JSON.parse(event.body) as { message?: string };
    if (!parsed.message?.trim()) return badRequest("message is required");
    message = parsed.message.trim().slice(0, 4000);
  } catch {
    return badRequest("Body must be JSON");
  }

  const meterStore = createMeterStoreFromEnv();
  const [locations, readings, prior, otherTenantIds] = await Promise.all([
    meterStore.listLocations(tenantId),
    meterStore.listReadings(tenantId),
    conv.listRecent(tenantId, auth.userId, 12),
    loadOtherTenantIds(tenantId),
  ]);
  const confidence = assessTenantConfidence(readings, locations.length);

  let municipality: string | null = null;
  try {
    const tenantStore = createTenantStoreFromEnv();
    const profile = await tenantStore.getTenantProfile(tenantId);
    municipality = profile?.displayName ?? profile?.mapTown ?? null;
  } catch {
    municipality = null;
  }

  const input: AgentTurnInput = {
    tenantId,
    userId: auth.userId,
    message,
    history: prior.map((m) => ({ role: m.role, text: m.text })),
    confidence,
    municipality,
    operatorEmail: auth.email || null,
  };

  // Isolation before rate charge — forbidden turns must not consume a slot.
  try {
    assertNoCrossTenantContext({
      callerTenantId: tenantId,
      textParts: [
        message,
        ...input.history.map((h) => h.text),
        confidence.plainLanguage,
        confidence.improveHint,
      ],
      otherTenantIds,
    });
  } catch (err) {
    return forbidden(
      err instanceof Error ? err.message : "Isolation violation",
    );
  }

  let reply = templateAgentReply(input);
  let sources: Array<{ source: string; excerpt: string; uri?: string | null }> =
    [];
  let retrievalMode: string | null = null;
  let toolName: string | null = null;
  let tokenUsage: { inputTokens?: number; outputTokens?: number } | null = null;

  const isGreeting =
    /^(hi|hello|hey)\b/i.test(message.trim()) ||
    /\bjust say (a )?(short )?hello\b/i.test(message);
  const needsConfirmGate = reply.needsConfirm;
  const wantsFeatureDeepDive =
    /\b(tell me more|know more|explain (the )?feature|what can i enter|how (do|can) i get a report)\b/i.test(
      message,
    ) || /\bfeature:\s*/i.test(message);
  // Cheapest-first: keep deterministic template replies for Confidence / billing /
  // onboarding / confirm gates — do not overwrite with KB + Converse.
  const templateHandles =
    needsConfirmGate ||
    isGreeting ||
    /\b(onboard|confidence|watch|actionable|thin|solid|cost|billing|price)\b/i.test(
      message,
    );
  const useRagAndModel = !templateHandles || wantsFeatureDeepDive;

  if (useRagAndModel) {
    const tool = pickAgentTool(message);
    toolName = tool === "none" ? null : tool;
    const toolResult =
      tool === "none"
        ? { tool, observation: "" }
        : await runAgentTool(tool, tenantId, message);

    const kb = await retrieveKnowledge({ question: message, tenantId });
    sources = kb.sources;
    retrievalMode = kb.mode;

    // Post-retrieval isolation BEFORE rate charge so blocked turns keep quota.
    try {
      assertNoCrossTenantContext({
        callerTenantId: tenantId,
        textParts: [message, kb.context, toolResult.observation],
        otherTenantIds,
      });
    } catch (err) {
      return forbidden(
        err instanceof Error ? err.message : "Isolation violation",
      );
    }

    const rate = await checkAndIncrementAgentRate(tenantId);
    if (!rate.allowed) {
      return json(429, {
        error: `Assistant rate limit reached (${rate.limit}/hour for this system). Try again next hour.`,
        request_id: requestId,
        remaining: 0,
      });
    }

    const place = friendlyMunicipalityName(tenantId, municipality);
    const first = operatorFirstName({ email: auth.email });
    const system = [
      "You are Water Saver, a calm, friendly assistant for rural Colorado water operators.",
      `You are helping ${first} with water operations for ${place}.`,
      `Address them as ${first} when a greeting or personal note fits naturally — do not overuse the name.`,
      `Never say “tenant” or use internal system ids. Always say “${place}” for the water system.`,
      `Stay inside ${place} only. Never invent other municipalities or customer PII.`,
      "Never claim a confirmed leak from Thin Watch flags. Prefer “worth a look when you can.”",
      "For treatment / chlorine / regulatory questions, prefer Context from colorado-ops or cited knowledge.",
      "If those docs are missing, say you do not have enough information — do not invent dosing rates.",
      "Guidance is not a substitute for a certified operator or CDPHE.",
      "When Context includes CDPHE online URLs, include those live links in your answer.",
      "Cite source filenames and URLs when possible.",
      "Keep answers short and plain-language.",
      wantsFeatureDeepDive
        ? [
            "The operator asked for a deeper feature walkthrough.",
            "Cover, in order when relevant: (1) What can be entered here?",
            "(2) What does this do for their water system?",
            "(3) How can they get a report or export?",
            "(4) One calm next step they can take today.",
            "Invite a follow-up question; stay on this feature until they move on.",
          ].join(" ")
        : "",
      reply.confidenceCoaching,
      "",
      "Tool observation (live, this system only):",
      toolResult.observation || "(none)",
      "",
      "Context:",
      kb.context || "(none)",
    ]
      .filter(Boolean)
      .join("\n");

    const historyText = input.history
      .slice(-6)
      .map((h) => `${h.role}: ${h.text}`)
      .join("\n");

    const polished = await converseText({
      system,
      user: `${historyText}\nuser: ${message}`.trim(),
      maxTokens: wantsFeatureDeepDive ? 500 : 350,
    });

    if (polished) {
      tokenUsage = {
        inputTokens: polished.inputTokens,
        outputTokens: polished.outputTokens,
      };
      reply = {
        ...reply,
        reply: polished.text,
        model: "bedrock",
        modelId: polished.modelId,
      };
    } else if (toolResult.observation || kb.context) {
      const bits = [
        toolResult.observation,
        sources[0]?.uri
          ? `See also: ${sources[0].uri}`
          : sources[0]
            ? `Source: ${sources[0].source}`
            : "",
        reply.confidenceCoaching,
      ].filter(Boolean);
      reply = {
        ...reply,
        reply: bits.join("\n\n"),
        model: "template",
        modelId: null,
      };
    }

    return finishAgentTurn({
      conv,
      tenantId,
      userId: auth.userId,
      message,
      reply,
      sources,
      retrievalMode,
      toolName,
      tokenUsage,
      confidence,
      requestId,
      rateRemaining: rate.remaining,
    });
  }

  // Template-only: rate after isolation so forbidden turns keep quota.
  const rate = await checkAndIncrementAgentRate(tenantId);
  if (!rate.allowed) {
    return json(429, {
      error: `Assistant rate limit reached (${rate.limit}/hour for this system). Try again next hour.`,
      request_id: requestId,
      remaining: 0,
    });
  }

  return finishAgentTurn({
    conv,
    tenantId,
    userId: auth.userId,
    message,
    reply,
    sources,
    retrievalMode,
    toolName,
    tokenUsage,
    confidence,
    requestId,
    rateRemaining: rate.remaining,
  });
};

async function finishAgentTurn(args: {
  conv: ReturnType<typeof createConversationStoreFromEnv>;
  tenantId: string;
  userId: string;
  message: string;
  reply: ReturnType<typeof templateAgentReply>;
  sources: Array<{ source: string; excerpt: string; uri?: string | null }>;
  retrievalMode: string | null;
  toolName: string | null;
  tokenUsage: { inputTokens?: number; outputTokens?: number } | null;
  confidence: ReturnType<typeof assessTenantConfidence>;
  requestId: string;
  rateRemaining: number;
}) {
  console.info(
    JSON.stringify({
      msg: "agent.turn",
      request_id: args.requestId,
      tenant_id: args.tenantId,
      user_id: args.userId,
      retrieval_mode: args.retrievalMode,
      tool: args.toolName,
      model: args.reply.model,
      kb_sources: args.sources.length,
      input_tokens: args.tokenUsage?.inputTokens ?? null,
      output_tokens: args.tokenUsage?.outputTokens ?? null,
      rate_remaining: args.rateRemaining,
    }),
  );

  const now = new Date().toISOString();
  await args.conv.putMessage({
    tenantId: args.tenantId,
    userId: args.userId,
    messageId: randomUUID(),
    role: "user",
    text: args.message,
    createdAt: now,
  });
  await args.conv.putMessage({
    tenantId: args.tenantId,
    userId: args.userId,
    messageId: randomUUID(),
    role: "assistant",
    text: args.reply.reply,
    createdAt: new Date(Date.now() + 1).toISOString(),
    model: args.reply.modelId ?? args.reply.model,
  });

  return ok({
    tenantId: args.tenantId,
    reply: args.reply.reply,
    model: args.reply.model,
    modelId:
      args.reply.modelId ??
      (args.reply.model === "bedrock" ? DEFAULT_BEDROCK_MODEL_ID : null),
    sources: args.sources,
    retrievalMode: args.retrievalMode,
    tool: args.toolName,
    guardrails: args.reply.guardrails,
    needsConfirm: args.reply.needsConfirm,
    confirmPrompt: args.reply.confirmPrompt,
    costNote: args.reply.costNote,
    confidenceCoaching: args.reply.confidenceCoaching,
    confidence: {
      level: args.confidence.level,
      monthsOfHistory: args.confidence.monthsOfHistory,
      coveragePct: args.confidence.coveragePct,
      displayScore: args.confidence.displayScore,
    },
    request_id: args.requestId,
    rateRemaining: args.rateRemaining,
  });
}
