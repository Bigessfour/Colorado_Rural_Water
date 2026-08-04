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
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly review = inject(ReviewService);
  readonly theme = inject(ThemeService);
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
