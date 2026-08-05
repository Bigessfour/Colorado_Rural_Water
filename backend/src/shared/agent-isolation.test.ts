import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertNoCrossTenantContext,
  detectNeedsConfirm,
  findCrossTenantLeaks,
  templateAgentReply,
} from "./agent-context.js";
import { explainAlertTemplate } from "./alert-explain.js";
import type { ConfidenceSnapshot } from "./alert-engine.js";
import { MemoryConversationStore } from "./conversation.js";
import {
  buildCrwaRollupRow,
  sanitizeRollupForResponse,
} from "./crwa-rollup.js";
import type { TenantProfile } from "./tenant-admin.js";

const thinConfidence: ConfidenceSnapshot = {
  level: "Thin",
  monthsOfHistory: 1,
  meterCount: 10,
  coveragePct: 40,
  displayScore: 20,
  statisticalMode: "Watch",
  plainLanguage: "Thin history",
  improveHint: "Upload a few more cycles.",
};

describe("agent isolation (E5)", () => {
  it("flags foreign tenant ids in context", () => {
    const leaks = findCrossTenantLeaks({
      callerTenantId: "town-wiley",
      textParts: ["Help with town-steve meters"],
      otherTenantIds: ["town-steve", "town-wiley"],
    });
    assert.equal(leaks.length, 1);
    assert.match(leaks[0], /town-steve/);
  });

  it("throws on assert when another tenant leaks", () => {
    assert.throws(
      () =>
        assertNoCrossTenantContext({
          callerTenantId: "a",
          textParts: ["see b data"],
          otherTenantIds: ["b"],
        }),
      /isolation/i,
    );
  });

  it("flags foreign tenants/ URI paths even when otherTenantIds is empty", () => {
    const leaks = findCrossTenantLeaks({
      callerTenantId: "town-wiley",
      textParts: [
        "Source: s3://bucket/tenants/town-steve/sop.md — do not share",
      ],
      otherTenantIds: [],
    });
    assert.ok(leaks.some((l) => /town-steve/.test(l)));
  });

  it("flags foreign TENANT# keys in retrieved context", () => {
    const leaks = findCrossTenantLeaks({
      callerTenantId: "town-wiley",
      textParts: ["pk=TENANT#town-of-steve sk=LOC#1"],
      otherTenantIds: [],
    });
    assert.ok(leaks.some((l) => /town-of-steve/.test(l)));
  });

  it("conversation store never mixes tenants", async () => {
    const store = new MemoryConversationStore();
    await store.putMessage({
      tenantId: "t1",
      userId: "u1",
      messageId: "1",
      role: "user",
      text: "hello",
      createdAt: "2026-08-01T00:00:00.000Z",
    });
    await store.putMessage({
      tenantId: "t2",
      userId: "u1",
      messageId: "2",
      role: "user",
      text: "secret other town",
      createdAt: "2026-08-01T00:00:01.000Z",
    });
    const hist = await store.listRecent("t1", "u1");
    assert.equal(hist.length, 1);
    assert.equal(hist[0].tenantId, "t1");
    assert.ok(!hist.some((m) => m.text.includes("other town")));
  });
});

describe("agent guardrails (E4/E6)", () => {
  it("requires confirm for delete language", () => {
    const d = detectNeedsConfirm("please delete source well-1");
    assert.equal(d.needsConfirm, true);
    assert.equal(d.kind, "delete");
  });

  it("coaches Confidence without overclaiming", () => {
    const reply = templateAgentReply({
      tenantId: "town-wiley",
      userId: "u1",
      message: "What does Confidence mean?",
      history: [],
      confidence: thinConfidence,
    });
    assert.match(reply.confidenceCoaching, /Thin/);
    assert.match(reply.reply, /Watch|Thin|leak/i);
    assert.equal(reply.guardrails.noCrossTenantData, true);
    assert.equal(reply.guardrails.cheapestFirst, true);
  });

  it("greets with operator first name and municipality", () => {
    const reply = templateAgentReply({
      tenantId: "town-wiley",
      userId: "u1",
      message: "hi",
      history: [],
      confidence: thinConfidence,
      municipality: "Town of Wiley",
      operatorEmail: "kelly.review@watersaver.local",
    });
    assert.match(reply.reply, /Hi Kelly/);
    assert.match(reply.reply, /Town of Wiley/);
    assert.ok(!/\btenant\b/i.test(reply.reply));
  });
});

describe("alert explanations (C6)", () => {
  it("builds Watch-friendly high usage copy", () => {
    const exp = explainAlertTemplate(
      {
        id: "unusual-m1",
        type: "unusual_high_usage",
        mode: "Watch",
        meterId: "m1",
        summary: "High usage",
        confidenceNote: "Watch",
      },
      thinConfidence,
    );
    assert.equal(exp.source, "template");
    assert.match(exp.plainLanguage, /Watch/);
    assert.ok(!/confirmed leak/i.test(exp.plainLanguage));
  });
});

describe("CRWA roll-up sanitize (D4/G6/H5)", () => {
  it("emits balance + confidence without inventing PII fields", () => {
    const profile: TenantProfile = {
      tenantId: "town-wiley",
      displayName: "Town of Wiley",
      createdAt: "2026-01-01T00:00:00.000Z",
      createdByUserId: "crwa",
      createdByEmail: "staff@crwa.org",
      initialUserEmail: "clerk@wiley.example",
      billingStatus: "pilot",
      billingMode: "pilot",
      planCode: "meters_0_100",
      paymentProvider: "none",
    };
    const row = buildCrwaRollupRow(profile, [], [], []);
    const [clean] = sanitizeRollupForResponse([row]);
    assert.equal(clean.system, "Town of Wiley");
    assert.equal(clean.confidence, "Thin");
    assert.equal(clean.balanceStatus, "insufficient");
    assert.ok(!("occupantName" in clean));
    assert.ok(!("serviceAddress" in clean));
    assert.ok(!("initialUserEmail" in clean));
  });
});
