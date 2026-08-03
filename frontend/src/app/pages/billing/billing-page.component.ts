import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { AuthService } from '../../core/auth.service';
import { environment } from '../../../environments/environment';

type BillingStatus = 'pilot' | 'active' | 'past_due' | 'suspended';

interface BillingView {
  billingStatus: BillingStatus;
  billingStatusLabel: string;
  billingMode: string;
  planCode: string;
  planLabel: string;
  meterCountEstimate?: number;
  retentionMonths?: number;
  billingContactEmail?: string;
  pilotExpiresAt?: string;
  lastPaymentAt?: string;
  paymentProvider: string;
}

interface BillingEventRow {
  eventId: string;
  createdAt: string;
  eventType: string;
  billingStatusAfter: BillingStatus;
  amountCents?: number;
  currency?: string;
  method?: string;
  note?: string;
  pilotExpiresAt?: string;
}

@Component({
  selector: 'app-billing-page',
  imports: [CurrencyPipe, DatePipe, RouterLink, CardModule, MessageModule, TableModule, TagModule],
  templateUrl: './billing-page.component.html',
  styleUrl: './billing-page.component.scss',
})
export class BillingPageComponent implements OnInit {
  readonly auth = inject(AuthService);

  busy = signal(false);
  error = signal('');
  displayName = signal('');
  billing = signal<BillingView | null>(null);
  events = signal<BillingEventRow[]>([]);

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    if (!this.auth.isLoggedIn()) {
      this.error.set('Sign in as a System Admin to view membership billing.');
      return;
    }
    await this.auth.refreshProfile();
    if (!this.auth.isSystemAdmin()) {
      this.error.set('Membership billing is available to System Admins for your municipality only.');
      return;
    }
    const token = this.auth.getBearerToken();
    if (!token) return;

    this.busy.set(true);
    this.error.set('');
    try {
      const res = await fetch(`${environment.apiBaseUrl}/billing`, {
        headers: { authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok) {
        this.error.set(body.error ?? `Failed (${res.status})`);
        return;
      }
      this.displayName.set(body.displayName ?? this.auth.tenantId() ?? '');
      this.billing.set(body.billing as BillingView);
      this.events.set((body.events ?? []) as BillingEventRow[]);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load billing');
    } finally {
      this.busy.set(false);
    }
  }

  billingSeverity(status: BillingStatus | undefined): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
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

  eventLabel(type: string): string {
    switch (type) {
      case 'record_payment':
        return 'Payment recorded';
      case 'extend_pilot':
        return 'Pilot extended';
      case 'mark_past_due':
        return 'Marked past due';
      case 'suspend':
        return 'Suspended';
      case 'reactivate':
        return 'Reactivated';
      case 'provision':
        return 'System provisioned';
      default:
        return type;
    }
  }

  amountDisplay(row: BillingEventRow): string | null {
    if (row.amountCents === undefined || row.amountCents === null) return null;
    return ((row.amountCents ?? 0) / 100).toFixed(2);
  }
}
