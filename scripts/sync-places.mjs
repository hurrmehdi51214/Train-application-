#!/usr/bin/env node
/**
 * Refreshes station coordinates and Place IDs from Google Geocoding.
 *
 * The coordinates checked into `src/data/stations.ts` are real and verified,
 * but they came from public geodata and a handful are approximate to a few
 * hundred metres. Once you have a Maps key, this rewrites them from Google's
 * own geocoder and attaches a Place ID to each, which the app then uses for
 * walking directions and for "open in Maps" handoff.
 *
 *   GOOGLE_MAPS_SERVER_KEY=... node scripts/sync-places.mjs [--dry-run]
 *
 * A move of more than 2 km is treated as a mis-geocode and skipped with a
 * warning rather than written. Geocoders confidently return the wrong city for
 * a station name surprisingly often, and silently relocating Rohri Junction to
 * a housing society in Lahore is worse than leaving it slightly imprecise.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const stationsFile = resolve(here, '..', 'src', 'data', 'stations.ts');

const KEY = process.env.GOOGLE_MAPS_SERVER_KEY ?? '';
const DRY = process.argv.includes('--dry-run');
const MAX_DRIFT_KM = 2;

if (!KEY) {
  console.error('GOOGLE_MAPS_SERVER_KEY is not set.');
  console.error('Use a *server* key with the Geocoding API enabled, not the app’s client key.');
  process.exit(1);
}

const source = readFileSync(stationsFile, 'utf8');

/** Pulls the fields this script cares about out of the TypeScript source. */
function parseStations(text) {
  const out = [];
  const blocks = text.split(/\n  \{\n/).slice(1);
  for (const block of blocks) {
    const id = block.match(/id: '([^']+)'/)?.[1];
    const name = block.match(/name: '([^']+)'/)?.[1];
    const city = block.match(/city: '([^']+)'/)?.[1];
    const coord = block.match(/coordinate: \{ lat: ([-\d.]+), lon: ([-\d.]+) \}/);
    if (id && name && city && coord) {
      out.push({ id, name, city, lat: Number(coord[1]), lon: Number(coord[2]) });
    }
  }
  return out;
}

const EARTH_KM = 6371.0088;
const toRad = (deg) => (deg * Math.PI) / 180;

function distanceKm(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat));
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function geocode(query) {
  const params = new URLSearchParams({
    address: query,
    components: 'country:PK',
    region: 'pk',
    key: KEY,
  });
  const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`);
  if (!response.ok) return null;
  const json = await response.json();
  if (json.status !== 'OK') return null;

  const result = json.results[0];
  return {
    lat: result.geometry.location.lat,
    lon: result.geometry.location.lng,
    placeId: result.place_id,
    address: result.formatted_address,
  };
}

const stations = parseStations(source);
console.log(`${stations.length} stations in the reference table\n`);

let updated = source;
let moved = 0;
let skipped = 0;
let missed = 0;

for (const station of stations) {
  // The city is in the query because "Cantt Station" alone matches a dozen.
  const found =
    (await geocode(`${station.name} Railway Station, ${station.city}, Pakistan`)) ??
    (await geocode(`${station.city} Railway Station, Pakistan`));
  await pause(220); // Geocoding allows 50 qps; there is no need to go near it.

  if (!found) {
    missed += 1;
    console.log(`--   ${station.id.padEnd(20)} no geocode result`);
    continue;
  }

  const drift = distanceKm(station, found);
  if (drift > MAX_DRIFT_KM) {
    skipped += 1;
    console.log(
      `!!   ${station.id.padEnd(20)} ${drift.toFixed(1)} km away - probably the wrong place, keeping ours`,
    );
    console.log(`       Google said: ${found.address}`);
    continue;
  }

  const before = `coordinate: { lat: ${station.lat}, lon: ${station.lon} }`;
  const after = `coordinate: { lat: ${found.lat.toFixed(6)}, lon: ${found.lon.toFixed(6)} }`;
  if (updated.includes(before)) {
    updated = updated.replace(before, after);
    // Attach the Place ID next to the photo key, where the field is declared.
    const photoLine = new RegExp(`(id: '${station.id}',[\\s\\S]*?photoKey: '[^']+',)`);
    if (!updated.includes(`placeId: '${found.placeId}'`)) {
      updated = updated.replace(photoLine, `$1\n    placeId: '${found.placeId}',`);
    }
    moved += 1;
    console.log(`ok   ${station.id.padEnd(20)} moved ${(drift * 1000).toFixed(0)} m`);
  }
}

if (DRY) {
  console.log(`\nDry run: ${moved} would be updated, ${skipped} rejected, ${missed} not found.`);
} else {
  writeFileSync(stationsFile, updated);
  console.log(`\n${moved} updated, ${skipped} rejected as mis-geocodes, ${missed} not found.`);
  console.log('Run `npm run typecheck` and check the diff before committing.');
}
