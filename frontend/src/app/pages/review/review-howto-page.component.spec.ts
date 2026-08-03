import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../core/auth.service';
import { ReviewService } from '../../review/review.service';
import { REVIEW_STEPS } from '../../review/review-steps';
import { ReviewHowtoPageComponent } from './review-howto-page.component';

@Component({ selector: 'app-stub', template: '' })
class StubComponent {}

describe('ReviewHowtoPageComponent', () => {
  const loggedIn = signal(true);
  const ensureSession = vi.fn(async () => true);
  const setStepIndex = vi.fn();
  const enableMode = vi.fn();

  beforeEach(async () => {
    sessionStorage.clear();
    loggedIn.set(true);
    ensureSession.mockClear();
    setStepIndex.mockClear();
    enableMode.mockClear();

    await TestBed.configureTestingModule({
      imports: [ReviewHowtoPageComponent],
      providers: [
        provideRouter([
          { path: 'login', component: StubComponent },
          { path: 'dashboard', component: StubComponent },
        ]),
        {
          provide: AuthService,
          useValue: {
            isLoggedIn: () => loggedIn(),
          },
        },
        {
          provide: ReviewService,
          useValue: {
            enableMode,
            ensureSession,
            setStepIndex,
            currentStep: () => REVIEW_STEPS[1]!,
            error: () => '',
            busy: () => false,
            submitted: () => false,
          },
        },
      ],
    }).compileComponents();
  });

  it('enables review mode on init and lists steps', () => {
    const fixture = TestBed.createComponent(ReviewHowtoPageComponent);
    fixture.detectChanges();
    expect(enableMode).toHaveBeenCalled();
    expect(ensureSession).toHaveBeenCalled();
    expect(fixture.componentInstance.steps.length).toBe(REVIEW_STEPS.length);
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Kelly review');
    expect(text).toContain('Start review');
  });

  it('start calls ensureSession when logged in', async () => {
    const fixture = TestBed.createComponent(ReviewHowtoPageComponent);
    fixture.detectChanges();
    ensureSession.mockClear();
    setStepIndex.mockClear();
    await fixture.componentInstance.start();
    expect(ensureSession).toHaveBeenCalled();
    // Continues from current step — does not force setStepIndex(0).
    expect(setStepIndex).not.toHaveBeenCalled();
  });

  it('shows sign-in hint when logged out', () => {
    loggedIn.set(false);
    const fixture = TestBed.createComponent(ReviewHowtoPageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toMatch(/Sign in/i);
  });
});
