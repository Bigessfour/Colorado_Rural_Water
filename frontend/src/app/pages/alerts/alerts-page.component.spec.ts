import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../core/auth.service';
import { AlertsPageComponent } from './alerts-page.component';

describe('AlertsPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlertsPageComponent],
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
    vi.stubGlobal('fetch', vi.fn());
  });

  it('refresh renders Watch and Actionable rows from the API', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          confidence: {
            level: 'Building',
            monthsOfHistory: 2,
            coveragePct: 70,
            plainLanguage: 'Building history',
          },
          alerts: [
            {
              id: 'w1',
              mode: 'Watch',
              meterId: '1042',
              summary: 'Statistical outlier',
              confidenceNote: 'Thin history',
              status: 'open',
            },
            {
              id: 'a1',
              mode: 'Actionable',
              meterId: '1043',
              summary: 'Stuck register',
              confidenceNote: 'Hardware flag',
              status: 'open',
            },
          ],
          balanceAlerts: [],
        }),
        { status: 200 },
      ),
    );

    const fixture = TestBed.createComponent(AlertsPageComponent);
    await fixture.componentInstance.refresh();
    fixture.detectChanges();

    const modes = fixture.componentInstance.alerts().map((a) => a.mode);
    expect(modes).toContain('Watch');
    expect(modes).toContain('Actionable');
    expect(fixture.componentInstance.error()).toBe('');
  });
});
