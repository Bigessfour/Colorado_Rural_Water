import {
  ApplicationConfig,
  ErrorHandler,
  ENVIRONMENT_INITIALIZER,
  inject,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';

import { routes } from './app.routes';
import { environment } from '../environments/environment';
import {
  ClientErrorReporter,
  installBrowserErrorBridge,
} from './core/client-error-reporter';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    ClientErrorReporter,
    { provide: ErrorHandler, useExisting: ClientErrorReporter },
    {
      provide: ENVIRONMENT_INITIALIZER,
      multi: true,
      useValue: () => {
        installBrowserErrorBridge(inject(ClientErrorReporter));
      },
    },
    provideRouter(routes),
    provideHttpClient(),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: false,
        },
      },
      ...(environment.primeNgLicense
        ? { license: environment.primeNgLicense }
        : {}),
    }),
  ],
};
