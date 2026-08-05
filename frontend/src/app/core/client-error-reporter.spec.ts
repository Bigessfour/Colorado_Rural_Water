import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientErrorReporter, installBrowserErrorBridge } from './client-error-reporter';
import { AuthService } from './auth.service';

describe('ClientErrorReporter', () => {
  let reporter: ClientErrorReporter;
  const getBearerToken = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ClientErrorReporter,
        {
          provide: AuthService,
          useValue: { getBearerToken },
        },
      ],
    });
    reporter = TestBed.inject(ClientErrorReporter);
    getBearerToken.mockReset();
  });

  it('handleError posts telemetry when bearer token exists', async () => {
    getBearerToken.mockReturnValue('token-1');
    reporter.handleError(new Error('boom'));
    await vi.waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toContain('/telemetry/client-errors');
    expect((init as RequestInit).method).toBe('POST');
  });

  it('skips telemetry when not authenticated', async () => {
    getBearerToken.mockReturnValue(null);
    reporter.handleError(new Error('quiet'));
    await new Promise((r) => setTimeout(r, 20));
    expect(fetch).not.toHaveBeenCalled();
  });

  it('installBrowserErrorBridge registers window listeners', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    installBrowserErrorBridge(reporter);
    expect(addSpy).toHaveBeenCalledWith('error', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
    addSpy.mockRestore();
  });
});
