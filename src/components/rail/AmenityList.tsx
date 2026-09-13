import React from 'react';
import { View } from 'react-native';

import { Amenity } from '@/types';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/primitives/Text';
import { Icon, IconName } from '@/components/primitives/Icon';
import { amenityMeta } from '@/data/discovery';

/**
 * What's on board.
 *
 * A list with icons, not a grid of chips: Airbnb learned that an amenity is
 * read, not scanned, and a one-line explanation next to each ("USB-A and USB-C
 * at every seat") answers the question a bare label leaves open.
 */
export function AmenityList({ amenities, limit }: { amenities: Amenity[]; limit?: number }) {
  const { palette, space } = useTheme();
  const shown = limit ? amenities.slice(0, limit) : amenities;

  if (shown.length === 0) {
    return (
      <Text variant="body" tone="secondary">
        No amenity information published for this coach.
      </Text>
    );
  }

  return (
    <View>
      {shown.map((amenity, index) => {
        const meta = amenityMeta[amenity];
        return (
          <View
            key={amenity}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.base,
              paddingVertical: space.md,
              borderTopWidth: index === 0 ? 0 : 1,
              borderTopColor: palette.border,
            }}
          >
            <Icon name={meta.icon as IconName} size={22} color={palette.textPrimary} strokeWidth={1.6} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyLarge">{meta.label}</Text>
              <Text variant="caption" tone="secondary" style={{ marginTop: 1 }}>
                {meta.detail}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
