import { TextStyle } from 'react-native';

/**
 * Type.
 *
 * Airbnb sets everything in Cereal, a bespoke geometric-humanist sans by Dalton
 * Maag. It is licensed only to Airbnb, so this uses Manrope - the closest freely
 * licensed face in the same genus: geometric skeleton, humanist detailing, tall
 * x-height, and the round single-storey shapes that make Cereal feel friendly
 * rather than corporate.
 *
 * One family, six weights, no serif anywhere. Hierarchy comes from weight and
 * size only, which is what keeps a photo-led interface calm. The scale below is
 * Airbnb's own: 14/400 body, 16/500 UI labels, and headings stepping through
 * 18, 20, 22, 26 and 32.
 */

export const fontFamily = {
  extraLight: 'Manrope_200ExtraLight',
  light: 'Manrope_300Light',
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extraBold: 'Manrope_800ExtraBold',
} as const;

/**
 * On web the bundled font may not have painted on first frame, so every style
 * carries a real fallback stack rather than letting the browser drop to Times.
 */
const webStack = ', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

const face = (name: string) => ({ fontFamily: name + (typeof document === 'undefined' ? '' : webStack) });

export type TypeVariant =
  | 'hero'
  | 'display'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'bodyLarge'
  | 'label'
  | 'body'
  | 'bodyMedium'
  | 'caption'
  | 'captionMedium'
  | 'overline'
  | 'price';

export const type: Record<TypeVariant, TextStyle> = {
  /** Onboarding and empty-state headlines only. */
  hero: { ...face(fontFamily.extraBold), fontSize: 32, lineHeight: 38, letterSpacing: -0.8 },
  /** Page titles. */
  display: { ...face(fontFamily.extraBold), fontSize: 26, lineHeight: 32, letterSpacing: -0.6 },
  /** Section titles, listing names. */
  title: { ...face(fontFamily.bold), fontSize: 22, lineHeight: 28, letterSpacing: -0.4 },
  heading: { ...face(fontFamily.bold), fontSize: 20, lineHeight: 26, letterSpacing: -0.3 },
  subheading: { ...face(fontFamily.semibold), fontSize: 17, lineHeight: 23, letterSpacing: -0.2 },
  /** Long-form reading. */
  bodyLarge: { ...face(fontFamily.regular), fontSize: 16, lineHeight: 24, letterSpacing: -0.1 },
  /** Buttons, tabs, form labels. */
  label: { ...face(fontFamily.semibold), fontSize: 16, lineHeight: 22, letterSpacing: -0.1 },
  body: { ...face(fontFamily.regular), fontSize: 14, lineHeight: 20 },
  bodyMedium: { ...face(fontFamily.semibold), fontSize: 14, lineHeight: 20, letterSpacing: -0.1 },
  caption: { ...face(fontFamily.regular), fontSize: 12, lineHeight: 16 },
  captionMedium: { ...face(fontFamily.semibold), fontSize: 12, lineHeight: 16 },
  /** Tiny all-caps eyebrow. Used sparingly - it is loud for its size. */
  overline: {
    ...face(fontFamily.bold),
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  /** Fares. Tabular-feeling, so a column of prices lines up. */
  price: { ...face(fontFamily.extraBold), fontSize: 18, lineHeight: 24, letterSpacing: -0.4 },
};

/** The map from variant name to the font asset, for preloading. */
export const fontAssets = fontFamily;
