import { afterEach, describe, expect, it, vi } from 'vitest';
import { autoPinMissingMeters } from './meter-auto-pin';

describe('autoPinMissingMeters', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('skips meters that already have coordinates', async () => {
    const geocode = vi.fn();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await autoPinMissingMeters({
      apiBaseUrl: 'https://api.example',
      token: 'jwt',
      delayMs: 0,
      geocode,
      meters: [
        {
          meterId: 'M-1',
          serviceAddress: '1 Main',
          latitude: 38.1,
          longitude: -102.7,
        },
      ],
    });

    expect(result.total).toBe(0);
    expect(geocode).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('geocodes and PUTs pins for meters missing coordinates', async () => {
    const geocode = vi.fn().mockResolvedValue({
      latitude: 38.15,
      longitude: -102.72,
      label: '1 Main, Wiley',
      note: 'approx',
    });
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await autoPinMissingMeters({
      apiBaseUrl: 'https://api.example',
      token: 'jwt',
      delayMs: 0,
      geocode,
      meters: [
        { meterId: 'M-2', serviceAddress: '2 Oak Wiley CO', latitude: null, longitude: null },
      ],
    });

    expect(result).toMatchObject({ total: 1, pinned: 1, skipped: 0, failed: 0, done: 1 });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example/meters/M-2',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ latitude: 38.15, longitude: -102.72 }),
      }),
    );
  });

  it('counts skipped when geocoder finds nothing', async () => {
    const geocode = vi.fn().mockResolvedValue(null);
    vi.stubGlobal('fetch', vi.fn());

    const result = await autoPinMissingMeters({
      apiBaseUrl: 'https://api.example',
      token: 'jwt',
      delayMs: 0,
      geocode,
      meters: [{ meterId: 'M-3', serviceAddress: 'Nowhere', latitude: null, longitude: null }],
    });

    expect(result.skipped).toBe(1);
    expect(result.pinned).toBe(0);
  });
});
