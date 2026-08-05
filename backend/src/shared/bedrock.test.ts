import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

describe("bedrock helpers", () => {
  const prevEnabled = process.env.BEDROCK_ENABLED;
  const prevModel = process.env.BEDROCK_MODEL_ID;

  afterEach(() => {
    if (prevEnabled === undefined) delete process.env.BEDROCK_ENABLED;
    else process.env.BEDROCK_ENABLED = prevEnabled;
    if (prevModel === undefined) delete process.env.BEDROCK_MODEL_ID;
    else process.env.BEDROCK_MODEL_ID = prevModel;
  });

  it("bedrockEnabled is true by default and false when explicitly disabled", async () => {
    delete process.env.BEDROCK_ENABLED;
    const mod = await import("./bedrock.js");
    assert.equal(mod.bedrockEnabled(), true);

    process.env.BEDROCK_ENABLED = "0";
    const disabled = await import("./bedrock.js");
    assert.equal(disabled.bedrockEnabled(), false);

    process.env.BEDROCK_ENABLED = "false";
    const disabledStr = await import("./bedrock.js");
    assert.equal(disabledStr.bedrockEnabled(), false);
  });

  it("converseText returns null when Bedrock is disabled", async () => {
    process.env.BEDROCK_ENABLED = "0";
    const { converseText } = await import("./bedrock.js");
    const result = await converseText({ system: "sys", user: "hi" });
    assert.equal(result, null);
  });

  it("converseText returns null when SDK call fails (invalid model)", async () => {
    delete process.env.BEDROCK_ENABLED;
    const { converseText } = await import("./bedrock.js");
    // Pass modelId per-call — DEFAULT_BEDROCK_MODEL_ID is fixed at module load.
    const result = await converseText({
      system: "sys",
      user: "hi",
      maxTokens: 16,
      modelId: "amazon.nova-lite-v1:0-does-not-exist-for-ci",
    });
    assert.equal(result, null);
  });
});
