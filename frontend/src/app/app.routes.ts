import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell.component';
import { DashboardPageComponent } from './pages/dashboard/dashboard-page.component';
import { UploadPageComponent } from './pages/upload/upload-page.component';
import { AlertsPageComponent } from './pages/alerts/alerts-page.component';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: DashboardPageComponent },
      { path: 'upload', component: UploadPageComponent },
      { path: 'alerts', component: AlertsPageComponent },
    ],
  },
];
