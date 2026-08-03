import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell.component';
import { DashboardPageComponent } from './pages/dashboard/dashboard-page.component';
import { UploadPageComponent } from './pages/upload/upload-page.component';
import { AlertsPageComponent } from './pages/alerts/alerts-page.component';
import { CrwaRollupPageComponent } from './pages/crwa/crwa-rollup-page.component';
import { LoginPageComponent } from './pages/login/login-page.component';
import { SourcesPageComponent } from './pages/sources/sources-page.component';
import { AdminPageComponent } from './pages/admin/admin-page.component';
import { BillingPageComponent } from './pages/billing/billing-page.component';

export const routes: Routes = [
  { path: 'login', component: LoginPageComponent },
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: DashboardPageComponent },
      { path: 'upload', component: UploadPageComponent },
      { path: 'sources', component: SourcesPageComponent },
      { path: 'alerts', component: AlertsPageComponent },
      { path: 'admin', component: AdminPageComponent },
      { path: 'billing', component: BillingPageComponent },
      { path: 'crwa', component: CrwaRollupPageComponent },
    ],
  },
];
