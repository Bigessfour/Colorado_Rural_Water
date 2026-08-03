import { ErrorHandler, Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

/** Debounce identical messages so a tight loop does not flood the API. */
const DEDUPE_MS = 5_000;
const recent = new Map<string, number>();

@Injectable()
export class ClientErrorReporter implements ErrorHandler {
  private readonly auth = inject(AuthService);

  handleError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error(error);
    void this.report({
      message,
      stack,
      source: 'ErrorHandler',
      url: typeof location !== 'undefined' ? location.href : undefined,
    });
  }

  /** Call from window error / unhandledrejection listeners. */
  reportBrowser(input: {
    message: string;
    stack?: string;
    source: string;
  }): void {
    void this.report({
      ...input,
      url: typeof location !== 'undefined' ? location.href : undefined,
    });
  }

  private async report(payload: {
    message: string;
    stack?: string;
    source: string;
    url?: string;
  }): Promise<void> {
    const key = `${payload.source}:${payload.message}`;
    const now = Date.now();
    const last = recent.get(key) ?? 0;
    if (now - last < DEDUPE_MS) return;
    recent.set(key, now);

    const token = this.auth.getBearerToken();
    if (!token) return;

    try {
      await fetch(`${environment.apiBaseUrl}/telemetry/client-errors`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    } catch {
      // Never throw from the error reporter.
    }
  }
}

export function installBrowserErrorBridge(reporter: ClientErrorReporter): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('error', (ev) => {
    reporter.reportBrowser({
      message: ev.message || 'window.error',
      stack: ev.error instanceof Error ? ev.error.stack : undefined,
      source: 'window.error',
    });
  });

  window.addEventListener('unhandledrejection', (ev) => {
    const reason = ev.reason;
    reporter.reportBrowser({
      message: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
      source: 'unhandledrejection',
    });
  });
}
