/**
 * Municipal System Admin — invite/list users for JWT tenant only.
 * CRWA provision / multi-town billing live on /crwa (not here).
 */

import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { AuthService, type TenantRole } from '../../core/auth.service';
import { environment } from '../../../environments/environment';

type AssignableRole = 'operator' | 'system_admin';

interface UserRow {
  email: string;
  role: AssignableRole;
  createdAt: string;
}

@Component({
  selector: 'app-admin-page',
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    CardModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TableModule,
    MessageModule,
    TagModule,
  ],
  templateUrl: './admin-page.component.html',
  styleUrl: './admin-page.component.scss',
})
export class AdminPageComponent implements OnInit {
  readonly auth = inject(AuthService);

  readonly roleOptions = [
    { label: 'Operator', value: 'operator' as AssignableRole },
    { label: 'System Admin', value: 'system_admin' as AssignableRole },
  ];

  users = signal<UserRow[]>([]);
  busy = signal(false);
  error = signal('');
  status = signal('');
  tempPassword = signal('');

  inviteEmail = '';
  inviteRole: AssignableRole = 'operator';

  ngOnInit(): void {
    void this.bootstrap();
  }

  async bootstrap(): Promise<void> {
    if (!this.auth.isLoggedIn()) {
      this.error.set('Sign in to manage users for your water system.');
      return;
    }
    await this.auth.refreshProfile();
    if (this.auth.isSystemAdmin() && this.auth.tenantId()) {
      await this.refreshUsers();
    }
  }

  async refreshUsers(): Promise<void> {
    const token = this.auth.getBearerToken();
    if (!token) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const res = await fetch(`${environment.apiBaseUrl}/admin/users`, {
        headers: { authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok) {
        this.error.set(body.error ?? `Failed (${res.status})`);
        return;
      }
      this.users.set((body.users ?? []) as UserRow[]);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      this.busy.set(false);
    }
  }

  async inviteUser(): Promise<void> {
    if (!this.auth.isSystemAdmin()) {
      this.error.set('Only a System Admin for this municipality can invite users.');
      return;
    }
    const token = this.auth.getBearerToken();
    if (!token) {
      this.error.set('Sign in as a System Admin to invite users.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.tempPassword.set('');
    try {
      const res = await fetch(`${environment.apiBaseUrl}/admin/users/invite`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email: this.inviteEmail,
          role: this.inviteRole,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        this.error.set(body.error ?? `Invite failed (${res.status})`);
        return;
      }
      this.tempPassword.set(body.user?.temporaryPassword ?? '');
      this.status.set(
        `Invited ${body.user?.email ?? this.inviteEmail}. Share the temporary password securely.`,
      );
      this.inviteEmail = '';
      this.inviteRole = 'operator';
      await this.refreshUsers();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Invite failed');
    } finally {
      this.busy.set(false);
    }
  }

  roleLabel(role: TenantRole | AssignableRole): string {
    switch (role) {
      case 'crwa_admin':
        return 'CRWA Admin';
      case 'system_admin':
        return 'System Admin';
      default:
        return 'Operator';
    }
  }
}
