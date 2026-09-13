import type { Station } from '@/types';

/**
 * Pakistan Railways station reference data.
 *
 * Coordinates are real, taken from public geodata and checked against Wikidata
 * for the principal stations (Karachi Cantt 24.8438/67.0412, Lahore Junction
 * 31.5772/74.3363, Rawalpindi 33.6036/73.0483, Multan Cantt 30.1804/71.4446).
 * `scripts/sync-places.mjs` refreshes them from Google Geocoding, and attaches
 * a Place ID to each, when a Maps key is configured.
 *
 * Lines follow the network's own naming: ML-1 is the Karachi-Peshawar spine
 * that almost every long-distance service runs on, ML-2 is the Kotri-Attock
 * route through Dadu and Larkana, ML-3 branches at Rohri for Quetta and
 * Chaman, and ML-4 is the Taxila-Havelian branch.
 */
export const STATIONS: Station[] = [
  {
    id: 'stn-khi-cantt',
    code: 'KYC',
    name: 'Karachi Cantt',
    nameUrdu: 'کراچی چھاؤنی',
    city: 'Karachi',
    province: 'Sindh',
    coordinate: { lat: 24.8438, lon: 67.0412 },
    line: 'ML-1',
    platforms: 8,
    facilities: ['waiting-room', 'ladies-waiting-room', 'prayer-area', 'food-court', 'porters', 'parking', 'atm', 'left-luggage', 'retiring-room', 'wheelchair-access'],
    concourseWalkMinutes: 7,
    photoKey: 'station.karachi-cantt',
  },
  {
    id: 'stn-khi-city',
    code: 'KCY',
    name: 'Karachi City',
    nameUrdu: 'کراچی سٹی',
    city: 'Karachi',
    province: 'Sindh',
    coordinate: { lat: 24.8607, lon: 67.0099 },
    line: 'ML-1',
    platforms: 5,
    facilities: ['waiting-room', 'prayer-area', 'tea-stall', 'porters', 'parking'],
    concourseWalkMinutes: 5,
    photoKey: 'station.karachi-cantt',
  },
  {
    id: 'stn-hyd',
    code: 'HDR',
    name: 'Hyderabad Junction',
    nameUrdu: 'حیدرآباد جنکشن',
    city: 'Hyderabad',
    province: 'Sindh',
    coordinate: { lat: 25.396, lon: 68.3578 },
    line: 'ML-1',
    platforms: 5,
    facilities: ['waiting-room', 'ladies-waiting-room', 'prayer-area', 'tea-stall', 'porters', 'parking'],
    concourseWalkMinutes: 4,
    photoKey: 'station.hyderabad',
  },
  {
    id: 'stn-nawabshah',
    code: 'NWS',
    name: 'Nawabshah',
    nameUrdu: 'نوابشاہ',
    city: 'Nawabshah',
    province: 'Sindh',
    coordinate: { lat: 26.2442, lon: 68.4096 },
    line: 'ML-1',
    platforms: 3,
    facilities: ['waiting-room', 'prayer-area', 'tea-stall'],
    concourseWalkMinutes: 3,
    photoKey: 'station.hyderabad',
  },
  {
    id: 'stn-rohri',
    code: 'ROH',
    name: 'Rohri Junction',
    nameUrdu: 'روہڑی جنکشن',
    city: 'Rohri',
    province: 'Sindh',
    coordinate: { lat: 27.6844, lon: 68.8942 },
    line: 'ML-1',
    platforms: 6,
    facilities: ['waiting-room', 'prayer-area', 'tea-stall', 'porters', 'retiring-room'],
    concourseWalkMinutes: 4,
    photoKey: 'station.rohri',
  },
  {
    id: 'stn-sukkur',
    code: 'SUK',
    name: 'Sukkur',
    nameUrdu: 'سکھر',
    city: 'Sukkur',
    province: 'Sindh',
    coordinate: { lat: 27.7052, lon: 68.8574 },
    line: 'ML-2',
    platforms: 3,
    facilities: ['waiting-room', 'prayer-area', 'tea-stall', 'parking'],
    concourseWalkMinutes: 3,
    photoKey: 'station.rohri',
  },
  {
    id: 'stn-rykhan',
    code: 'RYK',
    name: 'Rahim Yar Khan',
    nameUrdu: 'رحیم یار خان',
    city: 'Rahim Yar Khan',
    province: 'Punjab',
    coordinate: { lat: 28.4202, lon: 70.2952 },
    line: 'ML-1',
    platforms: 4,
    facilities: ['waiting-room', 'prayer-area', 'tea-stall', 'porters', 'parking'],
    concourseWalkMinutes: 3,
    photoKey: 'station.bahawalpur',
  },
  {
    id: 'stn-bwp',
    code: 'BWP',
    name: 'Bahawalpur',
    nameUrdu: 'بہاولپور',
    city: 'Bahawalpur',
    province: 'Punjab',
    coordinate: { lat: 29.3956, lon: 71.6836 },
    line: 'ML-1',
    platforms: 4,
    facilities: ['waiting-room', 'ladies-waiting-room', 'prayer-area', 'food-court', 'porters', 'parking', 'atm'],
    concourseWalkMinutes: 4,
    photoKey: 'station.bahawalpur',
  },
  {
    id: 'stn-mux-cantt',
    code: 'MTC',
    name: 'Multan Cantt',
    nameUrdu: 'ملتان چھاؤنی',
    city: 'Multan',
    province: 'Punjab',
    coordinate: { lat: 30.1804, lon: 71.4446 },
    line: 'ML-1',
    platforms: 6,
    facilities: ['waiting-room', 'ladies-waiting-room', 'prayer-area', 'food-court', 'porters', 'parking', 'atm', 'retiring-room', 'wheelchair-access'],
    concourseWalkMinutes: 5,
    photoKey: 'station.multan',
  },
  {
    id: 'stn-khanewal',
    code: 'KWL',
    name: 'Khanewal Junction',
    nameUrdu: 'خانیوال جنکشن',
    city: 'Khanewal',
    province: 'Punjab',
    coordinate: { lat: 30.3017, lon: 71.9321 },
    line: 'ML-1',
    platforms: 5,
    facilities: ['waiting-room', 'prayer-area', 'tea-stall', 'porters'],
    concourseWalkMinutes: 3,
    photoKey: 'city.khanewal',
  },
  {
    id: 'stn-sahiwal',
    code: 'SWL',
    name: 'Sahiwal',
    nameUrdu: 'ساہیوال',
    city: 'Sahiwal',
    province: 'Punjab',
    coordinate: { lat: 30.6682, lon: 73.1114 },
    line: 'ML-1',
    platforms: 3,
    facilities: ['waiting-room', 'prayer-area', 'tea-stall'],
    concourseWalkMinutes: 3,
    photoKey: 'city.khanewal',
  },
  {
    id: 'stn-fsd',
    code: 'FSD',
    name: 'Faisalabad',
    nameUrdu: 'فیصل آباد',
    city: 'Faisalabad',
    province: 'Punjab',
    coordinate: { lat: 31.4187, lon: 73.0791 },
    line: 'Branch',
    platforms: 4,
    facilities: ['waiting-room', 'ladies-waiting-room', 'prayer-area', 'food-court', 'porters', 'parking'],
    concourseWalkMinutes: 4,
    photoKey: 'city.faisalabad',
  },
  {
    id: 'stn-lhr',
    code: 'LHR',
    name: 'Lahore Junction',
    nameUrdu: 'لاہور جنکشن',
    city: 'Lahore',
    province: 'Punjab',
    coordinate: { lat: 31.5772, lon: 74.3363 },
    line: 'ML-1',
    platforms: 11,
    facilities: ['waiting-room', 'ladies-waiting-room', 'prayer-area', 'food-court', 'porters', 'parking', 'atm', 'left-luggage', 'retiring-room', 'wheelchair-access', 'wifi'],
    concourseWalkMinutes: 6,
    photoKey: 'station.lahore',
  },
  {
    id: 'stn-gujranwala',
    code: 'GRW',
    name: 'Gujranwala',
    nameUrdu: 'گوجرانوالہ',
    city: 'Gujranwala',
    province: 'Punjab',
    coordinate: { lat: 32.1617, lon: 74.1883 },
    line: 'ML-1',
    platforms: 4,
    facilities: ['waiting-room', 'prayer-area', 'tea-stall', 'parking'],
    concourseWalkMinutes: 3,
    photoKey: 'station.lahore',
  },
  {
    id: 'stn-gujrat',
    code: 'GRT',
    name: 'Gujrat',
    nameUrdu: 'گجرات',
    city: 'Gujrat',
    province: 'Punjab',
    coordinate: { lat: 32.574, lon: 74.0754 },
    line: 'ML-1',
    platforms: 3,
    facilities: ['waiting-room', 'prayer-area', 'tea-stall'],
    concourseWalkMinutes: 2,
    photoKey: 'station.lahore',
  },
  {
    id: 'stn-jhelum',
    code: 'JLM',
    name: 'Jhelum',
    nameUrdu: 'جہلم',
    city: 'Jhelum',
    province: 'Punjab',
    coordinate: { lat: 32.933, lon: 73.729 },
    line: 'ML-1',
    platforms: 3,
    facilities: ['waiting-room', 'prayer-area', 'tea-stall', 'parking'],
    concourseWalkMinutes: 3,
    photoKey: 'station.rawalpindi',
  },
  {
    id: 'stn-rwp',
    code: 'RWP',
    name: 'Rawalpindi',
    nameUrdu: 'راولپنڈی',
    city: 'Rawalpindi',
    province: 'Punjab',
    coordinate: { lat: 33.6036, lon: 73.0483 },
    line: 'ML-1',
    platforms: 6,
    facilities: ['waiting-room', 'ladies-waiting-room', 'prayer-area', 'food-court', 'porters', 'parking', 'atm', 'left-luggage', 'retiring-room', 'wheelchair-access'],
    concourseWalkMinutes: 5,
    photoKey: 'station.rawalpindi',
  },
  {
    id: 'stn-isb',
    code: 'ISB',
    name: 'Islamabad Margalla',
    nameUrdu: 'اسلام آباد ۔ مارگلہ',
    city: 'Islamabad',
    province: 'Islamabad',
    coordinate: { lat: 33.6667, lon: 73.05 },
    line: 'ML-1',
    platforms: 3,
    facilities: ['waiting-room', 'prayer-area', 'tea-stall', 'parking', 'wheelchair-access'],
    concourseWalkMinutes: 3,
    photoKey: 'station.islamabad',
  },
  {
    id: 'stn-attock',
    code: 'ATC',
    name: 'Attock City',
    nameUrdu: 'اٹک سٹی',
    city: 'Attock',
    province: 'Punjab',
    coordinate: { lat: 33.768, lon: 72.36 },
    line: 'ML-1',
    platforms: 3,
    facilities: ['waiting-room', 'prayer-area', 'tea-stall'],
    concourseWalkMinutes: 2,
    photoKey: 'city.attock',
  },
  {
    id: 'stn-nowshera',
    code: 'NSH',
    name: 'Nowshera Junction',
    nameUrdu: 'نوشہرہ جنکشن',
    city: 'Nowshera',
    province: 'Khyber Pakhtunkhwa',
    coordinate: { lat: 34.015, lon: 71.98 },
    line: 'ML-1',
    platforms: 3,
    facilities: ['waiting-room', 'prayer-area', 'tea-stall'],
    concourseWalkMinutes: 2,
    photoKey: 'station.peshawar',
  },
  {
    id: 'stn-pew',
    code: 'PWC',
    name: 'Peshawar Cantt',
    nameUrdu: 'پشاور چھاؤنی',
    city: 'Peshawar',
    province: 'Khyber Pakhtunkhwa',
    coordinate: { lat: 34.0027, lon: 71.5423 },
    line: 'ML-1',
    platforms: 5,
    facilities: ['waiting-room', 'ladies-waiting-room', 'prayer-area', 'food-court', 'porters', 'parking', 'retiring-room'],
    concourseWalkMinutes: 4,
    photoKey: 'station.peshawar',
  },
  {
    id: 'stn-quetta',
    code: 'QTA',
    name: 'Quetta',
    nameUrdu: 'کوئٹہ',
    city: 'Quetta',
    province: 'Balochistan',
    coordinate: { lat: 30.1868, lon: 66.9985 },
    line: 'ML-3',
    platforms: 4,
    facilities: ['waiting-room', 'ladies-waiting-room', 'prayer-area', 'tea-stall', 'porters', 'parking', 'retiring-room'],
    concourseWalkMinutes: 4,
    photoKey: 'station.quetta',
  },
  {
    id: 'stn-sibi',
    code: 'SBI',
    name: 'Sibi Junction',
    nameUrdu: 'سبی جنکشن',
    city: 'Sibi',
    province: 'Balochistan',
    coordinate: { lat: 29.547, lon: 67.877 },
    line: 'ML-3',
    platforms: 3,
    facilities: ['waiting-room', 'prayer-area', 'tea-stall'],
    concourseWalkMinutes: 2,
    photoKey: 'station.quetta',
  },
  {
    id: 'stn-jacobabad',
    code: 'JCD',
    name: 'Jacobabad Junction',
    nameUrdu: 'جیکب آباد جنکشن',
    city: 'Jacobabad',
    province: 'Sindh',
    coordinate: { lat: 28.282, lon: 68.438 },
    line: 'ML-3',
    platforms: 3,
    facilities: ['waiting-room', 'prayer-area', 'tea-stall'],
    concourseWalkMinutes: 2,
    photoKey: 'station.rohri',
  },
  {
    id: 'stn-sialkot',
    code: 'SLK',
    name: 'Sialkot Junction',
    nameUrdu: 'سیالکوٹ جنکشن',
    city: 'Sialkot',
    province: 'Punjab',
    coordinate: { lat: 32.494, lon: 74.531 },
    line: 'Branch',
    platforms: 3,
    facilities: ['waiting-room', 'prayer-area', 'tea-stall', 'parking'],
    concourseWalkMinutes: 3,
    photoKey: 'city.sialkot',
  },
  {
    id: 'stn-havelian',
    code: 'HVL',
    name: 'Havelian',
    nameUrdu: 'ہویلیاں',
    city: 'Havelian',
    province: 'Khyber Pakhtunkhwa',
    coordinate: { lat: 34.053, lon: 73.16 },
    line: 'ML-4',
    platforms: 2,
    facilities: ['waiting-room', 'prayer-area', 'tea-stall'],
    concourseWalkMinutes: 2,
    photoKey: 'city.havelian',
  },
  {
    id: 'stn-taxila',
    code: 'TXL',
    name: 'Taxila Cantt',
    nameUrdu: 'ٹیکسلا چھاؤنی',
    city: 'Taxila',
    province: 'Punjab',
    coordinate: { lat: 33.746, lon: 72.818 },
    line: 'ML-1',
    platforms: 3,
    facilities: ['waiting-room', 'prayer-area', 'tea-stall'],
    concourseWalkMinutes: 2,
    photoKey: 'city.attock',
  },
  {
    id: 'stn-kotri',
    code: 'KTR',
    name: 'Kotri Junction',
    nameUrdu: 'کوٹری جنکشن',
    city: 'Kotri',
    province: 'Sindh',
    coordinate: { lat: 25.367, lon: 68.308 },
    line: 'ML-2',
    platforms: 4,
    facilities: ['waiting-room', 'prayer-area', 'tea-stall'],
    concourseWalkMinutes: 3,
    photoKey: 'station.hyderabad',
  },
  {
    id: 'stn-larkana',
    code: 'LRK',
    name: 'Larkana',
    nameUrdu: 'لاڑکانہ',
    city: 'Larkana',
    province: 'Sindh',
    coordinate: { lat: 27.559, lon: 68.212 },
    line: 'ML-2',
    platforms: 3,
    facilities: ['waiting-room', 'prayer-area', 'tea-stall'],
    concourseWalkMinutes: 2,
    photoKey: 'station.rohri',
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

/** Station name, or the id itself, so a missing reference never renders blank. */
export function stationName(id: string): string {
  return byId.get(id)?.name ?? id;
}

export function stationCity(id: string): string {
  return byId.get(id)?.city ?? id;
}

/**
 * Station search. Matches the code exactly first, then the start of the name or
 * city, then anywhere - so typing "LHR" or "lah" both land on Lahore Junction
 * before they land on anything else.
 */
export function searchStations(query: string, limit = 10): Station[] {
  const q = query.trim().toLowerCase();
  if (!q) return STATIONS.slice(0, limit);

  return STATIONS.map((station) => {
    const name = station.name.toLowerCase();
    const city = station.city.toLowerCase();
    const code = station.code.toLowerCase();
    let score = 0;
    if (code === q) score = 100;
    else if (code.startsWith(q)) score = 90;
    else if (city.startsWith(q)) score = 80;
    else if (name.startsWith(q)) score = 75;
    else if (city.includes(q)) score = 50;
    else if (name.includes(q)) score = 45;
    else if (station.nameUrdu.includes(query.trim())) score = 60;
    return { station, score };
  })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.station.name.localeCompare(b.station.name))
    .slice(0, limit)
    .map((entry) => entry.station);
}
