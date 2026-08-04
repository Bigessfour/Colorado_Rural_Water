import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../core/auth.service';
import { MetersPageComponent } from './meters-page.component';

describe('MetersPageComponent', () => {
  beforeEach(async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ meters: [] }), { status: 200 }),
      ),
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
});
