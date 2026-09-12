import type { Coordinate } from '@/types';

const EARTH_RADIUS_M = 6_371_008.8;
const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** Great-circle distance in metres. */
export function distanceMeters(a: Coordinate, b: Coordinate): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing from `a` to `b`, degrees clockwise from north. */
export function bearingDegrees(a: Coordinate, b: Coordinate): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLon = toRad(b.lon - a.lon);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function interpolate(a: Coordinate, b: Coordinate, t: number): Coordinate {
  return { lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t };
}

/** Cumulative distance at each vertex of a polyline. */
export function cumulativeDistances(line: Coordinate[]): number[] {
  const out: number[] = [0];
  for (let i = 1; i < line.length; i += 1) {
    const prev = line[i - 1]!;
    const curr = line[i]!;
    out.push(out[i - 1]! + distanceMeters(prev, curr));
  }
  return out;
}

/**
 * Point at fraction `t` (0..1) along a polyline, measured by distance rather
 * than vertex count so a dense curve does not slow the train down.
 */
export function pointAlong(line: Coordinate[], t: number): { point: Coordinate; bearing: number } {
  if (line.length === 0) return { point: { lat: 0, lon: 0 }, bearing: 0 };
  if (line.length === 1) return { point: line[0]!, bearing: 0 };

  const dists = cumulativeDistances(line);
  const total = dists[dists.length - 1]!;
  const target = Math.max(0, Math.min(1, t)) * total;

  for (let i = 1; i < line.length; i += 1) {
    if (dists[i]! >= target) {
      const segStart = line[i - 1]!;
      const segEnd = line[i]!;
      const segLen = dists[i]! - dists[i - 1]!;
      const local = segLen === 0 ? 0 : (target - dists[i - 1]!) / segLen;
      return { point: interpolate(segStart, segEnd, local), bearing: bearingDegrees(segStart, segEnd) };
    }
  }
  const last = line[line.length - 1]!;
  const penultimate = line[line.length - 2]!;
  return { point: last, bearing: bearingDegrees(penultimate, last) };
}

/** Fraction along the polyline of the vertex nearest to `target`. */
export function progressOfNearestVertex(line: Coordinate[], target: Coordinate): number {
  if (line.length < 2) return 0;
  const dists = cumulativeDistances(line);
  const total = dists[dists.length - 1]!;
  let bestIndex = 0;
  let best = Infinity;
  line.forEach((vertex, index) => {
    const d = distanceMeters(vertex, target);
    if (d < best) {
      best = d;
      bestIndex = index;
    }
  });
  return total === 0 ? 0 : dists[bestIndex]! / total;
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

export function boundsOf(points: Coordinate[], paddingRatio = 0.12): BoundingBox {
  if (points.length === 0) return { minLat: 0, maxLat: 1, minLon: 0, maxLon: 1 };
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;
  for (const p of points) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLon = Math.min(minLon, p.lon);
    maxLon = Math.max(maxLon, p.lon);
  }
  // Degenerate bounds (a single point) still need an extent to project into.
  const latSpan = Math.max(maxLat - minLat, 0.004);
  const lonSpan = Math.max(maxLon - minLon, 0.004);
  const padLat = latSpan * paddingRatio;
  const padLon = lonSpan * paddingRatio;
  return {
    minLat: minLat - padLat,
    maxLat: minLat + latSpan + padLat,
    minLon: minLon - padLon,
    maxLon: minLon + lonSpan + padLon,
  };
}

/**
 * Web-Mercator-ish projection into a fixed pixel box. At city scale the
 * difference from true Mercator is under a pixel, and staying linear keeps the
 * SVG renderer cheap enough to animate at 60fps on a mid-range Android.
 */
export function projector(bounds: BoundingBox, width: number, height: number) {
  const latSpan = bounds.maxLat - bounds.minLat;
  const lonSpan = bounds.maxLon - bounds.minLon;
  // Correct longitude compression at the mid-latitude of the view.
  const midLat = toRad((bounds.maxLat + bounds.minLat) / 2);
  const aspectCorrection = Math.cos(midLat);

  const dataAspect = (lonSpan * aspectCorrection) / latSpan;
  const boxAspect = width / height;
  // Fit the data box inside the view box without distorting it.
  const scale =
    dataAspect > boxAspect ? width / (lonSpan * aspectCorrection) : height / latSpan;
  const offsetX = (width - lonSpan * aspectCorrection * scale) / 2;
  const offsetY = (height - latSpan * scale) / 2;

  return (c: Coordinate): { x: number; y: number } => ({
    x: offsetX + (c.lon - bounds.minLon) * aspectCorrection * scale,
    y: offsetY + (bounds.maxLat - c.lat) * scale,
  });
}

export function formatDistance(meters: number): string {
  if (meters < 950) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toFixed(meters < 9500 ? 1 : 0)} km`;
}

/** Average walking speed used for on-foot ETAs: 1.33 m/s, i.e. ~4.8 km/h. */
export const WALK_SPEED_MPS = 1.33;

export function walkingMinutes(meters: number): number {
  return Math.max(1, Math.round(meters / WALK_SPEED_MPS / 60));
}
