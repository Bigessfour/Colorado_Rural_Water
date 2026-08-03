import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from '../core/auth.service';
import { environment } from '../../environments/environment';
import { REVIEW_STEPS, type ReviewRating } from './review-steps';

const MODE_KEY = 'ws_review_mode';
const SESSION_KEY = 'ws_review_session_id';
const STEP_INDEX_KEY = 'ws_review_step_index';

export interface ReviewSessionDto {
  sessionId: string;
  reviewerEmail: string;
  createdAt: string;
  expiresAt: string;
  status: 'open' | 'completed';
  submittedAt?: string;
}

export interface ReviewStepDto {
  stepId: string;
  rating: ReviewRating | null;
  clarity: number | null;
  comment: string;
  skipped: boolean;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly auth = inject(AuthService);

  private readonly modeOn = signal(this.readMode());
  private readonly sessionIdSig = signal<string | null>(this.readSessionId());
  private readonly sessionSig = signal<ReviewSessionDto | null>(null);
  private readonly stepsSig = signal<ReviewStepDto[]>([]);
  private readonly indexSig = signal(this.readStepIndex());
  private readonly errorSig = signal('');
  private readonly busySig = signal(false);
  private readonly submittedSig = signal(false);

  readonly active = computed(() => this.modeOn());
  readonly sessionId = computed(() => this.sessionIdSig());
  readonly session = computed(() => this.sessionSig());
  readonly steps = computed(() => this.stepsSig());
  readonly stepIndex = computed(() => this.indexSig());
  readonly currentStep = computed(() => REVIEW_STEPS[this.indexSig()] ?? REVIEW_STEPS[0]!);
  readonly progressLabel = computed(
    () => `Step ${this.indexSig() + 1} of ${REVIEW_STEPS.length}`,
  );
  readonly error = computed(() => this.errorSig());
  readonly busy = computed(() => this.busySig());
  readonly submitted = computed(() => this.submittedSig());
  readonly totalSteps = REVIEW_STEPS.length;
  /** True when at least one step was saved or index advanced past the start. */
  readonly hasProgress = computed(
    () => this.stepsSig().length > 0 || this.indexSig() > 0,
  );

  enableMode(): void {
    this.modeOn.set(true);
    sessionStorage.setItem(MODE_KEY, '1');
  }

  disableMode(): void {
    this.modeOn.set(false);
    sessionStorage.removeItem(MODE_KEY);
  }

  setStepIndex(i: number): void {
    const clamped = Math.max(0, Math.min(REVIEW_STEPS.length - 1, i));
    this.indexSig.set(clamped);
    sessionStorage.setItem(STEP_INDEX_KEY, String(clamped));
  }

  nextStep(): void {
    this.setStepIndex(this.indexSig() + 1);
  }

  prevStep(): void {
    this.setStepIndex(this.indexSig() - 1);
  }

  stepFeedback(stepId: string): ReviewStepDto | undefined {
    return this.stepsSig().find((s) => s.stepId === stepId);
  }

  /**
   * Open or resume the active review session without forcing step 0.
   * Completed sessions get a fresh open session; mid-walkthrough progress is kept.
   */
  async ensureSession(): Promise<boolean> {
    if (!this.auth.isLoggedIn()) {
      this.errorSig.set('Sign in to start the review.');
      return false;
    }
    const existing = this.sessionIdSig();
    if (existing) {
      const ok = await this.loadSession(existing);
      if (ok && !this.submittedSig()) {
        this.restoreStepIndexFromProgress();
        return true;
      }
      // Completed or invalid stored session → start a fresh open session for Kelly.
      this.clearStoredSession();
    }
    const created = await this.createSession();
    if (created && !this.hasProgress()) {
      // Fresh walkthrough: skip sign-in step when already authenticated.
      this.setStepIndex(this.auth.isLoggedIn() ? 1 : 0);
    }
    return created;
  }

  async createSession(): Promise<boolean> {
    const token = this.auth.getBearerToken();
    if (!token) {
      this.errorSig.set('Sign in to start the review.');
      return false;
    }
    this.busySig.set(true);
    this.errorSig.set('');
    try {
      const res = await fetch(`${environment.apiBaseUrl}/review/sessions`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok) {
        this.errorSig.set(body.error ?? `Could not start review (${res.status})`);
        return false;
      }
      const session = body.session as ReviewSessionDto;
      this.sessionSig.set(session);
      this.sessionIdSig.set(session.sessionId);
      sessionStorage.setItem(SESSION_KEY, session.sessionId);
      this.stepsSig.set([]);
      this.submittedSig.set(session.status === 'completed');
      this.enableMode();
      return true;
    } catch (err) {
      this.errorSig.set(err instanceof Error ? err.message : 'Network error');
      return false;
    } finally {
      this.busySig.set(false);
    }
  }

