import {
  AmenityId,
  Call,
  Carriage,
  CrowdingLevel,
  FareOption,
  JourneyOption,
  TrainService,
} from '@/types';
import { routeGeometry } from './geometry';

/**
 * Timetable fixtures.
 *
 * Departures are generated relative to the moment the module loads so the app
 * always has a plausible "next train" whenever it is opened. The gateway
 * returns the identical shape; swapping `USE_FIXTURES` off in services/apiClient
 * is the only change needed to run against the real feed.
 */

const MIN = 60_000;

function at(offsetMinutes: number, from = Date.now()): string {
  // Round to the minute so the UI never renders a departure at 09:14:37.
  const t = Math.round((from + offsetMinutes * MIN) / MIN) * MIN;
  return new Date(t).toISOString();
}

interface CallSpec {
  stationId: string;
  /** Minutes after the service's origin departure. */
  offset: number;
  /** Dwell time at the platform, minutes. */
  dwell?: number;
  platform?: string;
  platformConfirmed?: boolean;
  delay?: number;
}

interface ServiceSpec {
  id: string;
  headcode: string;
  operator: string;
  /** Minutes from now to the origin departure. Negative = already running. */
  departsIn: number;
  calls: CallSpec[];
  carriages: Carriage[];
  disruptionNote?: { severity: 'info' | 'minor' | 'major'; title: string; detail: string };
}

function buildCalls(spec: ServiceSpec): Call[] {
  const originEpoch = Date.now() + spec.departsIn * MIN;
  return spec.calls.map((call, index) => {
    const isFirst = index === 0;
    const isLast = index === spec.calls.length - 1;
    const dwell = call.dwell ?? (isFirst || isLast ? 0 : 1);
    const delay = call.delay ?? 0;

    const scheduledArrival = isFirst ? null : at(call.offset, originEpoch);
    const scheduledDeparture = isLast ? null : at(call.offset + dwell, originEpoch);
    const expectedArrival = scheduledArrival ? at(call.offset + delay, originEpoch) : null;
    const expectedDeparture = scheduledDeparture
      ? at(call.offset + dwell + delay, originEpoch)
      : null;

    const now = Date.now();
    const departureEpoch = new Date(expectedDeparture ?? expectedArrival ?? '').getTime();
    const arrivalEpoch = new Date(expectedArrival ?? expectedDeparture ?? '').getTime();

    let status: Call['status'] = 'scheduled';
    if (now >= departureEpoch) status = isLast ? 'arrived' : 'departed';
    else if (now >= arrivalEpoch) status = 'arrived';
    else if (arrivalEpoch - now <= 3 * MIN) status = 'approaching';

    return {
      stationId: call.stationId,
      sequence: index,
      scheduledArrival,
      scheduledDeparture,
      expectedArrival,
      expectedDeparture,
      platform: call.platform ?? null,
      platformConfirmed: call.platformConfirmed ?? Boolean(call.platform),
      status,
      delayMinutes: delay,
    };
  });
}

const STANDARD_AMENITIES: AmenityId[] = ['wifi', 'power', 'usb-c', 'luggage-rack', 'air-conditioning'];
const FIRST_AMENITIES: AmenityId[] = [
  'wifi',
  'power',
  'usb-c',
  'table',
  'catering',
  'quiet',
  'luggage-rack',
  'air-conditioning',
];

function carriage(
  letter: string,
  position: number,
  crowding: CrowdingLevel,
  occupancy: number,
  options: Partial<Carriage> = {},
): Carriage {
  const first = options.class === 'first';
  return {
    letter,
    position,
    class: first ? 'first' : 'standard',
    crowding,
    occupancy,
    amenities: options.amenities ?? (first ? FIRST_AMENITIES : STANDARD_AMENITIES),
    seats: options.seats ?? (first ? 45 : 76),
    ...options,
  };
}

const FLAGSHIP_FORMATION: Carriage[] = [
  carriage('A', 1, 'light', 0.24, { class: 'first', amenities: FIRST_AMENITIES, seats: 45 }),
  carriage('B', 2, 'moderate', 0.52, { amenities: [...STANDARD_AMENITIES, 'quiet'] }),
  carriage('C', 3, 'busy', 0.78, { amenities: [...STANDARD_AMENITIES, 'trolley'] }),
  carriage('D', 4, 'moderate', 0.55, { amenities: [...STANDARD_AMENITIES, 'accessible-toilet', 'wheelchair-space'], seats: 68 }),
  carriage('E', 5, 'light', 0.31, { amenities: [...STANDARD_AMENITIES, 'bike-space'], seats: 64 }),
  carriage('F', 6, 'empty', 0.12, { amenities: [...STANDARD_AMENITIES, 'quiet', 'table'] }),
];

