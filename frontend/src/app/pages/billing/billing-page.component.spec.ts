import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../core/auth.service';
import { BillingPageComponent } from './billing-page.component';

describe('BillingPageComponent', () => {
  const refreshProfile = vi.fn(async () => {});

  beforeEach(async () => {
    refreshProfile.mockClear();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            displayName: 'Town of Wiley',
            billing: {
              billingStatus: 'pilot',
              billingStatusLabel: 'Pilot',
              billingMode: 'manual',
              planCode: 'meters_0_100',
              planLabel: 'Up to 100 meters',
              paymentProvider: 'manual',
            },
            events: [],
          }),
          { status: 200 },
        ),
      ),
    );

    await TestBed.configureTestingModule({
      imports: [BillingPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            getBearerToken: () => 'jwt',
            isLoggedIn: () => true,
            refreshProfile,
            isSystemAdmin: () => true,
          },
        },
      ],
    }).compileComponents();
  });

  it('loads billing view on init', async () => {
    const fixture = TestBed.createComponent(BillingPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fetch).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toMatch(/Billing|pilot/i);
  });
});
