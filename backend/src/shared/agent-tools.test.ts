import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pickAgentTool } from "./agent-tools.js";

describe("agent-tools pickAgentTool", () => {
  it("routes alert questions", () => {
    assert.equal(pickAgentTool("What is Watch vs Actionable?"), "list_alerts");
  });

  it("routes column mapping", () => {
    assert.equal(
      pickAgentTool("Help map CSV columns acct, addr, read"),
      "suggest_column_map",
    );
  });

  it("routes usage / confidence", () => {
    assert.equal(
      pickAgentTool("How is our Confidence and usage history?"),
      "usage_summary",
    );
  });

  it("returns none for open questions", () => {
    assert.equal(pickAgentTool("What is a MOR?"), "none");
  });
});
