import React from 'react';
import { View, ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

/** Airbnb uses a real 1px #DDDDDD rule, not a hairline alpha. */
export function Divider({ inset = 0, style }: { inset?: number; style?: ViewStyle }) {
  const { palette } = useTheme();
  return (
    <View style={[{ height: 1, backgroundColor: palette.border, marginLeft: inset }, style]} />
  );
}
