import { Router } from 'express';
import { z } from 'zod';

import { config } from '../config.js';
import { cachePolicy } from '../middleware/security.js';

/**
 * Google Maps proxy.
 *
 * The app never calls Directions, Geocoding, Places or Distance Matrix
 * directly, and this route is the reason why. Those are billable web services
 * authenticated by a *server* key, and a server key cannot be restricted by
 * bundle id or referrer - so shipping one in an app binary means anyone who
 * unzips the APK can spend the operator's money until someone notices the bill.
 *
 * Everything here therefore does four things:
 *   1. holds the key server-side,
 *   2. validates and narrows the parameters, so this cannot be turned into an
 *      open geocoding relay for someone else's project,
 *   3. caches aggressively within what Google's terms allow, and
 *   4. returns only the fields the app actually uses, which keeps a 40 KB
 *      Directions response down to about 400 bytes on a 3G connection.
 */

export const mapsRouter = Router();

const GOOGLE = 'https://maps.googleapis.com/maps/api';

/** A "lat,lng" pair, bounded to sane values. Nothing else is accepted. */
const latLng = z
  .string()
  .regex(/^-?\d{1,2}(\.\d{1,7})?,-?\d{1,3}(\.\d{1,7})?$/)
  .refine((value) => {
    const [lat, lon] = value.split(',').map(Number);
    return Math.abs(lat!) <= 90 && Math.abs(lon!) <= 180;
  }, 'coordinate out of range');

/**
 * Pakistan's bounding box, roughly. Requests outside it are rejected: this
 * proxy exists to serve one country's rail network, and leaving it open to the
 * whole planet is how a proxy becomes someone else's free Maps account.
 */
const PAKISTAN_BOUNDS = { minLat: 23.5, maxLat: 37.2, minLon: 60.8, maxLon: 77.9 };

function insidePakistan(value: string): boolean {
  const [lat, lon] = value.split(',').map(Number);
  return (
    lat! >= PAKISTAN_BOUNDS.minLat &&
    lat! <= PAKISTAN_BOUNDS.maxLat &&
    lon! >= PAKISTAN_BOUNDS.minLon &&
    lon! <= PAKISTAN_BOUNDS.maxLon
  );
}

async function callGoogle(path: string, params: Record<string, string>) {
  if (!config.GOOGLE_MAPS_SERVER_KEY) {
    throw Object.assign(new Error('Maps are not configured on this gateway'), { status: 503 });
  }

  const query = new URLSearchParams({ ...params, key: config.GOOGLE_MAPS_SERVER_KEY });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetch(`${GOOGLE}${path}?${query}`, { signal: controller.signal });
    if (!response.ok) throw Object.assign(new Error('Maps upstream error'), { status: 502 });
    const json = (await response.json()) as { status?: string; error_message?: string };

    // Google answers HTTP 200 with a status field, so the code alone is not
    // enough. ZERO_RESULTS is a legitimate answer, not a failure.
    if (json.status && !['OK', 'ZERO_RESULTS'].includes(json.status)) {
      // Never pass Google's error_message through: it can name the key.
      throw Object.assign(new Error(`Maps request failed (${json.status})`), { status: 502 });
    }
    return json;
  } finally {
    clearTimeout(timeout);
  }
}

/* ------------------------------------------------------------- directions */

const directionsSchema = z.object({
  origin: latLng,
  destination: latLng,
  mode: z.enum(['walking', 'driving', 'transit', 'bicycling']).default('walking'),
  transit_mode: z.enum(['rail', 'train', 'bus', 'subway']).optional(),
});

mapsRouter.get('/directions', cachePolicy(3600), async (req, res, next) => {
  const parsed = directionsSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ code: 'bad_request', message: 'Invalid coordinates' });
    return;
  }
  if (!insidePakistan(parsed.data.origin) || !insidePakistan(parsed.data.destination)) {
    res.status(400).json({ code: 'out_of_area', message: 'This gateway only serves Pakistan' });
    return;
  }

  try {
    const json = (await callGoogle('/directions/json', {
      origin: parsed.data.origin,
      destination: parsed.data.destination,
      mode: parsed.data.mode,
      region: 'pk',
      units: 'metric',
      ...(parsed.data.transit_mode ? { transit_mode: parsed.data.transit_mode } : {}),
    })) as {
      routes?: Array<{
        overview_polyline?: { points?: string };
        legs?: Array<{ distance?: { value?: number }; duration?: { value?: number } }>;
      }>;
    };

    const route = json.routes?.[0];
    if (!route) {
      res.status(404).json({ code: 'no_route', message: 'No route found' });
      return;
    }

    // Only the three fields the app uses. The full response is ~40 KB.
    res.json({
      polyline: route.overview_polyline?.points ?? '',
      distanceMeters: route.legs?.[0]?.distance?.value ?? 0,
      durationSeconds: route.legs?.[0]?.duration?.value ?? 0,
    });
  } catch (error) {
    next(error);
  }
});

