import React, { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  PressableProps,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';
import { Icon, IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'critical';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconPosition?: 'leading' | 'trailing';
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  /** Suppresses the haptic tap. Use for destructive confirmations only. */
  silent?: boolean;
}

const heights: Record<Size, number> = { sm: 36, md: 46, lg: 54 };

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'trailing',
  loading = false,
  fullWidth = false,
  disabled,
  onPress,
  silent = false,
  style,
  ...rest
}: ButtonProps) {
  const { palette, radius } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const isDisabled = disabled || loading;

  const surfaces: Record<Variant, ViewStyle> = {
    primary: { backgroundColor: palette.brand },
    secondary: { backgroundColor: palette.surfaceSunken },
    ghost: { backgroundColor: 'transparent' },
    critical: { backgroundColor: palette.criticalSoft },
  };
  const contentColors: Record<Variant, string> = {
    primary: palette.onBrand,
    secondary: palette.textPrimary,
    ghost: palette.brand,
    critical: palette.critical,
  };

  const press = (to: number) =>
    Animated.spring(scale, {
      toValue: to,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();

  const content = contentColors[variant];

  return (
    <Animated.View style={[{ transform: [{ scale }] }, fullWidth ? { alignSelf: 'stretch' } : null]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: Boolean(isDisabled), busy: loading }}
        accessibilityLabel={label}
        disabled={isDisabled}
        onPressIn={() => press(0.972)}
        onPressOut={() => press(1)}
        onPress={(event) => {
          if (!silent && Platform.OS !== 'web') {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          onPress?.(event);
        }}
        style={[
          styles.base,
          surfaces[variant],
          {
            height: heights[size],
            borderRadius: radius.md,
            paddingHorizontal: size === 'sm' ? 14 : 20,
            opacity: isDisabled ? 0.45 : 1,
          },
          style,
        ]}
        {...rest}
      >
        {loading ? (
          <ActivityIndicator color={content} />
        ) : (
          <View style={styles.row}>
            {icon && iconPosition === 'leading' ? (
              <View style={{ marginRight: 8 }}>
                <Icon name={icon} size={size === 'sm' ? 16 : 18} color={content} />
              </View>
            ) : null}
            <Text
              variant={size === 'sm' ? 'label' : 'headline'}
              numberOfLines={1}
              style={{ color: content, letterSpacing: -0.1 }}
            >
              {label}
            </Text>
            {icon && iconPosition === 'trailing' ? (
              <View style={{ marginLeft: 8 }}>
                <Icon name={icon} size={size === 'sm' ? 16 : 18} color={content} />
              </View>
            ) : null}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
});
