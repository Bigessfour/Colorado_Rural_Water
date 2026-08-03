import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReviewService } from './review.service';
import { REVIEW_STEPS } from './review-steps';
import { ReviewPanelComponent } from './review-panel.component';

@Component({ selector: 'app-stub', template: '' })
class StubComponent {}

describe('ReviewPanelComponent', () => {
  const saveStep = vi.fn(async () => true);
  const nextStep = vi.fn();
  const submitted = signal(false);
  const error = signal('');
  const busy = signal(false);
  const stepIndex = signal(0);

  beforeEach(async () => {
    saveStep.mockClear();
    nextStep.mockClear();
    submitted.set(false);
    error.set('');
    busy.set(false);
    stepIndex.set(0);

    await TestBed.configureTestingModule({
      imports: [ReviewPanelComponent],
      providers: [
        provideRouter([
          { path: 'login', component: StubComponent },
          { path: 'dashboard', component: StubComponent },
        ]),
        {
          provide: ReviewService,
          useValue: {
            currentStep: () => REVIEW_STEPS[stepIndex()]!,
            progressLabel: () => `Step ${stepIndex() + 1} of ${REVIEW_STEPS.length}`,
            stepIndex: () => stepIndex(),
            totalSteps: REVIEW_STEPS.length,
            submitted: () => submitted(),
            error: () => error(),
            busy: () => busy(),
            stepFeedback: () => undefined,
            saveStep,
            nextStep,
            prevStep: vi.fn(),
            submit: vi.fn(async () => ({ ok: true, emailSent: true })),
          },
        },
      ],
    }).compileComponents();

    // Avoid navigation failures during saveAndNext → goToCurrentRoute.
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });

  it('renders rating choices for the current step', () => {
    const fixture = TestBed.createComponent(ReviewPanelComponent);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Love this');
    expect(text).toContain("Don't need this");
    expect(text).toContain(REVIEW_STEPS[0]!.title);
  });

  it('selectRating + saveAndNext requires comment for Change', async () => {
    const fixture = TestBed.createComponent(ReviewPanelComponent);
    const cmp = fixture.componentInstance;
    fixture.detectChanges();

    cmp.selectRating('change');
    cmp.comment = '';
    saveStep.mockResolvedValueOnce(false);
    await cmp.saveAndNext();
    expect(saveStep).toHaveBeenCalledWith(
      expect.objectContaining({ rating: 'change', comment: '', skipped: false }),
    );
    expect(nextStep).not.toHaveBeenCalled();
  });

  it('saveAndNext advances when save succeeds', async () => {
    const fixture = TestBed.createComponent(ReviewPanelComponent);
    const cmp = fixture.componentInstance;
    fixture.detectChanges();
    cmp.selectRating('love');
    cmp.comment = 'Nice';
    await cmp.saveAndNext();
    expect(saveStep).toHaveBeenCalled();
    expect(nextStep).toHaveBeenCalled();
  });
});
