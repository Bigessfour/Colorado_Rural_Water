import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hasAnyRole,
  hasRole,
  parseAuthFromClaims,
  parseCognitoGroups,
  requireAnyRole,
  requireTenantId,
} from "./auth.js";
import {
  generateTemporaryPassword,
  normalizeDisplayName,
  normalizeEmail,
  normalizeTenantId,
} from "./tenant-admin.js";

describe("parseCognitoGroups", () => {
  it("parses API Gateway bracketed stringification", () => {
    assert.deepEqual(parseCognitoGroups("[crwa_admins]"), ["crwa_admins"]);
    assert.deepEqual(parseCognitoGroups("[operators,system_admins]"), [
      "operators",
      "system_admins",
    ]);
  });

  it("parses JSON array strings and native arrays", () => {
    assert.deepEqual(parseCognitoGroups('["crwa_admins"]'), ["crwa_admins"]);
    assert.deepEqual(parseCognitoGroups(["operators"]), ["operators"]);
  });

  it("parses API Gateway space-separated multi-group claims", () => {
    assert.deepEqual(parseCognitoGroups("crwa_admins operators"), [
      "crwa_admins",
      "operators",
    ]);
    assert.deepEqual(parseCognitoGroups("[crwa_admins operators]"), [
      "crwa_admins",
      "operators",
    ]);
  });
});

describe("parseAuthFromClaims", () => {
  it("reads tenant and roles from Cognito-style claims", () => {
    const auth = parseAuthFromClaims({
      sub: "user-1",
      email: "clerk@example-town.co.us",
      "custom:tenant_id": "tenant-wiley",
      "cognito:groups": ["operators", "system_admins"],
    });

    assert.equal(auth.userId, "user-1");
    assert.equal(auth.tenantId, "tenant-wiley");
    assert.deepEqual(auth.roles, ["operator", "system_admin"]);
  });

  it("reads roles when API Gateway stringifies cognito:groups", () => {
    const auth = parseAuthFromClaims({
      sub: "crwa-1",
      email: "staff@crwa.org",
      "cognito:groups": "[crwa_admins]",
    });
    assert.deepEqual(auth.roles, ["crwa_admin"]);
  });

  it("requireTenantId blocks missing tenant for operators", () => {
    const auth = parseAuthFromClaims({
      sub: "user-2",
      email: "x@y.z",
      "cognito:groups": ["operators"],
    });
    assert.throws(() => requireTenantId(auth), /Missing tenant_id/);
  });

  it("maps CRWA group and allows missing tenant until selected", () => {
    const auth = parseAuthFromClaims({
      sub: "crwa-1",
      email: "staff@crwa.org",
      "cognito:groups": ["crwa_admins"],
    });
    assert.equal(auth.tenantId, null);
    assert.ok(hasRole(auth, "crwa_admin"));
    assert.throws(() => requireTenantId(auth), /select a tenant context/);
  });

  it("does not grant operator when Cognito groups are empty", () => {
    const auth = parseAuthFromClaims({
      sub: "orphan-1",
      email: "orphan@example.com",
      "custom:tenant_id": "town-wiley",
      "cognito:groups": [],
    });
    assert.deepEqual(auth.roles, []);
    assert.equal(hasRole(auth, "operator"), false);
  });
});

describe("requireAnyRole", () => {
  it("allows system_admin for invite capability", () => {
    const auth = parseAuthFromClaims({
      sub: "a",
      email: "a@b.c",
      "custom:tenant_id": "town-a",
      "cognito:groups": ["system_admins"],
    });
    assert.ok(hasAnyRole(auth, ["system_admin", "crwa_admin"]));
    requireAnyRole(auth, ["system_admin"]);
  });

  it("blocks operator from CRWA provision", () => {
    const auth = parseAuthFromClaims({
      sub: "a",
      email: "a@b.c",
      "custom:tenant_id": "town-a",
      "cognito:groups": ["operators"],
    });
    assert.throws(
      () => requireAnyRole(auth, ["crwa_admin"]),
      /Requires one of/,
    );
  });
});

describe("tenant-admin normalize", () => {
  it("normalizes tenant id slug", () => {
    assert.deepEqual(normalizeTenantId("Town-Wiley"), {
      ok: true,
      tenantId: "town-wiley",
    });
    assert.equal(normalizeTenantId("_registry").ok, false);
    assert.equal(normalizeTenantId("A").ok, false);
  });

  it("validates email and display name", () => {
    assert.deepEqual(normalizeEmail("  Clerk@Town.GOV "), {
      ok: true,
      email: "clerk@town.gov",
    });
    assert.equal(normalizeEmail("not-an-email").ok, false);
    assert.deepEqual(normalizeDisplayName("  Wiley  "), {
      ok: true,
      displayName: "Wiley",
    });
  });

  it("generates policy-friendly temporary passwords", () => {
    const pw = generateTemporaryPassword();
    assert.ok(pw.length >= 12);
    assert.match(pw, /[A-Z]/);
    assert.match(pw, /[a-z]/);
    assert.match(pw, /\d/);
    assert.match(pw, /[!@#$%^&*]/);
  });
});