const SHORT_FORMATION: Carriage[] = [
  carriage('A', 1, 'moderate', 0.48, { class: 'first', seats: 30 }),
  carriage('B', 2, 'busy', 0.81),
  carriage('C', 3, 'full', 0.94, { amenities: [...STANDARD_AMENITIES, 'accessible-toilet'] }),
  carriage('D', 4, 'busy', 0.76, { amenities: [...STANDARD_AMENITIES, 'bike-space'] }),
];

const SERVICE_SPECS: ServiceSpec[] = [
  {
    id: 'svc-1y24',
    headcode: '1Y24',
    operator: 'Meridian Rail',
    departsIn: 38,
    calls: [
      { stationId: 'stn-kgx', offset: 0, platform: '4' },
      { stationId: 'stn-sve', offset: 22, platform: '3', delay: 2 },
      { stationId: 'stn-pbo', offset: 48, platform: '2', delay: 3 },
      { stationId: 'stn-gth', offset: 68, platform: '1', delay: 3 },
      { stationId: 'stn-nng', offset: 80, platform: '2', delay: 4 },
      { stationId: 'stn-don', offset: 104, dwell: 2, platform: '3b', delay: 4 },
      { stationId: 'stn-yrk', offset: 128, platform: '9', platformConfirmed: false, delay: 4 },
    ],
    carriages: FLAGSHIP_FORMATION,
    disruptionNote: {
      severity: 'minor',
      title: 'Speed restriction near Retford',
      detail:
        'Engineers are working on the down line between Retford and Bawtry. Services are running up to 6 minutes late through the area until 22:00.',
    },
  },
  {
    id: 'svc-1d18',
    headcode: '1D18',
    operator: 'Meridian Rail',
    departsIn: 14,
    calls: [
      { stationId: 'stn-kgx', offset: 0, platform: '7' },
      { stationId: 'stn-pbo', offset: 46, platform: '3' },
      { stationId: 'stn-don', offset: 96, dwell: 2, platform: '4' },
      { stationId: 'stn-lds', offset: 128, platform: '11', platformConfirmed: false },
    ],
    carriages: SHORT_FORMATION,
  },
  {
    id: 'svc-1a07',
    headcode: '1A07',
    operator: 'Meridian Rail',
    departsIn: 72,
    calls: [
      { stationId: 'stn-kgx', offset: 0, platform: '1' },
      { stationId: 'stn-sve', offset: 24, platform: '4' },
      { stationId: 'stn-pbo', offset: 52, platform: '2' },
      { stationId: 'stn-don', offset: 108, dwell: 2, platform: '3' },
      { stationId: 'stn-yrk', offset: 134, platform: '10', platformConfirmed: false },
    ],
    carriages: FLAGSHIP_FORMATION.map((c) => ({ ...c, crowding: 'light' as CrowdingLevel, occupancy: c.occupancy * 0.55 })),
  },
  {
    id: 'svc-1n35',
    headcode: '1N35',
    operator: 'Northern Cross',
    departsIn: 106,
    calls: [
      { stationId: 'stn-kgx', offset: 0, platform: '5' },
      { stationId: 'stn-pbo', offset: 50, platform: '4' },
      { stationId: 'stn-nng', offset: 78, platform: '1' },
      { stationId: 'stn-don', offset: 102, platform: '8' },
      { stationId: 'stn-yrk', offset: 126, platform: '3' },
    ],
    carriages: SHORT_FORMATION.map((c) => ({ ...c, crowding: 'moderate' as CrowdingLevel, occupancy: 0.5 })),
  },
];

function disruptions(spec: ServiceSpec): TrainService['disruptions'] {
  if (!spec.disruptionNote) return [];
  return [
    {
      id: `${spec.id}-disruption`,
      severity: spec.disruptionNote.severity,
      title: spec.disruptionNote.title,
      detail: spec.disruptionNote.detail,
      issuedAt: at(-26),
    },
  ];
}

