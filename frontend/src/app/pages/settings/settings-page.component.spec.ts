import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../core/auth.service';
import { ThemeService } from '../../core/theme.service';
import { SettingsPageComponent } from './settings-page.component';

describe('SettingsPageComponent', () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          email: 'operator@example.com',
          tenantId: 'town-wiley',
          roles: ['operator'],
          displayName: 'Town of Wiley',
        }),
      })),
    );

    await TestBed.configureTestingModule({
      imports: [SettingsPageComponent],
      providers: [
        provideRouter([]),
        ThemeService,
        {
          provide: AuthService,
          useValue: {
            isLoggedIn: () => true,
            getBearerToken: () => 'jwt',
          },
        },
      ],
    }).compileComponents();
  });

  it('renders display settings and loads profile', async () => {
    const fixture = TestBed.createComponent(SettingsPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toMatch(/Settings|Display|Light|Dark/i);
    expect(fetch).toHaveBeenCalled();
  });
});
