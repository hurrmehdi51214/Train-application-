import type {
  Amenity,
  BerthType,
  Call,
  CoachOffer,
  CrowdingLevel,
  JourneyOption,
  Review,
  TrainService,
  TravelClass,
} from '@/types';
import { chainage, distanceBetween, fareMinor, routeGeometry } from './network';

/**
 * Pakistan Railways services.
 *
 * These are the real trains: real names, real UP/DN numbers, real calling
 * patterns, and journey times matching the operator's published schedule
 * (Green Line 1,518 km in 23h45m, Tezgam 26h40m to Rawalpindi, Khyber Mail
 * ~32h to Peshawar). Times for a given date are generated from the origin
 * departure and distance, so every intermediate call is internally consistent
 * rather than typed out and slowly going wrong.
 *
 * Live delay figures are deterministic per service rather than random, so the
 * same train looks the same on every render within a session. Against the real
 * gateway these come from the operator's control feed instead; see
 * `services/apiClient.ts`.
 */

const MIN = 60_000;

const AMENITIES: Record<TravelClass, Amenity[]> = {
  economy: ['washroom', 'luggage-space', 'tea-service', 'prayer-space'],
  'ac-standard': [
    'air-conditioning',
    'bedding',
    'washroom',
    'luggage-space',
    'reading-light',
    'power-socket',
    'tea-service',
  ],
  'ac-business': [
    'air-conditioning',
    'reclining-seat',
    'meals-included',
    'power-socket',
    'usb-charging',
    'washroom',
    'western-washroom',
    'luggage-space',
    'security-staff',
    'dining-car',
  ],
  parlour: [
    'air-conditioning',
    'reclining-seat',
    'meals-included',
    'power-socket',
    'usb-charging',
    'entertainment',
    'western-washroom',
    'security-staff',
    'privacy-curtain',
  ],
  'ac-sleeper': [
    'air-conditioning',
    'bedding',
    'privacy-curtain',
    'meals-included',
    'power-socket',
    'usb-charging',
    'western-washroom',
    'reading-light',
    'security-staff',
    'luggage-space',
    'dining-car',
  ],
};

const BERTHS: Record<TravelClass, BerthType[]> = {
  economy: ['seat'],
  'ac-standard': ['lower', 'middle', 'upper'],
  'ac-business': ['seat'],
  parlour: ['seat'],
  'ac-sleeper': ['lower', 'upper'],
};

interface StopSpec {
  id: string;
  /** Minutes the train stands. Origin and terminus are 0. */
  halt?: number;
}

interface ClassSpec {
  travelClass: TravelClass;
  coaches: string[];
  capacity: number;
  /** Fraction of capacity already sold, 0..1. */
  sold: number;
}

interface TrainSpec {
  id: string;
  number: string;
  name: string;
  nameUrdu: string;
  line: string;
  stops: StopSpec[];
  /** Local departure from the origin, 24h "HH:MM". */
  departAt: string;
  journeyMinutes: number;
  classes: ClassSpec[];
  /** Premium services price above the standard per-km rate. */
  fareMultiplier: number;
  photoKeys: string[];
  rating: number;
  reviewCount: number;
  reviews: Review[];
  tagline: string;
  about: string;
  featured?: boolean;
  /** Minutes typically late. Pakistan Railways publishes this per service. */
  typicalDelay: number;
  disruption?: { severity: 'info' | 'minor' | 'major'; title: string; detail: string };
}

/* ------------------------------------------------------------ the services */

