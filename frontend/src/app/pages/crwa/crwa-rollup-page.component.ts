import { Component, OnInit, inject, signal } from '@angular/core';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { MessageModule } from 'primeng/message';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../../core/auth.service';
import { environment } from '../../../environments/environment';

type ConfidenceLevel = 'Thin' | 'Building' | 'Solid' | 'Strong';

interface RollupRow {
  tenantId: string;
  system: string;
  meterCount: number;
  unaccountedPct: number | null;
  balanceStatus: string;
  periodLabel: string;
  confidence: ConfidenceLevel;
  monthsOfHistory: number;
  coveragePct: number;
  note: string;
  billingStatus: string;
}

@Component({
  selector: 'app-crwa-rollup-page',
  imports: [CardModule, TagModule, TableModule, MessageModule, ButtonModule],
  templateUrl: './crwa-rollup-page.component.html',
  styleUrl: './crwa-rollup-page.component.scss',
})
export class CrwaRollupPageComponent implements OnInit {
  readonly auth = inject(AuthService);

  rows = signal<RollupRow[]>([]);
  busy = signal(false);
  error = signal('');
  generatedAt = signal('');

  ngOnInit(): void {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    if (!this.auth.isCrwaAdmin()) {
      this.error.set('CRWA Admin role required for the enterprise roll-up.');
      return;
    }
    const token = this.auth.getBearerToken();
    if (!token) {
      this.error.set('Sign in as CRWA Admin to load the live roll-up.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const res = await fetch(`${environment.apiBaseUrl}/admin/rollup`, {
        headers: { authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok) {
        this.error.set(body.error ?? `Roll-up failed (${res.status})`);
        return;
      }
      this.generatedAt.set(body.generatedAt ?? '');
      this.rows.set((body.systems ?? []) as RollupRow[]);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Network error');
    } finally {
      this.busy.set(false);
    }
  }

  unaccountedLabel(row: RollupRow): string {
    if (row.balanceStatus === 'insufficient' || row.unaccountedPct == null) {
      return '— (need In + Out)';
    }
    return `${row.unaccountedPct.toFixed(1)}%`;
  }

  confidenceSeverity(level: ConfidenceLevel): 'secondary' | 'info' | 'success' | 'warn' {
    switch (level) {
      case 'Thin':
        return 'secondary';
      case 'Building':
        return 'warn';
      case 'Solid':
        return 'info';
      case 'Strong':
        return 'success';
    }
  }
}
