import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../core/auth.service';
import { CrwaRollupPageComponent } from './crwa-rollup-page.component';

describe('CrwaRollupPageComponent', () => {
  beforeEach(async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ rows: [], generatedAt: '2026-08-04T00:00:00Z' }), {
          status: 200,
        }),
      ),
    );

    await TestBed.configureTestingModule({
      imports: [CrwaRollupPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            getBearerToken: () => 'jwt',
            isLoggedIn: () => true,
            isCrwaAdmin: () => true,
          },
        },
      ],
    }).compileComponents();
  });

  it('loads roll-up rows on init', async () => {
    const fixture = TestBed.createComponent(CrwaRollupPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fetch).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toMatch(/Roll-up|CRWA|confidence/i);
  });
});
