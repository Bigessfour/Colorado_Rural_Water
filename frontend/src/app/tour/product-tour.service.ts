import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import {
  PRODUCT_TOUR_STEPS,
  PRODUCT_TOUR_VERSION,
  deepenPrompt,
  type ProductTourStep,
} from './product-tour.steps';

const STORAGE_PREFIX = 'ws_product_tour_done';

@Injectable({ providedIn: 'root' })
export class ProductTourService {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  private readonly activeSig = signal(false);
  private readonly indexSig = signal(0);
  private readonly rectSig = signal<DOMRect | null>(null);

  readonly active = this.activeSig.asReadonly();
  readonly index = this.indexSig.asReadonly();
  readonly highlightRect = this.rectSig.asReadonly();
  readonly steps = PRODUCT_TOUR_STEPS;

  currentStep(): ProductTourStep {
    return PRODUCT_TOUR_STEPS[this.indexSig()] ?? PRODUCT_TOUR_STEPS[0]!;
  }

  progressLabel(): string {
    return `Tip ${this.indexSig() + 1} of ${PRODUCT_TOUR_STEPS.length}`;
  }

  storageKey(): string {
    const who = this.auth.email() || this.auth.tenantId() || 'anon';
    return `${STORAGE_PREFIX}:${PRODUCT_TOUR_VERSION}:${who}`;
  }

  hasCompleted(): boolean {
    if (typeof localStorage === 'undefined') return true;
    return localStorage.getItem(this.storageKey()) === '1';
  }

  markCompleted(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.storageKey(), '1');
  }

  clearCompleted(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(this.storageKey());
  }

  /** One-time auto start after login for new operators. */
  maybeAutoStart(): void {
    if (!this.auth.isLoggedIn() || this.activeSig() || this.hasCompleted()) return;
    void this.start();
  }

  async start(fromBeginning = true): Promise<void> {
    if (!this.auth.isLoggedIn()) return;
    if (fromBeginning) this.indexSig.set(0);
    this.activeSig.set(true);
    await this.showStep(this.indexSig());
  }

  async next(): Promise<void> {
    if (this.indexSig() >= PRODUCT_TOUR_STEPS.length - 1) {
      this.finish();
      return;
    }
    this.indexSig.update((i) => i + 1);
    await this.showStep(this.indexSig());
  }

  async prev(): Promise<void> {
    if (this.indexSig() <= 0) return;
    this.indexSig.update((i) => i - 1);
    await this.showStep(this.indexSig());
  }

  skip(): void {
    this.finish();
  }

  finish(): void {
    this.markCompleted();
    this.activeSig.set(false);
    this.rectSig.set(null);
  }

  /** Replay from Settings — clears one-time flag and starts again. */
  async replay(): Promise<void> {
    this.clearCompleted();
    await this.start(true);
  }

  async knowMore(): Promise<void> {
    const step = this.currentStep();
    const prompt = deepenPrompt(step);
    this.finish();
    // Keep the prompt out of the URL (length + cleaner share links).
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('ws_assistant_ask', prompt);
    }
    await this.router.navigate(['/assistant'], {
      queryParams: { deepen: '1', feature: step.featureKey },
    });
  }

  private async showStep(i: number): Promise<void> {
    const step = PRODUCT_TOUR_STEPS[i];
    if (!step) return;
    await this.router.navigateByUrl(step.route);
    // Allow the route/view to paint before measuring.
    await new Promise((r) => setTimeout(r, 280));
    this.measureAnchor(step.anchor);
    // Retry once if the view is still settling.
    if (!this.rectSig()) {
      await new Promise((r) => setTimeout(r, 400));
      this.measureAnchor(step.anchor);
    }
  }

  private measureAnchor(anchor: string): void {
    if (typeof document === 'undefined') return;
    const el = document.querySelector(`[data-tour="${anchor}"]`) as HTMLElement | null;
    if (!el) {
      this.rectSig.set(null);
      return;
    }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const rect = el.getBoundingClientRect();
    this.rectSig.set(rect);
  }

  refreshHighlight(): void {
    if (!this.activeSig()) return;
    this.measureAnchor(this.currentStep().anchor);
  }
}
