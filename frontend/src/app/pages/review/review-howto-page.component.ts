import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../../core/auth.service';
import { ReviewService } from '../../review/review.service';
import { REVIEW_STEPS } from '../../review/review-steps';

@Component({
  selector: 'app-review-howto-page',
  imports: [RouterLink, ButtonModule, CardModule, MessageModule],
  templateUrl: './review-howto-page.component.html',
  styleUrl: './review-howto-page.component.scss',
})
export class ReviewHowtoPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly review = inject(ReviewService);
  private readonly router = inject(Router);

  readonly steps = REVIEW_STEPS;
  status = signal('');

  ngOnInit(): void {
    // Arm review mode; resume existing open session — never force step 0 here.
    this.review.enableMode();
    if (this.auth.isLoggedIn()) {
      void this.review.ensureSession();
    }
  }

  async start(): Promise<void> {
    this.status.set('');
    const ok = await this.review.ensureSession();
    if (!ok) return;
    // Mid-walkthrough: continue where they left off (do not reset to the beginning).
    await this.router.navigateByUrl(this.review.currentStep().route);
  }
}
