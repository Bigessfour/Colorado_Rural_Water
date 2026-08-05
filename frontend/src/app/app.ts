import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { ReviewService } from './review/review.service';
import { ReviewPanelComponent } from './review/review-panel.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, ReviewPanelComponent],
  template: `
    <router-outlet />
    @if (review.active() && review.sessionId()) {
      <app-review-panel />
    } @else if (review.active() && !review.sessionId()) {
      <aside class="review-nudge" aria-label="Start Kelly review">
        <p>
          Review mode is on. Open <a routerLink="/review">Review</a> and press Start (sign in first
          if needed).
        </p>
      </aside>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .review-nudge {
      position: fixed;
      right: 1rem;
      bottom: 1rem;
      z-index: 1200;
      max-width: 18rem;
      padding: 0.85rem 1rem;
      border-radius: 0.5rem;
      background: #0f3d42;
      color: #f4fbfb;
      font-family: 'Source Sans 3', system-ui, sans-serif;
      font-size: 0.9rem;
      box-shadow: 0 8px 24px rgba(15, 61, 66, 0.28);
    }
    .review-nudge a {
      color: #9ee7e0;
    }
  `,
})
export class App {
  /** Hosts Kelly review panel when review mode + session are active. */
  readonly review = inject(ReviewService);
}
