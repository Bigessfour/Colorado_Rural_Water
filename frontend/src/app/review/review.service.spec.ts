import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../core/auth.service';
import { ReviewService } from './review.service';

describe('ReviewService', () => {
  let review: ReviewService;
  let auth: {
    isLoggedIn: ReturnType<typeof vi.fn>;
    getBearerToken: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    sessionStorage.clear();
    auth = {
      isLoggedIn: vi.fn(() => true),
      getBearerToken: vi.fn(() => 'fake-jwt'),
    };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ReviewService,
        { provide: AuthService, useValue: auth },
      ],
    });
    review = TestBed.inject(ReviewService);
    vi.stubGlobal('fetch', vi.fn());
  });

  it('createSession stores session id and enables review mode', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          session: {
            sessionId: 'sess-1',
            reviewerEmail: 'kelly@example.com',
            createdAt: '2026-08-01T00:00:00.000Z',
            expiresAt: '2026-08-15T00:00:00.000Z',
            status: 'open',
          },
        }),
        { status: 201 },
      ),
    );

    const ok = await review.createSession();
    expect(ok).toBe(true);
    expect(review.sessionId()).toBe('sess-1');
    expect(review.active()).toBe(true);
    expect(sessionStorage.getItem('ws_review_session_id')).toBe('sess-1');
  });

  it('saveStep requires comment for change rating', async () => {
    sessionStorage.setItem('ws_review_session_id', 'sess-1');
    // Re-inject so constructor reads session id
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ReviewService,
        { provide: AuthService, useValue: auth },
      ],
    });
    review = TestBed.inject(ReviewService);
    review.setStepIndex(1); // dashboard

    const ok = await review.saveStep({
      rating: 'change',
      clarity: 3,
      comment: '',
      skipped: false,
    });
    expect(ok).toBe(false);
    expect(review.error()).toMatch(/short note/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('saveStep persists feedback and submit marks completed', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            session: {
              sessionId: 'sess-2',
              reviewerEmail: 'kelly@example.com',
              createdAt: '2026-08-01T00:00:00.000Z',
              expiresAt: '2026-08-15T00:00:00.000Z',
              status: 'open',
            },
          }),
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            step: {
              stepId: 'signin',
              rating: 'love',
              clarity: 5,
              comment: 'Calm',
              skipped: false,
              updatedAt: '2026-08-03T00:00:00.000Z',
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            session: {
              sessionId: 'sess-2',
              reviewerEmail: 'kelly@example.com',
              createdAt: '2026-08-01T00:00:00.000Z',
              expiresAt: '2026-08-15T00:00:00.000Z',
              status: 'completed',
              submittedAt: '2026-08-03T12:00:00.000Z',
            },
            steps: [],
            emailSent: true,
            summaryText: 'ok',
          }),
          { status: 200 },
        ),
      );

    expect(await review.createSession()).toBe(true);
    review.setStepIndex(0);
    expect(
      await review.saveStep({
        rating: 'love',
        clarity: 5,
        comment: 'Calm',
        skipped: false,
      }),
    ).toBe(true);
    expect(review.stepFeedback('signin')?.rating).toBe('love');

    const submitted = await review.submit();
    expect(submitted.ok).toBe(true);
    expect(submitted.emailSent).toBe(true);
    expect(review.submitted()).toBe(true);
  });

  it('ensureSession fails when not logged in', async () => {
    auth.isLoggedIn.mockReturnValue(false);
    auth.getBearerToken.mockReturnValue(null);
    expect(await review.ensureSession()).toBe(false);
    expect(review.error()).toMatch(/Sign in/i);
  });

  it('resumes at first unanswered step after reload', async () => {
    sessionStorage.setItem('ws_review_session_id', 'sess-resume');
    sessionStorage.setItem('ws_review_step_index', '0'); // stale / remounted
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ReviewService,
        { provide: AuthService, useValue: auth },
      ],
    });
    review = TestBed.inject(ReviewService);

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          session: {
            sessionId: 'sess-resume',
            reviewerEmail: 'kelly@example.com',
            createdAt: '2026-08-01T00:00:00.000Z',
            expiresAt: '2026-08-15T00:00:00.000Z',
            status: 'open',
          },
          steps: [
            { stepId: 'signin', rating: 'love', clarity: 5, comment: '', skipped: false, updatedAt: 't' },
            { stepId: 'dashboard', rating: 'love', clarity: 4, comment: '', skipped: false, updatedAt: 't' },
            { stepId: 'upload_mapper', rating: 'change', clarity: 3, comment: 'mapper copy', skipped: false, updatedAt: 't' },
          ],
        }),
        { status: 200 },
      ),
    );

    expect(await review.ensureSession()).toBe(true);
    // Next unanswered is alerts (index 3)
    expect(review.stepIndex()).toBe(3);
    expect(review.currentStep().id).toBe('alerts');
  });
});
