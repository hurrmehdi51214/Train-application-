import type { Coordinate } from '@/types';
import { getStation } from './stations';

/**
 * Track alignment.
 *
 * Shaping vertices only: the whole network is a few kilobytes at this
 * resolution, which is what lets the route map render with the radio off.
 * Where a Google Maps key is configured, `services/googleMaps.ts` replaces
 * these with a real Directions polyline.
 */

/**
 * Track alignment between adjacent stations, as shaping vertices only. The
 * whole network is a few kilobytes at this resolution, which is what lets the
 * route map render with the radio off. Where a Google Maps key is configured,
 * `services/googleMaps.ts` replaces these with a real Directions polyline.
 */
const SEGMENTS: Record<string, Coordinate[]> = {
  'stn-khi-cantt>stn-hyd': [
    { lat: 24.888, lon: 67.143 }, // Drigh Road
    { lat: 24.95, lon: 67.35 }, // Landhi
    { lat: 25.05, lon: 67.72 }, // Jhimpir side
    { lat: 25.25, lon: 68.05 }, // Kotri approach
    { lat: 25.367, lon: 68.308 }, // Kotri Junction
  ],
  'stn-hyd>stn-nawabshah': [
    { lat: 25.764, lon: 68.662 }, // Tando Adam
    { lat: 25.927, lon: 68.622 }, // Shahdadpur
  ],
  'stn-nawabshah>stn-rohri': [
    { lat: 26.6, lon: 68.45 }, // Padidan
    { lat: 27.112, lon: 68.423 }, // Mehrabpur
    { lat: 27.529, lon: 68.761 }, // Khairpur
  ],
  'stn-rohri>stn-rykhan': [
    { lat: 27.95, lon: 69.35 }, // Ghotki
    { lat: 28.2, lon: 69.75 }, // Ubauro
    { lat: 28.42, lon: 70.05 }, // Sadiqabad
  ],
  'stn-rykhan>stn-bwp': [
    { lat: 28.645, lon: 70.657 }, // Khanpur
    { lat: 29.0, lon: 71.1 }, // Ahmadpur East
  ],
  'stn-bwp>stn-mux-cantt': [
    { lat: 29.75, lon: 71.6 }, // Samasatta
    { lat: 30.0, lon: 71.52 }, // Shujaabad
  ],
  'stn-mux-cantt>stn-khanewal': [{ lat: 30.24, lon: 71.7 }],
  'stn-khanewal>stn-sahiwal': [
    { lat: 30.44, lon: 72.355 }, // Mian Channu
    { lat: 30.532, lon: 72.696 }, // Chichawatni
  ],
  'stn-sahiwal>stn-lhr': [
    { lat: 30.81, lon: 73.45 }, // Okara
    { lat: 31.023, lon: 73.85 }, // Pattoki
    { lat: 31.245, lon: 74.215 }, // Raiwind
    { lat: 31.456, lon: 74.312 }, // Kot Lakhpat
  ],
  'stn-lhr>stn-gujranwala': [
    { lat: 31.72, lon: 74.27 }, // Muridke
    { lat: 31.95, lon: 74.23 }, // Kamoke
  ],
  'stn-gujranwala>stn-gujrat': [{ lat: 32.445, lon: 74.12 }], // Wazirabad
  'stn-gujrat>stn-jhelum': [{ lat: 32.701, lon: 73.96 }], // Lalamusa
  'stn-jhelum>stn-rwp': [
    { lat: 33.05, lon: 73.55 }, // Sohawa side
    { lat: 33.254, lon: 73.305 }, // Gujar Khan
    { lat: 33.45, lon: 73.15 }, // Mandra
    { lat: 33.576, lon: 73.1 }, // Chaklala
  ],
  'stn-rwp>stn-isb': [{ lat: 33.64, lon: 73.05 }],
  'stn-rwp>stn-taxila': [{ lat: 33.68, lon: 72.95 }, { lat: 33.72, lon: 72.88 }],
  'stn-taxila>stn-attock': [{ lat: 33.77, lon: 72.6 }], // Hasan Abdal
  'stn-attock>stn-nowshera': [
    { lat: 33.9, lon: 72.24 }, // Attock Khurd bridge over the Indus
    { lat: 33.99, lon: 72.05 }, // Akora Khattak
  ],
  'stn-nowshera>stn-pew': [{ lat: 34.01, lon: 71.75 }], // Pabbi
  'stn-taxila>stn-havelian': [
    { lat: 33.85, lon: 72.95 },
    { lat: 33.98, lon: 73.05 }, // Haripur
  ],
  'stn-rohri>stn-jacobabad': [{ lat: 27.9, lon: 68.7 }], // Shikarpur side
  'stn-jacobabad>stn-sibi': [
    { lat: 28.6, lon: 68.25 }, // Jhatpat
    { lat: 29.1, lon: 68.0 }, // Bakhtiarabad
  ],
  'stn-sibi>stn-quetta': [
    { lat: 29.75, lon: 67.6 }, // Bolan Pass, Nari Gorge
    { lat: 29.95, lon: 67.35 }, // Mach
    { lat: 30.1, lon: 67.15 }, // Kolpur
  ],
  'stn-lhr>stn-fsd': [
    { lat: 31.43, lon: 73.9 }, // Sheikhupura
    { lat: 31.42, lon: 73.5 }, // Jaranwala side
  ],
  'stn-gujranwala>stn-sialkot': [{ lat: 32.33, lon: 74.35 }],
  'stn-khi-cantt>stn-khi-city': [{ lat: 24.852, lon: 67.025 }],
  'stn-hyd>stn-kotri': [{ lat: 25.38, lon: 68.33 }],
  'stn-rohri>stn-sukkur': [{ lat: 27.695, lon: 68.875 }],
};

function segment(fromId: string, toId: string): Coordinate[] {
  const forward = SEGMENTS[`${fromId}>${toId}`];
  if (forward) return forward;
  const reverse = SEGMENTS[`${toId}>${fromId}`];
  if (reverse) return [...reverse].reverse();
  return [];
}

/** Adds intermediate points so a polyline animates smoothly under the train. */
export function densify(line: Coordinate[], stepsPerSegment = 5): Coordinate[] {
  if (line.length < 2) return line;
  const out: Coordinate[] = [line[0]!];
  for (let i = 1; i < line.length; i += 1) {
    const a = line[i - 1]!;
    const b = line[i]!;
    for (let step = 1; step <= stepsPerSegment; step += 1) {
      const t = step / stepsPerSegment;
      out.push({ lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t });
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
    if (index > 0) line.push(...segment(stationIds[index - 1]!, stationId));
    line.push(station.coordinate);
  });
  return densify(line, 4);
}
