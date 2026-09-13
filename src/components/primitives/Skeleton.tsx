import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

/**
 * Loading placeholder.
 *
 * A slow pulse rather than a sweeping shimmer. A shimmer that races across six
 * cards at once is more distracting than the wait it is covering; a 1.4s
 * breathe reads as "working" and then gets out of the way.
 */
export function Skeleton({
  width,
  height,
  radius: r,
  style,
}: {
  width?: number | `${number}%`;
  height: number;
  radius?: number;
  style?: ViewStyle;
}) {
  const { palette, radius } = useTheme();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        {
          width: width ?? '100%',
          height,
          borderRadius: r ?? radius.sm,
          backgroundColor: palette.fill,
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }),
        } as ViewStyle,
        style,
      ]}
    />
  );
}

/** The shape of one train card, for the results list's first paint. */
export function TrainCardSkeleton() {
  const { space, radius } = useTheme();
  return (
    <View style={{ marginBottom: space.xxl }}>
      <Skeleton height={210} radius={radius.md} />
      <View style={{ gap: space.sm, marginTop: space.md }}>
        <Skeleton height={16} width="62%" />
        <Skeleton height={14} width="44%" />
        <Skeleton height={14} width="30%" />
      </View>
    </View>
  );
}
