import { Station } from '@/types';

/**
 * Station reference data. In production this is a nightly snapshot pulled from
 * the operator's reference-data service and cached on device (see
 * services/offline.ts) so that search, maps and ticket rendering keep working
 * with no connection. The shape here is exactly what the gateway returns.
 */
export const STATIONS: Station[] = [
  {
    id: 'stn-kgx',
    code: 'KGX',
    name: "London King's Cross",
    city: 'London',
    coordinate: { lat: 51.5308, lon: -0.1238 },
    entrances: [
      { id: 'kgx-western', label: 'Western Concourse (Pancras Rd)', coordinate: { lat: 51.5318, lon: -0.1257 } },
      { id: 'kgx-euston-rd', label: 'Euston Road entrance', coordinate: { lat: 51.5301, lon: -0.1233 } },
      { id: 'kgx-york-way', label: 'York Way entrance', coordinate: { lat: 51.5324, lon: -0.1216 } },
    ],
    platforms: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'],
    facilities: ['step-free', 'toilets', 'baby-change', 'left-luggage', 'taxi-rank', 'ticket-office', 'waiting-room'],
    concourseWalkMinutes: 6,
    timezone: 'Europe/London',
  },
  {
    id: 'stn-sve',
    code: 'SVG',
    name: 'Stevenage',
    city: 'Stevenage',
    coordinate: { lat: 51.9018, lon: -0.2072 },
    entrances: [{ id: 'sve-main', label: 'Station Approach', coordinate: { lat: 51.9022, lon: -0.2064 } }],
    platforms: ['1', '2', '3', '4'],
    facilities: ['step-free', 'toilets', 'car-park', 'bike-racks', 'ticket-office'],
    concourseWalkMinutes: 3,
    timezone: 'Europe/London',
  },
  {
    id: 'stn-pbo',
    code: 'PBO',
    name: 'Peterborough',
    city: 'Peterborough',
    coordinate: { lat: 52.5744, lon: -0.2503 },
    entrances: [{ id: 'pbo-main', label: 'Station Road entrance', coordinate: { lat: 52.5741, lon: -0.2494 } }],
    platforms: ['1', '2', '3', '4', '5', '6', '7'],
    facilities: ['step-free', 'toilets', 'baby-change', 'car-park', 'taxi-rank', 'ticket-office', 'waiting-room'],
    concourseWalkMinutes: 4,
    timezone: 'Europe/London',
  },
  {
    id: 'stn-gth',
    code: 'GRA',
    name: 'Grantham',
    city: 'Grantham',
    coordinate: { lat: 52.9065, lon: -0.6432 },
    entrances: [{ id: 'gth-main', label: 'Station Approach', coordinate: { lat: 52.9068, lon: -0.6426 } }],
    platforms: ['1', '2', '3', '4'],
    facilities: ['step-free', 'toilets', 'car-park', 'bike-racks'],
    concourseWalkMinutes: 3,
    timezone: 'Europe/London',
  },
  {
    id: 'stn-nng',
    code: 'NNG',
    name: 'Newark North Gate',
    city: 'Newark',
    coordinate: { lat: 53.0823, lon: -0.8062 },
    entrances: [{ id: 'nng-main', label: 'Appletongate entrance', coordinate: { lat: 53.0826, lon: -0.8055 } }],
    platforms: ['1', '2', '3'],
    facilities: ['step-free', 'toilets', 'car-park', 'taxi-rank'],
    concourseWalkMinutes: 2,
    timezone: 'Europe/London',
  },
  {
    id: 'stn-don',
    code: 'DON',
    name: 'Doncaster',
    city: 'Doncaster',
    coordinate: { lat: 53.5218, lon: -1.1398 },
    entrances: [
      { id: 'don-main', label: 'Trafford Way entrance', coordinate: { lat: 53.5214, lon: -1.1389 } },
      { id: 'don-frenchgate', label: 'Frenchgate Centre link', coordinate: { lat: 53.5223, lon: -1.1381 } },
    ],
    platforms: ['1', '2', '3', '3b', '4', '5', '6', '7', '8'],
    facilities: ['step-free', 'toilets', 'baby-change', 'left-luggage', 'taxi-rank', 'ticket-office', 'waiting-room'],
    concourseWalkMinutes: 4,
    timezone: 'Europe/London',
  },
  {
    id: 'stn-yrk',
    code: 'YRK',
    name: 'York',
    city: 'York',
    coordinate: { lat: 53.9578, lon: -1.0934 },
    entrances: [
      { id: 'yrk-front', label: 'Station Road (front)', coordinate: { lat: 53.9575, lon: -1.0926 } },
      { id: 'yrk-rear', label: 'Leeman Road (rear)', coordinate: { lat: 53.9589, lon: -1.0957 } },
    ],
    platforms: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'],
    facilities: ['step-free', 'toilets', 'baby-change', 'left-luggage', 'taxi-rank', 'bike-racks', 'ticket-office', 'waiting-room'],
    concourseWalkMinutes: 5,
    timezone: 'Europe/London',
  },
  {
    id: 'stn-lds',
    code: 'LDS',
    name: 'Leeds',
    city: 'Leeds',
    coordinate: { lat: 53.7955, lon: -1.5491 },
    entrances: [
      { id: 'lds-north', label: 'New Station Street', coordinate: { lat: 53.7958, lon: -1.5479 } },
      { id: 'lds-south', label: 'Southern entrance (River Aire)', coordinate: { lat: 53.7939, lon: -1.5487 } },
    ],
    platforms: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17'],
    facilities: ['step-free', 'toilets', 'baby-change', 'left-luggage', 'taxi-rank', 'bike-racks', 'ticket-office', 'waiting-room'],
    concourseWalkMinutes: 5,
    timezone: 'Europe/London',
  },
];

const byId = new Map(STATIONS.map((s) => [s.id, s]));
const byCode = new Map(STATIONS.map((s) => [s.code, s]));

export function getStation(id: string): Station | undefined {
  return byId.get(id);
}

export function getStationByCode(code: string): Station | undefined {
  return byCode.get(code.toUpperCase());
}

/** Station name or the id itself, so a missing reference never renders blank. */
export function stationName(id: string): string {
  return byId.get(id)?.name ?? id;
}

export function searchStations(query: string, limit = 8): Station[] {
  const q = query.trim().toLowerCase();
  if (!q) return STATIONS.slice(0, limit);
  const scored = STATIONS.map((station) => {
    const name = station.name.toLowerCase();
    const city = station.city.toLowerCase();
    const code = station.code.toLowerCase();
    let score = -1;
    if (code === q) score = 100;
    else if (name.startsWith(q)) score = 80;
    else if (city.startsWith(q)) score = 70;
    else if (name.includes(q)) score = 50;
    else if (city.includes(q)) score = 40;
    return { station, score };
  })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((entry) => entry.station);
}