const SPECS: TrainSpec[] = [
  {
    id: 'svc-green-line',
    number: '5UP',
    name: 'Green Line Express',
    nameUrdu: 'گرین لائن ایکسپریس',
    line: 'ML-1',
    stops: [
      { id: 'stn-khi-cantt' },
      { id: 'stn-hyd', halt: 10 },
      { id: 'stn-rohri', halt: 15 },
      { id: 'stn-bwp', halt: 10 },
      { id: 'stn-khanewal', halt: 10 },
      { id: 'stn-lhr', halt: 20 },
      { id: 'stn-rwp', halt: 10 },
      { id: 'stn-isb' },
    ],
    departAt: '22:00',
    journeyMinutes: 23 * 60 + 45,
    classes: [
      { travelClass: 'parlour', coaches: ['A'], capacity: 48, sold: 0.72 },
      { travelClass: 'ac-business', coaches: ['B', 'C'], capacity: 128, sold: 0.61 },
      { travelClass: 'ac-standard', coaches: ['D', 'E'], capacity: 116, sold: 0.44 },
      { travelClass: 'economy', coaches: ['F', 'G', 'H'], capacity: 264, sold: 0.83 },
    ],
    fareMultiplier: 1.15,
    photoKeys: ['train.express', 'city.islamabad', 'scene.indus', 'train.coach', 'station.karachi-cantt'],
    rating: 4.72,
    reviewCount: 1284,
    tagline: 'The flagship. Karachi to the capital, overnight.',
    about:
      'Pakistan Railways runs no finer train. The Green Line leaves Karachi Cantt at ten at night, crosses the whole length of the country while you sleep, and puts you in Islamabad the following evening. Meals come to the seat in AC Business and Parlour, the bedding is fresh, and it stops only eight times in 1,518 kilometres - which is why it is the one train people book weeks ahead.',
    featured: true,
    typicalDelay: 12,
    reviews: [
      {
        id: 'r-gl-1',
        author: 'Ayesha',
        when: 'August 2026',
        rating: 5,
        travelClass: 'ac-business',
        body: 'Booked Parlour for my mother and AC Business for myself. The attendant came round with dinner just after Hyderabad and breakfast before Bahawalpur, and both were genuinely good. Slept properly. Would not fly this route again.',
      },
      {
        id: 'r-gl-2',
        author: 'Bilal',
        when: 'July 2026',
        rating: 4,
        travelClass: 'ac-standard',
        body: 'AC Standard is excellent value - proper berth, clean bedding, and the coach was quiet by eleven. We ran about twenty minutes late into Rawalpindi, which for this distance I will take.',
      },
      {
        id: 'r-gl-3',
        author: 'Nadia',
        when: 'July 2026',
        rating: 5,
        travelClass: 'parlour',
        body: 'Parlour is the front coach and the windows are enormous. Watching the sun come up over the Cholistan side somewhere past Rahim Yar Khan was the best part of the trip.',
      },
      {
        id: 'r-gl-4',
        author: 'Usman',
        when: 'June 2026',
        rating: 4,
        travelClass: 'economy',
        body: 'Economy on the Green Line is still Economy - it fills right up and stays full. But it is clean, the fans work, and the tea trolley comes through often. For the price it cannot be beaten.',
      },
    ],
  },
  {
    id: 'svc-tezgam',
    number: '7UP',
    name: 'Tezgam',
    nameUrdu: 'تیز گام',
    line: 'ML-1',
    stops: [
      { id: 'stn-khi-cantt' },
      { id: 'stn-hyd', halt: 10 },
      { id: 'stn-nawabshah', halt: 5 },
      { id: 'stn-rohri', halt: 15 },
      { id: 'stn-rykhan', halt: 5 },
      { id: 'stn-bwp', halt: 10 },
      { id: 'stn-mux-cantt', halt: 15 },
      { id: 'stn-khanewal', halt: 5 },
      { id: 'stn-sahiwal', halt: 5 },
      { id: 'stn-lhr', halt: 20 },
      { id: 'stn-gujranwala', halt: 5 },
      { id: 'stn-gujrat', halt: 5 },
      { id: 'stn-jhelum', halt: 5 },
      { id: 'stn-rwp' },
    ],
    departAt: '17:00',
    journeyMinutes: 26 * 60 + 40,
    classes: [
      { travelClass: 'ac-sleeper', coaches: ['A'], capacity: 32, sold: 0.88 },
      { travelClass: 'ac-business', coaches: ['B', 'C'], capacity: 120, sold: 0.66 },
      { travelClass: 'ac-standard', coaches: ['D', 'E'], capacity: 116, sold: 0.55 },
      { travelClass: 'economy', coaches: ['F', 'G', 'H', 'J'], capacity: 352, sold: 0.79 },
    ],
    fareMultiplier: 1,
    photoKeys: ['city.multan', 'train.locomotive', 'scene.desert', 'train.coach', 'station.rawalpindi'],
    rating: 4.41,
    reviewCount: 2107,
    tagline: 'Running since 1953, and still the one everyone knows.',
    about:
      'The Tezgam is the train your grandparents took. It has been working the Karachi-Rawalpindi corridor since 1953, it calls at fourteen stations, and it carries more people up and down this country than almost anything else on rails. AC Sleeper is a proper four-berth cabin with a door. Book it early - there is one coach of it.',
    featured: true,
    typicalDelay: 35,
    disruption: {
      severity: 'minor',
      title: 'Engineering work near Khanewal',
      detail:
        'Track renewal between Khanewal and Sahiwal until the end of the month. Services through the section are running up to 40 minutes late overnight.',
    },
    reviews: [
      {
        id: 'r-tg-1',
        author: 'Farhan',
        when: 'August 2026',
        rating: 5,
        travelClass: 'ac-sleeper',
        body: 'Four berths, a door that locks, and a window I did not want to look away from. Got the cabin to ourselves as a family. This is the way to do Karachi to Pindi.',
      },
      {
        id: 'r-tg-2',
        author: 'Hina',
        when: 'August 2026',
        rating: 4,
        travelClass: 'ac-business',
        body: 'Comfortable and the staff were kind. It is an old train and it feels like one, but in a good way. We were an hour down by Lahore and made some of it back after.',
      },
      {
        id: 'r-tg-3',
        author: 'Kamran',
        when: 'June 2026',
        rating: 3,
        travelClass: 'economy',
        body: 'Economy was packed by Rohri and stayed that way. Fine for a few hours, long for twenty-six. The multan halt is long enough to get down and get proper food, which helps.',
      },
    ],
  },
  {
    id: 'svc-khyber-mail',
    number: '1UP',
    name: 'Khyber Mail',
    nameUrdu: 'خیبر میل',
    line: 'ML-1',
    stops: [
      { id: 'stn-khi-cantt' },
      { id: 'stn-hyd', halt: 10 },
      { id: 'stn-nawabshah', halt: 5 },
      { id: 'stn-rohri', halt: 20 },
      { id: 'stn-rykhan', halt: 10 },
      { id: 'stn-bwp', halt: 10 },
      { id: 'stn-mux-cantt', halt: 15 },
      { id: 'stn-khanewal', halt: 5 },
      { id: 'stn-sahiwal', halt: 5 },
      { id: 'stn-lhr', halt: 25 },
      { id: 'stn-gujranwala', halt: 5 },
      { id: 'stn-jhelum', halt: 5 },
      { id: 'stn-rwp', halt: 15 },
      { id: 'stn-attock', halt: 5 },
      { id: 'stn-nowshera', halt: 5 },
      { id: 'stn-pew' },
    ],
    departAt: '22:00',
    journeyMinutes: 32 * 60,
    classes: [
      { travelClass: 'ac-sleeper', coaches: ['A'], capacity: 32, sold: 0.81 },
      { travelClass: 'ac-business', coaches: ['B'], capacity: 64, sold: 0.58 },
      { travelClass: 'ac-standard', coaches: ['C', 'D'], capacity: 116, sold: 0.49 },
      { travelClass: 'economy', coaches: ['E', 'F', 'G', 'H', 'J'], capacity: 440, sold: 0.74 },
    ],
    fareMultiplier: 0.95,
    photoKeys: ['scene.khyber', 'city.peshawar', 'train.locomotive', 'station.peshawar', 'train.coach'],
    rating: 4.58,
    reviewCount: 1633,
    tagline: 'Karachi to Peshawar. Continuously, since February 1920.',
    about:
      'The oldest named train in the country and the one with the best story. The Khyber Mail has run between Karachi and Peshawar since 1920, through partition and everything after, and it still leaves Karachi Cantt at ten at night. Thirty-two hours, the entire length of ML-1, and a sunrise over the Potohar plateau somewhere around Jhelum that nobody who has seen it forgets.',
    featured: true,
    typicalDelay: 48,
    reviews: [
      {
        id: 'r-km-1',
        author: 'Zubair',
        when: 'July 2026',
        rating: 5,
        travelClass: 'ac-sleeper',
        body: 'Thirty-two hours sounds mad until you do it. You wake up twice, you eat well, you watch the whole country change outside the window from Sindh scrub to Punjab green to the hills. Take a book. Take two.',
      },
      {
        id: 'r-km-2',
        author: 'Sana',
        when: 'May 2026',
        rating: 4,
        travelClass: 'ac-standard',
        body: 'Historic train, and you feel it. Ours was about an hour late into Peshawar which is apparently normal. The bedding was clean and the attendant checked on us twice in the night.',
      },
      {
        id: 'r-km-3',
        author: 'Imran',
        when: 'April 2026',
        rating: 5,
        travelClass: 'ac-business',
        body: 'Did Lahore to Peshawar on this rather than the full run. Crossing the Indus at Attock just after dawn is worth the ticket on its own.',
      },
    ],
  },
  {
    id: 'svc-karakoram',
    number: '41UP',
    name: 'Karakoram Express',
    nameUrdu: 'قراقرم ایکسپریس',
    line: 'ML-1',
    stops: [
      { id: 'stn-khi-cantt' },
      { id: 'stn-hyd', halt: 8 },
      { id: 'stn-rohri', halt: 15 },
      { id: 'stn-rykhan', halt: 5 },
      { id: 'stn-bwp', halt: 8 },
      { id: 'stn-mux-cantt', halt: 12 },
      { id: 'stn-khanewal', halt: 5 },
      { id: 'stn-sahiwal', halt: 5 },
      { id: 'stn-lhr' },
    ],
    departAt: '15:00',
    journeyMinutes: 17 * 60 + 30,
    classes: [
      { travelClass: 'ac-sleeper', coaches: ['A'], capacity: 32, sold: 0.76 },
      { travelClass: 'ac-business', coaches: ['B', 'C'], capacity: 120, sold: 0.52 },
      { travelClass: 'ac-standard', coaches: ['D'], capacity: 58, sold: 0.4 },
      { travelClass: 'economy', coaches: ['E', 'F', 'G'], capacity: 264, sold: 0.69 },
    ],
    fareMultiplier: 1.05,
    photoKeys: ['city.lahore', 'train.express', 'city.bahawalpur', 'station.lahore', 'train.coach'],
    rating: 4.49,
    reviewCount: 1871,
    tagline: 'The fast one to Lahore. Seventeen and a half hours, door to door.',
    about:
      'If you want Karachi to Lahore and you want it over with, this is the train. The Karakoram skips most of the small stops, keeps a genuinely quick average, and arrives into Lahore Junction in the morning with the day still ahead of you. AC Business here is the sweet spot: reclining seats, meals included, and about half the price of flying once you count getting to the airport.',
    featured: true,
    typicalDelay: 18,
    reviews: [
      {
        id: 'r-kk-1',
        author: 'Maria',
        when: 'August 2026',
        rating: 5,
        travelClass: 'ac-business',
        body: 'Left Karachi at three, had dinner, slept, woke up outside Sahiwal, into Lahore before nine. Genuinely the most civilised way to do this journey.',
      },
      {
        id: 'r-kk-2',
        author: 'Danish',
        when: 'June 2026',
        rating: 4,
        travelClass: 'ac-standard',
        body: 'Only one AC Standard coach so book early. Ran ten minutes late, nobody minded.',
      },
    ],
  },
  {
    id: 'svc-jaffar',
    number: '27UP',
    name: 'Jaffar Express',
    nameUrdu: 'جعفر ایکسپریس',
    line: 'ML-3',
    stops: [
      { id: 'stn-quetta' },
      { id: 'stn-sibi', halt: 15 },
      { id: 'stn-jacobabad', halt: 10 },
      { id: 'stn-rohri', halt: 25 },
      { id: 'stn-rykhan', halt: 5 },
      { id: 'stn-bwp', halt: 10 },
      { id: 'stn-mux-cantt', halt: 15 },
      { id: 'stn-khanewal', halt: 5 },
      { id: 'stn-lhr', halt: 25 },
      { id: 'stn-gujranwala', halt: 5 },
      { id: 'stn-jhelum', halt: 5 },
      { id: 'stn-rwp', halt: 15 },
      { id: 'stn-attock', halt: 5 },
      { id: 'stn-pew' },
    ],
    departAt: '09:00',
    journeyMinutes: 34 * 60,
    classes: [
      { travelClass: 'ac-sleeper', coaches: ['A'], capacity: 24, sold: 0.63 },
      { travelClass: 'ac-business', coaches: ['B'], capacity: 60, sold: 0.47 },
      { travelClass: 'ac-standard', coaches: ['C'], capacity: 58, sold: 0.38 },
      { travelClass: 'economy', coaches: ['D', 'E', 'F', 'G'], capacity: 352, sold: 0.71 },
    ],
    fareMultiplier: 1,
    photoKeys: ['scene.bolan', 'city.quetta', 'station.quetta', 'train.track', 'scene.khyber'],
    rating: 4.66,
    reviewCount: 742,
    tagline: 'Down the Bolan Pass. The most spectacular line in the country.',
    about:
      'Between Quetta and Sibi the Jaffar drops nearly 1,500 metres through the Bolan Pass on a line the British spent a fortune and a great many lives building. Tunnels, gorges, switchback gradients, and scenery that does not look like anywhere else in Pakistan. Sit on the left coming down. The rest of the run to Peshawar is a long haul across the plains, but those first four hours are the reason to be on this train.',
    featured: true,
    typicalDelay: 55,
    reviews: [
      {
        id: 'r-jf-1',
        author: 'Shahzad',
        when: 'July 2026',
        rating: 5,
        travelClass: 'ac-business',
        body: 'I have taken trains on four continents and the Bolan descent is in the top three things I have seen from a train window. Bring water, it gets hot once you are down on the plain.',
      },
      {
        id: 'r-jf-2',
        author: 'Rabia',
        when: 'March 2026',
        rating: 4,
        travelClass: 'ac-sleeper',
        body: 'Long journey, but the sleeper made it easy and the Quetta end is beautiful. Departed about forty minutes late which seems to be the norm here.',
      },
    ],
  },
  {
    id: 'svc-bolan-mail',
    number: '3UP',
    name: 'Bolan Mail',
    nameUrdu: 'بولان میل',
    line: 'ML-3',
    stops: [
      { id: 'stn-khi-city' },
      { id: 'stn-hyd', halt: 10 },
      { id: 'stn-rohri', halt: 20 },
      { id: 'stn-jacobabad', halt: 10 },
      { id: 'stn-sibi', halt: 15 },
      { id: 'stn-quetta' },
    ],
    departAt: '11:00',
    journeyMinutes: 23 * 60 + 30,
    classes: [
      { travelClass: 'ac-sleeper', coaches: ['A'], capacity: 24, sold: 0.52 },
      { travelClass: 'ac-standard', coaches: ['B'], capacity: 58, sold: 0.41 },
      { travelClass: 'economy', coaches: ['C', 'D', 'E', 'F'], capacity: 352, sold: 0.64 },
    ],
    fareMultiplier: 0.95,
    photoKeys: ['city.quetta', 'scene.bolan', 'scene.indus', 'station.quetta', 'train.coach'],
    rating: 4.24,
    reviewCount: 486,
    tagline: 'Karachi to Quetta the slow way, through the Bolan.',
    about:
      'The Bolan Mail has connected Karachi to Quetta since 1948. It is not fast and it does not pretend to be. What it does is climb the Bolan Pass in daylight on the up run, which the overnight services do not, and arrive in Quetta with the mountains lit.',
    typicalDelay: 40,
    reviews: [
      {
        id: 'r-bm-1',
        author: 'Aslam',
        when: 'May 2026',
        rating: 4,
        travelClass: 'ac-standard',
        body: 'Good value and the climb into Balochistan is the whole point. Take a jacket, Quetta is a different climate entirely.',
      },
    ],
  },
  {
    id: 'svc-karachi-express',
    number: '15UP',
    name: 'Karachi Express',
    nameUrdu: 'کراچی ایکسپریس',
    line: 'ML-1',
    stops: [
      { id: 'stn-khi-city' },
      { id: 'stn-hyd', halt: 10 },
      { id: 'stn-nawabshah', halt: 5 },
      { id: 'stn-rohri', halt: 15 },
      { id: 'stn-rykhan', halt: 5 },
      { id: 'stn-bwp', halt: 8 },
      { id: 'stn-mux-cantt', halt: 12 },
      { id: 'stn-khanewal', halt: 5 },
      { id: 'stn-sahiwal', halt: 5 },
      { id: 'stn-lhr' },
    ],
    departAt: '20:00',
    journeyMinutes: 18 * 60 + 30,
    classes: [
      { travelClass: 'ac-sleeper', coaches: ['A'], capacity: 32, sold: 0.7 },
      { travelClass: 'ac-business', coaches: ['B', 'C'], capacity: 120, sold: 0.57 },
      { travelClass: 'ac-standard', coaches: ['D'], capacity: 58, sold: 0.45 },
      { travelClass: 'economy', coaches: ['E', 'F', 'G', 'H'], capacity: 352, sold: 0.81 },
    ],
    fareMultiplier: 1,
    photoKeys: ['city.sukkur', 'city.lahore', 'train.express', 'station.lahore', 'train.coach'],
    rating: 4.35,
    reviewCount: 2540,
    tagline: 'Overnight to Lahore. In service since 1943.',
    about:
      'Leaves Karachi City at eight in the evening and puts you in Lahore in time for a late breakfast. The workhorse of this corridor: not the fastest, not the newest, but it runs every single day and it gets you there.',
    typicalDelay: 25,
    reviews: [
      {
        id: 'r-ke-1',
        author: 'Junaid',
        when: 'August 2026',
        rating: 4,
        travelClass: 'ac-business',
        body: 'Do this three or four times a year for work. Reliable, comfortable enough, and I get a full night. The catering has improved a lot in the last year.',
      },
      {
        id: 'r-ke-2',
        author: 'Tahira',
        when: 'July 2026',
        rating: 5,
        travelClass: 'ac-sleeper',
        body: 'Travelled alone and felt completely safe - the sleeper door locks and there is a conductor on the coach all night.',
      },
    ],
  },
  {
    id: 'svc-hazara',
    number: '11UP',
    name: 'Hazara Express',
    nameUrdu: 'ہزارہ ایکسپریس',
    line: 'ML-4',
    stops: [
      { id: 'stn-khi-city' },
      { id: 'stn-hyd', halt: 10 },
      { id: 'stn-rohri', halt: 20 },
      { id: 'stn-bwp', halt: 10 },
      { id: 'stn-mux-cantt', halt: 15 },
      { id: 'stn-lhr', halt: 25 },
      { id: 'stn-gujranwala', halt: 5 },
      { id: 'stn-jhelum', halt: 5 },
      { id: 'stn-rwp', halt: 15 },
      { id: 'stn-taxila', halt: 10 },
      { id: 'stn-havelian' },
    ],
    departAt: '07:00',
    journeyMinutes: 31 * 60,
    classes: [
      { travelClass: 'ac-business', coaches: ['A'], capacity: 60, sold: 0.5 },
      { travelClass: 'ac-standard', coaches: ['B'], capacity: 58, sold: 0.43 },
      { travelClass: 'economy', coaches: ['C', 'D', 'E', 'F'], capacity: 352, sold: 0.72 },
    ],
    fareMultiplier: 0.95,
    photoKeys: ['city.havelian', 'scene.northern', 'city.attock', 'train.coach', 'station.rawalpindi'],
    rating: 4.3,
    reviewCount: 612,
    tagline: 'The only train that gets you to the foot of the Karakoram Highway.',
    about:
      'Havelian is where the rails stop and the mountains start. Take this for Abbottabad, the Kaghan valley, or to pick up the Karakoram Highway north. It is a long run from Karachi, but from Rawalpindi it is a comfortable few hours into the hills.',
    typicalDelay: 30,
    reviews: [
      {
        id: 'r-hz-1',
        author: 'Fawad',
        when: 'June 2026',
        rating: 5,
        travelClass: 'ac-business',
        body: 'Took it from Pindi to Havelian on the way up to Naran. The Taxila to Havelian stretch is lovely and it saved a miserable drive.',
      },
    ],
  },
  {
    id: 'svc-awam',
    number: '13UP',
    name: 'Awam Express',
    nameUrdu: 'عوام ایکسپریس',
    line: 'ML-1',
    stops: [
      { id: 'stn-khi-cantt' },
      { id: 'stn-hyd', halt: 10 },
      { id: 'stn-nawabshah', halt: 5 },
      { id: 'stn-rohri', halt: 20 },
      { id: 'stn-rykhan', halt: 8 },
      { id: 'stn-bwp', halt: 10 },
      { id: 'stn-mux-cantt', halt: 15 },
      { id: 'stn-khanewal', halt: 5 },
      { id: 'stn-sahiwal', halt: 5 },
      { id: 'stn-lhr', halt: 25 },
      { id: 'stn-gujranwala', halt: 5 },
      { id: 'stn-jhelum', halt: 5 },
      { id: 'stn-rwp', halt: 15 },
      { id: 'stn-nowshera', halt: 5 },
      { id: 'stn-pew' },
    ],
    departAt: '06:30',
    journeyMinutes: 33 * 60 + 30,
    classes: [
      { travelClass: 'ac-standard', coaches: ['A'], capacity: 58, sold: 0.36 },
      { travelClass: 'economy', coaches: ['B', 'C', 'D', 'E', 'F', 'G'], capacity: 528, sold: 0.86 },
    ],
    fareMultiplier: 0.9,
    photoKeys: ['city.peshawar', 'train.track', 'city.rawalpindi', 'station.peshawar', 'train.express'],
    rating: 3.98,
    reviewCount: 1105,
    tagline: 'The people’s train. Cheapest way from Karachi to Peshawar.',
    about:
      'Awam means "the people", and that is exactly who this train is for. Almost all Economy, stops nearly everywhere, and costs a fraction of the premium services. Slow and crowded, but it is the train that actually connects this country.',
    typicalDelay: 65,
    reviews: [
      {
        id: 'r-aw-1',
        author: 'Sajid',
        when: 'July 2026',
        rating: 4,
        travelClass: 'economy',
        body: 'You get what you pay for and what you pay is very little. Go for a lower berth if you can and bring your own food.',
      },
      {
        id: 'r-aw-2',
        author: 'Noreen',
        when: 'May 2026',
        rating: 3,
        travelClass: 'ac-standard',
        body: 'The one AC Standard coach is a haven. Train was two hours late but honestly I expected worse.',
      },
    ],
  },
  {
    id: 'svc-allama-iqbal',
    number: '9UP',
    name: 'Allama Iqbal Express',
    nameUrdu: 'علامہ اقبال ایکسپریس',
    line: 'ML-1',
    stops: [
      { id: 'stn-khi-cantt' },
      { id: 'stn-hyd', halt: 10 },
      { id: 'stn-rohri', halt: 20 },
      { id: 'stn-bwp', halt: 10 },
      { id: 'stn-mux-cantt', halt: 15 },
      { id: 'stn-khanewal', halt: 5 },
      { id: 'stn-lhr', halt: 25 },
      { id: 'stn-gujranwala', halt: 8 },
      { id: 'stn-sialkot' },
    ],
    departAt: '05:00',
    journeyMinutes: 24 * 60 + 30,
    classes: [
      { travelClass: 'ac-business', coaches: ['A'], capacity: 60, sold: 0.44 },
      { travelClass: 'ac-standard', coaches: ['B'], capacity: 58, sold: 0.39 },
      { travelClass: 'economy', coaches: ['C', 'D', 'E', 'F'], capacity: 352, sold: 0.68 },
    ],
    fareMultiplier: 0.95,
    photoKeys: ['city.sialkot', 'city.lahore', 'train.express', 'train.coach', 'station.lahore'],
    rating: 4.12,
    reviewCount: 538,
    tagline: 'Karachi through to Sialkot, running since 1940.',
    about:
      'One of the few services that carries straight through to Sialkot rather than making you change at Lahore or Wazirabad. Useful if you are heading for Gujrat, Sialkot or across to Azad Kashmir.',
    typicalDelay: 38,
    reviews: [
      {
        id: 'r-ai-1',
        author: 'Waqas',
        when: 'April 2026',
        rating: 4,
        travelClass: 'ac-business',
        body: 'Straight through to Sialkot without changing is worth a lot. Comfortable coach, decent food at Multan.',
      },
    ],
  },
  {
    id: 'svc-pakistan-express',
    number: '45UP',
    name: 'Pakistan Express',
    nameUrdu: 'پاکستان ایکسپریس',
    line: 'ML-1',
    stops: [
      { id: 'stn-khi-city' },
      { id: 'stn-hyd', halt: 10 },
      { id: 'stn-nawabshah', halt: 5 },
      { id: 'stn-rohri', halt: 20 },
      { id: 'stn-rykhan', halt: 8 },
      { id: 'stn-bwp', halt: 10 },
      { id: 'stn-mux-cantt', halt: 15 },
      { id: 'stn-khanewal', halt: 5 },
      { id: 'stn-sahiwal', halt: 5 },
      { id: 'stn-lhr', halt: 25 },
      { id: 'stn-gujranwala', halt: 5 },
      { id: 'stn-jhelum', halt: 5 },
      { id: 'stn-rwp' },
    ],
    departAt: '13:30',
    journeyMinutes: 29 * 60,
    classes: [
      { travelClass: 'ac-business', coaches: ['A'], capacity: 60, sold: 0.48 },
      { travelClass: 'ac-standard', coaches: ['B', 'C'], capacity: 116, sold: 0.42 },
      { travelClass: 'economy', coaches: ['D', 'E', 'F', 'G', 'H'], capacity: 440, sold: 0.77 },
    ],
    fareMultiplier: 0.92,
    photoKeys: ['city.rawalpindi', 'scene.indus', 'train.express', 'station.rawalpindi', 'train.coach'],
    rating: 4.05,
    reviewCount: 897,
    tagline: 'Karachi to Rawalpindi, calling everywhere that matters.',
    about:
      'A solid, unglamorous long-distance service with a good spread of stops. If the Green Line and the Tezgam are sold out, this is the next train you should look at.',
    typicalDelay: 45,
    reviews: [
      {
        id: 'r-pe-1',
        author: 'Adeel',
        when: 'June 2026',
        rating: 4,
        travelClass: 'ac-standard',
        body: 'Two AC Standard coaches so there is usually space. Nothing fancy, does the job.',
      },
    ],
  },
  {
    id: 'svc-millat',
    number: '17UP',
    name: 'Millat Express',
    nameUrdu: 'ملت ایکسپریس',
    line: 'ML-1',
    stops: [
      { id: 'stn-khi-cantt' },
      { id: 'stn-hyd', halt: 10 },
      { id: 'stn-rohri', halt: 20 },
      { id: 'stn-bwp', halt: 10 },
      { id: 'stn-mux-cantt', halt: 15 },
      { id: 'stn-khanewal', halt: 8 },
      { id: 'stn-fsd' },
    ],
    departAt: '19:30',
    journeyMinutes: 21 * 60,
    classes: [
      { travelClass: 'ac-business', coaches: ['A'], capacity: 60, sold: 0.41 },
      { travelClass: 'ac-standard', coaches: ['B'], capacity: 58, sold: 0.35 },
      { travelClass: 'economy', coaches: ['C', 'D', 'E'], capacity: 264, sold: 0.7 },
    ],
    fareMultiplier: 0.95,
    photoKeys: ['city.faisalabad', 'city.khanewal', 'train.express', 'train.coach', 'city.multan'],
    rating: 4.02,
    reviewCount: 421,
    tagline: 'The direct run to Faisalabad.',
    about:
      'Faisalabad is not on the main line, so getting there from the south usually means changing at Khanewal or Lahore. The Millat runs straight through, which saves a couple of hours and a lot of standing about.',
    typicalDelay: 30,
    reviews: [
      {
        id: 'r-ml-1',
        author: 'Shazia',
        when: 'May 2026',
        rating: 4,
        travelClass: 'ac-business',
        body: 'Direct to Faisalabad without changing at Khanewal is the whole reason to take this. Clean and on time for us.',
      },
    ],
  },
];

