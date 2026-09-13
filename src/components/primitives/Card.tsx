import React from 'react';
import { View, ViewProps, ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export interface CardProps extends ViewProps {
  padding?: number;
  radius?: number;
  /** Airbnb cards mostly sit flat on white; elevation is the exception. */
  elevated?: boolean;
  bordered?: boolean;
  tone?: 'surface' | 'fill' | 'brand';
}

export function Card({
  padding,
  radius: radiusProp,
  elevated = false,
  bordered = false,
  tone = 'surface',
  style,
  ...rest
}: CardProps) {
  const { palette, radius, shadow } = useTheme();

  const backgrounds = {
    surface: palette.surface,
    fill: palette.fill,
    brand: palette.brandSoft,
  } as const;

  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: backgrounds[tone],
          borderRadius: radiusProp ?? radius.md,
          padding,
        } as ViewStyle,
        bordered ? { borderWidth: 1, borderColor: palette.border } : null,
        elevated ? shadow.card : null,
        style,
      ]}
    />
  );
}
