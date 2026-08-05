import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { friendlyMunicipalityName, operatorFirstName } from "./persona.js";

describe("persona helpers", () => {
  it("builds Town/City labels from tenant slugs", () => {
    assert.equal(friendlyMunicipalityName("town-wiley"), "Town of Wiley");
    assert.equal(
      friendlyMunicipalityName("city-fort-morgan"),
      "City of Fort Morgan",
    );
    assert.equal(
      friendlyMunicipalityName("town-wiley", "Town of Wiley"),
      "Town of Wiley",
    );
  });

  it("derives first name from email", () => {
    assert.equal(
      operatorFirstName({ email: "kelly.review@watersaver.local" }),
      "Kelly",
    );
    assert.equal(
      operatorFirstName({ email: "demo.operator@watersaver.local" }),
      "Demo",
    );
  });
});
