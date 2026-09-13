import type { Amenity, Collection, Destination, StationFacility, TransitMode } from '@/types';
import { getStation } from './stations';

/**
 * The discovery layer: what the Explore tab is made of.
 *
 * Airbnb's home screen is categories and photographs, not a search form. The
 * same applies here - most people opening a train app in Pakistan are deciding
 * *whether* to travel as much as *how*, and a grid of real places does more for
 * that than an empty origin field.
 */

export const DESTINATIONS: Destination[] = [
  {
    id: 'dest-karachi',
    city: 'Karachi',
    cityUrdu: 'کراچی',
    province: 'Sindh',
    stationId: 'stn-khi-cantt',
    photoKey: 'city.karachi',
    blurb: 'The sea, the food, and the start of every main line.',
    coordinate: { lat: 24.8607, lon: 67.0011 },
    popularity: 100,
  },
  {
    id: 'dest-lahore',
    city: 'Lahore',
    cityUrdu: 'لاہور',
    province: 'Punjab',
    stationId: 'stn-lhr',
    photoKey: 'city.lahore',
    blurb: 'Badshahi, the Walled City, and the best station building in Pakistan.',
    coordinate: { lat: 31.5497, lon: 74.3436 },
    popularity: 98,
  },
  {
    id: 'dest-islamabad',
    city: 'Islamabad',
    cityUrdu: 'اسلام آباد',
    province: 'Islamabad',
    stationId: 'stn-isb',
    photoKey: 'city.islamabad',
    blurb: 'Faisal Mosque, the Margallas, and the Green Line terminus.',
    coordinate: { lat: 33.6844, lon: 73.0479 },
    popularity: 92,
  },
  {
    id: 'dest-multan',
    city: 'Multan',
    cityUrdu: 'ملتان',
    province: 'Punjab',
    stationId: 'stn-mux-cantt',
    photoKey: 'city.multan',
    blurb: 'City of saints, shrines and the best mangoes on the network.',
    coordinate: { lat: 30.1575, lon: 71.5249 },
    popularity: 80,
  },
  {
    id: 'dest-peshawar',
    city: 'Peshawar',
    cityUrdu: 'پشاور',
    province: 'Khyber Pakhtunkhwa',
    stationId: 'stn-pew',
    photoKey: 'city.peshawar',
    blurb: 'Where ML-1 ends and the Khyber begins.',
    coordinate: { lat: 34.0151, lon: 71.5249 },
    popularity: 78,
  },
  {
    id: 'dest-quetta',
    city: 'Quetta',
    cityUrdu: 'کوئٹہ',
    province: 'Balochistan',
    stationId: 'stn-quetta',
    photoKey: 'city.quetta',
    blurb: 'Reached by the Bolan Pass, which is reason enough.',
    coordinate: { lat: 30.1798, lon: 66.975 },
    popularity: 71,
  },
  {
    id: 'dest-bahawalpur',
    city: 'Bahawalpur',
    cityUrdu: 'بہاولپور',
    province: 'Punjab',
    stationId: 'stn-bwp',
    photoKey: 'city.bahawalpur',
    blurb: 'Noor Mahal, Derawar Fort, and the edge of the Cholistan.',
    coordinate: { lat: 29.3956, lon: 71.6836 },
    popularity: 68,
  },
  {
    id: 'dest-sukkur',
    city: 'Sukkur',
    cityUrdu: 'سکھر',
    province: 'Sindh',
    stationId: 'stn-rohri',
    photoKey: 'city.sukkur',
    blurb: 'The Indus at its widest, under the Lansdowne Bridge.',
    coordinate: { lat: 27.7052, lon: 68.8574 },
    popularity: 62,
  },
  {
    id: 'dest-havelian',
    city: 'Havelian',
    cityUrdu: 'ہویلیاں',
    province: 'Khyber Pakhtunkhwa',
    stationId: 'stn-havelian',
    photoKey: 'city.havelian',
    blurb: 'Rail-head for Abbottabad, Kaghan and the Karakoram Highway.',
    coordinate: { lat: 34.053, lon: 73.16 },
    popularity: 55,
  },
  {
    id: 'dest-faisalabad',
    city: 'Faisalabad',
    cityUrdu: 'فیصل آباد',
    province: 'Punjab',
    stationId: 'stn-fsd',
    photoKey: 'city.faisalabad',
    blurb: 'The clock tower and eight bazaars radiating off it.',
    coordinate: { lat: 31.4504, lon: 73.135 },
    popularity: 60,
  },
];

/**
 * Explore categories. These are the pill row at the top of the home screen -
 * the single most-used control in the whole Airbnb app, and the reason its
 * home screen does not need a hero search form.
 */
export interface Category {
  id: string;
  label: string;
  /** Which services belong to it. Empty means "everything". */
  filter: (id: string) => boolean;
  photoKey: string;
}

