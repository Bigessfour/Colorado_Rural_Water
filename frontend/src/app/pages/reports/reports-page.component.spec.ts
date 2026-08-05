import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../core/auth.service';
import { ReportsPageComponent } from './reports-page.component';

describe('ReportsPageComponent', () => {
  beforeEach(async () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );

    await TestBed.configureTestingModule({
      imports: [ReportsPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            getBearerToken: () => 'jwt',
            isLoggedIn: () => true,
            placeName: () => 'Town of Wiley',
          },
        },
      ],
    }).compileComponents();
  });

  it('renders report tabs and catalog', () => {
    const fixture = TestBed.createComponent(ReportsPageComponent);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toMatch(/Reports|All report processes|Run reports|Recent activity/i);
    expect(text).toMatch(/work order|summary/i);
    expect(text).toMatch(/Field \/ work orders|Operations|Legacy export/);
  });

  it('shows labeled catalog actions including Open / Print PDF', () => {
    const fixture = TestBed.createComponent(ReportsPageComponent);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toMatch(/Download CSV/);
    expect(text).toMatch(/Download Excel/);
    expect(text).toMatch(/Open \/ Print PDF/);
  });
});
