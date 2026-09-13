import type { TravelClass } from '@/types';

/**
 * The fare model.
 *
 * Calibrated against Pakistan Railways' published 2025 fares for the
 * Karachi-Lahore corridor (1,214 km): Economy PKR 1,750-1,950 and AC Business
 * PKR 4,950-5,450 depending on the train. The rates below reproduce that band,
 * and every other city pair falls out of the same per-kilometre arithmetic
 * rather than being invented one route at a time. `tests/fares.test.ts` holds
 * the model to those published figures.
 *
 * Values are paisa (1/100 PKR) so nothing that touches money is ever a float.
 */

/**
 * Fare model.
 *
 * Calibrated against Pakistan Railways' published 2025 fares for the
 * Karachi-Lahore corridor (1,214 km): Economy PKR 1,750-1,950 and AC Business
 * PKR 4,950-5,450 depending on the train. The rates below reproduce that band,
 * and every other city pair falls out of the same per-kilometre arithmetic
 * rather than being invented one route at a time.
 *
 * Values are paisa (1/100 PKR) to keep money in integers.
 */
const RATE_PER_KM_MINOR: Record<TravelClass, number> = {
  economy: 145,
  'ac-standard': 220,
  'ac-business': 410,
  parlour: 470,
  'ac-sleeper': 585,
};

const BOOKING_BASE_MINOR = 15_000; // PKR 150 reservation and handling charge

/** Cheapest first. Drives the class picker and the "from" price on every card. */
export const CLASS_ORDER: TravelClass[] = [
  'economy',
  'ac-standard',
  'ac-business',
  'parlour',
  'ac-sleeper',
];

export const CLASS_LABEL: Record<TravelClass, string> = {
  economy: 'Economy',
  'ac-standard': 'AC Standard',
  'ac-business': 'AC Business',
  parlour: 'Parlour Car',
  'ac-sleeper': 'AC Sleeper',
};

export const CLASS_BLURB: Record<TravelClass, string> = {
  economy: 'Padded bench seating, fans, open coach',
  'ac-standard': 'Air-conditioned berths, bedding on request',
  'ac-business': 'Reclining air-conditioned seats, meals included',
  parlour: 'The front coach, two-by-one seating, best views',
  'ac-sleeper': 'Enclosed four-berth cabin with a door that locks',
};

/**
 * Fare for one adult, in paisa. Rounded to the nearest PKR 50 because that is
 * how the counter prices it and a ticket reading "PKR 5,127" would be wrong.
 */
export function fareMinor(
  distanceKm: number,
  travelClass: TravelClass,
  multiplier = 1,
): number {
  const raw = (BOOKING_BASE_MINOR + RATE_PER_KM_MINOR[travelClass] * distanceKm) * multiplier;
  return Math.round(raw / 5_000) * 5_000;
}

/** Children travel at half fare; infants under two travel free. */
export function partyFareMinor(
  perAdultMinor: number,
  party: { adults: number; children: number; infants: number },
): number {
  return perAdultMinor * party.adults + Math.round(perAdultMinor * 0.5) * party.children;
}