export const CATEGORIES: Category[] = [
  { id: 'all', label: 'All trains', filter: () => true, photoKey: 'train.express' },
  {
    id: 'overnight',
    label: 'Overnight',
    filter: (id) => ['svc-green-line', 'svc-tezgam', 'svc-khyber-mail', 'svc-karachi-express', 'svc-karakoram'].includes(id),
    photoKey: 'train.coach',
  },
  {
    id: 'scenic',
    label: 'Scenic',
    filter: (id) => ['svc-jaffar', 'svc-bolan-mail', 'svc-hazara', 'svc-khyber-mail'].includes(id),
    photoKey: 'scene.bolan',
  },
  {
    id: 'sleeper',
    label: 'Sleeper cabins',
    filter: (id) => ['svc-tezgam', 'svc-khyber-mail', 'svc-karakoram', 'svc-karachi-express', 'svc-jaffar', 'svc-bolan-mail'].includes(id),
    photoKey: 'scene.northern',
  },
  {
    id: 'fast',
    label: 'Fastest',
    filter: (id) => ['svc-karakoram', 'svc-green-line', 'svc-karachi-express', 'svc-millat'].includes(id),
    photoKey: 'train.locomotive',
  },
  {
    id: 'budget',
    label: 'Best value',
    filter: (id) => ['svc-awam', 'svc-pakistan-express', 'svc-bolan-mail', 'svc-allama-iqbal', 'svc-millat'].includes(id),
    photoKey: 'scene.desert',
  },
  {
    id: 'historic',
    label: 'Historic',
    filter: (id) => ['svc-khyber-mail', 'svc-tezgam', 'svc-bolan-mail', 'svc-karachi-express'].includes(id),
    photoKey: 'city.rohri',
  },
];

export const COLLECTIONS: Collection[] = [
  {
    id: 'col-flagship',
    title: 'The flagship runs',
    subtitle: 'The trains people plan their year around',
    photoKey: 'scene.northern',
    serviceIds: ['svc-green-line', 'svc-tezgam', 'svc-karakoram', 'svc-khyber-mail'],
  },
  {
    id: 'col-mountains',
    title: 'Into the mountains',
    subtitle: 'Bolan, Khyber and the road to the Karakoram',
    photoKey: 'scene.bolan',
    serviceIds: ['svc-jaffar', 'svc-bolan-mail', 'svc-hazara'],
  },
  {
    id: 'col-overnight',
    title: 'Sleep your way there',
    subtitle: 'Board after dinner, wake up somewhere else',
    photoKey: 'train.coach',
    serviceIds: ['svc-green-line', 'svc-karachi-express', 'svc-tezgam', 'svc-karakoram'],
  },
];

/* ---------------------------------------------------------------- copy maps */

export const amenityMeta: Record<Amenity, { label: string; detail: string; icon: string }> = {
  'air-conditioning': { label: 'Air conditioning', detail: 'Climate controlled throughout the coach', icon: 'snow' },
  bedding: { label: 'Bedding provided', detail: 'Clean sheets, pillow and blanket at your berth', icon: 'bed' },
  'dining-car': { label: 'Dining car', detail: 'A proper restaurant coach on the train', icon: 'restaurant' },
  'meals-included': { label: 'Meals included', detail: 'Served to your seat, included in the fare', icon: 'meal' },
  'tea-service': { label: 'Chai service', detail: 'Tea trolley through the coach all journey', icon: 'tea' },
  'power-socket': { label: 'Power socket', detail: 'Two-pin socket at every seat', icon: 'plug' },
  'usb-charging': { label: 'USB charging', detail: 'USB-A and USB-C at every seat', icon: 'usb' },
  'reading-light': { label: 'Reading light', detail: 'Individual light at each berth', icon: 'lamp' },
  wifi: { label: 'Wi-Fi', detail: 'Onboard Wi-Fi where coverage allows', icon: 'wifi' },
  'prayer-space': { label: 'Prayer space', detail: 'Clear area at the coach end for namaz', icon: 'prayer' },
  washroom: { label: 'Washroom', detail: 'Eastern-style washroom at both ends', icon: 'washroom' },
  'western-washroom': { label: 'Western washroom', detail: 'Western-style toilet available', icon: 'washroom' },
  'luggage-space': { label: 'Luggage space', detail: 'Overhead racks and end-of-coach stacks', icon: 'luggage' },
  'wheelchair-space': { label: 'Wheelchair space', detail: 'Dedicated bay, book with the station', icon: 'accessible' },
  'security-staff': { label: 'Security on board', detail: 'Railway police travel with this service', icon: 'shield' },
  'reclining-seat': { label: 'Reclining seat', detail: 'Deep recline with a footrest', icon: 'seat' },
  'privacy-curtain': { label: 'Privacy curtain', detail: 'Curtain or door to your berth', icon: 'curtain' },
  entertainment: { label: 'Screen', detail: 'Seat-back entertainment screen', icon: 'screen' },
};

export const facilityMeta: Record<StationFacility, { label: string; icon: string }> = {
  'waiting-room': { label: 'Waiting room', icon: 'seat' },
  'ladies-waiting-room': { label: 'Ladies waiting room', icon: 'seat' },
  'prayer-area': { label: 'Prayer area', icon: 'prayer' },
  'food-court': { label: 'Food court', icon: 'restaurant' },
  'tea-stall': { label: 'Chai stall', icon: 'tea' },
  'wheelchair-access': { label: 'Step-free access', icon: 'accessible' },
  parking: { label: 'Parking', icon: 'car' },
  porters: { label: 'Porters (qulis)', icon: 'luggage' },
  atm: { label: 'ATM', icon: 'card' },
  'left-luggage': { label: 'Left luggage', icon: 'luggage' },
  'retiring-room': { label: 'Retiring rooms', icon: 'bed' },
  wifi: { label: 'Wi-Fi', icon: 'wifi' },
};

export const modeLabel: Record<TransitMode, string> = {
  bus: 'Bus',
  metrobus: 'Metrobus',
  brt: 'BRT',
  rickshaw: 'Rickshaw',
  taxi: 'Taxi',
  'ride-hailing': 'Careem / inDrive',
  walk: 'Walk',
};

export function destinationForStation(stationId: string): Destination | undefined {
  return DESTINATIONS.find((d) => d.stationId === stationId)
    ?? DESTINATIONS.find((d) => getStation(d.stationId)?.city === getStation(stationId)?.city);
}
