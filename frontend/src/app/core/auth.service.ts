import { Injectable, computed, signal } from '@angular/core';
import { environment } from '../../environments/environment';

const TOKEN_KEY = 'ws_id_token';
const EMAIL_KEY = 'ws_email';

export type TenantRole = 'operator' | 'system_admin' | 'crwa_admin';

export interface AuthSession {
  idToken: string;
  accessToken: string;
  refreshToken?: string;
  email: string;
  expiresAt: number;
}

export interface MeProfile {
  userId: string;
  email: string;
  tenantId: string | null;
  roles: TenantRole[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly session = signal<AuthSession | null>(this.readStored());
  private readonly profile = signal<MeProfile | null>(null);

  readonly idToken = computed(() => this.session()?.idToken ?? null);
  readonly email = computed(() => this.session()?.email ?? this.profile()?.email ?? null);
  readonly tenantId = computed(() => this.profile()?.tenantId ?? null);
  readonly roles = computed(() => this.profile()?.roles ?? []);
  readonly isLoggedIn = computed(() => {
    const s = this.session();
    return Boolean(s?.idToken && s.expiresAt > Date.now());
  });
  readonly isSystemAdmin = computed(() => this.roles().includes('system_admin'));
  readonly isCrwaAdmin = computed(() => this.roles().includes('crwa_admin'));
  readonly canManageUsers = computed(() => this.isSystemAdmin() || this.isCrwaAdmin());

  async login(email: string, password: string): Promise<void> {
    const endpoint = `https://cognito-idp.${environment.cognito.region}.amazonaws.com/`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-amz-json-1.1',
        'x-amz-target': 'AWSCognitoIdentityProviderService.InitiateAuth',
      },
      body: JSON.stringify({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: environment.cognito.clientId,
        AuthParameters: {
          USERNAME: email.trim(),
          PASSWORD: password,
        },
      }),
    });

    const body = (await res.json()) as {
      AuthenticationResult?: {
        IdToken?: string;
        AccessToken?: string;
        RefreshToken?: string;
        ExpiresIn?: number;
      };
      ChallengeName?: string;
      message?: string;
      __type?: string;
    };

    if (!res.ok) {
      throw new Error(body.message ?? body.__type ?? `Sign-in failed (${res.status})`);
    }
    if (body.ChallengeName) {
      throw new Error(
        `Sign-in needs extra step (${body.ChallengeName}). Ask an admin to set a permanent password.`,
      );
    }

    const idToken = body.AuthenticationResult?.IdToken;
    const accessToken = body.AuthenticationResult?.AccessToken;
    if (!idToken || !accessToken) {
      throw new Error('Sign-in succeeded but no tokens were returned.');
    }

    const expiresIn = body.AuthenticationResult?.ExpiresIn ?? 3600;
    const next: AuthSession = {
      idToken,
      accessToken,
      refreshToken: body.AuthenticationResult?.RefreshToken,
      email: email.trim(),
      expiresAt: Date.now() + expiresIn * 1000 - 60_000,
    };
    this.persist(next);
    this.session.set(next);
    await this.refreshProfile();
  }

  logout(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(EMAIL_KEY);
    this.session.set(null);
    this.profile.set(null);
  }

  /** Prefer live session; fall back to legacy pasted token key. */
  getBearerToken(): string | null {
    if (this.isLoggedIn()) return this.idToken();
    const legacy = sessionStorage.getItem(TOKEN_KEY);
    return legacy?.trim() || null;
  }

  /** Load roles/tenant from GET /me (JWT claims via API). */
  async refreshProfile(): Promise<MeProfile | null> {
    const token = this.getBearerToken();
    if (!token) {
      this.profile.set(null);
      return null;
    }
    try {
      const res = await fetch(`${environment.apiBaseUrl}/me`, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        this.profile.set(null);
        return null;
      }
      const body = (await res.json()) as MeProfile;
      const next: MeProfile = {
        userId: body.userId ?? '',
        email: body.email ?? this.email() ?? '',
        tenantId: body.tenantId ?? null,
        roles: Array.isArray(body.roles) ? body.roles : ['operator'],
      };
      this.profile.set(next);
      return next;
    } catch {
      this.profile.set(null);
      return null;
    }
  }

  private persist(session: AuthSession): void {
    sessionStorage.setItem(TOKEN_KEY, session.idToken);
    sessionStorage.setItem(EMAIL_KEY, session.email);
  }

  private readStored(): AuthSession | null {
    const idToken = sessionStorage.getItem(TOKEN_KEY);
    const email = sessionStorage.getItem(EMAIL_KEY) ?? '';
    if (!idToken) return null;
    // Without refresh wiring yet, assume ~1h from last store; force re-login if decode fails.
    const exp = decodeExpMs(idToken);
    if (exp && exp <= Date.now()) {
      sessionStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return {
      idToken,
      accessToken: '',
      email,
      expiresAt: exp ?? Date.now() + 50 * 60_000,
    };
  }
}

function decodeExpMs(jwt: string): number | null {
  try {
    const payload = jwt.split('.')[1];
    if (!payload) return null;
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as {
      exp?: number;
    };
    return typeof json.exp === 'number' ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}
