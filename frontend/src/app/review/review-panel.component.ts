import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { TextareaModule } from 'primeng/textarea';
import { ReviewService } from './review.service';
import { RATING_OPTIONS, type ReviewRating } from './review-steps';

@Component({
  selector: 'app-review-panel',
  imports: [FormsModule, ButtonModule, MessageModule, TextareaModule],
  templateUrl: './review-panel.component.html',
  styleUrl: './review-panel.component.scss',
})
export class ReviewPanelComponent implements OnInit {
  readonly review = inject(ReviewService);
  private readonly router = inject(Router);

  readonly ratingOptions = RATING_OPTIONS;

  rating: ReviewRating | null = null;
  clarity: number | null = null;
  comment = '';
  statusNote = signal('');
  collapsed = signal(false);

  ngOnInit(): void {
    void this.hydrateFromSaved();
  }

  private hydrateFromSaved(): void {
    const step = this.review.currentStep();
    const saved = this.review.stepFeedback(step.id);
    if (saved) {
      this.rating = saved.rating;
      this.clarity = saved.clarity;
      this.comment = saved.comment;
    } else {
      this.rating = null;
      this.clarity = null;
      this.comment = '';
    }
  }

  selectRating(value: ReviewRating): void {
    this.rating = value;
  }

  async saveAndNext(): Promise<void> {
    this.statusNote.set('');
    const ok = await this.review.saveStep({
      rating: this.rating,
      clarity: this.clarity,
      comment: this.comment,
      skipped: false,
    });
    if (!ok) return;
    this.statusNote.set('Saved.');
    if (this.review.stepIndex() < this.review.totalSteps - 1) {
      this.review.nextStep();
      this.hydrateFromSaved();
      await this.goToCurrentRoute();
    }
  }

  async skip(): Promise<void> {
    this.statusNote.set('');
    const ok = await this.review.saveStep({
      rating: null,
      clarity: null,
      comment: this.comment,
      skipped: true,
    });
    if (!ok) return;
    if (this.review.stepIndex() < this.review.totalSteps - 1) {
      this.review.nextStep();
      this.hydrateFromSaved();
      await this.goToCurrentRoute();
    }
  }

  async back(): Promise<void> {
    this.review.prevStep();
    this.hydrateFromSaved();
    await this.goToCurrentRoute();
  }

  async submitReview(): Promise<void> {
    this.statusNote.set('');
    // Persist current step first if they rated it.
    if (this.rating || this.comment.trim()) {
      const saved = await this.review.saveStep({
        rating: this.rating,
        clarity: this.clarity,
        comment: this.comment,
        skipped: false,
      });
      if (!saved) return;
    }
    const result = await this.review.submit();
    if (result.ok) {
      if (result.emailSent) {
        this.statusNote.set('Review submitted. Thank you — Steve will get a summary email.');
      } else if (result.emailSkippedReason) {
        this.statusNote.set(`Review saved. ${result.emailSkippedReason}`);
      } else {
        this.statusNote.set('Review submitted. Thank you.');
      }
    }
  }

  toggleCollapse(): void {
    this.collapsed.update((v) => !v);
  }

  private async goToCurrentRoute(): Promise<void> {
    const route = this.review.currentStep().route;
    await this.router.navigateByUrl(route);
  }
}
