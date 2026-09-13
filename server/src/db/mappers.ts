import type {
  AccommodationRow,
  CallRow,
  DisruptionRow,
  PositionRow,
  StationRow,
} from './legacyRail.js';

/**
 * Row shapes to wire shapes.
 *
 * This is the only place Pakistan Railways' vocabulary - run UIDs, stop
 * sequences, slab fares, berth types - is translated into the app's domain
 * model. Above this file nobody needs to know that a train is numbered
 * differently in each direction.
 */

const CALL_STATUS: Record<string, string> = {
  SCHEDULED: 'scheduled',
  SIGNALLED: 'approaching',
  APPROACHING: 'approaching',
  ARRIVED: 'arrived',
  DEPARTED: 'departed',
  PASSED: 'departed',
  SKIPPED: 'skipped',
  CANCELLED_STOP: 'skipped',
};

const SEVERITY: Record<string, string> = {
  INFO: 'info',
  MINOR: 'minor',
  MAJOR: 'major',
  SEVERE: 'major',
};

/** The operator's class codes. */
const TRAVEL_CLASS: Record<string, string> = {
  EC: 'economy',
  ECO: 'economy',
  ACS: 'ac-standard',
  ACL: 'ac-standard', // "AC Lower" is the same product under an older name
  ACB: 'ac-business',
  PC: 'parlour',
  PARLOUR: 'parlour',
  ACSL: 'ac-sleeper',
  SLEEPER: 'ac-sleeper',
};

const BERTH_TYPE: Record<string, string> = {
  S: 'seat',
  SEAT: 'seat',
  L: 'lower',
  LOWER: 'lower',
  M: 'middle',
  MIDDLE: 'middle',
  U: 'upper',
  UPPER: 'upper',
};

const AMENITY: Record<string, string> = {
  AC: 'air-conditioning',
  BED: 'bedding',
  DINE: 'dining-car',
  MEAL: 'meals-included',
  CHAI: 'tea-service',
  PWR: 'power-socket',
  USB: 'usb-charging',
  LAMP: 'reading-light',
  WIFI: 'wifi',
  NAMAZ: 'prayer-space',
  WC: 'washroom',
  WWC: 'western-washroom',
  LUGG: 'luggage-space',
  WCHR: 'wheelchair-space',
  SEC: 'security-staff',
  RECL: 'reclining-seat',
  CURT: 'privacy-curtain',
  SCRN: 'entertainment',
};

const FACILITY: Record<string, string> = {
  WAIT: 'waiting-room',
  LWAIT: 'ladies-waiting-room',
  NAMAZ: 'prayer-area',
  FOOD: 'food-court',
  CHAI: 'tea-stall',
  SFA: 'wheelchair-access',
  PARK: 'parking',
  QULI: 'porters',
  ATM: 'atm',
  CLOAK: 'left-luggage',
  RETIRE: 'retiring-room',
  WIFI: 'wifi',
};

const iso = (value: Date | null) => (value ? value.toISOString() : null);
const map = <T>(table: Record<string, T>, codes: string[]): T[] =>
  codes.map((code) => table[code]).filter((value): value is T => value !== undefined);

export function toStation(row: StationRow) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    nameUrdu: row.name_urdu,
    city: row.city,
    province: row.province,
    coordinate: { lat: row.lat, lon: row.lon },
    line: row.line,
    platforms: row.platforms,
    facilities: map(FACILITY, row.facilities),
    concourseWalkMinutes: row.concourse_walk_minutes,
    photoKey: `station.${row.code.toLowerCase()}`,
  };
}

export function toCall(row: CallRow) {
  return {
    stationId: row.station_id,
    sequence: row.sequence,
    distanceKm: row.distance_km,
    scheduledArrival: iso(row.scheduled_arrival),
    scheduledDeparture: iso(row.scheduled_departure),
    expectedArrival: iso(row.expected_arrival),
    expectedDeparture: iso(row.expected_departure),
    platform: row.platform,
    platformConfirmed: row.platform_confirmed,
    status: CALL_STATUS[row.call_status] ?? 'scheduled',
    delayMinutes: row.delay_minutes,
    haltMinutes: row.halt_minutes,
  };
}

export function toOffer(row: AccommodationRow) {
  const available = Math.max(0, row.capacity - row.sold);
  const loadFactor = row.capacity > 0 ? row.sold / row.capacity : 0;

  return {
    travelClass: TRAVEL_CLASS[row.travel_class] ?? 'economy',
    coaches: row.coach_labels,
    berths: map(BERTH_TYPE, row.berth_types),
    amenities: map(AMENITY, row.amenity_codes),
    available,
    capacity: row.capacity,
    crowding:
      loadFactor >= 0.92
        ? 'full'
        : loadFactor >= 0.75
          ? 'busy'
          : loadFactor >= 0.45
            ? 'moderate'
            : loadFactor >= 0.2
              ? 'light'
              : 'empty',
    fareMinor: row.fare_minor,
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

export function toPosition(row: PositionRow) {
  const stops = Math.max(1, row.total_stops - 1);
  return {
    serviceId: row.service_id,
    coordinate: { lat: row.lat, lon: row.lon },
    bearing: row.bearing ?? 0,
    speedKph: row.speed_kph ?? 0,
    progress:
      row.next_stop_sequence !== null ? Math.min(1, Math.max(0, row.next_stop_sequence / stops)) : 0,
    nextCallSequence: row.next_stop_sequence ?? 0,
    recordedAt: row.recorded_at.toISOString(),
    source: row.source === 'LOCO_GPS' ? 'gps' : row.source === 'TRACKSIDE' ? 'trackside' : 'timetable',
  };
}
