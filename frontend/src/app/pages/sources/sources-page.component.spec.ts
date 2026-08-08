import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../core/auth.service';
import { SourcesPageComponent } from './sources-page.component';

describe('SourcesPageComponent', () => {
  beforeEach(async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ sources: [] }), { status: 200 })),
    );

    await TestBed.configureTestingModule({
      imports: [SourcesPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            getBearerToken: () => 'jwt',
            isLoggedIn: () => true,
            firstName: () => 'Demo',
            placeName: () => 'Town of Wiley',
            mapCenter: () => ({ lat: 38.15, lng: -102.72 }),
          },
        },
      ],
    }).compileComponents();
  });

  it('loads sources on init', async () => {
    const fixture = TestBed.createComponent(SourcesPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fetch).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toMatch(/Sources|water source/i);
  });
});
