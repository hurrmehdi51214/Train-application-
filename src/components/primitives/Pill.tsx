import React from 'react';
import { View, ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';
import { Icon, IconName } from './Icon';
import { Touchable } from './Touchable';

export interface PillProps {
  label: string;
  icon?: IconName;
  selected?: boolean;
  onPress?: () => void;
  tone?: 'neutral' | 'brand' | 'warning' | 'error' | 'success' | 'inverse';
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

/**
 * The chip used for filters, amenities and status. Selected state is a solid
 * dark fill rather than a tint - Airbnb's own choice, and it survives being
 * photographed against a bright image far better than a pastel does.
 */
export function Pill({ label, icon, selected, onPress, tone = 'neutral', size = 'md', style }: PillProps) {
  const { palette, radius, space } = useTheme();

  const tones = {
    neutral: { bg: palette.fill, fg: palette.textPrimary, border: 'transparent' },
    brand: { bg: palette.brandSoft, fg: palette.brandStrong, border: 'transparent' },
    warning: { bg: palette.warningSoft, fg: palette.warning, border: 'transparent' },
    error: { bg: palette.errorSoft, fg: palette.error, border: 'transparent' },
    success: { bg: palette.successSoft, fg: palette.success, border: 'transparent' },
    inverse: { bg: palette.textPrimary, fg: palette.surface, border: 'transparent' },
  } as const;

  const resolved = selected ? tones.inverse : tones[tone];
  const Wrapper = onPress ? Touchable : View;

  return (
    <Wrapper
      {...(onPress ? { onPress, haptic: 'selection' as const, scaleTo: 0.95 } : {})}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={onPress ? { selected: Boolean(selected) } : undefined}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          gap: 6,
          backgroundColor: resolved.bg,
          borderRadius: radius.pill,
          paddingHorizontal: size === 'sm' ? space.sm + 2 : space.md,
          paddingVertical: size === 'sm' ? 5 : space.sm,
        } as ViewStyle,
        style ?? {},
      ]}
    >
      {icon ? <Icon name={icon} size={size === 'sm' ? 13 : 15} color={resolved.fg} strokeWidth={1.9} /> : null}
      <Text variant={size === 'sm' ? 'caption' : 'bodyMedium'} style={{ color: resolved.fg }}>
        {label}
      </Text>
    </Wrapper>
  );
}
