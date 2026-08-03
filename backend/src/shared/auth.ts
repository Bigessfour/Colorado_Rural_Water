export type TenantRole = 'operator' | 'system_admin' | 'crwa_admin';

export interface AuthContext {
  userId: string;
  email: string;
  tenantId: string | null;
  roles: TenantRole[];
}

/** Claims expected on Cognito ID/access tokens once wired. */
export function parseAuthFromClaims(claims: Record<string, unknown>): AuthContext {
  const rawGroups = claims['cognito:groups'];
  const groups = Array.isArray(rawGroups)
    ? rawGroups.map(String)
    : typeof rawGroups === 'string'
      ? rawGroups.split(',')
      : [];

  const roles: TenantRole[] = [];
  if (groups.includes('operators') || groups.includes('operator')) roles.push('operator');
  if (groups.includes('system_admins') || groups.includes('system_admin')) roles.push('system_admin');
  if (groups.includes('crwa_admins') || groups.includes('crwa_admin')) roles.push('crwa_admin');

  const tenantId =
    typeof claims['custom:tenant_id'] === 'string'
      ? claims['custom:tenant_id']
      : typeof claims.tenant_id === 'string'
        ? claims.tenant_id
        : null;

  return {
    userId: String(claims.sub ?? ''),
    email: String(claims.email ?? ''),
    tenantId,
    roles: roles.length ? roles : ['operator'],
  };
}

/** CRWA admins may lack a tenant; everyone else must have one. */
export function requireTenantId(auth: AuthContext): string {
  if (auth.tenantId) return auth.tenantId;
  if (auth.roles.includes('crwa_admin')) {
    throw new Error('CRWA admin must select a tenant context for this operation');
  }
  throw new Error('Missing tenant_id claim');
}
