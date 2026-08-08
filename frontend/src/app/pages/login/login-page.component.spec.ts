import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../core/auth.service';
import { LoginPageComponent } from './login-page.component';

describe('LoginPageComponent', () => {
  const login = vi.fn();
  const respondToMfaChallenge = vi.fn();
  const respondToNewPassword = vi.fn();
  const startLoginTotpSetup = vi.fn();
  const completeLoginTotpSetup = vi.fn();
  const email = vi.fn(() => 'demo.operator@watersaver.local');

  beforeEach(async () => {
    login.mockReset();
    respondToMfaChallenge.mockReset();
    respondToNewPassword.mockReset();
    startLoginTotpSetup.mockReset();
    completeLoginTotpSetup.mockReset();
    email.mockReturnValue('demo.operator@watersaver.local');

    await TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [
        provideRouter([{ path: 'dashboard', component: LoginPageComponent }]),
        {
          provide: AuthService,
          useValue: {
            login,
            respondToMfaChallenge,
            respondToNewPassword,
            startLoginTotpSetup,
            completeLoginTotpSetup,
            email,
          },
        },
      ],
    }).compileComponents();
  });

  it('starts on credentials step and renders brand + sign-in widgets', () => {
    const fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(fixture.componentInstance.step()).toBe('credentials');
    expect(el.textContent).toMatch(/Sign in to Water Saver/i);
    expect(el.querySelector('img.login-logo')).toBeTruthy();
    expect(el.querySelector('input[name="email"]')).toBeTruthy();
    expect(el.querySelector('input[name="password"]')).toBeTruthy();
    expect(el.textContent).toMatch(/Sign in/i);
    expect(el.querySelector('a[href="/dashboard"], a[routerlink="/dashboard"]')).toBeTruthy();
  });

  it('signs in and navigates to dashboard for a normal operator', async () => {
    login.mockResolvedValue({ status: 'signed_in' });
    const fixture = TestBed.createComponent(LoginPageComponent);
    const router = TestBed.inject(Router);
    const nav = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fixture.componentInstance.email = 'demo.operator@watersaver.local';
    fixture.componentInstance.password = 'secret';
    fixture.detectChanges();

    await fixture.componentInstance.submitCredentials();
    expect(login).toHaveBeenCalledWith('demo.operator@watersaver.local', 'secret');
    expect(nav).toHaveBeenCalledWith('/dashboard');
  });

  it('routes kelly.review to /review after sign-in', async () => {
    login.mockResolvedValue({ status: 'signed_in' });
    email.mockReturnValue('kelly.review@watersaver.local');
    const fixture = TestBed.createComponent(LoginPageComponent);
    const router = TestBed.inject(Router);
    const nav = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fixture.componentInstance.email = 'kelly.review@watersaver.local';
    fixture.componentInstance.password = 'secret';

    await fixture.componentInstance.submitCredentials();
    expect(nav).toHaveBeenCalledWith('/review');
  });

  it('shows MFA step when Cognito challenges SOFTWARE_TOKEN_MFA', async () => {
    login.mockResolvedValue({
      status: 'challenge',
      challenge: {
        challengeName: 'SOFTWARE_TOKEN_MFA',
        session: 'sess',
        email: 'demo.operator@watersaver.local',
      },
    });
    const fixture = TestBed.createComponent(LoginPageComponent);
    await fixture.componentInstance.submitCredentials();
    fixture.detectChanges();
    expect(fixture.componentInstance.step()).toBe('mfa');
    expect(fixture.componentInstance.hint()).toMatch(/authenticator/i);
    expect((fixture.nativeElement as HTMLElement).textContent).toMatch(
      /Verify and continue/i,
    );
  });

  it('surfaces Cognito errors on the credentials form', async () => {
    login.mockRejectedValue(new Error('Incorrect username or password.'));
    const fixture = TestBed.createComponent(LoginPageComponent);
    await fixture.componentInstance.submitCredentials();
    fixture.detectChanges();
    expect(fixture.componentInstance.error()).toMatch(/Incorrect username/i);
    expect((fixture.nativeElement as HTMLElement).textContent).toMatch(
      /Incorrect username/i,
    );
  });
});
