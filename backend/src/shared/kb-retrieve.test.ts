import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { join } from "node:path";
import {
  buildTenantRetrievalFilter,
  retrieveLocalCorpus,
} from "./kb-retrieve.js";

describe("kb-retrieve", () => {
  it("builds shared OR tenant_id metadata filter", () => {
    const f = buildTenantRetrievalFilter("town-wiley");
    assert.equal(f.orAll?.length, 2);
    assert.deepEqual(f.orAll?.[0], {
      equals: { key: "scope", value: "shared" },
    });
    assert.deepEqual(f.orAll?.[1], {
      equals: { key: "tenant_id", value: "town-wiley" },
    });
  });

  it("local corpus finds residual / CDPHE guidance", () => {
    process.env.KNOWLEDGE_LOCAL_DIR = join(process.cwd(), "knowledge");
    const result = retrieveLocalCorpus(
      "What about disinfectant residual for Colorado PWS?",
      "town-wiley",
      4,
    );
    assert.equal(result.mode, "local-corpus");
    assert.ok(result.sources.length > 0);
    assert.match(result.context.toLowerCase(), /residual|cdphe|disinfectant/);
  });
});
