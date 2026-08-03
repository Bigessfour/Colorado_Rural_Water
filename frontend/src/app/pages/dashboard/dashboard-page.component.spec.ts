import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../core/auth.service';
import { DashboardPageComponent } from './dashboard-page.component';

describe('DashboardPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            getBearerToken: () => 'jwt',
            isLoggedIn: () => true,
          },
        },
      ],
    }).compileComponents();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('refreshLive loads alerts, balance bars, usage trend, and health donut', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            confidence: {
              level: 'Building',
              monthsOfHistory: 3,
              meterCount: 12,
              coveragePct: 80,
              displayScore: 55,
              plainLanguage: 'Growing history',
              improveHint: 'Add more months',
            },
            alerts: [
              {
                id: 'a1',
                mode: 'Watch',
                meterId: '1042',
                summary: 'Usage spike',
                confidenceNote: 'Thin history',
              },
              {
                id: 'a2',
                mode: 'Actionable',
                meterId: '1043',
                summary: 'Stuck',
                confidenceNote: 'Hardware',
              },
            ],
            balanceAlerts: [],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            period: '2026-07',
            periodLabel: 'July 2026',
            producedGal: 1000,
            billedGal: 900,
            unaccountedGal: 100,
            unaccountedPct: 10,
            status: 'loss',
            confidence: { level: 'Building' },
            trend: [
              { period: '2026-05', periodLabel: 'May 2026', billedGal: 800_000 },
              { period: '2026-06', periodLabel: 'June 2026', billedGal: 850_000 },
              { period: '2026-07', periodLabel: 'July 2026', billedGal: 900_000 },
            ],
          }),
          { status: 200 },
        ),
      );

    const fixture = TestBed.createComponent(DashboardPageComponent);
    await fixture.componentInstance.refreshLive();
    fixture.detectChanges();

    expect(fixture.componentInstance.balance().status).toBe('loss');
    expect(fixture.componentInstance.usageEmpty()).toBe(false);
    expect(fixture.componentInstance.usageHasBand()).toBe(true);
    expect(
      fixture.componentInstance.usageChartData().datasets.some((d) => d.label === 'Billed usage'),
    ).toBe(true);
    expect(fixture.componentInstance.balanceInsufficient()).toBe(false);
    expect(fixture.componentInstance.balanceBarData().datasets.length).toBe(3);
    expect(fixture.componentInstance.showHealth()).toBe(true);
    expect(fixture.componentInstance.healthChartData().datasets[0]!.data).toEqual([10, 1, 1]);
    expect(fixture.componentInstance.confidence().level).toBe('Building');
  });
});
