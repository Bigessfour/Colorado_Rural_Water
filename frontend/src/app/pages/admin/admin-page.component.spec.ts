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
        .mockResolvedValue(new Response(JSON.stringify({ users: [] }), { status: 200 })),
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
            isCrwaAdmin: () => false,
            isSystemAdmin: () => true,
            tenantId: () => 'town-wiley',
            email: () => 'admin@town.gov',
            placeName: () => 'Town of Wiley',
            roles: () => ['system_admin'],
          },
        },
      ],
    }).compileComponents();
  });

  it('loads tenant users on init for System Admin', async () => {
    const fixture = TestBed.createComponent(AdminPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fetch).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toMatch(/Users|Invite|Town of Wiley/i);
    expect(fixture.nativeElement.textContent).not.toMatch(/Provision municipality/i);
  });
});