/* ---------------------------------------------------------------- builders */

/** Deterministic 0..1 value from a string, so a coach looks the same all session. */
function hash01(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

function crowdingFor(sold: number): CrowdingLevel {
  if (sold >= 0.92) return 'full';
  if (sold >= 0.75) return 'busy';
  if (sold >= 0.45) return 'moderate';
  if (sold >= 0.2) return 'light';
  return 'empty';
}

/** Local midnight for a yyyy-mm-dd date string. */
function startOfDay(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0).getTime();
}

export function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function buildCalls(spec: TrainSpec, date: string): Call[] {
  const [hh, mm] = spec.departAt.split(':').map(Number);
  const originEpoch = startOfDay(date) + (hh! * 60 + mm!) * MIN;

  const totalHalts = spec.stops.reduce((sum, stop) => sum + (stop.halt ?? 0), 0);
  const runningMinutes = Math.max(1, spec.journeyMinutes - totalHalts);

  const originKm = chainage(spec.stops[0]!.id);
  const totalKm = Math.abs(chainage(spec.stops[spec.stops.length - 1]!.id) - originKm) || 1;

  const now = Date.now();
  let haltsSoFar = 0;

  return spec.stops.map((stop, index) => {
    const isFirst = index === 0;
    const isLast = index === spec.stops.length - 1;
    const halt = isFirst || isLast ? 0 : (stop.halt ?? 0);

    const km = Math.abs(chainage(stop.id) - originKm);
    const arriveOffset = (runningMinutes * km) / totalKm + haltsSoFar;
    const departOffset = arriveOffset + halt;
    haltsSoFar += halt;

    // Delay accumulates down the route rather than appearing all at once.
    const delay = Math.round(spec.typicalDelay * (0.35 + 0.65 * (km / totalKm)));

    const scheduledArrival = isFirst ? null : new Date(originEpoch + arriveOffset * MIN).toISOString();
    const scheduledDeparture = isLast ? null : new Date(originEpoch + departOffset * MIN).toISOString();
    const expectedArrival = isFirst ? null : new Date(originEpoch + (arriveOffset + delay) * MIN).toISOString();
    const expectedDeparture = isLast ? null : new Date(originEpoch + (departOffset + delay) * MIN).toISOString();

    const arriveAt = new Date(expectedArrival ?? expectedDeparture ?? '').getTime();
    const departAt = new Date(expectedDeparture ?? expectedArrival ?? '').getTime();

    let status: Call['status'] = 'scheduled';
    if (now >= departAt) status = isLast ? 'arrived' : 'departed';
    else if (now >= arriveAt) status = 'arrived';
    else if (arriveAt - now <= 10 * MIN) status = 'approaching';

    // Platforms are assigned by the station and are a forecast until about an
    // hour out, which is exactly how the departure boards behave.
    const platformSeed = hash01(`${spec.id}:${stop.id}`);
    const platformCount = Math.max(2, Math.round(2 + platformSeed * 6));
    const platform = String(1 + Math.floor(platformSeed * platformCount));

    return {
      stationId: stop.id,
      sequence: index,
      distanceKm: Math.round(km),
      scheduledArrival,
      scheduledDeparture,
      expectedArrival,
      expectedDeparture,
      platform,
      platformConfirmed: arriveAt - now < 60 * MIN,
      status,
      delayMinutes: delay,
      haltMinutes: halt,
    } satisfies Call;
  });
}

