/**
 * Domain model for Safar.
 *
 * The shape is Pakistan Railways': named trains with UP/DN numbers, a calling
 * pattern down one of the main lines, and accommodation sold by class and berth
 * rather than by seat number alone.
 *
 * The *presentation* borrows Airbnb's information architecture, because it maps
 * unusually well: a train service is a listing, Pakistan Railways is the host,
 * classes are room types, amenities are amenities, and a journey is a stay with
 * a check-in and a check-out. Everywhere the two models disagree, the railway
 * wins - a passenger who misses the difference between AC Business and AC
 * Sleeper has lost a night's sleep, not a nice view.
 */

export type Iso8601 = string;

export interface Coordinate {
  lat: number;
  lon: number;
}

/* ------------------------------------------------------------------ places */

export type Province = 'Sindh' | 'Punjab' | 'Khyber Pakhtunkhwa' | 'Balochistan' | 'Islamabad';

export type StationFacility =
  | 'waiting-room'
  | 'ladies-waiting-room'
  | 'prayer-area'
  | 'food-court'
  | 'tea-stall'
  | 'wheelchair-access'
  | 'parking'
  | 'porters'
  | 'atm'
  | 'left-luggage'
  | 'retiring-room'
  | 'wifi';

export interface Station {
  id: string;
  /** Pakistan Railways station code. */
  code: string;
  name: string;
  /** Name in Urdu, shown alongside on station and ticket screens. */
  nameUrdu: string;
  city: string;
  province: Province;
  coordinate: Coordinate;
  /** Main line this station sits on: ML-1, ML-2, ML-3 or a branch. */
  line: string;
  platforms: number;
  facilities: StationFacility[];
  /** Minutes from the main entrance to the far platform. */
  concourseWalkMinutes: number;
  /** Photo key into src/data/photos.ts. */
  photoKey: string;
  /** Google Place ID, filled by scripts/sync-places.mjs when a key is set. */
  placeId?: string;
}

/* ------------------------------------------------------------------ trains */

/**
 * Accommodation classes, cheapest first. The order matters: it drives the
 * class picker, the default sort, and the "from PKR x" on every card.
 */
export type TravelClass =
  | 'economy'
  | 'ac-standard'
  | 'parlour'
  | 'ac-business'
  | 'ac-sleeper';

export type BerthType = 'seat' | 'lower' | 'middle' | 'upper';

export type Amenity =
  | 'air-conditioning'
  | 'bedding'
  | 'dining-car'
  | 'meals-included'
  | 'tea-service'
  | 'power-socket'
  | 'usb-charging'
  | 'reading-light'
  | 'wifi'
  | 'prayer-space'
  | 'washroom'
  | 'western-washroom'
  | 'luggage-space'
  | 'wheelchair-space'
  | 'security-staff'
  | 'reclining-seat'
  | 'privacy-curtain'
  | 'entertainment';

export type CrowdingLevel = 'empty' | 'light' | 'moderate' | 'busy' | 'full';

export interface CoachOffer {
  travelClass: TravelClass;
  /** Coach letters in the formation carrying this class, front to rear. */
  coaches: string[];
  berths: BerthType[];
  amenities: Amenity[];
  /** Berths or seats left, across the whole train. */
  available: number;
  capacity: number;
  crowding: CrowdingLevel;
  /** Fare in paisa (1/100 PKR) for the whole booked leg, per passenger. */
  fareMinor: number;
}

export type CallStatus = 'scheduled' | 'approaching' | 'arrived' | 'departed' | 'skipped';

export interface Call {
  stationId: string;
  sequence: number;
  /** Kilometres from the train's origin. */
  distanceKm: number;
  scheduledArrival: Iso8601 | null;
  scheduledDeparture: Iso8601 | null;
  expectedArrival: Iso8601 | null;
  expectedDeparture: Iso8601 | null;
  platform: string | null;
  platformConfirmed: boolean;
  status: CallStatus;
  /** Positive is late, in minutes. Pakistan Railways reports to the minute. */
  delayMinutes: number;
  /** Minutes the train stands at the platform. */
  haltMinutes: number;
}

export interface Disruption {
  id: string;
  severity: 'info' | 'minor' | 'major';
  title: string;
  detail: string;
  issuedAt: Iso8601;
}

export interface Review {
  id: string;
  author: string;
  /** Month and year only, as Airbnb shows. */
  when: string;
  rating: number;
  body: string;
  /** Which class they travelled in, which is the only context that matters. */
  travelClass: TravelClass;
}

