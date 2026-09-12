import React from 'react';
import { View } from 'react-native';

import { Call } from '@/types';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/primitives/Text';
import { Surface } from '@/components/primitives/Surface';
import { LiveDot } from '@/components/primitives/LiveDot';
import { clockTime, delayLabel, relativeLabel } from '@/utils/time';

/**
 * The platform number is the single most-glanced-at thing in this app, so it
 * gets its own card, set large, in the mono face, with the confidence of the
 * forecast stated in words next to it. "Platform 4 (expected)" is honest;
 * showing a bare "4" that changes under someone's feet is not.
 */
export function PlatformCard({ call, live = true }: { call: Call; live?: boolean }) {
  const { palette, radius, space } = useTheme();
  const late = call.delayMinutes > 1;

  return (
    <Surface padding={space.xl}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: 78,
            height: 78,
            borderRadius: radius.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: call.platformConfirmed ? palette.brand : palette.surfaceSunken,
          }}
        >
          <Text
            variant="overline"
            style={{ color: call.platformConfirmed ? palette.onBrand : palette.textTertiary, opacity: 0.8 }}
          >
            Platform
          </Text>
          <Text
            style={{
              fontSize: call.platform && call.platform.length > 2 ? 28 : 34,
              lineHeight: 38,
              fontWeight: '700',
              color: call.platformConfirmed ? palette.onBrand : palette.textPrimary,
            }}
          >
            {call.platform ?? '-'}
          </Text>
        </View>

        <View style={{ flex: 1, marginLeft: space.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {live ? <LiveDot size={7} color={late ? palette.warning : palette.success} /> : null}
            <Text variant="label" tone={late ? 'accent' : 'success'}>
              {delayLabel(call.delayMinutes)}
            </Text>
          </View>

          <Text variant="title" style={{ marginTop: 4 }}>
            {clockTime(call.expectedDeparture ?? call.expectedArrival)}
          </Text>

          <Text variant="caption" tone="tertiary" style={{ marginTop: 2 }}>
            {call.platformConfirmed
              ? `Confirmed · departs ${relativeLabel(call.expectedDeparture ?? call.expectedArrival)}`
              : 'Platform not yet confirmed by the station'}
          </Text>
        </View>
      </View>
    </Surface>
  );
}
