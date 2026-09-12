import { Coordinate } from '@/types';
import { getStation } from './stations';
import { interpolate } from '@/utils/geo';

/**
 * Track alignment between adjacent stations, as shaping vertices only. The
 * renderer densifies these at draw time. Storing the corridor this coarsely is
 * what makes the offline map viable: the whole network is a few kilobytes, so
 * it ships inside the app bundle and is refreshed with the reference-data
 * snapshot rather than as tiles.
 */
const SEGMENTS: Record<string, Coordinate[]> = {
  'stn-kgx>stn-sve': [
    { lat: 51.5644, lon: -0.1065 }, // Finsbury Park
    { lat: 51.5983, lon: -0.1197 }, // Alexandra Palace
    { lat: 51.6980, lon: -0.1830 }, // Potters Bar
    { lat: 51.7645, lon: -0.2280 }, // Hatfield
    { lat: 51.8017, lon: -0.2050 }, // Welwyn Garden City
    { lat: 51.8690, lon: -0.1900 }, // Knebworth
  ],
  'stn-sve>stn-pbo': [
    { lat: 51.9530, lon: -0.2640 }, // Hitchin
    { lat: 52.0230, lon: -0.2680 }, // Arlesey
    { lat: 52.0860, lon: -0.2650 }, // Biggleswade
    { lat: 52.1310, lon: -0.2920 }, // Sandy
    { lat: 52.2280, lon: -0.2600 }, // St Neots
    { lat: 52.3300, lon: -0.1870 }, // Huntingdon
    { lat: 52.4700, lon: -0.2380 }, // Holme
  ],
  'stn-pbo>stn-gth': [
    { lat: 52.6100, lon: -0.2700 }, // Werrington Junction
    { lat: 52.6900, lon: -0.3700 }, // Tallington
    { lat: 52.7200, lon: -0.4400 }, // Essendine
    { lat: 52.7500, lon: -0.5000 }, // Little Bytham
    { lat: 52.8100, lon: -0.5600 }, // Corby Glen
  ],
  'stn-gth>stn-nng': [
    { lat: 52.9600, lon: -0.6600 }, // Barkston
    { lat: 53.0300, lon: -0.7500 }, // Claypole
  ],
  'stn-nng>stn-don': [
    { lat: 53.1600, lon: -0.8300 }, // Carlton-on-Trent
    { lat: 53.2300, lon: -0.8800 }, // Tuxford
    { lat: 53.3120, lon: -0.9460 }, // Retford
    { lat: 53.3800, lon: -1.0100 }, // Ranskill
    { lat: 53.4300, lon: -1.0500 }, // Bawtry
    { lat: 53.4800, lon: -1.0900 }, // Rossington
  ],
  'stn-don>stn-yrk': [
    { lat: 53.5800, lon: -1.1400 }, // Shaftholme Junction
    { lat: 53.6600, lon: -1.1300 }, // Balne
    { lat: 53.7200, lon: -1.1200 }, // Temple Hirst
    { lat: 53.7600, lon: -1.1200 }, // Hambleton
    { lat: 53.8900, lon: -1.1200 }, // Colton Junction
  ],
  'stn-don>stn-lds': [
    { lat: 53.5700, lon: -1.1800 }, // Adwick
    { lat: 53.5900, lon: -1.2800 }, // South Elmsall
    { lat: 53.6300, lon: -1.3700 }, // Fitzwilliam
    { lat: 53.6820, lon: -1.5020 }, // Wakefield Westgate
    { lat: 53.7200, lon: -1.5100 }, // Outwood
  ],
  'stn-pbo>stn-don': [
    { lat: 52.6100, lon: -0.2700 },
    { lat: 52.9065, lon: -0.6432 },
    { lat: 53.0823, lon: -0.8062 },
    { lat: 53.3120, lon: -0.9460 },
  ],
  'stn-kgx>stn-pbo': [
    { lat: 51.5983, lon: -0.1197 },
    { lat: 51.7645, lon: -0.2280 },
    { lat: 51.9018, lon: -0.2072 },
    { lat: 52.1310, lon: -0.2920 },
    { lat: 52.3300, lon: -0.1870 },
  ],
};

function segmentBetween(fromId: string, toId: string): Coordinate[] {
  const forward = SEGMENTS[`${fromId}>${toId}`];
  if (forward) return forward;
  const reverse = SEGMENTS[`${toId}>${fromId}`];
  if (reverse) return [...reverse].reverse();
  return [];
}

/** Adds intermediate points so a polyline animates smoothly under the train. */
export function densify(line: Coordinate[], stepsPerSegment = 6): Coordinate[] {
  if (line.length < 2) return line;
  const out: Coordinate[] = [line[0]!];
  for (let i = 1; i < line.length; i += 1) {
    const a = line[i - 1]!;
    const b = line[i]!;
    for (let step = 1; step <= stepsPerSegment; step += 1) {
      out.push(interpolate(a, b, step / stepsPerSegment));
    }
  }
  return out;
}

/** Full alignment for a list of calling points, in travel order. */
export function routeGeometry(stationIds: string[]): Coordinate[] {
  const line: Coordinate[] = [];
  stationIds.forEach((stationId, index) => {
    const station = getStation(stationId);
    if (!station) return;
    if (index > 0) {
      const previous = stationIds[index - 1]!;
      line.push(...segmentBetween(previous, stationId));
    }
    line.push(station.coordinate);
  });
  // Calling points must appear in the line, so insert them before densifying.
  const ordered = stationIds
    .map((id) => getStation(id)?.coordinate)
    .filter((c): c is Coordinate => Boolean(c));
  if (line.length === 0) return densify(ordered);
  return densify(line, 5);
}

/**
 * Walking alignment from a coordinate to a station entrance. Real deployments
 * call the pedestrian routing service; offline we fall back to a two-segment
 * dog-leg, which is honest about being an approximation and still gives the
 * user the right direction to set off in.
 */
export function walkingRoute(from: Coordinate, to: Coordinate): Coordinate[] {
  const elbow: Coordinate = { lat: from.lat + (to.lat - from.lat) * 0.65, lon: from.lon };
  return densify([from, elbow, to], 8);
}
