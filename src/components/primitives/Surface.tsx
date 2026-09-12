import React from 'react';
import { View, ViewProps, ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export interface SurfaceProps extends ViewProps {
  level?: 'flat' | 'raised' | 'sunken';
  padding?: number;
  radius?: number;
  /** Adds the mode-appropriate elevation treatment. */
  elevated?: boolean;
  bordered?: boolean;
}

export function Surface({
  level = 'raised',
  padding,
  radius: radiusProp,
  elevated = true,
  bordered = false,
  style,
  ...rest
}: SurfaceProps) {
  const theme = useTheme();
  const { palette, radius, elevation, hairlineWidth } = theme;

  const backgrounds: Record<NonNullable<SurfaceProps['level']>, string> = {
    flat: palette.canvas,
    raised: palette.surface,
    sunken: palette.surfaceSunken,
  };

  const base: ViewStyle = {
    backgroundColor: backgrounds[level],
    borderRadius: radiusProp ?? radius.lg,
    padding,
  };

  return (
    <View
      {...rest}
      style={[
        base,
        elevated ? elevation.card : null,
        bordered ? { borderWidth: hairlineWidth, borderColor: palette.hairline } : null,
        style,
      ]}
    />
  );
}
