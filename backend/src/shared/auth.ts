/**
 * JWT claim parsing + role/tenant guards (demo isolation one-liner).
 *
 * Demo day: every Lambda reads `custom:tenant_id` from the Cognito JWT via
 * API Gateway — the browser never supplies or switches municipality.
 * See `requireTenantId` and docs/DEMO_WALKTHROUGH.md.
 */

export type TenantRole = "operator" | "system_admin" | "crwa_admin";

/** Roles that may be assigned to municipal users (not CRWA staff). */
export type AssignableTenantRole = "operator" | "system_admin";

export const COGNITO_GROUP_BY_ROLE: Record<TenantRole, string> = {
  operator: "operators",
  system_admin: "system_admins",
  crwa_admin: "crwa_admins",
};

export interface AuthContext {
  userId: string;
  email: string;
  tenantId: string | null;
  roles: TenantRole[];
}

/**
 * Cognito puts groups on the token as a string[].
 * API Gateway HTTP JWT authorizer stringifies arrays — often as `[crwa_admins]`
 * (bracketed, unquoted), a JSON array string, a comma list, or (for multi-group
 * tokens) a space-separated list like `crwa_admins operators`.
 */
export function parseCognitoGroups(raw: unknown): string[] {
  if (Array.isArray(raw))
    return raw
      .map(String)
      .map((g) => g.trim())
      .filter(Boolean);
  if (typeof raw !== "string" || !raw.trim()) return [];
  const s = raw.trim();
  if (s.startsWith("[")) {
    try {
      const parsed = JSON.parse(s) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .map(String)
          .map((g) => g.trim())
          .filter(Boolean);
      }
    } catch {
      // API GW often emits [group_a,group_b] or [group_a group_b] without JSON quotes.
      const inner = s.slice(1, s.endsWith("]") ? -1 : undefined);
      return splitGroupList(inner);
    }
  }
  return splitGroupList(s);
}

/** Split comma- and/or whitespace-separated Cognito group names (names have no spaces). */
function splitGroupList(raw: string): string[] {
  return raw
    .split(/[,\s]+/)
    .map((p) => p.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

/**
 * Map Cognito JWT claims → AuthContext.
 * Tenant comes only from `custom:tenant_id` (or legacy `tenant_id`) on the token.
 */
export function parseAuthFromClaims(
  claims: Record<string, unknown>,
): AuthContext {
  const groups = parseCognitoGroups(
    claims["cognito:groups"] ?? claims["cognito_groups"] ?? claims.groups,
  );

  const roles: TenantRole[] = [];
  if (groups.includes("operators") || groups.includes("operator"))
    roles.push("operator");
  if (groups.includes("system_admins") || groups.includes("system_admin"))
    roles.push("system_admin");
  if (groups.includes("crwa_admins") || groups.includes("crwa_admin"))
    roles.push("crwa_admin");

  const tenantId =
    typeof claims["custom:tenant_id"] === "string"
      ? claims["custom:tenant_id"]
      : typeof claims.tenant_id === "string"
        ? claims.tenant_id
        : null;

  return {
    userId: String(claims.sub ?? ""),
    email: String(claims.email ?? ""),
    tenantId,
    // No default operator — empty Cognito groups must not grant municipal access by implication.
    // Users are assigned to operators / system_admins / crwa_admins on invite (D1–D3).
    roles,
  };
}

export function hasRole(auth: AuthContext, role: TenantRole): boolean {
  return auth.roles.includes(role);
}

export function hasAnyRole(auth: AuthContext, roles: TenantRole[]): boolean {
  return roles.some((role) => auth.roles.includes(role));
}

/** Throws if the caller lacks every listed role (OR semantics). */
export function requireAnyRole(auth: AuthContext, roles: TenantRole[]): void {
  if (!hasAnyRole(auth, roles)) {
    throw new Error(`Requires one of: ${roles.join(", ")}`);
  }
}

export function isAssignableTenantRole(
  value: unknown,
): value is AssignableTenantRole {
  return value === "operator" || value === "system_admin";
}

/** CRWA admins may lack a tenant; everyone else must have one. */
export function requireTenantId(auth: AuthContext): string {
  if (auth.tenantId) return auth.tenantId;
  if (auth.roles.includes("crwa_admin")) {
    throw new Error(
      "CRWA admin must select a tenant context for this operation",
    );
  }
  throw new Error("Missing tenant_id claim");
}
