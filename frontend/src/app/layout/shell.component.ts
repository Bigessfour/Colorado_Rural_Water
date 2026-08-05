/**
 * Authenticated app chrome — nav, theme toggle, product tour, Kelly review mode.
 * Compose Assessment (`environment.composeDemo`) loosens Cognito for the AI spine;
 * production SPA always uses JWT Bearer from AuthService.
 */

import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SelectButton } from 'primeng/selectbutton';
import { AuthService } from '../core/auth.service';
import { ReviewService } from '../review/review.service';
import { ThemeService, type UiTheme } from '../core/theme.service';
import { ProductTourOverlayComponent } from '../tour/product-tour-overlay.component';
import { ProductTourService } from '../tour/product-tour.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-shell',
  imports: [
    FormsModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ButtonModule,
    MessageModule,
    SelectButton,
    ProductTourOverlayComponent,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly review = inject(ReviewService);
  readonly theme = inject(ThemeService);
  readonly tour = inject(ProductTourService);
  readonly composeDemo = environment.composeDemo;

  readonly themeOptions = [
    { label: 'Light', value: 'light' as UiTheme, icon: 'pi pi-sun' },
    { label: 'Dark', value: 'dark' as UiTheme, icon: 'pi pi-moon' },
  ];

  private readonly router = inject(Router);

  onThemeChange(mode: UiTheme): void {
    this.theme.setMode(mode);
  }

  ngOnInit(): void {
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('compose-demo', this.composeDemo);
    }
    if (this.auth.isLoggedIn()) {
      void this.auth.refreshProfile().finally(() => {
        // One-time product tour for new operators (per email + tour version).
        // Skip when Kelly guided review is already running.
        window.setTimeout(() => {
          if (this.review.active()) return;
          this.tour.maybeAutoStart();
        }, 900);
      });
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
