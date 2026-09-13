import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/primitives/Text';
import { Icon } from '@/components/primitives/Icon';
import { Touchable } from '@/components/primitives/Touchable';

/**
 * The header search bar.
 *
 * Airbnb's most copied component, and the reason its home screen needs no
 * search form: a rounded pill with a magnifier, a bold primary line, a light
 * secondary line, and a circular filter button on the right. It is a *button*,
 * not an input - tapping it opens the real search flow, which means the
 * keyboard never appears somewhere it cannot be used properly.
 */
export function SearchPill({
  primary,
  secondary,
  onPress,
  onFilters,
  compact = false,
}: {
  primary: string;
  secondary: string;
  onPress: () => void;
  onFilters?: () => void;
  compact?: boolean;
}) {
  const { palette, radius, space, shadow } = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      <Touchable
        onPress={onPress}
        scaleTo={0.985}
        accessibilityRole="search"
        accessibilityLabel={`${primary}. ${secondary}. Tap to change`}
        style={[
          {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.md,
            height: compact ? 48 : 56,
            paddingHorizontal: space.base,
            borderRadius: radius.pill,
            backgroundColor: palette.surface,
            borderWidth: 1,
            borderColor: palette.border,
          },
          shadow.card,
        ]}
      >
        <Icon name="search" size={compact ? 17 : 19} strokeWidth={2.2} />
        <View style={{ flex: 1 }}>
          <Text variant={compact ? 'bodyMedium' : 'label'} numberOfLines={1}>
            {primary}
          </Text>
          <Text variant="caption" tone="secondary" numberOfLines={1} style={{ marginTop: 1 }}>
            {secondary}
          </Text>
        </View>
      </Touchable>

      {onFilters ? (
        <Touchable
          onPress={onFilters}
          scaleTo={0.9}
          accessibilityRole="button"
          accessibilityLabel="Filters"
          style={{
            width: compact ? 44 : 48,
            height: compact ? 44 : 48,
            borderRadius: 999,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: palette.border,
            backgroundColor: palette.surface,
          }}
        >
          <Icon name="sliders" size={18} />
        </Touchable>
      ) : null}
    </View>
  );
}
