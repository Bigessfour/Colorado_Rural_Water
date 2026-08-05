/**
 * Auto-pin meters that have a service address but no map coordinates.
 * Uses Photon (browser) + PUT /meters/{id}. Never overwrites an existing pin.
 */

import { geocodeServiceAddress, type GeocodeBias } from './geocode.service';

export type AutoPinTarget = {
  meterId: string;
  serviceAddress: string;
  latitude?: number | null;
  longitude?: number | null;
};

export type AutoPinProgress = {
  done: number;
  total: number;
  pinned: number;
  skipped: number;
  failed: number;
  currentMeterId?: string;
};

function hasCoords(m: AutoPinTarget): boolean {
  return (
    typeof m.latitude === 'number' &&
    typeof m.longitude === 'number' &&
    Number.isFinite(m.latitude) &&
    Number.isFinite(m.longitude)
  );
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const t = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

async function putMeterCoords(
  apiBaseUrl: string,
  token: string,
  meterId: string,
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<boolean> {
  const res = await fetch(`${apiBaseUrl}/meters/${encodeURIComponent(meterId)}`, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ latitude, longitude }),
    signal,
  });
  return res.ok;
}

/**
 * Geocode + save pins for meters missing coordinates.
 * Rate-limited (default 350ms) to stay polite to the public geocoder.
 */
export async function autoPinMissingMeters(options: {
  apiBaseUrl: string;
  token: string;
  meters: AutoPinTarget[];
  /** Pause between geocode calls. Default 350ms. */
  delayMs?: number;
  signal?: AbortSignal;
  /** Tenant municipality / map center — keeps bare streets out of Denver. */
  bias?: GeocodeBias;
  onProgress?: (p: AutoPinProgress) => void;
  /** Test seam — defaults to Photon geocodeServiceAddress. */
  geocode?: typeof geocodeServiceAddress;
}): Promise<AutoPinProgress> {
  const delayMs = options.delayMs ?? 350;
  const geocode = options.geocode ?? geocodeServiceAddress;
  const targets = options.meters.filter(
    (m) => !hasCoords(m) && typeof m.serviceAddress === 'string' && m.serviceAddress.trim(),
  );
  const progress: AutoPinProgress = {
    done: 0,
    total: targets.length,
    pinned: 0,
    skipped: 0,
    failed: 0,
  };
  options.onProgress?.({ ...progress });

  for (const m of targets) {
    if (options.signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    progress.currentMeterId = m.meterId;
    options.onProgress?.({ ...progress });

    try {
      const hit = await geocode(m.serviceAddress, {
        ...options.bias,
        signal: options.signal,
      });
      if (!hit) {
        progress.skipped += 1;
      } else {
        const ok = await putMeterCoords(
          options.apiBaseUrl,
          options.token,
          m.meterId,
          hit.latitude,
          hit.longitude,
          options.signal,
        );
        if (ok) progress.pinned += 1;
        else progress.failed += 1;
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
      progress.failed += 1;
    }

    progress.done += 1;
    options.onProgress?.({ ...progress });

    if (progress.done < targets.length) {
      await sleep(delayMs, options.signal);
    }
  }

  progress.currentMeterId = undefined;
  options.onProgress?.({ ...progress });
  return progress;
}

/** Fetch tenant meters then auto-pin any without coordinates. */
export async function autoPinMissingFromApi(options: {
  apiBaseUrl: string;
  token: string;
  delayMs?: number;
  signal?: AbortSignal;
  bias?: GeocodeBias;
  onProgress?: (p: AutoPinProgress) => void;
}): Promise<AutoPinProgress> {
  const res = await fetch(`${options.apiBaseUrl}/meters`, {
    headers: { authorization: `Bearer ${options.token}` },
    signal: options.signal,
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error ?? `Failed to list meters (${res.status})`);
  }
  const meters = (body.meters ?? []) as AutoPinTarget[];
  return autoPinMissingMeters({ ...options, meters });
}
