import type { Coordinate } from '@/types';

/**
 * Google's encoded polyline format.
 *
 * Values are deltas, zigzag-encoded to make negatives cheap, split into 5-bit
 * chunks with the continuation bit set on all but the last, and offset by 63 so
 * every byte lands in printable ASCII.
 *
 * Written out here rather than pulled from a dependency: it is thirty lines,
 * and the usual packages bring a whole geometry library with them for it.
 */
export function decodePolyline(encoded: string): Coordinate[] {
  const points: Coordinate[] = [];
  let index = 0;
  let lat = 0;
  let lon = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lon += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ lat: lat / 1e5, lon: lon / 1e5 });
  }

  return points;
}

/** The inverse, used by tests and by the static-map URL builder. */
export function encodePolyline(points: Coordinate[]): string {
  let lastLat = 0;
  let lastLon = 0;
  let out = '';

  const chunk = (value: number) => {
    let v = value < 0 ? ~(value << 1) : value << 1;
    while (v >= 0x20) {
      out += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
      v >>= 5;
    }
    out += String.fromCharCode(v + 63);
  };

  for (const point of points) {
    const lat = Math.round(point.lat * 1e5);
    const lon = Math.round(point.lon * 1e5);
    chunk(lat - lastLat);
    chunk(lon - lastLon);
    lastLat = lat;
    lastLon = lon;
  }

  return out;
}