function buildService(spec: ServiceSpec): TrainService {
  const calls = buildCalls(spec);
  const stationIds = spec.calls.map((c) => c.stationId);
  return {
    id: spec.id,
    headcode: spec.headcode,
    operator: spec.operator,
    origin: stationIds[0]!,
    destination: stationIds[stationIds.length - 1]!,
    calls,
    carriages: spec.carriages,
    geometry: routeGeometry(stationIds),
    disruptions: disruptions(spec),
    cancelled: false,
  };
}

/** Rebuilt on demand so times stay anchored to "now" across a long session. */
export function allServices(): TrainService[] {
  return SERVICE_SPECS.map(buildService);
}

export function getService(id: string): TrainService | undefined {
  const spec = SERVICE_SPECS.find((s) => s.id === id);
  return spec ? buildService(spec) : undefined;
}

function fares(baseMinor: number, seatsRemaining: number): FareOption[] {
  return [
    {
      id: 'fare-advance',
      class: 'standard',
      flexibility: 'advance',
      priceMinor: baseMinor,
      currency: 'GBP',
      refundable: false,
      changeable: false,
      seatsRemaining,
      conditions: ['Valid only on the booked train', 'No refunds', 'Seat reservation included'],
    },
    {
      id: 'fare-offpeak',
      class: 'standard',
      flexibility: 'off-peak',
      priceMinor: Math.round(baseMinor * 1.72),
      currency: 'GBP',
      refundable: true,
      changeable: true,
      seatsRemaining: null,
      conditions: ['Valid on any off-peak service', 'Change for free before departure', 'Refundable up to 28 days'],
    },
    {
      id: 'fare-first',
      class: 'first',
      flexibility: 'off-peak',
      priceMinor: Math.round(baseMinor * 2.65),
      currency: 'GBP',
      refundable: true,
      changeable: true,
      seatsRemaining: Math.max(2, Math.round(seatsRemaining / 4)),
      conditions: ['First Class seat', 'Complimentary refreshments', 'Lounge access at staffed stations'],
    },
  ];
}

/** Journey options for a search. Single-leg only in this corridor. */
export function searchJourneys(originId: string, destinationId: string): JourneyOption[] {
  return allServices()
    .map((service) => {
      const originCall = service.calls.find((c) => c.stationId === originId);
      const destinationCall = service.calls.find((c) => c.stationId === destinationId);
      if (!originCall || !destinationCall) return null;
      if (destinationCall.sequence <= originCall.sequence) return null;

      const departure = originCall.expectedDeparture ?? originCall.scheduledDeparture;
      const arrival = destinationCall.expectedArrival ?? destinationCall.scheduledArrival;
      if (!departure || !arrival) return null;

      const durationMinutes = Math.round(
        (new Date(arrival).getTime() - new Date(departure).getTime()) / MIN,
      );
      const boarded = service.carriages;
      const averageOccupancy =
        boarded.reduce((sum, c) => sum + c.occupancy, 0) / Math.max(1, boarded.length);
      const expectedCrowding: CrowdingLevel =
        averageOccupancy > 0.8 ? 'full'
        : averageOccupancy > 0.65 ? 'busy'
        : averageOccupancy > 0.4 ? 'moderate'
        : averageOccupancy > 0.2 ? 'light'
        : 'empty';

      const legCount = destinationCall.sequence - originCall.sequence;
      const baseMinor = 2100 + legCount * 900;

      return {
        id: `${service.id}:${originId}:${destinationId}`,
        legs: [
          {
            serviceId: service.id,
            originStationId: originId,
            destinationStationId: destinationId,
            departure,
            arrival,
            platform: originCall.platform,
          },
        ],
        durationMinutes,
        changes: 0,
        fares: fares(baseMinor, Math.max(3, 40 - legCount * 5)),
        expectedCrowding,
        carbonGramsPerPassenger: Math.round(durationMinutes * 68),
      } satisfies JourneyOption;
    })
    .filter((option): option is JourneyOption => option !== null)
    .sort((a, b) => new Date(a.legs[0]!.departure).getTime() - new Date(b.legs[0]!.departure).getTime());
}

export function getJourneyOption(id: string): JourneyOption | undefined {
  const [, originId, destinationId] = id.split(':');
  if (!originId || !destinationId) return undefined;
  return searchJourneys(originId, destinationId).find((option) => option.id === id);
}
