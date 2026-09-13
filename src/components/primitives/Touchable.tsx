import React, { useMemo, useRef } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  PressableProps,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/theme/ThemeProvider';

export interface TouchableProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  style?: ViewStyle | Array<ViewStyle | false | null | undefined>;
  /** How far it shrinks on press. Cards barely move; buttons move a little. */
  scaleTo?: number;
  /** Fades instead of scaling. Right for anything with a photo in it. */
  fade?: boolean;
  haptic?: 'light' | 'medium' | 'selection' | 'none';
}

/**
 * Properties that position an element inside its *parent* rather than laying
 * out its own children.
 *
 * These have to sit on the animated wrapper, not on the Pressable inside it.
 * Leaving `flex: 1` on the inner view means the wrapper sizes itself to its
 * content and a row of five tabs all collapse to the left - which is exactly
 * the bug this list exists to prevent.
 */
const OUTER_KEYS = [
  'flex',
  'flexGrow',
  'flexShrink',
  'flexBasis',
  'alignSelf',
  'width',
  'minWidth',
  'maxWidth',
  'height',
  'minHeight',
  'maxHeight',
  'margin',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'marginHorizontal',
  'marginVertical',
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'zIndex',
] as const;

function split(style: TouchableProps['style']): { outer: ViewStyle; inner: ViewStyle } {
  const flat = (StyleSheet.flatten(style as never) ?? {}) as Record<string, unknown>;
  const outer: Record<string, unknown> = {};
  const inner: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(flat)) {
    if ((OUTER_KEYS as readonly string[]).includes(key)) outer[key] = value;
    else inner[key] = value;
  }
  // The Pressable has to fill whatever box the wrapper ended up with.
  if (outer.flex !== undefined || outer.width !== undefined || outer.height !== undefined) {
    inner.flex = 1;
  }
  return { outer: outer as ViewStyle, inner: inner as ViewStyle };
}

/**
 * The one press surface.
 *
 * Every tappable thing in the app goes through this, so press physics are
 * identical everywhere: a single spring config from the theme, one opinion
 * about haptics, and no component quietly inventing its own feel. Photos fade
 * rather than scale, because scaling an image card makes it resample and
 * shimmer on every frame of the animation.
 */
export function Touchable({
  children,
  style,
  scaleTo = 0.97,
  fade = false,
  haptic = 'light',
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  ...rest
}: TouchableProps) {
  const { spring, duration } = useTheme();
  const value = useRef(new Animated.Value(0)).current;
  const { outer, inner } = useMemo(() => split(style), [style]);

  const animate = (to: number) => {
    if (fade) {
      Animated.timing(value, { toValue: to, duration: duration.tap, useNativeDriver: true }).start();
    } else {
      Animated.spring(value, { toValue: to, useNativeDriver: true, ...spring.press }).start();
    }
  };

  const animated = fade
    ? { opacity: value.interpolate({ inputRange: [0, 1], outputRange: [1, 0.82] }) }
    : { transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [1, scaleTo] }) }] };

  return (
    <Animated.View style={[outer, animated]}>
      <Pressable
        {...rest}
        disabled={disabled}
        onPressIn={(e) => {
          animate(1);
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          animate(0);
          onPressOut?.(e);
        }}
        onPress={(e) => {
          if (haptic !== 'none' && Platform.OS !== 'web' && !disabled) {
            if (haptic === 'selection') void Haptics.selectionAsync();
            else {
              void Haptics.impactAsync(
                haptic === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
              );
            }
          }
          onPress?.(e);
        }}
        style={inner}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
