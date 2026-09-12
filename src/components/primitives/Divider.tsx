import React from 'react';
import { View, ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export function Divider({ inset = 0, style }: { inset?: number; style?: ViewStyle }) {
  const { palette, hairlineWidth } = useTheme();
  return (
    <View
      style={[
        { height: hairlineWidth, backgroundColor: palette.hairline, marginLeft: inset },
        style,
      ]}
    />
  );
}
