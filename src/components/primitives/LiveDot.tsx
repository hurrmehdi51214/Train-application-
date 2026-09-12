import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

/**
 * The "this is live" signal. One pulse every 1.6s, easing out - slow enough to
 * read as a heartbeat rather than a notification badge demanding attention.
 */
export function LiveDot({ size = 8, color }: { size?: number; color?: string }) {
  const { palette, duration } = useTheme();
  const tint = color ?? palette.success;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: duration.pulse * 0.55,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: duration.pulse * 0.45,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
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
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0] }),
          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
        }}
      />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tint }} />
    </View>
  );
}
