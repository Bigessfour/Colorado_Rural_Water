/**
 * Operator-facing labels — never echo tenant slugs as “tenant town-wiley”.
 */

export function friendlyMunicipalityName(
  tenantId: string,
  displayName?: string | null,
): string {
  const named = displayName?.trim();
  if (named) return named;
  const slug = (tenantId || "").trim().toLowerCase().replace(/_/g, "-");
  if (!slug) return "your water system";
  const parts = slug.split("-").filter(Boolean);
  if (!parts.length) return "your water system";
  const title = (t: string) =>
    t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : t;
  if (parts[0] === "town" && parts.length > 1) {
    return `Town of ${parts.slice(1).map(title).join(" ")}`;
  }
  if (parts[0] === "city" && parts.length > 1) {
    return `City of ${parts.slice(1).map(title).join(" ")}`;
  }
  return parts.map(title).join(" ");
}

export function operatorFirstName(opts: {
  email?: string | null;
  fullName?: string | null;
}): string {
  const full = opts.fullName?.trim();
  if (full) return full.split(/\s+/)[0] ?? "there";
  const email = opts.email?.trim();
  if (email?.includes("@")) {
    const local = email.split("@", 1)[0] ?? "";
    const token = local.split(/[._+\-]/)[0] ?? "";
    if (token && /^[A-Za-z]/.test(token)) {
      return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    }
  }
  return "there";
}
