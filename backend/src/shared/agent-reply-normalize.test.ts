import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterConversationForClient,
  isSterileAssistantText,
  normalizeOutboundAssistantText,
} from "./agent-reply-normalize.js";

describe("agent-reply-normalize", () => {
  it("flags for-your-system (slug only) intros", () => {
    assert.equal(
      isSterileAssistantText(
        "I am the Water Saver assistant for your system (town-wiley only).",
      ),
      true,
    );
    assert.equal(
      isSterileAssistantText("Confidence measures history depth for Town of Wiley."),
      false,
    );
  });

  it("replaces prompt-echo dumps with fallback", () => {
    const out = normalizeOutboundAssistantText(
      "user: hi\nassistant: hello\nsystem: stay in tenant",
      "fallback",
    );
    assert.equal(out, "fallback");
  });

  it("strips a single assistant: prefix but keeps useful text", () => {
    const out = normalizeOutboundAssistantText(
      "assistant: Confidence is history depth for Town of Wiley.",
      "fallback",
    );
    assert.equal(out, "Confidence is history depth for Town of Wiley.");
  });

  it("falls back on sterile TENANT# / in-tenant echoes", () => {
    assert.equal(isSterileAssistantText("Stay in tenant town-wiley."), true);
    assert.equal(isSterileAssistantText("Scope is TENANT#town-wiley only."), true);
    assert.equal(
      normalizeOutboundAssistantText("user: what is Confidence?", "fallback"),
      "fallback",
    );
  });

  it("keeps place-named multi-line welcome (not sterile)", () => {
    const welcome = [
      "Hi Demo — I'm the Water Saver assistant for Town of Wiley.",
      "I can help with onboarding inventory and Confidence coaching.",
    ].join("\n\n");
    assert.equal(isSterileAssistantText(welcome), false);
    assert.equal(normalizeOutboundAssistantText(welcome, "fallback"), welcome);
  });

  it("filters sterile rows from client history", () => {
    const rows = filterConversationForClient([
      {
        role: "assistant",
        text: "I am the Water Saver assistant for your system (town-wiley only).",
      },
      { role: "user", text: "What is Confidence?" },
      { role: "assistant", text: "History depth, not a leak %." },
      { role: "assistant", text: "   " },
    ]);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].role, "user");
  });
});
