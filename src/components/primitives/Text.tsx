import React from 'react';
import { Text as RNText, TextProps as RNTextProps, TextStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { type as typeScale } from '@/theme/typography';

type Variant = keyof typeof typeScale;
type Tone = 'primary' | 'secondary' | 'tertiary' | 'inverse' | 'brand' | 'accent' | 'critical' | 'success';

export interface TextProps extends RNTextProps {
  variant?: Variant;
  tone?: Tone;
  align?: TextStyle['textAlign'];
  /** Optical adjustment for headings sitting directly above body copy. */
  tight?: boolean;
}

export function Text({
  variant = 'body',
  tone = 'primary',
  align,
  tight,
  style,
  ...rest
}: TextProps) {
  const { palette } = useTheme();

  const colors: Record<Tone, string> = {
    primary: palette.textPrimary,
    secondary: palette.textSecondary,
    tertiary: palette.textTertiary,
    inverse: palette.textInverse,
    brand: palette.brand,
    accent: palette.accent,
    critical: palette.critical,
    success: palette.success,
  };

  return (
    <RNText
      {...rest}
      style={[
        typeScale[variant],
        { color: colors[tone] },
        align ? { textAlign: align } : null,
        tight ? { marginBottom: -2 } : null,
        style,
      ]}
    />
  );
}
