import type { Coordinate } from '@/types';
import { decodePolyline } from '@/utils/polyline';
import { config } from './config';
import * as offline from './offline';

/**
 * Google Maps integration.
 *
 * Split deliberately in two, because the two halves have different security
 * properties:
 *
 *   - **Rendering** (the map itself) uses the Maps SDK directly from the app
 *     with a *client* key. That key is public by nature - it ships in the
 *     bundle - so it is restricted by iOS bundle id, Android signing
 *     certificate and HTTP referrer in the Google Cloud console, and it can do
 *     nothing but draw maps.
 *
 *   - **Data** (Directions, Geocoding, Places, Distance Matrix) goes through
 *     our own gateway at `/maps/*`, which holds a *server* key. Calling those
 *     web services straight from the app would mean shipping an unrestricted,
 *     billable key to every handset, and anyone who unzipped the APK could
 *     spend our money. The gateway also caches, which Google's terms allow for
 *     place IDs and geocodes and which keeps the bill sane.
 *
 * With no key configured at all, every function here returns null and the app
 * falls back to the bundled vector geometry. That path is not a stub: it is
 * what runs in a tunnel, and it is tested.
 */

export interface Leg {
  distanceMeters: number;
  durationSeconds: number;
  polyline: Coordinate[];
}

export interface PlaceSuggestion {
  placeId: string;
  primary: string;
  secondary: string;
}

/** Whether the app can draw a real Google map at all. */
export function canRenderMaps(): boolean {
  return Boolean(config.googleMapsApiKey);
}

/* --------------------------------------------------------------- polyline */

export { decodePolyline } from '@/utils/polyline';

/* ------------------------------------------------------------ the gateway */

async function mapsRequest<T>(path: string, params: Record<string, string>): Promise<T | null> {
  if (config.useFixtures && !config.mapsProxyUrl) return null;

  const query = new URLSearchParams(params).toString();
  const base = config.mapsProxyUrl || `${config.apiBaseUrl}/maps`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);
    const response = await fetch(`${base}${path}?${query}`, {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

/* ---------------------------------------------------------------- the API */

/**
 * Walking route from a point to a station entrance. Cached for a week: a
 * pavement does not move, and this is exactly the call someone makes on a
 * flaky connection outside a station.
 */
export async function walkingRoute(from: Coordinate, to: Coordinate): Promise<Leg | null> {
  const key = `walk.${from.lat.toFixed(4)},${from.lon.toFixed(4)}>${to.lat.toFixed(4)},${to.lon.toFixed(4)}`;
  const cached = await offline.read<Leg>(key);
  if (cached && cached.freshness !== 'stale') return cached.value;

  const result = await mapsRequest<{ distanceMeters: number; durationSeconds: number; polyline: string }>(
    '/directions',
    {
      origin: `${from.lat},${from.lon}`,
      destination: `${to.lat},${to.lon}`,
      mode: 'walking',
    },
  );

  if (!result) return cached?.value ?? null;

  const leg: Leg = {
    distanceMeters: result.distanceMeters,
    durationSeconds: result.durationSeconds,
    polyline: decodePolyline(result.polyline),
  };
  await offline.write(key, leg, 7 * 24 * 3600_000);
  return leg;
}

/**
 * The rail alignment between two stations, as Google has it.
 *
 * Pinned forever once fetched. Track alignment changes on a timescale of
 * decades, and having it on disk is what makes the journey map work offline.
 */
export async function railRoute(from: Coordinate, to: Coordinate, cacheKey: string): Promise<Coordinate[] | null> {
  const key = `rail.${cacheKey}`;
  const cached = await offline.read<Coordinate[]>(key);
  if (cached) return cached.value;

  const result = await mapsRequest<{ polyline: string }>('/directions', {
    origin: `${from.lat},${from.lon}`,
    destination: `${to.lat},${to.lon}`,
    mode: 'transit',
    transit_mode: 'rail',
  });
  if (!result?.polyline) return null;

  const line = decodePolyline(result.polyline);
  await offline.pin(key, line);
  return line;
}

/** Address autocomplete, biased to Pakistan. Used by "where are you now?". */
export async function autocomplete(input: string, near?: Coordinate): Promise<PlaceSuggestion[]> {
  if (input.trim().length < 3) return [];
  const result = await mapsRequest<{ suggestions: PlaceSuggestion[] }>('/places/autocomplete', {
    input,
    region: 'pk',
    ...(near ? { location: `${near.lat},${near.lon}`, radius: '50000' } : {}),
  });
  return result?.suggestions ?? [];
}

/** Resolves a Place ID to a coordinate. Pinned - a place does not move. */
export async function placeCoordinate(placeId: string): Promise<Coordinate | null> {
  const key = `place.${placeId}`;
  const cached = await offline.read<Coordinate>(key);
  if (cached) return cached.value;

  const result = await mapsRequest<{ lat: number; lon: number }>('/places/detail', { place_id: placeId });
  if (!result) return null;

  const coordinate = { lat: result.lat, lon: result.lon };
  await offline.pin(key, coordinate);
  return coordinate;
}

/** Live driving time to a station, for "will I make it?" on the journey screen. */
export async function driveTime(from: Coordinate, to: Coordinate): Promise<{ seconds: number; meters: number } | null> {
  const result = await mapsRequest<{ durationSeconds: number; distanceMeters: number }>('/distance-matrix', {
    origin: `${from.lat},${from.lon}`,
    destination: `${to.lat},${to.lon}`,
    mode: 'driving',
    departure_time: 'now',
  });
  return result ? { seconds: result.durationSeconds, meters: result.distanceMeters } : null;
}

/**
 * A Google Static Maps URL. Used for the small map thumbnail on a listing,
 * where mounting a live, pannable map would cost a map load and a frame budget
 * for something nobody interacts with.
 */
export function staticMapUrl(options: {
  center: Coordinate;
  zoom?: number;
  width: number;
  height: number;
  markers?: Coordinate[];
  path?: Coordinate[];
  dark?: boolean;
}): string | null {
  if (!config.googleMapsApiKey) return null;

  const { center, zoom = 11, width, height, markers = [], path = [], dark } = options;
  const params = new URLSearchParams({
    center: `${center.lat},${center.lon}`,
    zoom: String(zoom),
    size: `${Math.min(640, Math.round(width))}x${Math.min(640, Math.round(height))}`,
    scale: '2',
    key: config.googleMapsApiKey,
  });

  for (const marker of markers) {
    params.append('markers', `color:0x0E7A3A|${marker.lat},${marker.lon}`);
  }
  if (path.length > 1) {
    // Static Maps caps the URL length, so thin a long alignment before sending.
    const step = Math.max(1, Math.ceil(path.length / 80));
    const thinned = path.filter((_, i) => i % step === 0);
    params.append(
      'path',
      `color:0x0E7A3Aff|weight:4|${thinned.map((p) => `${p.lat},${p.lon}`).join('|')}`,
    );
  }
  if (dark) params.append('map_id', 'safar_dark');

  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}
