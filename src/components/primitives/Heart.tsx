import React, { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/theme/ThemeProvider';
import { Icon } from './Icon';

/**
 * The wishlist heart.
 *
 * The animation is the whole point. Airbnb's heart does not fade in - it
 * overshoots and settles, which is what makes saving something feel like a
 * small reward rather than a state change. Two springs: a quick punch out to
 * 1.25 and a bouncier return, plus a ring that expands and fades behind it.
 *
 * On a photo it gets a soft shadow, because a white outline on a bright sky is
 * invisible otherwise.
 */
export function Heart({
  saved,
  onToggle,
  size = 26,
  onPhoto = false,
}: {
  saved: boolean;
  onToggle: () => void;
  size?: number;
  onPhoto?: boolean;
}) {
  const { palette, spring } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const wasSaved = useRef(saved);

  useEffect(() => {
    if (saved === wasSaved.current) return;
    wasSaved.current = saved;
    if (!saved) return;

    scale.setValue(1);
    ring.setValue(0);
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.25, useNativeDriver: true, damping: 9, stiffness: 500, mass: 0.5 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, ...spring.pop }),
    ]).start();
    Animated.timing(ring, { toValue: 1, duration: 420, useNativeDriver: true }).start();
  }, [saved, scale, ring, spring.pop]);

  const fill = saved ? palette.brand : onPhoto ? 'rgba(0,0,0,0.45)' : 'transparent';
  const stroke = saved ? palette.brand : onPhoto ? '#FFFFFF' : palette.textPrimary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={saved ? 'Remove from wishlist' : 'Save to wishlist'}
      accessibilityState={{ selected: saved }}
      hitSlop={12}
      onPress={() => {
        if (Platform.OS !== 'web') {
          void Haptics.impactAsync(
            saved ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium,
          );
        }
        onToggle();
      }}
      style={{ width: size + 8, height: size + 8, alignItems: 'center', justifyContent: 'center' }}
    >
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: palette.brand,
          opacity: ring.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0.5, 0] }),
          transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.9] }) }],
        }}
      />
      <Animated.View style={{ transform: [{ scale }] }}>
        <View
          style={
            onPhoto
              ? {
                  shadowColor: '#000',
                  shadowOpacity: 0.35,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 1 },
                }
              : undefined
          }
        >
          <Icon name="heart" size={size} filled={saved} color={saved ? fill : stroke} strokeWidth={2} />
        </View>
      </Animated.View>
    </Pressable>
  );
}
