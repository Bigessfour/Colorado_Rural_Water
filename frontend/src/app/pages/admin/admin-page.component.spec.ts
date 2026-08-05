import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../core/auth.service';
import { AdminPageComponent } from './admin-page.component';

describe('AdminPageComponent', () => {
  const refreshProfile = vi.fn(async () => {});

  beforeEach(async () => {
    refreshProfile.mockClear();
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ tenants: [], users: [] }), { status: 200 }),
        ),
    );

    await TestBed.configureTestingModule({
      imports: [AdminPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            getBearerToken: () => 'jwt',
            isLoggedIn: () => true,
            refreshProfile,
            canManageUsers: () => true,
            isCrwaAdmin: () => true,
            isSystemAdmin: () => true,
            tenantId: () => 'town-wiley',
            email: () => 'admin@example.com',
            roles: () => ['system_admin', 'crwa_admin'],
          },
        },
      ],
    }).compileComponents();
  });

  it('loads admin data on init', async () => {
    const fixture = TestBed.createComponent(AdminPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fetch).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toMatch(/Admin|tenant|provision/i);
  });
});
