import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../core/auth.service';
import { LoginPageComponent } from './login-page.component';

describe('LoginPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            login: vi.fn(async () => ({ kind: 'done' as const })),
            respondToMfaChallenge: vi.fn(),
            completeNewPassword: vi.fn(),
            verifySoftwareToken: vi.fn(),
          },
        },
      ],
    }).compileComponents();
  });

  it('starts on credentials step and renders sign-in copy', () => {
    const fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.step()).toBe('credentials');
    expect(fixture.nativeElement.textContent).toMatch(/Sign in|Water Saver/i);
  });
});
