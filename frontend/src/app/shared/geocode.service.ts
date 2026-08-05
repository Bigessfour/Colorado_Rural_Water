/**
 * Approximate geocode for meter map pins (Feature 011 stretch).
 * Uses Photon (Komoot) over OSM data — browser CORS OK; operator-initiated only.
 * Always confirm / fine-tune on the map; rural addresses are often approximate.
 */

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  /** Human-readable match label from the geocoder. */
  label: string;
  /** Rough quality hint for the operator. */
  note: string;
}

const PHOTON_URL = 'https://photon.komoot.io/api/';

/** Colorado bounding box for Photon: west,south,east,north. */
const COLORADO_BBOX = '-109.06,36.99,-102.04,41.00';

function inColorado(lat: number, lng: number): boolean {
  return lat >= 36.9 && lat <= 41.1 && lng >= -109.2 && lng <= -101.9;
}

function propStr(props: Record<string, unknown>, key: string): string {
  const v = props[key];
  return typeof v === 'string' ? v.toLowerCase() : '';
}

/**
 * Prefer hits whose city/name tokens appear in the query (e.g. “Wiley”),
 * so a statewide bbox does not return a random Colorado “Main Street”.
 */
function pickBestFeature(
  features: Array<{
    geometry?: { coordinates?: number[] };
    properties?: Record<string, unknown>;
  }>,
  query: string,
): { latitude: number; longitude: number; props: Record<string, unknown> } | null {
  const q = query.toLowerCase();
  const scored: Array<{
    score: number;
    latitude: number;
    longitude: number;
    props: Record<string, unknown>;
  }> = [];

  for (const feature of features) {
    const coords = feature.geometry?.coordinates;
    if (!coords || coords.length < 2) continue;
    const longitude = Number(coords[0]);
    const latitude = Number(coords[1]);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    if (!inColorado(latitude, longitude)) continue;

    const props = feature.properties ?? {};
    let score = 1;
    for (const key of ['city', 'town', 'village', 'name', 'county', 'postcode']) {
      const val = propStr(props, key);
      if (val && q.includes(val)) score += 5;
      // Token overlap: query word matches place name
      for (const token of val.split(/[^a-z0-9]+/).filter((t) => t.length >= 3)) {
        if (q.includes(token)) score += 2;
      }
    }
    if (propStr(props, 'state').includes('colorado')) score += 1;
    scored.push({ score, latitude, longitude, props });
  }

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  return best ? { latitude: best.latitude, longitude: best.longitude, props: best.props } : null;
}

/** Bias rural CO lookups — always send a Colorado-aware query to Photon. */
export function biasColoradoAddress(address: string): string {
  const trimmed = address.trim();
  if (!trimmed) return trimmed;
  // Expand bare "CO" and ensure USA so Photon prefers Colorado over other "Main St" hits.
  const expanded = trimmed.replace(/\bCO\b/gi, 'Colorado');
  if (/\bcolorado\b/i.test(expanded) && /\busa\b|\bunited states\b/i.test(expanded)) {
    return expanded;
  }
  if (/\bcolorado\b/i.test(expanded)) {
    return `${expanded}, USA`;
  }
  return `${expanded}, Colorado, USA`;
}

/**
 * Geocode a single service address. Returns null when nothing useful is found.
 */
export async function geocodeServiceAddress(
  address: string,
  options?: { signal?: AbortSignal },
): Promise<GeocodeResult | null> {
  const q = biasColoradoAddress(address);
  if (!q) return null;

  const url = new URL(PHOTON_URL);
  url.searchParams.set('q', q);
  url.searchParams.set('limit', '5');
  url.searchParams.set('lang', 'en');
  url.searchParams.set('bbox', COLORADO_BBOX);

  const res = await fetch(url.toString(), {
    method: 'GET',
    signal: options?.signal,
    headers: { accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Geocoder unavailable (${res.status}). Try again in a moment.`);
  }

  const body = (await res.json()) as {
    features?: Array<{
      geometry?: { coordinates?: number[] };
      properties?: Record<string, unknown>;
    }>;
  };

  const best = pickBestFeature(body.features ?? [], q);
  if (!best) return null;

  const { latitude, longitude, props } = best;
  const labelParts = [
    props['name'],
    props['street'],
    props['housenumber'],
    props['city'] ?? props['town'] ?? props['village'],
    props['state'],
    props['country'],
  ]
    .filter((p) => typeof p === 'string' && p.trim())
    .map((p) => String(p).trim());
  const label = labelParts.length ? [...new Set(labelParts)].join(', ') : q;

  return {
    latitude,
    longitude,
    label,
    note: 'Approximate from address — drag the pin or click the map to fine-tune before trusting it.',
  };
}
