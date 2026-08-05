import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../core/auth.service';
import { MetersPageComponent } from './meters-page.component';

describe('MetersPageComponent', () => {
  beforeEach(async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ meters: [] }), { status: 200 })),
    );

    await TestBed.configureTestingModule({
      imports: [MetersPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            getBearerToken: () => 'jwt',
            isLoggedIn: () => true,
            placeName: () => 'Town of Wiley',
            mapCenter: () => ({ lat: 38.15, lng: -102.72 }),
          },
        },
      ],
    }).compileComponents();
  });

  it('loads meters on init and exposes view mode toggles', async () => {
    const fixture = TestBed.createComponent(MetersPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fetch).toHaveBeenCalled();
    fixture.componentInstance.onViewModeChange('map');
    expect(fixture.componentInstance.viewMode()).toBe('map');
    expect(fixture.nativeElement.textContent).toMatch(/Meters|Map/i);
  });

  it('filters the listing and clears selection when the selected meter drops out', async () => {
    const fixture = TestBed.createComponent(MetersPageComponent);
    const cmp = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    cmp.meters.set([
      {
        meterId: 'M-1',
        serviceAddress: '1 Main',
        occupantName: 'Ann',
        accountNumber: 'A1',
        route: 'R1',
        manufacturer: null,
        model: null,
        serialNumber: null,
        meterSize: null,
        installDate: null,
        meterType: null,
        locationDetail: null,
        radioId: null,
        lastTestedAt: null,
        notes: null,
        latitude: null,
        longitude: null,
        updatedAt: '2026-01-01T00:00:00.000Z',
        readingCount: 0,
      },
      {
        meterId: 'M-2',
        serviceAddress: '2 Oak',
        occupantName: 'Bob',
        accountNumber: 'B2',
        route: 'R2',
        manufacturer: null,
        model: null,
        serialNumber: null,
        meterSize: null,
        installDate: null,
        meterType: null,
        locationDetail: null,
        radioId: null,
        lastTestedAt: null,
        notes: null,
        latitude: null,
        longitude: null,
        updatedAt: '2026-01-01T00:00:00.000Z',
        readingCount: 0,
      },
    ]);
    cmp.selectMeter('M-1');
    cmp.onListSearchChange('oak');
    expect(cmp.filteredMeters().map((m) => m.meterId)).toEqual(['M-2']);
    expect(cmp.selectedMeterId()).toBeNull();
    expect(cmp.tableFirst()).toBe(0);
    expect(cmp.filterActive()).toBe(true);

    cmp.clearListSearch();
    cmp.tableRows.set(1);
    cmp.onTablePage({ first: 1, rows: 1 });
    expect(cmp.tableFirst()).toBe(1);
    cmp.onListSearchChange('main');
    expect(cmp.filteredMeters()).toHaveLength(1);
    expect(cmp.tableFirst()).toBe(0);
  });
});
