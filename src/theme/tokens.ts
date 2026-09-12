/**
 * Meridian Rail design tokens.
 *
 * The palette is deliberately narrow: one deep petrol-green that carries the
 * brand, one warm brass that carries attention, and a long neutral ramp that
 * does all the structural work. Everything else is derived. Keeping the set
 * small is what stops a product from looking assembled out of a template.
 */

export type Mode = 'light' | 'dark';

const ramp = {
  ink900: '#07110F',
  ink800: '#0B1A22',
  ink700: '#11242C',
  ink600: '#1A3038',
  ink500: '#2B4048',
  slate500: '#5B6B72',
  slate400: '#7A8A90',
  slate300: '#9BA9AE',
  mist200: '#D7DFE1',
  mist100: '#E9EFF0',
  paper50: '#F6F9F9',
  white: '#FFFFFF',
} as const;

const brand = {
  /** Deep petrol green - the signature. Used for rails, primary actions, focus. */
  petrol: '#0F5D5A',
  petrolLift: '#17857F',
  petrolDeep: '#0A403E',
  /** Warm brass - delays, live status, anything that must be looked at. */
  brass: '#C88A34',
  brassLift: '#E0A34E',
  /** Semantics */
  success: '#1E7F4F',
  warning: '#C88A34',
  critical: '#B33A30',
  info: '#2F6C8F',
} as const;

export interface Palette {
  mode: Mode;
  /** Page background, furthest back. */
  canvas: string;
  /** Raised surface (cards, sheets). */
  surface: string;
  /** Surface one step further forward (nested cards, inputs). */
  surfaceRaised: string;
  /** Quiet fill for chips and inert rows. */
  surfaceSunken: string;
  hairline: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  brand: string;
  brandLift: string;
  brandDeep: string;
  onBrand: string;
  accent: string;
  accentSoft: string;
  success: string;
  warning: string;
  critical: string;
  info: string;
  /** Tint used behind status pills, 12–16% of the parent hue. */
  successSoft: string;
  warningSoft: string;
  criticalSoft: string;
  infoSoft: string;
  /** Map-specific */
  mapLand: string;
  mapWater: string;
  mapRoad: string;
  mapRail: string;
}

export const lightPalette: Palette = {
  mode: 'light',
  canvas: ramp.paper50,
  surface: ramp.white,
  surfaceRaised: ramp.white,
  surfaceSunken: ramp.mist100,
  hairline: 'rgba(11, 26, 34, 0.10)',
  textPrimary: ramp.ink800,
  textSecondary: ramp.slate500,
  textTertiary: ramp.slate400,
  textInverse: ramp.white,
  brand: brand.petrol,
  brandLift: brand.petrolLift,
  brandDeep: brand.petrolDeep,
  onBrand: ramp.white,
  accent: brand.brass,
  accentSoft: 'rgba(200, 138, 52, 0.14)',
  success: brand.success,
  warning: brand.warning,
  critical: brand.critical,
  info: brand.info,
  successSoft: 'rgba(30, 127, 79, 0.12)',
  warningSoft: 'rgba(200, 138, 52, 0.14)',
  criticalSoft: 'rgba(179, 58, 48, 0.12)',
  infoSoft: 'rgba(47, 108, 143, 0.12)',
  mapLand: '#EDF2F1',
  mapWater: '#D6E6EA',
  mapRoad: '#FFFFFF',
  mapRail: '#0F5D5A',
};

export const darkPalette: Palette = {
  mode: 'dark',
  canvas: ramp.ink900,
  surface: ramp.ink800,
  surfaceRaised: ramp.ink700,
  surfaceSunken: ramp.ink600,
  hairline: 'rgba(233, 239, 240, 0.12)',
  textPrimary: '#EDF3F3',
  textSecondary: ramp.slate300,
  textTertiary: ramp.slate400,
  textInverse: ramp.ink900,
  brand: '#2E9A92',
  brandLift: '#45B5AC',
  brandDeep: '#0A403E',
  onBrand: ramp.ink900,
  accent: brand.brassLift,
  accentSoft: 'rgba(224, 163, 78, 0.18)',
  success: '#3EA877',
  warning: brand.brassLift,
  critical: '#D86055',
  info: '#5C9CC0',
  successSoft: 'rgba(62, 168, 119, 0.16)',
  warningSoft: 'rgba(224, 163, 78, 0.16)',
  criticalSoft: 'rgba(216, 96, 85, 0.16)',
  infoSoft: 'rgba(92, 156, 192, 0.16)',
  mapLand: '#0E1C23',
  mapWater: '#102A33',
  mapRoad: '#17303A',
  mapRail: '#45B5AC',
};

/** 4pt base, with a couple of odd values that exist because the eye wants them. */
export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  h1: 32,
  h2: 40,
  h3: 56,
} as const;

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const duration = {
  instant: 120,
  quick: 200,
  settle: 320,
  drift: 620,
  pulse: 1600,
} as const;

export const zIndex = {
  base: 0,
  raised: 10,
  sticky: 100,
  sheet: 200,
  toast: 300,
} as const;

export const ramps = ramp;
export const brandColors = brand;
