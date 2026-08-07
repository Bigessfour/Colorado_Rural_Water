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
            firstName: () => 'Kelly',
            placeName: () => 'Town of Wiley',
          },
        },
      ],
    }).compileComponents();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('refreshLive loads alerts, balance, health summary, outliers, last ingest', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        // alerts
        new Response(
          JSON.stringify({
            confidence: {
              level: 'Solid',
              monthsOfHistory: 12,
              meterCount: 12,
              coveragePct: 80,
              displayScore: 82,
              plainLanguage: 'Strong enough',
              improveHint: 'Add more months',
              statisticalMode: 'Actionable',
            },
            lastIngest: {
              at: '2026-08-07T12:00:00.000Z',
              goodRows: 100,
              badRows: 3,
              readingsWritten: 100,
            },
            alerts: [
              {
                id: 'a1',
                type: 'unusual_high_usage',
                mode: 'Actionable',
                meterId: '1042',
                summary: 'Usage spike (50,000 gal)',
                confidenceNote: 'Solid',
                usageGal: 50_000,
                usageRatio: 4.2,
              },
              {
                id: 'a2',
                type: 'stuck_meter',
                mode: 'Actionable',
                meterId: '1043',
                summary: 'Stuck',
                confidenceNote: 'Hardware',
              },
              {
                id: 'a3',
                type: 'diagnostic_flag',
                mode: 'Actionable',
                meterId: '1044',
                summary: 'LOW_BATTERY',
                confidenceNote: 'Hardware',
                diagnosticFlags: ['LOW_BATTERY'],
              },
            ],
            balanceAlerts: [],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        // balance (?trendMonths=24)
        new Response(
          JSON.stringify({
            period: '2026-07',
            periodLabel: 'July 2026',
            producedGal: 1000,
            billedGal: 900,
            unaccountedGal: 100,
            unaccountedPct: 10,
            status: 'loss',
            productionBySource: [
              { sourceId: 'north', sourceName: 'North Well', gallons: 600 },
              { sourceId: 'south', sourceName: 'South Well', gallons: 400 },
            ],
            confidence: { level: 'Solid' },
            trend: [
              { period: '2025-05', periodLabel: 'May 2025', billedGal: 700_000, unaccountedPct: 7, status: 'loss' },
              { period: '2025-06', periodLabel: 'June 2025', billedGal: 720_000, unaccountedPct: 7, status: 'loss' },
              { period: '2025-07', periodLabel: 'July 2025', billedGal: 740_000, unaccountedPct: 8, status: 'loss' },
              {
                period: '2026-05',
                periodLabel: 'May 2026',
                billedGal: 800_000,
                unaccountedPct: 8,
                status: 'loss',
              },
              {
                period: '2026-06',
                periodLabel: 'June 2026',
                billedGal: 850_000,
                unaccountedPct: 9,
                status: 'loss',
              },
              {
                period: '2026-07',
                periodLabel: 'July 2026',
                billedGal: 900_000,
                unaccountedPct: 10,
                status: 'loss',
              },
            ],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        // onboarding
        new Response(JSON.stringify({ complete: true }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        // meters
        new Response(
          JSON.stringify({
            meters: [
              { meterId: '1', installDate: '2000-01-01' },
              { meterId: '2', installDate: '2020-01-01' },
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
    expect(fixture.componentInstance.balanceInsufficient()).toBe(false);
    expect(fixture.componentInstance.showHealth()).toBe(true);
    expect(fixture.componentInstance.meterHealth().stuckCount).toBe(1);
    expect(fixture.componentInstance.meterHealth().diagnosticCount).toBe(1);
    expect(fixture.componentInstance.meterHealth().olderCount).toBe(1);
    expect(fixture.componentInstance.topOutliers().length).toBe(1);
    expect(fixture.componentInstance.topOutliers()[0]!.meterId).toBe('1042');
    expect(fixture.componentInstance.sourceProdEmpty()).toBe(false);
    expect(fixture.componentInstance.unaccountedSparkEmpty()).toBe(false);
    expect(fixture.componentInstance.lastIngest()?.label).toMatch(/Last upload:/);
    expect(fixture.componentInstance.confidence().level).toBe('Solid');
    expect(fixture.componentInstance.priorYearAvailable()).toBe(true);
    expect(fixture.componentInstance.usageCompareMode()).toBe('current');
    fixture.componentInstance.onUsageCompareChange('prior');
    expect(
      fixture.componentInstance.usageChartData().datasets.some((d) => d.label === 'Prior year'),
    ).toBe(true);
  });

  it('hides top outliers and softens loss when Confidence is Thin', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            confidence: { level: 'Thin', monthsOfHistory: 1, meterCount: 5, coveragePct: 20 },
            alerts: [
              {
                id: 'h1',
                type: 'unusual_high_usage',
                mode: 'Watch',
                meterId: 'x',
                summary: 'high',
                usageGal: 99_000,
                usageRatio: 5,
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
            producedGal: 50_000,
            billedGal: 40_000,
            unaccountedGal: 10_000,
            unaccountedPct: 20,
            status: 'loss',
            productionBySource: [{ sourceId: 'w1', sourceName: 'Well', gallons: 50_000 }],
            trend: [
              { period: '2026-07', billedGal: 40_000, unaccountedPct: 20, status: 'loss' },
            ],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ meters: [] }), { status: 200 }));

    const fixture = TestBed.createComponent(DashboardPageComponent);
    await fixture.componentInstance.refreshLive();
    expect(fixture.componentInstance.topOutliers()).toEqual([]);
    expect(fixture.componentInstance.isThin()).toBe(true);
    expect(fixture.componentInstance.balanceStatusLabel('loss')).toMatch(/Watch|early/i);
    expect(fixture.componentInstance.unaccountedSparkEmpty()).toBe(true);
    expect(fixture.componentInstance.balance().hint).toMatch(/Thin Confidence|Watch/i);
  });
});
