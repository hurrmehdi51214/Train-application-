import React, { useRef, useState } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  View,
  ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Photo } from './Photo';

/**
 * The listing-card image carousel.
 *
 * This is the single most recognisable component in Airbnb's app: a paged strip
 * of photographs with a row of dots that shrink as they move away from the
 * active one. The shrinking is what makes five dots read as "a few more" and
 * fifteen read as "lots" without ever showing fifteen dots.
 *
 * Paging is native (`pagingEnabled`), so the swipe has the platform's own
 * physics rather than something re-implemented in JavaScript.
 */
export function PhotoCarousel({
  uris,
  height,
  radius,
  style,
  overlay,
  accessibilityLabel,
}: {
  uris: string[];
  height: number;
  radius?: number;
  style?: ViewStyle;
  /** Rendered above the photo, e.g. the wishlist heart. */
  overlay?: React.ReactNode;
  accessibilityLabel?: string;
}) {
  const { radius: radii, space } = useTheme();
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
    useNativeDriver: false,
    listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (width <= 0) return;
      setIndex(Math.round(event.nativeEvent.contentOffset.x / width));
    },
  });

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={[{ height, borderRadius: radius ?? radii.md, overflow: 'hidden' }, style]}
    >
      <Animated.ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
        accessibilityLabel={accessibilityLabel}
      >
        {uris.map((uri, i) => (
          <Photo
            key={`${uri}-${i}`}
            uri={uri}
            width={width || undefined}
            height={height}
            radius={0}
            priority={i === 0 ? 'high' : 'low'}
          />
        ))}
      </Animated.ScrollView>

      {uris.length > 1 ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: space.md,
            left: 0,
            right: 0,
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 5,
          }}
        >
          {uris.map((_, i) => {
            const distance = Math.abs(i - index);
            // Dots shrink with distance, so a long strip stays a short row.
            const size = distance === 0 ? 6.5 : distance === 1 ? 5 : distance === 2 ? 4 : 3;
            return (
              <View
                key={i}
                style={{
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: '#FFFFFF',
                  opacity: distance === 0 ? 1 : Math.max(0.35, 0.8 - distance * 0.2),
                  shadowColor: '#000',
                  shadowOpacity: 0.25,
                  shadowRadius: 2,
                  shadowOffset: { width: 0, height: 1 },
                }}
              />
            );
          })}
        </View>
      ) : null}

      {overlay ? (
        <View style={{ position: 'absolute', top: space.md, right: space.md }}>{overlay}</View>
      ) : null}
    </View>
  );
}
