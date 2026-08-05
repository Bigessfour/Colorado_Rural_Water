/**
 * Cognito sign-in — Kelly demo step 1.
 * Demo user must have `custom:tenant_id` set in Cognito (never chosen in the form).
 * MFA / NEW_PASSWORD_REQUIRED challenges are Pilot extras — skip unless asked.
 */

import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { InputTextModule } from 'primeng/inputtext';
import { InputOtpModule } from 'primeng/inputotp';
import { AuthService, type PendingAuthChallenge } from '../../core/auth.service';

type LoginStep = 'credentials' | 'mfa' | 'new_password' | 'mfa_setup';

@Component({
  selector: 'app-login-page',
  imports: [
    FormsModule,
    RouterLink,
    CardModule,
    ButtonModule,
    MessageModule,
    InputTextModule,
    InputOtpModule,
  ],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
})
export class LoginPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  password = '';
  mfaCode = '';
  newPassword = '';
  confirmPassword = '';
  setupSecret = '';
  setupOtpauth = '';
  setupAssociateSession = '';

  step = signal<LoginStep>('credentials');
  busy = signal(false);
  error = signal('');
  hint = signal('');
  private pending: PendingAuthChallenge | null = null;

  async submitCredentials(): Promise<void> {
    this.error.set('');
    this.hint.set('');
    this.busy.set(true);
    try {
      const result = await this.auth.login(this.email, this.password);
      await this.handleLoginResult(result);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      this.busy.set(false);
    }
  }

  async submitMfa(): Promise<void> {
    if (!this.pending) return;
    this.error.set('');
    this.busy.set(true);
    try {
      const result = await this.auth.respondToMfaChallenge(this.pending, String(this.mfaCode));
      await this.handleLoginResult(result);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'MFA failed');
    } finally {
      this.busy.set(false);
    }
  }

  async submitNewPassword(): Promise<void> {
    if (!this.pending) return;
    this.error.set('');
    if (this.newPassword !== this.confirmPassword) {
      this.error.set('New password and confirmation do not match.');
      return;
    }
    this.busy.set(true);
    try {
      const result = await this.auth.respondToNewPassword(this.pending, this.newPassword);
      await this.handleLoginResult(result);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Password update failed');
    } finally {
      this.busy.set(false);
    }
  }

  async beginMfaSetup(): Promise<void> {
    if (!this.pending || this.pending.challengeName !== 'MFA_SETUP') return;
    this.error.set('');
    this.busy.set(true);
    try {
      const started = await this.auth.startLoginTotpSetup(this.pending);
      this.setupSecret = started.secretCode;
      this.setupOtpauth = started.otpauthUrl;
      this.setupAssociateSession = started.session;
      this.step.set('mfa_setup');
      this.hint.set('Add this key in your authenticator app, then enter the 6-digit code.');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not start MFA setup');
    } finally {
      this.busy.set(false);
    }
  }

  async submitMfaSetup(): Promise<void> {
    if (!this.pending) return;
    this.error.set('');
    this.busy.set(true);
    try {
      const result = await this.auth.completeLoginTotpSetup(
        this.pending,
        this.setupAssociateSession,
        String(this.mfaCode),
      );
      await this.handleLoginResult(result);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'MFA setup failed');
    } finally {
      this.busy.set(false);
    }
  }

  backToCredentials(): void {
    this.pending = null;
    this.mfaCode = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.setupSecret = '';
    this.setupOtpauth = '';
    this.setupAssociateSession = '';
    this.password = '';
    this.step.set('credentials');
    this.error.set('');
    this.hint.set('');
  }

  async copySecret(): Promise<void> {
    if (!this.setupSecret) return;
    try {
      await navigator.clipboard.writeText(this.setupSecret);
      this.hint.set('Secret copied. Paste it into your authenticator app.');
    } catch {
      this.hint.set('Copy failed — select the secret and copy manually.');
    }
  }

  private async handleLoginResult(
    result: Awaited<ReturnType<AuthService['login']>>,
  ): Promise<void> {
    if (result.status === 'signed_in') {
      const email = (this.auth.email() ?? this.email).toLowerCase();
      const reviewMode =
        email.startsWith('kelly.review') ||
        (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('ws_review_mode') === '1');
      await this.router.navigateByUrl(reviewMode ? '/review' : '/dashboard');
      return;
    }

    this.pending = result.challenge;
    this.mfaCode = '';
    switch (result.challenge.challengeName) {
      case 'SOFTWARE_TOKEN_MFA':
      case 'SMS_MFA':
        this.step.set('mfa');
        this.hint.set(
          result.challenge.challengeName === 'SMS_MFA'
            ? 'Enter the SMS code we sent you.'
            : 'Enter the 6-digit code from your authenticator app.',
        );
        break;
      case 'NEW_PASSWORD_REQUIRED':
        this.step.set('new_password');
        this.hint.set('Your temporary password must be replaced before you can continue.');
        break;
      case 'MFA_SETUP':
        this.step.set('mfa_setup');
        this.hint.set('Your account requires authenticator setup before sign-in completes.');
        await this.beginMfaSetup();
        break;
    }
  }
}
