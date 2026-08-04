import { Injectable, computed, signal } from '@angular/core';
import { environment } from '../../environments/environment';

const TOKEN_KEY = 'ws_id_token';
const ACCESS_KEY = 'ws_access_token';
const EMAIL_KEY = 'ws_email';

export type TenantRole = 'operator' | 'system_admin' | 'crwa_admin';

export type AuthChallengeName =
  | 'SOFTWARE_TOKEN_MFA'
  | 'SMS_MFA'
  | 'NEW_PASSWORD_REQUIRED'
  | 'MFA_SETUP';

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
  displayName?: string | null;
  mapTown?: string | null;
  mapCenterLat?: number | null;
  mapCenterLng?: number | null;
  mapZoom?: number | null;
}

export interface PendingAuthChallenge {
  challengeName: AuthChallengeName;
  session: string;
  email: string;
  challengeParameters: Record<string, string>;
}

export type LoginResult =
  | { status: 'signed_in' }
  | { status: 'challenge'; challenge: PendingAuthChallenge };

export interface MfaStatus {
  preferredMfa: string | null;
  enabledFactors: string[];
  softwareTokenEnabled: boolean;
}

export interface TotpSetupStart {
  secretCode: string;
  otpauthUrl: string;
}

interface CognitoAuthResult {
  IdToken?: string;
  AccessToken?: string;
  RefreshToken?: string;
  ExpiresIn?: number;
}

interface CognitoJson {
  AuthenticationResult?: CognitoAuthResult;
  ChallengeName?: string;
  Session?: string;
  ChallengeParameters?: Record<string, string>;
  SecretCode?: string;
  Status?: string;
  UserMFASettingList?: string[];
  PreferredMfaSetting?: string;
  message?: string;
  __type?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly session = signal<AuthSession | null>(this.readStored());
  private readonly profile = signal<MeProfile | null>(null);

  readonly idToken = computed(() => this.session()?.idToken ?? null);
  readonly accessToken = computed(() => this.session()?.accessToken || null);
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
  readonly mapCenter = computed(() => {
    const p = this.profile();
    if (
      p &&
      typeof p.mapCenterLat === 'number' &&
      typeof p.mapCenterLng === 'number' &&
      Number.isFinite(p.mapCenterLat) &&
      Number.isFinite(p.mapCenterLng)
    ) {
      return {
        lat: p.mapCenterLat,
        lng: p.mapCenterLng,
        zoom: typeof p.mapZoom === 'number' ? p.mapZoom : 12,
        town: p.mapTown ?? p.displayName ?? null,
      };
    }
    return null;
  });

  async login(email: string, password: string): Promise<LoginResult> {
    const body = await this.cognito('InitiateAuth', {
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: environment.cognito.clientId,
      AuthParameters: {
        USERNAME: email.trim(),
        PASSWORD: password,
      },
    });

    return this.consumeAuthResponse(body, email.trim());
  }

  async respondToMfaChallenge(challenge: PendingAuthChallenge, code: string): Promise<LoginResult> {
    const trimmed = code.replace(/\s+/g, '');
    if (!/^\d{6}$/.test(trimmed)) {
      throw new Error('Enter the 6-digit code from your authenticator app.');
    }

    const challengeResponses: Record<string, string> = {
      USERNAME: challenge.email,
    };
    if (challenge.challengeName === 'SOFTWARE_TOKEN_MFA') {
      challengeResponses['SOFTWARE_TOKEN_MFA_CODE'] = trimmed;
    } else if (challenge.challengeName === 'SMS_MFA') {
      challengeResponses['SMS_MFA_CODE'] = trimmed;
    } else {
      throw new Error(`Unsupported MFA challenge: ${challenge.challengeName}`);
    }

    const body = await this.cognito('RespondToAuthChallenge', {
      ClientId: environment.cognito.clientId,
      ChallengeName: challenge.challengeName,
      Session: challenge.session,
      ChallengeResponses: challengeResponses,
    });

    return this.consumeAuthResponse(body, challenge.email);
  }

  async respondToNewPassword(
    challenge: PendingAuthChallenge,
    newPassword: string,
  ): Promise<LoginResult> {
    if (challenge.challengeName !== 'NEW_PASSWORD_REQUIRED') {
      throw new Error('Not waiting for a new password.');
    }
    assertPasswordPolicy(newPassword);

    const body = await this.cognito('RespondToAuthChallenge', {
      ClientId: environment.cognito.clientId,
      ChallengeName: 'NEW_PASSWORD_REQUIRED',
      Session: challenge.session,
      ChallengeResponses: {
        USERNAME: challenge.email,
        NEW_PASSWORD: newPassword,
      },
    });

    return this.consumeAuthResponse(body, challenge.email);
  }

