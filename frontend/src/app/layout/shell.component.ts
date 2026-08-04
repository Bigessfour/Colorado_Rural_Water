import { Component, OnInit, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../core/auth.service';
import { ReviewService } from '../review/review.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ButtonModule, MessageModule],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly review = inject(ReviewService);
  readonly composeDemo = environment.composeDemo;
  private readonly router = inject(Router);

  ngOnInit(): void {
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('compose-demo', this.composeDemo);
    }
    if (this.auth.isLoggedIn()) {
      void this.auth.refreshProfile();
    }
    this.syncReviewModeFromUrl();
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.syncReviewModeFromUrl());
    if (this.review.active() && this.review.sessionId() && this.auth.isLoggedIn()) {
      void this.review.ensureSession();
    }
  }

  logout(): void {
    this.auth.logout();
  }

  private syncReviewModeFromUrl(): void {
    const tree = this.router.parseUrl(this.router.url);
    if (tree.queryParams['mode'] === 'review') {
      this.review.enableMode();
    }
  }
}