function buildOffers(spec: TrainSpec, fromId: string, toId: string): CoachOffer[] {
  const km = distanceBetween(fromId, toId) || distanceBetween(spec.stops[0]!.id, spec.stops[spec.stops.length - 1]!.id);
  return spec.classes.map((cls) => {
    const available = Math.max(0, Math.round(cls.capacity * (1 - cls.sold)));
    return {
      travelClass: cls.travelClass,
      coaches: cls.coaches,
      berths: BERTHS[cls.travelClass],
      amenities: AMENITIES[cls.travelClass],
      available,
      capacity: cls.capacity,
      crowding: crowdingFor(cls.sold),
      fareMinor: fareMinor(km, cls.travelClass, spec.fareMultiplier),
    };
  });
}

function buildService(spec: TrainSpec, date: string): TrainService {
  const stops = spec.stops.map((s) => s.id);
  return {
    id: spec.id,
    number: spec.number,
    name: spec.name,
    nameUrdu: spec.nameUrdu,
    operator: 'Pakistan Railways',
    line: spec.line,
    originStationId: stops[0]!,
    destinationStationId: stops[stops.length - 1]!,
    calls: buildCalls(spec, date),
    offers: buildOffers(spec, stops[0]!, stops[stops.length - 1]!),
    photoKeys: spec.photoKeys,
    rating: spec.rating,
    reviewCount: spec.reviewCount,
    reviews: spec.reviews,
    disruptions: spec.disruption
      ? [
          {
            id: `${spec.id}-disruption`,
            severity: spec.disruption.severity,
            title: spec.disruption.title,
            detail: spec.disruption.detail,
            issuedAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
          },
        ]
      : [],
    tagline: spec.tagline,
    about: spec.about,
    runsOn: [],
    cancelled: false,
    featured: Boolean(spec.featured),
  };
}

