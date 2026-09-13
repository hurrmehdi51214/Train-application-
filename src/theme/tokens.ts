/**
 * Safar design tokens.
 *
 * The structure is Airbnb's, deliberately: a near-monochrome interface carried
 * by one chromatic accent, a 4px spacing grid, soft corners everywhere, and
 * shadows so light they read as depth rather than decoration. That system works
 * because photography does the talking and the chrome gets out of its way.
 *
 * The accent is not Airbnb's Rausch pink. It is the green of the Pakistani
 * flag. Everything chromatic in this product descends from #01411C, the
 * official Pakistan green, lifted to #0E7A3A where it has to survive as an
 * interactive colour on white at 4.5:1.
 *
 * Neutrals are Airbnb's own greys (#222222 / #717171 / #DDDDDD / #F7F7F7).
 * They are borrowed on purpose: those five values are a solved problem for
 * photo-led marketplace UI, and re-deriving them would only make it worse.
 */

export type Mode = 'light' | 'dark';

/* ------------------------------------------------------------------ scales */

/** The flag green, extended into a usable interface ramp. */
export const green = {
  50: '#F1F9F4',
  100: '#E4F3EA',
  200: '#C2E4CF',
  300: '#8FCCAA',
  400: '#4FAC7A',
  500: '#12924A',
  /** Primary interactive. 4.6:1 on white. */
  600: '#0E7A3A',
  700: '#0A5C2C',
  /** Official Pakistan flag green. */
  800: '#01411C',
  900: '#012D14',
} as const;

/** Airbnb's neutral ramp. */
export const neutral = {
  0: '#FFFFFF',
  50: '#F7F7F7',
  100: '#EBEBEB',
  200: '#DDDDDD',
  300: '#C2C2C2',
  400: '#B0B0B0',
  500: '#717171',
  600: '#5E5E5E',
  700: '#3D3D3D',
  800: '#222222',
  900: '#111111',
  1000: '#000000',
} as const;

/**
 * Supporting hues. Used only where meaning demands a second colour - a rating
 * star, a delay, a destructive action. Never for decoration, because the moment
 * a fourth colour appears for fun the whole palette stops meaning anything.
 */
export const accent = {
  /** Truck-art marigold. Ratings, "popular" badges. */
  saffron: '#E0A02C',
  saffronDeep: '#A8710E',
  /** Multani blue pottery. Informational only. */
  indigo: '#1E5C8F',
  /** Delays, warnings. */
  clay: '#B8730B',
  /** Errors and destructive actions. */
  error: '#C13515',
} as const;

/* ---------------------------------------------------------------- palettes */

export interface Palette {
  mode: Mode;
  /** Page background. */
  canvas: string;
  /** Raised surface: cards, sheets, the tab bar. */
  surface: string;
  /** A surface one step forward: nested cards, inputs. */
  surfaceAlt: string;
  /** Quiet fill: chips, skeletons, image placeholders. */
  fill: string;
  /** Hairline borders. Airbnb uses a real 1px #DDDDDD, not an alpha. */
  border: string;
  borderStrong: string;

  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  /** The single chromatic accent. */
  brand: string;
  brandStrong: string;
  brandDeep: string;
  brandSoft: string;
  onBrand: string;
  /** Two stops for the primary-CTA gradient. */
  brandGradient: readonly [string, string];

  star: string;
  warning: string;
  warningSoft: string;
  error: string;
  errorSoft: string;
  info: string;
  infoSoft: string;
  success: string;
  successSoft: string;

  /** Scrim over photography, for text laid directly on an image. */
  scrim: string;
  /** Google Maps styling. */
  mapWater: string;
  mapLand: string;
  mapRoad: string;
  mapRail: string;
}

export const lightPalette: Palette = {
  mode: 'light',
  canvas: neutral[0],
  surface: neutral[0],
  surfaceAlt: neutral[50],
  fill: neutral[50],
  border: neutral[200],
  borderStrong: neutral[300],

  textPrimary: neutral[800],
  textSecondary: neutral[500],
  textTertiary: neutral[400],
  textInverse: neutral[0],

  brand: green[600],
  brandStrong: green[700],
  brandDeep: green[800],
  brandSoft: green[50],
  onBrand: neutral[0],
  brandGradient: [green[600], green[800]],

  star: neutral[800],
  warning: accent.clay,
  warningSoft: '#FDF4E6',
  error: accent.error,
  errorSoft: '#FDF0EC',
  info: accent.indigo,
  infoSoft: '#EDF3F8',
  success: green[600],
  successSoft: green[50],

  scrim: 'rgba(0,0,0,0.36)',
  mapWater: '#CFE3EC',
  mapLand: '#F3F4F1',
  mapRoad: '#FFFFFF',
  mapRail: green[600],
};

export const darkPalette: Palette = {
  mode: 'dark',
  canvas: neutral[1000],
  surface: '#1A1A1A',
  surfaceAlt: '#242424',
  fill: '#2B2B2B',
  border: '#333333',
  borderStrong: '#4A4A4A',

  textPrimary: '#F7F7F7',
  textSecondary: '#A8A8A8',
  textTertiary: '#7A7A7A',
  textInverse: neutral[900],

  brand: green[400],
  brandStrong: green[300],
  brandDeep: green[800],
  brandSoft: 'rgba(79,172,122,0.14)',
  onBrand: neutral[900],
  brandGradient: [green[500], green[700]],

  star: '#F7F7F7',
  warning: '#E0A02C',
  warningSoft: 'rgba(224,160,44,0.16)',
  error: '#FF6B4A',
  errorSoft: 'rgba(255,107,74,0.14)',
  info: '#6FA8D0',
  infoSoft: 'rgba(111,168,208,0.14)',
  success: green[400],
  successSoft: 'rgba(79,172,122,0.14)',

  scrim: 'rgba(0,0,0,0.48)',
  mapWater: '#17313D',
  mapLand: '#1B1B1B',
  mapRoad: '#2A2A2A',
  mapRail: green[400],
};

/* --------------------------------------------------------------- geometry */

/** 4px grid. Airbnb runs denser than most systems because cards carry the page. */
export const space = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  h1: 40,
  h2: 48,
  h3: 64,
} as const;

/** Soft everywhere: 8 on buttons, 12 on images and cards, 24 on sheets. */
export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  pill: 999,
} as const;

export const duration = {
  tap: 90,
  quick: 180,
  base: 260,
  slow: 400,
  page: 520,
  pulse: 1800,
} as const;

/**
 * Spring configs, shared so that every gesture in the product has the same
 * physics. A card that bounces differently from a sheet feels like two apps.
 */
export const spring = {
  /** Press feedback: fast, barely any overshoot. */
  press: { damping: 20, stiffness: 420, mass: 0.6 },
  /** Sheets and drawers. */
  sheet: { damping: 26, stiffness: 240, mass: 0.9 },
  /** Playful: the wishlist heart, the guest stepper. */
  pop: { damping: 11, stiffness: 340, mass: 0.7 },
} as const;

/** Elevation. Airbnb's shadows are lighter than most systems; keep them there. */
export const shadow = {
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  raised: {
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  floating: {
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
  },
  sheet: {
    shadowColor: '#000000',
    shadowOpacity: 0.16,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: -6 },
    elevation: 16,
  },
} as const;

export const zIndex = {
  base: 0,
  sticky: 10,
  header: 20,
  floating: 30,
  sheet: 40,
  toast: 50,
} as const;
