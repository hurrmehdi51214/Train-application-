import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';

import { Call } from '@/types';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/primitives/Text';
import { clockTime, delayLabel, relativeLabel } from '@/utils/time';

/** A slow heartbeat, so "live" reads as alive rather than as a notification badge. */
export function LiveDot({ size = 7, color }: { size?: number; color?: string }) {
  const { palette, duration } = useTheme();
  const tint = color ?? palette.success;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: duration.pulse * 0.55, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: duration.pulse * 0.45, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, duration.pulse]);

  return (
    <View style={{ width: size * 2.4, height: size * 2.4, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: size * 2.4,
          height: size * 2.4,
          borderRadius: size * 1.2,
          backgroundColor: tint,
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0] }),
          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) }],
        }}
      />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tint }} />
    </View>
  );
}

/**
 * The platform panel.
 *
 * The platform number is the single most-glanced-at thing in this app, so it
 * gets its own tile, set large, with the confidence of the forecast stated in
 * words beside it. "Platform 4 (expected)" is honest; a bare "4" that changes
 * under someone's feet is not.
 */
export function PlatformPanel({ call, live = true }: { call: Call; live?: boolean }) {
  const { palette, radius, space } = useTheme();
  const late = call.delayMinutes > 1;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.base,
        padding: space.base,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: palette.border,
      }}
    >
      <View
        style={{
          width: 74,
          height: 74,
          borderRadius: radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: call.platformConfirmed ? palette.brand : palette.fill,
        }}
      >
        <Text
          variant="overline"
          style={{ color: call.platformConfirmed ? palette.onBrand : palette.textTertiary, opacity: 0.9 }}
        >
          Platform
        </Text>
        <Text
          style={{
            fontSize: 30,
            lineHeight: 36,
            fontWeight: '800',
            color: call.platformConfirmed ? palette.onBrand : palette.textPrimary,
          }}
        >
          {call.platform ?? '–'}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: -4 }}>
          {live ? <LiveDot size={6} color={late ? palette.warning : palette.success} /> : null}
          <Text variant="captionMedium" tone={late ? 'warning' : 'success'}>
            {delayLabel(call.delayMinutes)}
          </Text>
        </View>
        <Text variant="title" style={{ marginTop: 2 }}>
          {clockTime(call.expectedDeparture ?? call.expectedArrival)}
        </Text>
        <Text variant="caption" tone="secondary" style={{ marginTop: 2 }}>
          {call.platformConfirmed
            ? `Confirmed · departs ${relativeLabel(call.expectedDeparture ?? call.expectedArrival)}`
            : 'Platform not confirmed by the station yet'}
        </Text>
      </View>
    </View>
  );
}
