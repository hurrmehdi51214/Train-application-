import React from 'react';
import { ActivityIndicator, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';
import { Icon, IconName } from './Icon';
import { Touchable } from './Touchable';

type Variant = 'primary' | 'dark' | 'outline' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconPosition?: 'leading' | 'trailing';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  accessibilityHint?: string;
}

const HEIGHT: Record<Size, number> = { sm: 36, md: 44, lg: 52 };

/**
 * Buttons.
 *
 * Five variants, and the discipline is in how rarely the first one appears:
 * `primary` carries the brand gradient and there is at most one per screen -
 * Reserve, Confirm and pay, Search. `dark` is the workhorse for everything
 * secondary that still needs weight, which is Airbnb's own pattern (their
 * "Show 165 stays" button is solid near-black, not pink).
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'trailing',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  accessibilityHint,
}: ButtonProps) {
  const { palette, radius, space } = useTheme();
  const isDisabled = disabled || loading;

  const content: Record<Variant, string> = {
    primary: palette.onBrand,
    dark: palette.mode === 'dark' ? palette.textInverse : '#FFFFFF',
    outline: palette.textPrimary,
    ghost: palette.textPrimary,
    destructive: palette.error,
  };

  const backgrounds: Record<Variant, ViewStyle> = {
    primary: {},
    dark: { backgroundColor: palette.textPrimary },
    outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: palette.textPrimary },
    ghost: { backgroundColor: 'transparent' },
    destructive: { backgroundColor: palette.errorSoft },
  };

  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm }}>
      {loading ? (
        <ActivityIndicator color={content[variant]} size="small" />
      ) : (
        <>
          {icon && iconPosition === 'leading' ? (
            <Icon name={icon} size={size === 'sm' ? 16 : 18} color={content[variant]} />
          ) : null}
          <Text
            variant={size === 'sm' ? 'bodyMedium' : 'label'}
            numberOfLines={1}
            style={[
              { color: content[variant] },
              variant === 'ghost' ? { textDecorationLine: 'underline' } : null,
            ]}
          >
            {label}
          </Text>
          {icon && iconPosition === 'trailing' ? (
            <Icon name={icon} size={size === 'sm' ? 16 : 18} color={content[variant]} />
          ) : null}
        </>
      )}
    </View>
  );

  const shell: ViewStyle = {
    height: HEIGHT[size],
    borderRadius: radius.sm,
    paddingHorizontal: size === 'sm' ? space.md : space.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    opacity: isDisabled ? 0.45 : 1,
    alignSelf: fullWidth ? 'stretch' : 'flex-start',
  };

  return (
    <Touchable
      onPress={onPress}
      disabled={isDisabled}
      scaleTo={0.975}
      haptic={variant === 'primary' ? 'medium' : 'light'}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={[shell, backgrounds[variant], style ?? {}]}
    >
      {variant === 'primary' ? (
        <LinearGradient
          colors={[...palette.brandGradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
        />
      ) : null}
      {body}
    </Touchable>
  );
}
