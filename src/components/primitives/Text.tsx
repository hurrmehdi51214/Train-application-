import React from 'react';
import { Text as RNText, TextProps as RNTextProps, TextStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { type as typeScale, TypeVariant } from '@/theme/typography';

type Tone =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'inverse'
  | 'brand'
  | 'error'
  | 'warning'
  | 'success';

export interface TextProps extends RNTextProps {
  variant?: TypeVariant;
  tone?: Tone;
  align?: TextStyle['textAlign'];
  /** Renders Urdu right-to-left with a little extra line height. */
  urdu?: boolean;
}

export function Text({ variant = 'body', tone, align, urdu, style, ...rest }: TextProps) {
  const { palette } = useTheme();

  const tones: Record<Tone, string> = {
    primary: palette.textPrimary,
    secondary: palette.textSecondary,
    tertiary: palette.textTertiary,
    inverse: palette.textInverse,
    brand: palette.brand,
    error: palette.error,
    warning: palette.warning,
    success: palette.success,
  };

  return (
    <RNText
      {...rest}
      style={[
        typeScale[variant],
        tone ? { color: tones[tone] } : { color: palette.textPrimary },
        align ? { textAlign: align } : null,
        // Urdu sits lower on the line and needs the room.
        urdu ? { writingDirection: 'rtl', lineHeight: (typeScale[variant].lineHeight ?? 20) + 6 } : null,
        style,
      ]}
    />
  );
}