  async loadSession(sessionId: string): Promise<boolean> {
    const token = this.auth.getBearerToken();
    if (!token) return false;
    this.busySig.set(true);
    this.errorSig.set('');
    try {
      const res = await fetch(
        `${environment.apiBaseUrl}/review/sessions/${encodeURIComponent(sessionId)}`,
        { headers: { authorization: `Bearer ${token}` } },
      );
      const body = await res.json();
      if (!res.ok) {
        this.clearStoredSession();
        this.errorSig.set(body.error ?? `Could not load session (${res.status})`);
        return false;
      }
      this.sessionSig.set(body.session as ReviewSessionDto);
      this.stepsSig.set((body.steps ?? []) as ReviewStepDto[]);
      this.submittedSig.set(body.session?.status === 'completed');
      this.enableMode();
      return true;
    } catch (err) {
      this.errorSig.set(err instanceof Error ? err.message : 'Network error');
      return false;
    } finally {
      this.busySig.set(false);
    }
  }

  async saveStep(input: {
    rating: ReviewRating | null;
    clarity: number | null;
    comment: string;
    skipped: boolean;
  }): Promise<boolean> {
    const sessionId = this.sessionIdSig();
    const step = this.currentStep();
    const token = this.auth.getBearerToken();
    if (!sessionId || !step || !token) {
      this.errorSig.set('No active review session.');
      return false;
    }
    if (!input.skipped && (input.rating === 'change' || input.rating === 'need_new')) {
      if (!input.comment.trim()) {
        this.errorSig.set('Add a short note for Change this or Need something new.');
        return false;
      }
    }
    this.busySig.set(true);
    this.errorSig.set('');
    try {
      const res = await fetch(
        `${environment.apiBaseUrl}/review/sessions/${encodeURIComponent(sessionId)}/steps/${encodeURIComponent(step.id)}`,
        {
          method: 'PUT',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(input),
        },
      );
      const body = await res.json();
      if (!res.ok) {
        this.errorSig.set(body.error ?? `Could not save (${res.status})`);
        return false;
      }
      const saved = body.step as ReviewStepDto;
      this.stepsSig.update((list) => {
        const rest = list.filter((s) => s.stepId !== saved.stepId);
        return [...rest, saved];
      });
      // Keep index durable across HMR / remounts.
      sessionStorage.setItem(STEP_INDEX_KEY, String(this.indexSig()));
      return true;
    } catch (err) {
      this.errorSig.set(err instanceof Error ? err.message : 'Network error');
      return false;
    } finally {
      this.busySig.set(false);
    }
  }

  async submit(): Promise<{
    ok: boolean;
    summaryText?: string;
    emailSent?: boolean;
    emailSkippedReason?: string;
  }> {
    const sessionId = this.sessionIdSig();
    const token = this.auth.getBearerToken();
    if (!sessionId || !token) {
      this.errorSig.set('No active review session.');
      return { ok: false };
    }
    this.busySig.set(true);
    this.errorSig.set('');
    try {
      const res = await fetch(
        `${environment.apiBaseUrl}/review/sessions/${encodeURIComponent(sessionId)}/submit`,
        {
          method: 'POST',
          headers: { authorization: `Bearer ${token}` },
        },
      );
      const body = await res.json();
      if (!res.ok) {
        this.errorSig.set(body.error ?? `Submit failed (${res.status})`);
        return { ok: false };
      }
      this.sessionSig.set(body.session as ReviewSessionDto);
      this.stepsSig.set((body.steps ?? []) as ReviewStepDto[]);
      this.submittedSig.set(true);
      sessionStorage.removeItem(STEP_INDEX_KEY);
      return {
        ok: true,
        summaryText: body.summaryText as string | undefined,
        emailSent: Boolean(body.emailSent),
        emailSkippedReason: body.emailSkippedReason as string | undefined,
      };
    } catch (err) {
      this.errorSig.set(err instanceof Error ? err.message : 'Network error');
      return { ok: false };
    } finally {
      this.busySig.set(false);
    }
  }

  /** First step with no saved feedback, else last step. */
  firstUnansweredIndex(steps: ReviewStepDto[] = this.stepsSig()): number {
    for (let i = 0; i < REVIEW_STEPS.length; i += 1) {
      const id = REVIEW_STEPS[i]!.id;
      if (!steps.some((s) => s.stepId === id)) return i;
    }
    return REVIEW_STEPS.length - 1;
  }

  private restoreStepIndexFromProgress(): void {
    const savedIdx = this.readStepIndex();
    if (this.stepsSig().length > 0) {
      // Resume at first unanswered step from Dynamo — survives remounts / HMR.
      this.setStepIndex(this.firstUnansweredIndex(this.stepsSig()));
      return;
    }
    this.setStepIndex(savedIdx);
  }

  private clearStoredSession(): void {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(STEP_INDEX_KEY);
    this.sessionIdSig.set(null);
    this.sessionSig.set(null);
    this.stepsSig.set([]);
    this.submittedSig.set(false);
    this.indexSig.set(0);
  }

  private readMode(): boolean {
    try {
      return sessionStorage.getItem(MODE_KEY) === '1';
    } catch {
      return false;
    }
  }

  private readSessionId(): string | null {
    try {
      return sessionStorage.getItem(SESSION_KEY);
    } catch {
      return null;
    }
  }

  private readStepIndex(): number {
    try {
      const raw = sessionStorage.getItem(STEP_INDEX_KEY);
      if (raw == null || raw === '') return 0;
      const n = Number.parseInt(raw, 10);
      if (!Number.isFinite(n)) return 0;
      return Math.max(0, Math.min(REVIEW_STEPS.length - 1, n));
    } catch {
      return 0;
    }
  }
}
