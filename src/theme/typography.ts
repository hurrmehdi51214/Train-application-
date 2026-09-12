import { Platform, TextStyle } from 'react-native';

/**
 * Two families, used with intent:
 *   - `display` is a serif. It appears on station names, fares and journey
 *     headlines only. Rail signage has always been typographic, and a serif is
 *     what keeps the product from reading like a generic dashboard.
 *   - `text` is the platform UI face, which is what people actually read fast.
 * `mono` is reserved for coach/seat/platform codes, where digit alignment
 * matters more than warmth.
 */
export const fonts = {
  display: Platform.select({
    ios: 'Iowan Old Style',
    android: 'serif',
    default: 'Iowan Old Style, Palatino, Georgia, serif',
  }) as string,
  text: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  }) as string,
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  }) as string,
};

type Variant =
  | 'display'
  | 'title'
  | 'headline'
  | 'body'
  | 'bodyStrong'
  | 'callout'
  | 'label'
  | 'caption'
  | 'overline'
  | 'numeric'
  | 'numericLarge';

export const type: Record<Variant, TextStyle> = {
  display: {
    fontFamily: fonts.display,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.6,
    fontWeight: '600',
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 25,
    lineHeight: 31,
    letterSpacing: -0.35,
    fontWeight: '600',
  },
  headline: {
    fontFamily: fonts.text,
    fontSize: 17,
    lineHeight: 23,
    letterSpacing: -0.2,
    fontWeight: '700',
  },
  body: {
    fontFamily: fonts.text,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: -0.1,
    fontWeight: '400',
  },
  bodyStrong: {
    fontFamily: fonts.text,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: -0.1,
    fontWeight: '600',
  },
  callout: {
    fontFamily: fonts.text,
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: '500',
  },
  label: {
    fontFamily: fonts.text,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
  },
  caption: {
    fontFamily: fonts.text,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  overline: {
    fontFamily: fonts.text,
    fontSize: 10.5,
    lineHeight: 14,
    letterSpacing: 1.1,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  numeric: {
    fontFamily: fonts.mono,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 0.4,
    fontWeight: '600',
  },
  numericLarge: {
    fontFamily: fonts.mono,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: 0.6,
    fontWeight: '700',
  },
};
