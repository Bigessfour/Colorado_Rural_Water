import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';

/** Minimal JWT payload with far-future exp for isLoggedIn. */
function fakeJwt(expSec = Math.floor(Date.now() / 1000) + 3600): string {
  const header = btoa(JSON.stringify({ alg: 'none' }));
  const payload = btoa(JSON.stringify({ exp: expSec }));
  return `${header}.${payload}.sig`;
}

describe('AuthService', () => {
  let auth: AuthService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [AuthService] });
    auth = TestBed.inject(AuthService);
    vi.stubGlobal('fetch', vi.fn());
  });

  it('login stores tokens and refreshProfile loads /me', async () => {
    const idToken = fakeJwt();
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            AuthenticationResult: {
              IdToken: idToken,
              AccessToken: 'access-1',
              RefreshToken: 'refresh-1',
              ExpiresIn: 3600,
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            userId: 'u-1',
            email: 'op@town.gov',
            tenantId: 'town-demo',
            roles: ['operator'],
          }),
          { status: 200 },
        ),
      );

    const result = await auth.login('op@town.gov', 'Password1!');
    expect(result).toEqual({ status: 'signed_in' });
    expect(auth.isLoggedIn()).toBe(true);
    expect(auth.getBearerToken()).toBe(idToken);
    expect(auth.tenantId()).toBe('town-demo');
    expect(auth.roles()).toEqual(['operator']);
    expect(sessionStorage.getItem('ws_id_token')).toBe(idToken);
  });

  it('login returns MFA challenge without storing tokens', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ChallengeName: 'SOFTWARE_TOKEN_MFA',
          Session: 'sess-mfa',
          ChallengeParameters: {},
        }),
        { status: 200 },
      ),
    );

    const result = await auth.login('op@town.gov', 'Password1!');
    expect(result.status).toBe('challenge');
    if (result.status === 'challenge') {
      expect(result.challenge.challengeName).toBe('SOFTWARE_TOKEN_MFA');
      expect(result.challenge.session).toBe('sess-mfa');
    }
    expect(auth.isLoggedIn()).toBe(false);
    expect(sessionStorage.getItem('ws_id_token')).toBeNull();
  });

  it('logout clears session storage and tokens', async () => {
    const idToken = fakeJwt();
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            AuthenticationResult: {
              IdToken: idToken,
              AccessToken: 'access-1',
              ExpiresIn: 3600,
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            userId: 'u-1',
            email: 'op@town.gov',
            tenantId: 'town-demo',
            roles: ['operator'],
          }),
          { status: 200 },
        ),
      );

    await auth.login('op@town.gov', 'Password1!');
    auth.logout();
    expect(auth.isLoggedIn()).toBe(false);
    expect(auth.getBearerToken()).toBeNull();
    expect(sessionStorage.getItem('ws_id_token')).toBeNull();
    expect(auth.tenantId()).toBeNull();
  });

  it('respondToMfaChallenge rejects non-6-digit codes', async () => {
    await expect(
      auth.respondToMfaChallenge(
        {
          challengeName: 'SOFTWARE_TOKEN_MFA',
          session: 's',
          email: 'a@b.c',
          challengeParameters: {},
        },
        '12',
      ),
    ).rejects.toThrow(/6-digit/);
  });
});
