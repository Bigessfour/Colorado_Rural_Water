import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { SelectButton } from 'primeng/selectbutton';
import { TagModule } from 'primeng/tag';
import { AuthService } from '../../core/auth.service';
import { ThemeService, type UiTheme } from '../../core/theme.service';
import { ProductTourService } from '../../tour/product-tour.service';
import { environment } from '../../../environments/environment';

interface MeProfile {
  email: string | null;
  tenantId: string | null;
  roles: string[];
  displayName: string | null;
}

@Component({
  selector: 'app-settings-page',
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    CardModule,
    MessageModule,
    SelectButton,
    TagModule,
  ],
  templateUrl: './settings-page.component.html',
  styleUrl: './settings-page.component.scss',
})
export class SettingsPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  readonly tour = inject(ProductTourService);

  readonly themeOptions = [
    { label: 'Light', value: 'light' as UiTheme, icon: 'pi pi-sun' },
    { label: 'Dark', value: 'dark' as UiTheme, icon: 'pi pi-moon' },
  ];

  profile = signal<MeProfile | null>(null);
  busy = signal(false);
  error = signal('');

  ngOnInit(): void {
    void this.loadProfile();
  }

  onThemeChange(mode: UiTheme): void {
    this.theme.setMode(mode);
  }

  roleLabel(role: string): string {
    switch (role) {
      case 'operator':
        return 'Operator';
      case 'system_admin':
        return 'System admin';
      case 'crwa_admin':
        return 'CRWA admin';
      default:
        return role;
    }
  }

  private async loadProfile(): Promise<void> {
    if (!this.auth.isLoggedIn()) return;
    const token = this.auth.getBearerToken();
    if (!token) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const res = await fetch(`${environment.apiBaseUrl}/me`, {
        headers: { authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok) {
        this.error.set(body.error ?? `Could not load profile (${res.status})`);
        return;
      }
      this.profile.set({
        email: body.email ?? null,
        tenantId: body.tenantId ?? null,
        roles: Array.isArray(body.roles) ? body.roles : [],
        displayName: body.displayName ?? null,
      });
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Network error');
    } finally {
      this.busy.set(false);
    }
  }
}
