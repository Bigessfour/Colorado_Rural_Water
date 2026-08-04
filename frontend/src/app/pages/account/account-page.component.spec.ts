import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../core/auth.service';
import { AccountPageComponent } from './account-page.component';

describe('AccountPageComponent', () => {
  const getMfaStatus = vi.fn(async () => ({
    softwareTokenEnabled: false,
    preferredMfa: null as string | null,
  }));

  beforeEach(async () => {
    getMfaStatus.mockClear();

    await TestBed.configureTestingModule({
      imports: [AccountPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            getBearerToken: () => 'jwt',
            getAccessToken: () => 'access-token',
            isLoggedIn: () => true,
            email: () => 'operator@example.com',
            tenantId: () => 'town-wiley',
            getMfaStatus,
          },
        },
      ],
    }).compileComponents();
  });

  it('loads MFA status on init', async () => {
    const fixture = TestBed.createComponent(AccountPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(getMfaStatus).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toMatch(/Account|password|MFA/i);
  });
});
