import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeMapCenterFields } from "./tenant-admin.js";

describe("normalizeMapCenterFields", () => {
  it("defaults mapTown to displayName when coords omitted", () => {
    const parsed = normalizeMapCenterFields({}, "Town of Wiley");
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.mapTown, "Town of Wiley");
    assert.equal(parsed.mapCenterLat, null);
    assert.equal(parsed.mapCenterLng, null);
  });

  it("accepts lat/lng pair with default zoom", () => {
    const parsed = normalizeMapCenterFields(
      {
        mapTown: "La Junta, CO",
        mapCenterLat: 37.985,
        mapCenterLng: -103.5438,
      },
      "Town of La Junta",
    );
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.mapTown, "La Junta, CO");
    assert.equal(parsed.mapCenterLat, 37.985);
    assert.equal(parsed.mapCenterLng, -103.5438);
    assert.equal(parsed.mapZoom, 12);
  });

  it("rejects one-sided coords", () => {
    assert.equal(normalizeMapCenterFields({ mapCenterLat: 38 }, "X").ok, false);
  });
});
