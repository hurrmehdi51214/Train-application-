import React from 'react';
import { Pressable, View, ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';
import { Icon, IconName } from './Icon';

export interface ChipProps {
  label: string;
  icon?: IconName;
  tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'critical' | 'info';
  selected?: boolean;
  onPress?: () => void;
  compact?: boolean;
  style?: ViewStyle;
}

export function Chip({ label, icon, tone = 'neutral', selected, onPress, compact, style }: ChipProps) {
  const { palette, radius } = useTheme();

  const tones = {
    neutral: { bg: palette.surfaceSunken, fg: palette.textSecondary },
    brand: { bg: palette.brand, fg: palette.onBrand },
    success: { bg: palette.successSoft, fg: palette.success },
    warning: { bg: palette.warningSoft, fg: palette.warning },
    critical: { bg: palette.criticalSoft, fg: palette.critical },
    info: { bg: palette.infoSoft, fg: palette.info },
  } as const;

  const resolved = selected ? tones.brand : tones[tone];
  const Container = onPress ? Pressable : View;

  return (
    <Container
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={onPress ? { selected: Boolean(selected) } : undefined}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          backgroundColor: resolved.bg,
          borderRadius: radius.pill,
          paddingHorizontal: compact ? 9 : 12,
          paddingVertical: compact ? 4 : 7,
        },
        style,
      ]}
    >
      {icon ? (
        <View style={{ marginRight: 6 }}>
          <Icon name={icon} size={compact ? 12 : 14} color={resolved.fg} strokeWidth={1.9} />
        </View>
      ) : null}
      <Text variant={compact ? 'caption' : 'label'} style={{ color: resolved.fg }}>
        {label}
      </Text>
    </Container>
  );
}