  /**
   * Login-time MFA_SETUP (pool requires MFA before tokens). Uses session-based
   * AssociateSoftwareToken / VerifySoftwareToken, then RespondToAuthChallenge.
   */
  async startLoginTotpSetup(challenge: PendingAuthChallenge): Promise<{
    secretCode: string;
    otpauthUrl: string;
    session: string;
  }> {
    if (challenge.challengeName !== 'MFA_SETUP') {
      throw new Error('Not waiting for MFA setup.');
    }
    const body = await this.cognito('AssociateSoftwareToken', {
      Session: challenge.session,
    });
    const secretCode = body.SecretCode;
    if (!secretCode) throw new Error('Cognito did not return an authenticator secret.');
    const session = body.Session ?? challenge.session;
    return {
      secretCode,
      otpauthUrl: buildOtpauthUrl(challenge.email, secretCode),
      session,
    };
  }

  async completeLoginTotpSetup(
    challenge: PendingAuthChallenge,
    associateSession: string,
    code: string,
  ): Promise<LoginResult> {
    const trimmed = code.replace(/\s+/g, '');
    if (!/^\d{6}$/.test(trimmed)) {
      throw new Error('Enter the 6-digit code from your authenticator app.');
    }

    const verified = await this.cognito('VerifySoftwareToken', {
      Session: associateSession,
      UserCode: trimmed,
      FriendlyDeviceName: 'Water Saver authenticator',
    });
    if (verified.Status && verified.Status !== 'SUCCESS') {
      throw new Error('Authenticator code was rejected. Check the time on your phone and try again.');
    }

    const body = await this.cognito('RespondToAuthChallenge', {
      ClientId: environment.cognito.clientId,
      ChallengeName: 'MFA_SETUP',
      Session: verified.Session ?? associateSession,
      ChallengeResponses: {
        USERNAME: challenge.email,
      },
    });

    return this.consumeAuthResponse(body, challenge.email);
  }

  async changePassword(previousPassword: string, proposedPassword: string): Promise<void> {
    const access = this.requireAccessToken();
    assertPasswordPolicy(proposedPassword);
    await this.cognito('ChangePassword', {
      AccessToken: access,
      PreviousPassword: previousPassword,
      ProposedPassword: proposedPassword,
    });
  }

  async getMfaStatus(): Promise<MfaStatus> {
    const access = this.requireAccessToken();
    const body = await this.cognito('GetUser', { AccessToken: access });
    const enabledFactors = Array.isArray(body.UserMFASettingList) ? body.UserMFASettingList : [];
    return {
      preferredMfa: body.PreferredMfaSetting ?? null,
      enabledFactors,
      softwareTokenEnabled: enabledFactors.includes('SOFTWARE_TOKEN_MFA'),
    };
  }

  async startTotpSetup(): Promise<TotpSetupStart> {
    const access = this.requireAccessToken();
    const body = await this.cognito('AssociateSoftwareToken', { AccessToken: access });
    const secretCode = body.SecretCode;
    if (!secretCode) throw new Error('Cognito did not return an authenticator secret.');
    const email = this.email() ?? 'operator';
    return {
      secretCode,
      otpauthUrl: buildOtpauthUrl(email, secretCode),
    };
  }

  async verifyAndEnableTotp(code: string): Promise<void> {
    const access = this.requireAccessToken();
    const trimmed = code.replace(/\s+/g, '');
    if (!/^\d{6}$/.test(trimmed)) {
      throw new Error('Enter the 6-digit code from your authenticator app.');
    }

    const verified = await this.cognito('VerifySoftwareToken', {
      AccessToken: access,
      UserCode: trimmed,
      FriendlyDeviceName: 'Water Saver authenticator',
    });
    if (verified.Status && verified.Status !== 'SUCCESS') {
      throw new Error('Authenticator code was rejected. Check the time on your phone and try again.');
    }

    await this.cognito('SetUserMFAPreference', {
      AccessToken: access,
      SoftwareTokenMfaSettings: {
        Enabled: true,
        PreferredMfa: true,
      },
    });
  }

  /**
   * Disable authenticator MFA only after re-proving the account password
   * (stolen access token alone must not strip MFA).
   */
  async disableSoftwareMfa(password: string): Promise<void> {
    const email = this.email();
    if (!email) throw new Error('Sign in again before changing MFA.');
    if (!password.trim()) throw new Error('Enter your current password to turn off MFA.');

    // Step-up: prove password still works before stripping MFA.
    const probe = await this.cognito('InitiateAuth', {
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: environment.cognito.clientId,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    });
    if (probe.ChallengeName === 'SOFTWARE_TOKEN_MFA' || probe.ChallengeName === 'SMS_MFA') {
      // Password accepted (MFA challenge means credentials were valid).
    } else if (!probe.AuthenticationResult?.AccessToken && !probe.ChallengeName) {
      throw new Error('Could not verify password.');
    } else if (
      probe.ChallengeName &&
      probe.ChallengeName !== 'SOFTWARE_TOKEN_MFA' &&
      probe.ChallengeName !== 'SMS_MFA' &&
      probe.ChallengeName !== 'NEW_PASSWORD_REQUIRED' &&
      probe.ChallengeName !== 'MFA_SETUP'
    ) {
      throw new Error(`Unexpected sign-in challenge while verifying password (${probe.ChallengeName}).`);
    }

    const access = this.requireAccessToken();
    await this.cognito('SetUserMFAPreference', {
      AccessToken: access,
      SoftwareTokenMfaSettings: {
        Enabled: false,
        PreferredMfa: false,
      },
    });
  }

