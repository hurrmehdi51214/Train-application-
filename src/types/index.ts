/** Domain model. Mirrors the gateway contract in docs/API.md one-for-one. */

export type Iso8601 = string;

export interface Coordinate {
  lat: number;
  lon: number;
}

export type StationFacility =
  | 'step-free'
  | 'toilets'
  | 'baby-change'
  | 'left-luggage'
  | 'taxi-rank'
  | 'bike-racks'
  | 'car-park'
  | 'ticket-office'
  | 'waiting-room';

export interface Station {
  id: string;
  /** Three-letter national reference code, e.g. "MRD". */
  code: string;
  name: string;
  city: string;
  coordinate: Coordinate;
  /** Entrances a walking route can target. First entry is the main entrance. */
  entrances: Array<{ id: string; label: string; coordinate: Coordinate }>;
  platforms: string[];
  facilities: StationFacility[];
  /** Minutes a typical passenger needs from the entrance to the platform. */
  concourseWalkMinutes: number;
  timezone: string;
}

export type AmenityId =
  | 'wifi'
  | 'power'
  | 'usb-c'
  | 'table'
  | 'quiet'
  | 'catering'
  | 'trolley'
  | 'bike-space'
  | 'wheelchair-space'
  | 'accessible-toilet'
  | 'luggage-rack'
  | 'air-conditioning';

export type CrowdingLevel = 'empty' | 'light' | 'moderate' | 'busy' | 'full';

export interface Carriage {
  /** Coach letter as printed on the door, e.g. "C". */
  letter: string;
  /** 1-indexed position from the front of the train in direction of travel. */
  position: number;
  class: 'standard' | 'first';
  crowding: CrowdingLevel;
  /** 0..1, from the on-train load-weighing/counting feed. */
  occupancy: number;
  amenities: AmenityId[];
  seats: number;
  /** Set when the operator has taken a coach out of service mid-trip. */
  outOfService?: boolean;
}

export type CallStatus = 'scheduled' | 'approaching' | 'arrived' | 'departed' | 'skipped';

export interface Call {
  stationId: string;
  /** Order along the service, 0-indexed. */
  sequence: number;
  scheduledArrival: Iso8601 | null;
  scheduledDeparture: Iso8601 | null;
  expectedArrival: Iso8601 | null;
  expectedDeparture: Iso8601 | null;
  platform: string | null;
  /** True while the platform is still a forecast and may change. */
  platformConfirmed: boolean;
  status: CallStatus;
  /** Positive = late, negative = early, in minutes. */
  delayMinutes: number;
}

export type ServiceDisruption = {
  id: string;
  severity: 'info' | 'minor' | 'major';
  title: string;
  detail: string;
  issuedAt: Iso8601;
};

export interface TrainService {
  id: string;
  /** Operator headcode, e.g. "1M42". */
  headcode: string;
  operator: string;
  origin: string;
  destination: string;
  calls: Call[];
  carriages: Carriage[];
  /** Route geometry in travel order, used by the offline map renderer. */
  geometry: Coordinate[];
  disruptions: ServiceDisruption[];
  /** Cancelled services keep their calls so the UI can explain what was lost. */
  cancelled: boolean;
}

export interface TrainPosition {
  serviceId: string;
  coordinate: Coordinate;
  /** Degrees clockwise from north. */
  bearing: number;
  speedKph: number;
  /** Fraction of the whole route travelled, 0..1. */
  progress: number;
  /** Sequence of the call the train is heading toward. */
  nextCallSequence: number;
  recordedAt: Iso8601;
  source: 'gps' | 'trackside' | 'interpolated';
}

export type FareClass = 'standard' | 'first';
export type FareFlexibility = 'advance' | 'off-peak' | 'anytime';

export interface FareOption {
  id: string;
  class: FareClass;
  flexibility: FareFlexibility;
  priceMinor: number;
  currency: string;
  refundable: boolean;
  changeable: boolean;
  seatsRemaining: number | null;
  conditions: string[];
}

export interface JourneyLeg {
  serviceId: string;
  originStationId: string;
  destinationStationId: string;
  departure: Iso8601;
  arrival: Iso8601;
  platform: string | null;
}

export interface JourneyOption {
  id: string;
  legs: JourneyLeg[];
  durationMinutes: number;
  changes: number;
  fares: FareOption[];
  /** Coarse forecast used before the real load feed is available. */
  expectedCrowding: CrowdingLevel;
  carbonGramsPerPassenger: number;
}

export type TicketStatus = 'valid' | 'activated' | 'used' | 'expired' | 'refunded';

export interface Ticket {
  id: string;
  reference: string;
  journeyId: string;
  serviceId: string;
  originStationId: string;
  destinationStationId: string;
  departure: Iso8601;
  arrival: Iso8601;
  passengerName: string;
  class: FareClass;
  flexibility: FareFlexibility;
  coach: string | null;
  seat: string | null;
  priceMinor: number;
  currency: string;
  status: TicketStatus;
  /**
   * Detached Ed25519 signature over the canonical ticket payload, issued by the
   * gateway. Barrier scanners verify it offline against the published key, so a
   * ticket never needs a network round-trip to be accepted.
   */
  signature: string;
  /** Key id so the barrier knows which public key to verify against. */
  keyId: string;
  /** Rotating code embedded in the QR; changes every `barcodeRotationSeconds`. */
  barcodePayload: string;
  barcodeRotationSeconds: number;
  issuedAt: Iso8601;
}

export type TransitMode = 'bus' | 'tram' | 'metro' | 'ferry' | 'bike' | 'scooter' | 'taxi' | 'walk';

export interface LastMileOption {
  id: string;
  mode: TransitMode;
  line: string;
  headsign: string;
  /** Where you board it, relative to the station. */
  boardingPoint: string;
  walkMinutesToBoarding: number;
  departures: Iso8601[];
  frequencyMinutes: number | null;
  operator: string;
  accessible: boolean;
  fareNote: string | null;
}

export type JourneyPhase =
  | 'idle'
  | 'to-station'
  | 'at-station'
  | 'onboard'
  | 'approaching'
  | 'arrived'
  | 'completed';

export interface ActiveJourney {
  ticketId: string;
  serviceId: string;
  phase: JourneyPhase;
  startedAt: Iso8601 | null;
  /** Sequence numbers of calls already passed. */
  passedCallSequences: number[];
  lastNotifiedPhase: JourneyPhase | null;
}
