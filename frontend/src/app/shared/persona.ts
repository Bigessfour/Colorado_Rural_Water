/** Operator-facing labels for Assistant copy (never echo tenant slugs). */

export function friendlyMunicipalityName(
  tenantId: string | null | undefined,
  displayName?: string | null,
): string {
  const named = displayName?.trim();
  if (named) return named;
  const slug = (tenantId || '').trim().toLowerCase().replace(/_/g, '-');
  if (!slug) return 'your water system';
  const parts = slug.split('-').filter(Boolean);
  if (!parts.length) return 'your water system';
  const title = (t: string) => (t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : t);
  if (parts[0] === 'town' && parts.length > 1) {
    return `Town of ${parts.slice(1).map(title).join(' ')}`;
  }
  if (parts[0] === 'city' && parts.length > 1) {
    return `City of ${parts.slice(1).map(title).join(' ')}`;
  }
  return parts.map(title).join(' ');
}

export function operatorFirstName(opts: {
  email?: string | null;
  fullName?: string | null;
}): string {
  const full = opts.fullName?.trim();
  if (full) return full.split(/\s+/)[0] ?? 'there';
  const email = opts.email?.trim();
  if (email?.includes('@')) {
    const local = email.split('@', 1)[0] ?? '';
    const token = local.split(/[._+\-]/)[0] ?? '';
    if (token && /^[A-Za-z]/.test(token)) {
      return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    }
  }
  return 'there';
}

export function assistantWelcome(opts: {
  tenantId?: string | null;
  displayName?: string | null;
  email?: string | null;
}): string {
  const place = friendlyMunicipalityName(opts.tenantId, opts.displayName);
  const first = operatorFirstName({ email: opts.email });
  return (
    `Hi ${first} — I'm here to help with water operations for ${place}. ` +
    `Ask about treatment, monitoring, or Colorado regs anytime. ` +
    `For dosing or regulatory details I'll stick to our curated notes and the ` +
    `[CDPHE Drinking Water Hub](https://cdphe.colorado.gov/drinking-water).`
  );
}
