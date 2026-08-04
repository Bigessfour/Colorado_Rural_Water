import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../core/auth.service';
import { ReviewService } from '../review/review.service';
import { ShellComponent } from './shell.component';

describe('ShellComponent', () => {
  const logout = vi.fn();
  const refreshProfile = vi.fn(async () => {});

  beforeEach(async () => {
    document.body.classList.remove('compose-demo');
    logout.mockClear();
    refreshProfile.mockClear();

    await TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            isLoggedIn: () => true,
            logout,
            refreshProfile,
            canManageUsers: () => false,
            isSystemAdmin: () => false,
            isCrwaAdmin: () => false,
            email: () => 'operator@example.com',
          },
        },
        {
          provide: ReviewService,
          useValue: {
            active: () => false,
            sessionId: () => null,
            enableMode: vi.fn(),
            ensureSession: vi.fn(async () => true),
          },
        },
      ],
    }).compileComponents();
  });

  it('creates and refreshes profile when logged in', () => {
    const fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();
    expect(refreshProfile).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toMatch(/Water Saver|Dashboard/i);
  });

  it('logout delegates to AuthService', () => {
    const fixture = TestBed.createComponent(ShellComponent);
    fixture.componentInstance.logout();
    expect(logout).toHaveBeenCalled();
  });
});
