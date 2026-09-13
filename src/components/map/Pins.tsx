import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Text } from '@/components/primitives/Text';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Markers for the Google map.
 *
 * On native these are real React views handed to `<Marker/>` rather than PNG
 * pin images, so they pick up the theme and stay crisp on every density. The
 * price pin is Airbnb's signature marker: a white pill with the fare in it,
 * which inverts to solid when you select it.
 */

export function StationPin({ kind, passed }: { kind: string; passed?: boolean }) {
  const { palette } = useTheme();
  const major = kind === 'origin' || kind === 'destination';
  const size = major ? 18 : 12;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: passed ? palette.brand : palette.surface,
        borderWidth: major ? 3.5 : 2.5,
        borderColor: palette.brand,
      }}
    />
  );
}

export function PricePin({ label, selected }: { label: string; selected?: boolean }) {
  const { palette, radius, shadow } = useTheme();

  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={[
          {
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: radius.pill,
            backgroundColor: selected ? palette.textPrimary : palette.surface,
            borderWidth: 1,
            borderColor: selected ? palette.textPrimary : palette.border,
          },
          shadow.floating,
        ]}
      >
        <Text
          variant="captionMedium"
          style={{ color: selected ? palette.surface : palette.textPrimary }}
        >
          {label}
        </Text>
      </View>
      {/* The little stem, so the pill points at its coordinate. */}
      <View
        style={{
          width: 2,
          height: 5,
          backgroundColor: selected ? palette.textPrimary : palette.border,
        }}
      />
    </View>
  );
}

export function TrainMarkerBubble({ bearing }: { bearing: number }) {
  const { palette } = useTheme();

  return (
    <View style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={40} height={40} viewBox="0 0 40 40">
        <Circle cx={20} cy={20} r={18} fill={palette.brand} opacity={0.18} />
        <Circle cx={20} cy={20} r={13} fill={palette.surface} />
        <Path
          d="M20 10.4c3.1 0 5.2 2.1 5.2 5v8.4c0 1.6-1.1 2.7-2.7 2.7h-5c-1.6 0-2.7-1.1-2.7-2.7v-8.4c0-2.9 2.1-5 5.2-5Z"
          fill={palette.brand}
          transform={`rotate(${bearing} 20 20)`}
        />
        <Rect
          x={16.9}
          y={13.8}
          width={6.2}
          height={3.6}
          rx={1.4}
          fill={palette.surface}
          transform={`rotate(${bearing} 20 20)`}
        />
      </Svg>
    </View>
  );
}
