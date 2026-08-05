import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isEmptyOrNotFoundObservation,
  parseAlertId,
  parseMeterId,
  pickAgentTool,
} from "./agent-tools.js";

describe("agent-tools pickAgentTool", () => {
  it("routes alert questions", () => {
    assert.equal(pickAgentTool("What is Watch vs Actionable?"), "list_alerts");
  });

  it("routes alertId deep links to get_alert", () => {
    assert.equal(
      pickAgentTool("Explain this Watch alert. alertId: stuck-1042 Address: Main"),
      "get_alert",
    );
  });

  it("routes meterId summaries to get_meter_summary", () => {
    assert.equal(
      pickAgentTool("Explain this meter meterId: 1042 readings"),
      "get_meter_summary",
    );
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

  it("routes balance keyword to list_alerts", () => {
    assert.equal(pickAgentTool("Any balance Watch right now?"), "list_alerts");
  });

  it("returns none for open questions", () => {
    assert.equal(pickAgentTool("What is a MOR?"), "none");
  });
});

describe("agent-tools parsers", () => {
  it("parses alertId and meterId", () => {
    assert.equal(parseAlertId("alertId: stuck-1042-1"), "stuck-1042-1");
    assert.equal(parseMeterId("meterId=1042"), "1042");
    assert.equal(parseAlertId("no id here"), null);
  });

  it("flags empty / not-found observations", () => {
    assert.equal(isEmptyOrNotFoundObservation(""), true);
    assert.equal(
      isEmptyOrNotFoundObservation("x", true),
      true,
    );
    assert.equal(
      isEmptyOrNotFoundObservation(
        "[Town] No alert with id fake-1 in open/acknowledged alerts — not in this system's data.",
      ),
      true,
    );
    assert.equal(
      isEmptyOrNotFoundObservation(
        "[Town] Open alerts: 2 (1 Watch, 1 Actionable).",
      ),
      false,
    );
  });
});
