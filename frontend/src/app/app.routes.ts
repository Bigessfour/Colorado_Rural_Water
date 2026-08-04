import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell.component';
import { DashboardPageComponent } from './pages/dashboard/dashboard-page.component';
import { UploadPageComponent } from './pages/upload/upload-page.component';
import { AlertsPageComponent } from './pages/alerts/alerts-page.component';
import { CrwaRollupPageComponent } from './pages/crwa/crwa-rollup-page.component';
import { LoginPageComponent } from './pages/login/login-page.component';
import { SourcesPageComponent } from './pages/sources/sources-page.component';
import { MetersPageComponent } from './pages/meters/meters-page.component';
import { AdminPageComponent } from './pages/admin/admin-page.component';
import { BillingPageComponent } from './pages/billing/billing-page.component';
import { AccountPageComponent } from './pages/account/account-page.component';
import { AgentPageComponent } from './pages/agent/agent-page.component';
import { ReviewHowtoPageComponent } from './pages/review/review-howto-page.component';
import { OnboardingPageComponent } from './pages/onboarding/onboarding-page.component';
import { ReportsPageComponent } from './pages/reports/reports-page.component';

export const routes: Routes = [
  { path: 'login', component: LoginPageComponent },
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: DashboardPageComponent },
      { path: 'upload', component: UploadPageComponent },
      { path: 'meters', component: MetersPageComponent },
      { path: 'sources', component: SourcesPageComponent },
      { path: 'alerts', component: AlertsPageComponent },
      { path: 'onboarding', component: OnboardingPageComponent },
      { path: 'reports', component: ReportsPageComponent },
      { path: 'assistant', component: AgentPageComponent },
      { path: 'account', component: AccountPageComponent },
      { path: 'admin', component: AdminPageComponent },
      { path: 'billing', component: BillingPageComponent },
      { path: 'crwa', component: CrwaRollupPageComponent },
      { path: 'review', component: ReviewHowtoPageComponent },
    ],
  },
];