/* ------------------------------------------------------------------ places */

mapsRouter.get('/places/autocomplete', cachePolicy(600), async (req, res, next) => {
  const schema = z.object({
    input: z.string().min(3).max(120),
    location: latLng.optional(),
    radius: z.coerce.number().min(100).max(100_000).optional(),
  });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ code: 'bad_request', message: 'Invalid search' });
    return;
  }

  try {
    const json = (await callGoogle('/place/autocomplete/json', {
      input: parsed.data.input,
      components: 'country:pk',
      ...(parsed.data.location
        ? { location: parsed.data.location, radius: String(parsed.data.radius ?? 50_000) }
        : {}),
    })) as {
      predictions?: Array<{
        place_id: string;
        structured_formatting?: { main_text?: string; secondary_text?: string };
      }>;
    };

    res.json({
      suggestions: (json.predictions ?? []).slice(0, 8).map((prediction) => ({
        placeId: prediction.place_id,
        primary: prediction.structured_formatting?.main_text ?? '',
        secondary: prediction.structured_formatting?.secondary_text ?? '',
      })),
    });
  } catch (error) {
    next(error);
  }
});

mapsRouter.get('/places/detail', cachePolicy(86_400), async (req, res, next) => {
  const parsed = z.object({ place_id: z.string().min(5).max(300) }).safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ code: 'bad_request', message: 'Invalid place' });
    return;
  }

  try {
    const json = (await callGoogle('/place/details/json', {
      place_id: parsed.data.place_id,
      // Field-masked: Places bills per field group, and we need exactly one.
      fields: 'geometry/location',
    })) as { result?: { geometry?: { location?: { lat: number; lng: number } } } };

    const location = json.result?.geometry?.location;
    if (!location) {
      res.status(404).json({ code: 'not_found', message: 'No such place' });
      return;
    }
    res.json({ lat: location.lat, lon: location.lng });
  } catch (error) {
    next(error);
  }
});

/* --------------------------------------------------------- distance matrix */

mapsRouter.get('/distance-matrix', cachePolicy(120), async (req, res, next) => {
  const schema = z.object({
    origin: latLng,
    destination: latLng,
    mode: z.enum(['driving', 'walking', 'transit']).default('driving'),
    departure_time: z.literal('now').optional(),
  });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ code: 'bad_request', message: 'Invalid coordinates' });
    return;
  }
  if (!insidePakistan(parsed.data.origin) || !insidePakistan(parsed.data.destination)) {
    res.status(400).json({ code: 'out_of_area', message: 'This gateway only serves Pakistan' });
    return;
  }

  try {
    const json = (await callGoogle('/distancematrix/json', {
      origins: parsed.data.origin,
      destinations: parsed.data.destination,
      mode: parsed.data.mode,
      units: 'metric',
      region: 'pk',
      ...(parsed.data.departure_time ? { departure_time: 'now' } : {}),
    })) as {
      rows?: Array<{
        elements?: Array<{
          distance?: { value?: number };
          duration?: { value?: number };
          duration_in_traffic?: { value?: number };
        }>;
      }>;
    };

    const element = json.rows?.[0]?.elements?.[0];
    if (!element?.duration) {
      res.status(404).json({ code: 'no_route', message: 'No route found' });
      return;
    }

    res.json({
      distanceMeters: element.distance?.value ?? 0,
      // Traffic-aware where Google gives it; a station run at 5pm in Karachi is
      // not the same journey as the same run at midnight.
      durationSeconds: element.duration_in_traffic?.value ?? element.duration.value ?? 0,
    });
  } catch (error) {
    next(error);
  }
});

/* ------------------------------------------------------------- geocoding */

mapsRouter.get('/geocode', cachePolicy(86_400), async (req, res, next) => {
  const parsed = z.object({ address: z.string().min(3).max(200) }).safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ code: 'bad_request', message: 'Invalid address' });
    return;
  }

  try {
    const json = (await callGoogle('/geocode/json', {
      address: parsed.data.address,
      components: 'country:PK',
      region: 'pk',
    })) as {
      results?: Array<{
        place_id?: string;
        formatted_address?: string;
        geometry?: { location?: { lat: number; lng: number } };
      }>;
    };

    const first = json.results?.[0];
    if (!first?.geometry?.location) {
      res.status(404).json({ code: 'not_found', message: 'No match' });
      return;
    }

    res.json({
      lat: first.geometry.location.lat,
      lon: first.geometry.location.lng,
      placeId: first.place_id ?? null,
      address: first.formatted_address ?? null,
    });
  } catch (error) {
    next(error);
  }
});