  logout(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(ACCESS_KEY);
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

  getAccessToken(): string | null {
    const fromSession = this.session()?.accessToken?.trim();
    if (fromSession) return fromSession;
    return sessionStorage.getItem(ACCESS_KEY)?.trim() || null;
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
        displayName: body.displayName ?? null,
        mapTown: body.mapTown ?? null,
        mapCenterLat: typeof body.mapCenterLat === 'number' ? body.mapCenterLat : null,
        mapCenterLng: typeof body.mapCenterLng === 'number' ? body.mapCenterLng : null,
        mapZoom: typeof body.mapZoom === 'number' ? body.mapZoom : null,
      };
      this.profile.set(next);
      return next;
    } catch {
      this.profile.set(null);
      return null;
    }
  }

  private async consumeAuthResponse(body: CognitoJson, email: string): Promise<LoginResult> {
    if (body.ChallengeName && body.Session) {
      const name = body.ChallengeName as AuthChallengeName;
      if (
        name !== 'SOFTWARE_TOKEN_MFA' &&
        name !== 'SMS_MFA' &&
        name !== 'NEW_PASSWORD_REQUIRED' &&
        name !== 'MFA_SETUP'
      ) {
        throw new Error(
          `Sign-in needs extra step (${body.ChallengeName}). Ask an admin for help.`,
        );
      }
      return {
        status: 'challenge',
        challenge: {
          challengeName: name,
          session: body.Session,
          email,
          challengeParameters: body.ChallengeParameters ?? {},
        },
      };
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
      email,
      expiresAt: Date.now() + expiresIn * 1000 - 60_000,
    };
    this.persist(next);
    this.session.set(next);
    await this.refreshProfile();
    return { status: 'signed_in' };
  }

  private requireAccessToken(): string {
    const access = this.getAccessToken();
    if (!access) {
      throw new Error('Sign in again to manage password or MFA (access token missing).');
    }
    return access;
  }

  private async cognito(target: string, payload: Record<string, unknown>): Promise<CognitoJson> {
    const endpoint = `https://cognito-idp.${environment.cognito.region}.amazonaws.com/`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-amz-json-1.1',
        'x-amz-target': `AWSCognitoIdentityProviderService.${target}`,
      },
      body: JSON.stringify(payload),
    });
    const body = (await res.json()) as CognitoJson;
    if (!res.ok) {
      throw new Error(friendlyCognitoError(body));
    }
    return body;
  }

  private persist(session: AuthSession): void {
    sessionStorage.setItem(TOKEN_KEY, session.idToken);
    sessionStorage.setItem(ACCESS_KEY, session.accessToken);
    sessionStorage.setItem(EMAIL_KEY, session.email);
  }

  private readStored(): AuthSession | null {
    const idToken = sessionStorage.getItem(TOKEN_KEY);
    const accessToken = sessionStorage.getItem(ACCESS_KEY) ?? '';
    const email = sessionStorage.getItem(EMAIL_KEY) ?? '';
    if (!idToken) return null;
    const exp = decodeExpMs(idToken);
    if (exp && exp <= Date.now()) {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(ACCESS_KEY);
      return null;
    }
    return {
      idToken,
      accessToken,
      email,
      expiresAt: exp ?? Date.now() + 50 * 60_000,
    };
  }
}

function buildOtpauthUrl(email: string, secret: string): string {
  const label = encodeURIComponent(`Water Saver:${email}`);
  const issuer = encodeURIComponent('Water Saver');
  return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
}

function assertPasswordPolicy(password: string): void {
  if (password.length < 12) {
    throw new Error('Password must be at least 12 characters.');
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    throw new Error(
      'Password needs upper, lower, number, and symbol (Cognito pool policy).',
    );
  }
}

function friendlyCognitoError(body: CognitoJson): string {
  const type = body.__type?.split('#').pop() ?? '';
  const msg = body.message || type || 'Request failed';
  if (/NotAuthorizedException/i.test(type) || /Incorrect username or password/i.test(msg)) {
    return 'Email or password is incorrect.';
  }
  if (/CodeMismatchException|EnableSoftwareTokenMFAException/i.test(type)) {
    return 'That code did not match. Try the newest code from your authenticator.';
  }
  if (/InvalidPasswordException/i.test(type)) {
    return msg || 'Password does not meet the policy.';
  }
  if (/LimitExceededException|TooManyRequestsException/i.test(type)) {
    return 'Too many attempts. Wait a minute and try again.';
  }
  return msg;
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
