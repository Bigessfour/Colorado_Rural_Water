/**
 * Approximate geocode for meter map pins (Feature 011 stretch).
 * Uses Photon (Komoot) over OSM data — browser CORS OK.
 * Biases queries to the tenant municipality (mapTown) + map center so bare
 * streets like “112 N Main” resolve near Wiley, not Denver.
 * When a map center is known, results farther than maxMiles are rejected.
 */

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  /** Human-readable match label from the geocoder. */
  label: string;
  /** Rough quality hint for the operator. */
  note: string;
}

/** Optional municipality / map-center bias from GET /me (tenant profile). */
export type GeocodeBias = {
  /** e.g. "Wiley, CO" or "Town of Wiley" from tenant mapTown / displayName. */
  town?: string | null;
  /** Optional ZIP to complete the query. */
  zip?: string | null;
  /** Tenant map center — Photon lat/lon bias + proximity hard-filter. */
  lat?: number | null;
  lng?: number | null;
  /** Reject hits farther than this from map center. Default 35. */
  maxMiles?: number | null;
  signal?: AbortSignal;
};

const PHOTON_URL = 'https://photon.komoot.io/api/';

/** Colorado bounding box for Photon: west,south,east,north. */
const COLORADO_BBOX = '-109.06,36.99,-102.04,41.00';

/** Default radius when tenant map center is known — keeps rural pins local. */
export const DEFAULT_GEOCODE_MAX_MILES = 35;

function inColorado(lat: number, lng: number): boolean {
  return lat >= 36.9 && lat <= 41.1 && lng >= -109.2 && lng <= -101.9;
}

function propStr(props: Record<string, unknown>, key: string): string {
  const v = props[key];
  return typeof v === 'string' ? v.toLowerCase() : '';
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Significant place tokens from a town label (drops “town of”, state abbreviations). */
export function municipalityTokens(town: string): string[] {
  return town
    .toLowerCase()
    .replace(/\b(town|city|of|colorado|co|usa|united states)\b/g, ' ')
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3);
}

/** Approx miles between two WGS84 points (good enough for CO-scale scoring). */
export function approxMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = lat1 - lat2;
  const dLng = (lng1 - lng2) * Math.cos((lat1 * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng) * 69;
}

/** Photon bbox string around a center point. */
export function bboxAround(lat: number, lng: number, miles: number): string {
  const dLat = miles / 69;
  const dLng = miles / (69 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  const west = lng - dLng;
  const south = lat - dLat;
  const east = lng + dLng;
  const north = lat + dLat;
  return `${west},${south},${east},${north}`;
}

/**
 * Prefer hits whose city matches the tenant town / query, and that sit near
 * the tenant map center — so statewide “Main Street” does not land in Denver.
 * Hits beyond maxMiles from the center are discarded entirely.
 */
function pickBestFeature(
  features: Array<{
    geometry?: { coordinates?: number[] };
    properties?: Record<string, unknown>;
  }>,
  query: string,
  bias?: GeocodeBias,
): { latitude: number; longitude: number; props: Record<string, unknown> } | null {
  const q = query.toLowerCase();
  const townTokens = bias?.town ? municipalityTokens(bias.town) : [];
  const biasLat = typeof bias?.lat === 'number' && Number.isFinite(bias.lat) ? bias.lat : null;
  const biasLng = typeof bias?.lng === 'number' && Number.isFinite(bias.lng) ? bias.lng : null;
  const maxMiles =
    typeof bias?.maxMiles === 'number' && Number.isFinite(bias.maxMiles)
      ? bias.maxMiles
      : DEFAULT_GEOCODE_MAX_MILES;

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

    // Hard reject far matches when we know the municipality center.
    if (biasLat != null && biasLng != null) {
      const miles = approxMiles(biasLat, biasLng, latitude, longitude);
      if (miles > maxMiles) continue;
    }

    const props = feature.properties ?? {};
    let score = 1;

    for (const key of ['city', 'town', 'village', 'name', 'county', 'postcode']) {
      const val = propStr(props, key);
      if (val && q.includes(val)) score += 5;
      for (const token of val.split(/[^a-z0-9]+/).filter((t) => t.length >= 3)) {
        if (q.includes(token)) score += 2;
      }
    }

    const place = [
      propStr(props, 'city'),
      propStr(props, 'town'),
      propStr(props, 'village'),
      propStr(props, 'name'),
    ].join(' ');
    for (const token of townTokens) {
      if (place.includes(token) || q.includes(token)) score += 12;
    }

    if (bias?.zip && propStr(props, 'postcode').includes(bias.zip.trim())) {
      score += 8;
    }
    if (propStr(props, 'state').includes('colorado')) score += 1;

    if (biasLat != null && biasLng != null) {
      const miles = approxMiles(biasLat, biasLng, latitude, longitude);
      if (miles <= 5) score += 25;
      else if (miles <= 15) score += 18;
      else if (miles <= 25) score += 12;
      else score += 4;
    }

    scored.push({ score, latitude, longitude, props });
  }

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  return best ? { latitude: best.latitude, longitude: best.longitude, props: best.props } : null;
}

/**
 * Bias rural CO lookups with the tenant town/ZIP when the street line is incomplete.
 */
export function biasColoradoAddress(address: string, bias?: GeocodeBias): string {
  let trimmed = address.trim();
  if (!trimmed) return trimmed;

  const town = bias?.town?.trim();
  if (town) {
    const tokens = municipalityTokens(town);
    const alreadyHasTown = tokens.some((t) =>
      new RegExp(`\\b${escapeRegExp(t)}\\b`, 'i').test(trimmed),
    );
    if (!alreadyHasTown) {
      trimmed = `${trimmed}, ${town}`;
    }
  }

  const zip = bias?.zip?.trim();
  if (zip && /^\d{5}(-\d{4})?$/.test(zip) && !new RegExp(`\\b${escapeRegExp(zip)}\\b`).test(trimmed)) {
    trimmed = `${trimmed} ${zip}`;
  }

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
 * Geocode a single service address. Returns null when nothing useful is found
 * (including when all Photon hits are outside the tenant radius).
 */
export async function geocodeServiceAddress(
  address: string,
  options?: GeocodeBias,
): Promise<GeocodeResult | null> {
  const q = biasColoradoAddress(address, options);
  if (!q) return null;

  const hasCenter =
    typeof options?.lat === 'number' &&
    typeof options?.lng === 'number' &&
    Number.isFinite(options.lat) &&
    Number.isFinite(options.lng);
  const maxMiles =
    typeof options?.maxMiles === 'number' && Number.isFinite(options.maxMiles)
      ? options.maxMiles
      : DEFAULT_GEOCODE_MAX_MILES;

  const url = new URL(PHOTON_URL);
  url.searchParams.set('q', q);
  url.searchParams.set('limit', hasCenter || options?.town ? '10' : '5');
  url.searchParams.set('lang', 'en');
  // Prefer a local bbox around the tenant when we have a map center.
  url.searchParams.set(
    'bbox',
    hasCenter ? bboxAround(options!.lat!, options!.lng!, maxMiles) : COLORADO_BBOX,
  );
  if (hasCenter) {
    url.searchParams.set('lat', String(options!.lat));
    url.searchParams.set('lon', String(options!.lng));
  }

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

  const best = pickBestFeature(body.features ?? [], q, options);
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

  const townNote = options?.town?.trim()
    ? ` Biased toward ${options.town.trim()} (within ~${maxMiles} mi).`
    : '';

  return {
    latitude,
    longitude,
    label,
    note:
      'Approximate from address — drag the pin or click the map to fine-tune before trusting it.' +
      townNote,
  };
}
