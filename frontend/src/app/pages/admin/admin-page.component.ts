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
import { TextareaModule } from 'primeng/textarea';
import { AuthService, type TenantRole } from '../../core/auth.service';
import { geocodeServiceAddress } from '../../shared/geocode.service';
import { environment } from '../../../environments/environment';

type AssignableRole = 'operator' | 'system_admin';
type PilotOrPaid = 'pilot' | 'paid';
type PlanCode = 'meters_0_100' | 'meters_101_300' | 'meters_301_750' | 'meters_750_plus' | 'custom';
type BillingStatus = 'pilot' | 'active' | 'past_due' | 'suspended';
type PaymentMethod = 'check' | 'ach' | 'card' | 'other';
type BillingAction = 'record-payment' | 'extend-pilot' | 'mark-past-due' | 'suspend' | 'reactivate';

interface TenantRow {
  tenantId: string;
  displayName: string;
  createdAt: string;
  initialUserEmail: string;
  billingStatus: BillingStatus;
  billingStatusLabel?: string;
  planCode: PlanCode;
  planLabel?: string;
  meterCountEstimate?: number;
  pilotExpiresAt?: string;
  lastPaymentAt?: string;
  billingNotes?: string;
}

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
    TextareaModule,
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

  readonly pilotOrPaidOptions = [
    { label: 'Pilot (complimentary)', value: 'pilot' as PilotOrPaid },
    { label: 'Paid (manual / offline)', value: 'paid' as PilotOrPaid },
  ];

  readonly planOptions = [
    { label: 'Up to 100 meters', value: 'meters_0_100' as PlanCode },
    { label: '101–300 meters', value: 'meters_101_300' as PlanCode },
    { label: '301–750 meters', value: 'meters_301_750' as PlanCode },
    { label: '750+ meters', value: 'meters_750_plus' as PlanCode },
    { label: 'Custom', value: 'custom' as PlanCode },
  ];

  readonly paymentMethodOptions = [
    { label: 'Check', value: 'check' as PaymentMethod },
    { label: 'ACH', value: 'ach' as PaymentMethod },
    { label: 'Card (offline)', value: 'card' as PaymentMethod },
    { label: 'Other', value: 'other' as PaymentMethod },
  ];

  tenants = signal<TenantRow[]>([]);
  users = signal<UserRow[]>([]);
  busy = signal(false);
  error = signal('');
  status = signal('');
  tempPassword = signal('');

  // D3 + I0 provision
  tenantId = '';
  displayName = '';
  /** Town/city for map center (defaults to display name when empty). */
  mapTown = '';
  initialUserEmail = '';
  initialUserRole: AssignableRole = 'system_admin';
  pilotOrPaid: PilotOrPaid = 'pilot';
  planCode: PlanCode = 'meters_0_100';
  meterCountEstimate = '';
  billingContactEmail = '';
  pilotExpiresAt = '';
  billingNotes = '';

  // D2 invite
  inviteEmail = '';
  inviteRole: AssignableRole = 'operator';

  // I1 actions
  actionTenantId = '';
  action: BillingAction = 'record-payment';
  actionAmountDollars = '';
  actionMethod: PaymentMethod = 'check';
  actionPilotExpiresAt = '';
  actionNote = '';

  readonly actionOptions = [
    { label: 'Record external payment', value: 'record-payment' as BillingAction },
    { label: 'Extend pilot', value: 'extend-pilot' as BillingAction },
    { label: 'Mark past due', value: 'mark-past-due' as BillingAction },
    { label: 'Suspend', value: 'suspend' as BillingAction },
    { label: 'Reactivate', value: 'reactivate' as BillingAction },
  ];

  ngOnInit(): void {
    void this.bootstrap();
  }

  async bootstrap(): Promise<void> {
    if (!this.auth.isLoggedIn()) {
      this.error.set('Sign in to manage systems and users.');
      return;
    }
    await this.auth.refreshProfile();
    if (this.auth.isCrwaAdmin()) {
      await this.refreshTenants();
    }
    if (this.auth.isSystemAdmin() && this.auth.tenantId()) {
      await this.refreshUsers();
    }
  }

  async refreshTenants(): Promise<void> {
    const token = this.auth.getBearerToken();
    if (!token) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const res = await fetch(`${environment.apiBaseUrl}/admin/tenants`, {
        headers: { authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok) {
        this.error.set(body.error ?? `Failed (${res.status})`);
        return;
      }
      const rows = (body.tenants ?? []) as TenantRow[];
      this.tenants.set(rows);
      this.status.set(`${body.count ?? 0} municipality system(s).`);
      if (!this.actionTenantId && rows[0]) {
        this.actionTenantId = rows[0].tenantId;
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load tenants');
    } finally {
      this.busy.set(false);
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

  async provisionTenant(): Promise<void> {
    const token = this.auth.getBearerToken();
    if (!token) {
      this.error.set('Sign in as a CRWA Admin to provision a system.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.tempPassword.set('');
    try {
      const mapTown = (this.mapTown.trim() || this.displayName).trim();
      const payload: Record<string, unknown> = {
        tenantId: this.tenantId,
        displayName: this.displayName,
        mapTown,
        initialUserEmail: this.initialUserEmail,
        initialUserRole: this.initialUserRole,
        pilotOrPaid: this.pilotOrPaid,
        planCode: this.planCode,
      };
      if (this.meterCountEstimate.trim()) {
        payload['meterCountEstimate'] = Number(this.meterCountEstimate);
      }
      if (this.billingContactEmail.trim()) {
        payload['billingContactEmail'] = this.billingContactEmail.trim();
      }
      if (this.pilotOrPaid === 'pilot' && this.pilotExpiresAt.trim()) {
        payload['pilotExpiresAt'] = new Date(this.pilotExpiresAt).toISOString();
      }
      if (this.billingNotes.trim()) {
        payload['billingNotes'] = this.billingNotes.trim();
      }

      let geocodeNote = '';
      try {
        const hit = await geocodeServiceAddress(mapTown);
        if (hit) {
          payload['mapCenterLat'] = Math.round(hit.latitude * 1e6) / 1e6;
          payload['mapCenterLng'] = Math.round(hit.longitude * 1e6) / 1e6;
          payload['mapZoom'] = 12;
          geocodeNote = ` Map centered near ${hit.label}.`;
        } else {
          geocodeNote =
            ' Map town saved without coordinates (geocoder found no Colorado match) — operators still see statewide default until coords are set.';
        }
      } catch {
        geocodeNote =
          ' Map town saved without coordinates (geocoder unavailable) — retry later or seed coords.';
      }

      const res = await fetch(`${environment.apiBaseUrl}/admin/tenants`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        this.error.set(body.error ?? `Provision failed (${res.status})`);
        return;
      }
      this.tempPassword.set(body.initialUser?.temporaryPassword ?? '');
      this.status.set(
        `Provisioned ${body.tenant?.displayName ?? this.displayName} (${body.tenant?.billingStatus ?? this.pilotOrPaid}). Share the temporary password securely.${geocodeNote}`,
      );
      this.tenantId = '';
      this.displayName = '';
      this.mapTown = '';
      this.initialUserEmail = '';
      this.initialUserRole = 'system_admin';
      this.pilotOrPaid = 'pilot';
      this.planCode = 'meters_0_100';
      this.meterCountEstimate = '';
      this.billingContactEmail = '';
      this.pilotExpiresAt = '';
      this.billingNotes = '';
      await this.refreshTenants();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Provision failed');
    } finally {
      this.busy.set(false);
    }
  }

  async inviteUser(): Promise<void> {
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

  selectTenantForAction(tenantId: string): void {
    this.actionTenantId = tenantId;
  }

  async runBillingAction(): Promise<void> {
    const token = this.auth.getBearerToken();
    if (!token) {
      this.error.set('Sign in as a CRWA Admin.');
      return;
    }
    if (!this.actionTenantId) {
      this.error.set('Select a municipality first.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const payload: Record<string, unknown> = {};
      if (this.actionNote.trim()) payload['note'] = this.actionNote.trim();

      if (this.action === 'record-payment') {
        if (this.actionAmountDollars.trim()) {
          const dollars = Number(this.actionAmountDollars);
          if (!Number.isFinite(dollars) || dollars < 0) {
            this.error.set('Amount must be a non-negative number.');
            this.busy.set(false);
            return;
          }
          payload['amountCents'] = Math.round(dollars * 100);
        }
        payload['method'] = this.actionMethod;
        payload['currency'] = 'USD';
      }
      if (this.action === 'extend-pilot') {
        if (!this.actionPilotExpiresAt.trim()) {
          this.error.set('Pilot expiry date is required.');
          this.busy.set(false);
          return;
        }
        payload['pilotExpiresAt'] = new Date(this.actionPilotExpiresAt).toISOString();
      }

      const res = await fetch(
        `${environment.apiBaseUrl}/admin/tenants/${encodeURIComponent(this.actionTenantId)}/billing/${this.action}`,
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${token}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
      );
      const body = await res.json();
      if (!res.ok) {
        this.error.set(body.error ?? `Billing action failed (${res.status})`);
        return;
      }
      this.status.set(
        `Updated ${body.tenant?.displayName ?? this.actionTenantId} → ${body.tenant?.billingStatus ?? 'ok'}.`,
      );
      this.actionAmountDollars = '';
      this.actionNote = '';
      this.actionPilotExpiresAt = '';
      await this.refreshTenants();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Billing action failed');
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

  billingSeverity(status: BillingStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'active':
        return 'success';
      case 'pilot':
        return 'info';
      case 'past_due':
        return 'warn';
      case 'suspended':
        return 'danger';
      default:
        return 'secondary';
    }
  }

  billingLabel(row: TenantRow): string {
    return row.billingStatusLabel ?? row.billingStatus ?? '—';
  }

  planLabelFor(row: TenantRow): string {
    return row.planLabel ?? row.planCode ?? '—';
  }

  tenantSelectOptions(): { label: string; value: string }[] {
    return this.tenants().map((t) => ({
      label: `${t.displayName} (${t.tenantId})`,
      value: t.tenantId,
    }));
  }
}
