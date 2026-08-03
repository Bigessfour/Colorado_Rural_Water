import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { InputTextModule } from 'primeng/inputtext';
import { InputOtpModule } from 'primeng/inputotp';
import { TagModule } from 'primeng/tag';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-account-page',
  imports: [
    FormsModule,
    RouterLink,
    CardModule,
    ButtonModule,
    MessageModule,
    InputTextModule,
    InputOtpModule,
    TagModule,
  ],
  templateUrl: './account-page.component.html',
  styleUrl: './account-page.component.scss',
})
export class AccountPageComponent implements OnInit {
  readonly auth = inject(AuthService);

  busy = signal(false);
  error = signal('');
  status = signal('');

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  mfaEnabled = signal(false);
  mfaPreferred = signal<string | null>(null);
  setupOpen = signal(false);
  setupSecret = '';
  setupOtpauth = '';
  setupCode = '';

  ngOnInit(): void {
    void this.refreshMfa();
  }

  async refreshMfa(): Promise<void> {
    if (!this.auth.isLoggedIn()) return;
    if (!this.auth.getAccessToken()) {
      this.error.set(
        'Sign out and sign in again so we can manage MFA (access token was not stored on an older session).',
      );
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const mfa = await this.auth.getMfaStatus();
      this.mfaEnabled.set(mfa.softwareTokenEnabled);
      this.mfaPreferred.set(mfa.preferredMfa);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load MFA status');
    } finally {
      this.busy.set(false);
    }
  }

  async changePassword(): Promise<void> {
    this.error.set('');
    this.status.set('');
    if (this.newPassword !== this.confirmPassword) {
      this.error.set('New password and confirmation do not match.');
      return;
    }
    this.busy.set(true);
    try {
      await this.auth.changePassword(this.currentPassword, this.newPassword);
      this.currentPassword = '';
      this.newPassword = '';
      this.confirmPassword = '';
      this.status.set('Password updated.');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Password change failed');
    } finally {
      this.busy.set(false);
    }
  }

  async startSetup(): Promise<void> {
    this.error.set('');
    this.status.set('');
    this.busy.set(true);
    try {
      const started = await this.auth.startTotpSetup();
      this.setupSecret = started.secretCode;
      this.setupOtpauth = started.otpauthUrl;
      this.setupCode = '';
      this.setupOpen.set(true);
      this.status.set('Add the secret in your authenticator app, then confirm with a code.');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not start MFA setup');
    } finally {
      this.busy.set(false);
    }
  }

  async confirmSetup(): Promise<void> {
    this.error.set('');
    this.status.set('');
    this.busy.set(true);
    try {
      await this.auth.verifyAndEnableTotp(String(this.setupCode));
      this.setupOpen.set(false);
      this.setupSecret = '';
      this.setupOtpauth = '';
      this.setupCode = '';
      this.status.set('Authenticator MFA is on. You will be asked for a code at the next sign-in.');
      await this.refreshMfa();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not enable MFA');
    } finally {
      this.busy.set(false);
    }
  }

  cancelSetup(): void {
    this.setupOpen.set(false);
    this.setupSecret = '';
    this.setupOtpauth = '';
    this.setupCode = '';
  }

  async disableMfa(): Promise<void> {
    this.error.set('');
    this.status.set('');
    this.busy.set(true);
    try {
      await this.auth.disableSoftwareMfa();
      this.status.set('Authenticator MFA turned off.');
      await this.refreshMfa();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not disable MFA');
    } finally {
      this.busy.set(false);
    }
  }

  async copySecret(): Promise<void> {
    if (!this.setupSecret) return;
    try {
      await navigator.clipboard.writeText(this.setupSecret);
      this.status.set('Secret copied. Paste it into your authenticator app.');
    } catch {
      this.status.set('Copy failed — select the secret and copy manually.');
    }
  }
}