export interface TrainService {
  id: string;
  /** e.g. "5UP". Pakistan Railways numbers every direction separately. */
  number: string;
  name: string;
  nameUrdu: string;
  operator: string;
  /** "ML-1", the corridor this train runs on. */
  line: string;
  originStationId: string;
  destinationStationId: string;
  calls: Call[];
  offers: CoachOffer[];
  /** Photo keys, in carousel order. The first is the hero. */
  photoKeys: string[];
  /** Out of 5, to two decimals, as Airbnb shows it. */
  rating: number;
  reviewCount: number;
  reviews: Review[];
  disruptions: Disruption[];
  /** A sentence of genuine character for the listing page. */
  tagline: string;
  about: string;
  /** Days of the week it runs, 0 = Sunday. Empty means daily. */
  runsOn: number[];
  cancelled: boolean;
  /** Marks the handful of services people actually plan trips around. */
  featured: boolean;
}

export interface TrainPosition {
  serviceId: string;
  coordinate: Coordinate;
  bearing: number;
  speedKph: number;
  /** 0..1 along the whole route. */
  progress: number;
  nextCallSequence: number;
  recordedAt: Iso8601;
  source: 'gps' | 'trackside' | 'timetable';
}

/* --------------------------------------------------------------- searching */

export interface Passengers {
  adults: number;
  children: number;
  infants: number;
}

export interface SearchQuery {
  originId: string | null;
  destinationId: string | null;
  /** Outbound date, yyyy-mm-dd. */
  date: string | null;
  returnDate: string | null;
  passengers: Passengers;
  travelClass: TravelClass | null;
}

export interface JourneyOption {
  id: string;
  serviceId: string;
  originStationId: string;
  destinationStationId: string;
  departure: Iso8601;
  arrival: Iso8601;
  durationMinutes: number;
  distanceKm: number;
  platform: string | null;
  offers: CoachOffer[];
  rating: number;
  reviewCount: number;
  /** Overnight journeys get a moon on the card; most of these are overnight. */
  nightsOnBoard: number;
}

/* ----------------------------------------------------------------- tickets */

export type TicketStatus = 'confirmed' | 'waitlisted' | 'boarded' | 'completed' | 'cancelled' | 'refunded';

export interface PassengerDetail {
  name: string;
  /** CNIC is required by Pakistan Railways for reserved accommodation. */
  cnicLast6: string | null;
  age: number | null;
  gender: 'male' | 'female' | 'other' | null;
  coach: string | null;
  berth: string | null;
  berthType: BerthType | null;
}

export interface Ticket {
  id: string;
  /** PNR, the number every counter and conductor asks for. */
  pnr: string;
  serviceId: string;
  originStationId: string;
  destinationStationId: string;
  departure: Iso8601;
  arrival: Iso8601;
  travelClass: TravelClass;
  passengers: PassengerDetail[];
  /** Total paid, in paisa. */
  totalMinor: number;
  currency: 'PKR';
  status: TicketStatus;
  /** Ed25519 signature from the gateway; verified offline at the gate. */
  signature: string;
  keyId: string;
  barcodePayload: string;
  barcodeRotationSeconds: number;
  issuedAt: Iso8601;
}

/* -------------------------------------------------------------- last mile */

export type TransitMode = 'bus' | 'metrobus' | 'brt' | 'rickshaw' | 'taxi' | 'ride-hailing' | 'walk';

export interface LastMileOption {
  id: string;
  mode: TransitMode;
  name: string;
  headsign: string;
  boardingPoint: string;
  walkMinutesToBoarding: number;
  departures: Iso8601[];
  frequencyMinutes: number | null;
  operator: string;
  /** Typical fare in paisa, or null for metered. */
  fareMinor: number | null;
  note: string | null;
}

/* -------------------------------------------------------------- journeying */

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
  passedCallSequences: number[];
  lastNotifiedPhase: JourneyPhase | null;
}

/* ------------------------------------------------------------- discovery */

export interface Destination {
  id: string;
  city: string;
  cityUrdu: string;
  province: Province;
  stationId: string;
  photoKey: string;
  blurb: string;
  coordinate: Coordinate;
  /** Hours from Karachi, used for the "near you" sort. */
  popularity: number;
}

export interface Collection {
  id: string;
  title: string;
  subtitle: string;
  photoKey: string;
  /** Service ids in this collection. */
  serviceIds: string[];
}
