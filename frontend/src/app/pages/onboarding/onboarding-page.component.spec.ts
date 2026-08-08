import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../core/auth.service';
import { OnboardingPageComponent } from './onboarding-page.component';

describe('OnboardingPageComponent', () => {
  beforeEach(async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            intake: {
              tenantId: 'town-wiley',
              currentStep: 0,
              completedAt: null,
              systemName: 'Town of Wiley',
              serviceTerritoryAddress: '',
              mapTown: '',
              primaryContactName: '',
              primaryContactEmail: '',
              primaryContactPhone: '',
              billingClerkName: '',
              billingClerkPhone: '',
              meterCountEstimate: null,
              sourceCountEstimate: null,
              readSchedule: 'manual',
              preferredUnit: 'gal',
              billingCycleNote: '',
              municipalBillingSystem: '',
              exportFormat: 'unknown',
              exportColumnHints: '',
              onboardingPath: 'A',
              hasHistoricalExport: false,
              historyNotes: '',
              updatedAt: '2026-08-04T00:00:00Z',
            },
            complete: false,
          }),
          { status: 200 },
        ),
      ),
    );

    await TestBed.configureTestingModule({
      imports: [OnboardingPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            getBearerToken: () => 'jwt',
            isLoggedIn: () => true,
            firstName: () => 'Demo',
            placeName: () => 'Town of Wiley',
          },
        },
      ],
    }).compileComponents();
  });

  it('loads intake on init', async () => {
    const fixture = TestBed.createComponent(OnboardingPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fetch).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toMatch(/Member intake|Welcome/i);
  });
});