export function allServices(date = todayIso()): TrainService[] {
  return SPECS.map((spec) => buildService(spec, date));
}

export function getService(id: string, date = todayIso()): TrainService | undefined {
  const spec = SPECS.find((s) => s.id === id);
  return spec ? buildService(spec, date) : undefined;
}

export function serviceGeometry(service: TrainService) {
  return routeGeometry(service.calls.map((c) => c.stationId));
}

/* ----------------------------------------------------------------- search */

/**
 * Journeys between two stations on a date. A train qualifies if it calls at
 * both, in the right order; the fare is then recomputed for that leg rather
 * than for the train's whole run, which is the difference between quoting
 * Karachi-Hyderabad and quoting Karachi-Peshawar.
 */
export function searchJourneys(
  originId: string,
  destinationId: string,
  date = todayIso(),
): JourneyOption[] {
  if (!originId || !destinationId || originId === destinationId) return [];

  return SPECS.map((spec) => {
    const service = buildService(spec, date);
    const from = service.calls.find((c) => c.stationId === originId);
    const to = service.calls.find((c) => c.stationId === destinationId);
    if (!from || !to || to.sequence <= from.sequence) return null;

    const departure = from.expectedDeparture ?? from.scheduledDeparture;
    const arrival = to.expectedArrival ?? to.scheduledArrival;
    if (!departure || !arrival) return null;

    const durationMinutes = Math.round(
      (new Date(arrival).getTime() - new Date(departure).getTime()) / MIN,
    );

    return {
      id: `${spec.id}:${originId}:${destinationId}:${date}`,
      serviceId: spec.id,
      originStationId: originId,
      destinationStationId: destinationId,
      departure,
      arrival,
      durationMinutes,
      distanceKm: Math.abs(to.distanceKm - from.distanceKm),
      platform: from.platform,
      offers: buildOffers(spec, originId, destinationId),
      rating: spec.rating,
      reviewCount: spec.reviewCount,
      // Anything crossing a local midnight is a night on board.
      nightsOnBoard: Math.max(
        0,
        new Date(arrival).getDate() !== new Date(departure).getDate()
          ? Math.round(durationMinutes / (24 * 60)) || 1
          : 0,
      ),
    } satisfies JourneyOption;
  })
    .filter((option): option is JourneyOption => option !== null)
    .sort((a, b) => new Date(a.departure).getTime() - new Date(b.departure).getTime());
}

export function getJourneyOption(id: string): JourneyOption | undefined {
  const [serviceId, originId, destinationId, date] = id.split(':');
  if (!serviceId || !originId || !destinationId) return undefined;
  return searchJourneys(originId, destinationId, date || todayIso()).find((o) => o.id === id);
}

/** Every station pair this network can actually sell, for the search suggester. */
export function servedStationIds(): string[] {
  return Array.from(new Set(SPECS.flatMap((s) => s.stops.map((stop) => stop.id))));
}
