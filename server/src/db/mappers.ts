import type { CallRow, DisruptionRow, FormationRow, PositionRow, StationRow } from './legacyRail.js';

/**
 * Row → wire shapes. The app's `src/types` is the contract; this file is the
 * only place the railway's vocabulary ("activation", "TIPLOC", "load factor")
 * is translated into it.
 */

const CALL_STATUS: Record<string, string> = {
  SCHEDULED: 'scheduled',
  APPROACHING: 'approaching',
  ARRIVED: 'arrived',
  DEPARTED: 'departed',
  PASSED: 'departed',
  CANCELLED_CALL: 'skipped',
};

const SEVERITY: Record<string, string> = {
  INFO: 'info',
  MINOR: 'minor',
  MAJOR: 'major',
  SEVERE: 'major',
};

const AMENITY: Record<string, string> = {
  WIFI: 'wifi',
  PWR: 'power',
  USBC: 'usb-c',
  TBL: 'table',
  QUIET: 'quiet',
  CAT: 'catering',
  TRLY: 'trolley',
  CYCLE: 'bike-space',
  WCHR: 'wheelchair-space',
  ACCWC: 'accessible-toilet',
  LUGG: 'luggage-rack',
  AIRCON: 'air-conditioning',
};

const FACILITY: Record<string, string> = {
  SFA: 'step-free',
  WC: 'toilets',
  BABY: 'baby-change',
  LEFTLUG: 'left-luggage',
  TAXI: 'taxi-rank',
  CYCLEPK: 'bike-racks',
  CARPK: 'car-park',
  TKTOFF: 'ticket-office',
  WAIT: 'waiting-room',
};

function iso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

export function toStation(row: StationRow) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    city: row.city,
    coordinate: { lat: row.lat, lon: row.lon },
    // The reference schema holds one entrance per station; multi-entrance
    // stations are enriched from our own geodata and merged in the route.
    entrances: [{ id: `${row.id}-main`, label: 'Main entrance', coordinate: { lat: row.lat, lon: row.lon } }],
    platforms: row.platforms,
    facilities: row.facilities.map((code) => FACILITY[code]).filter(Boolean),
    concourseWalkMinutes: row.concourse_walk_minutes,
    timezone: row.timezone,
  };
}

export function toCall(row: CallRow) {
  return {
    stationId: row.station_id,
    sequence: row.sequence,
    scheduledArrival: iso(row.scheduled_arrival),
    scheduledDeparture: iso(row.scheduled_departure),
    expectedArrival: iso(row.expected_arrival),
    expectedDeparture: iso(row.expected_departure),
    platform: row.platform,
    platformConfirmed: row.platform_confirmed,
    status: CALL_STATUS[row.call_status] ?? 'scheduled',
    delayMinutes: row.delay_minutes,
  };
}

export function toCarriage(row: FormationRow) {
  // A null load factor means the counter is out, not that the coach is empty.
  const occupancy = row.occupancy ?? null;
  const crowding =
    occupancy === null
      ? 'moderate'
      : occupancy > 0.9
        ? 'full'
        : occupancy > 0.7
          ? 'busy'
          : occupancy > 0.4
            ? 'moderate'
            : occupancy > 0.15
              ? 'light'
              : 'empty';

  return {
    letter: row.coach_letter,
    position: row.position,
    class: row.travel_class === 'F' ? 'first' : 'standard',
    crowding,
    occupancy: occupancy ?? 0.5,
    amenities: row.amenity_codes.map((code) => AMENITY[code]).filter(Boolean),
    seats: row.seats,
    outOfService: row.out_of_service,
  };
}

export function toDisruption(row: DisruptionRow) {
  return {
    id: row.id,
    severity: SEVERITY[row.severity] ?? 'info',
    title: row.title,
    detail: row.detail,
    issuedAt: row.issued_at.toISOString(),
  };
}

export function toPosition(row: PositionRow, routeLength: number) {
  return {
    serviceId: row.service_id,
    coordinate: { lat: row.lat, lon: row.lon },
    bearing: row.bearing ?? 0,
    speedKph: row.speed_kph ?? 0,
    progress:
      routeLength > 1 && row.next_call_sequence !== null
        ? Math.min(1, Math.max(0, row.next_call_sequence / (routeLength - 1)))
        : 0,
    nextCallSequence: row.next_call_sequence ?? 0,
    recordedAt: row.recorded_at.toISOString(),
    source: row.source === 'TRAIN_GPS' ? 'gps' : row.source === 'TRUST' ? 'trackside' : 'interpolated',
  };
}
