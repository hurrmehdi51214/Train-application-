import React from 'react';
import { View } from 'react-native';

import { AmenityId } from '@/types';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/primitives/Text';
import { Icon, IconName } from '@/components/primitives/Icon';
import { amenityMeta } from '@/data/amenities';

export function AmenityGrid({ amenities, dense = false }: { amenities: AmenityId[]; dense?: boolean }) {
  const { palette, radius, space } = useTheme();

  if (amenities.length === 0) {
    return (
      <Text variant="callout" tone="tertiary">
        No amenity information for this coach.
      </Text>
    );
  }

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
      {amenities.map((id) => {
        const meta = amenityMeta[id];
        return (
          <View
            key={id}
            accessibilityLabel={`${meta.label}. ${meta.detail}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 7,
              paddingVertical: dense ? 6 : 9,
              paddingHorizontal: dense ? 10 : 12,
              borderRadius: radius.sm,
              backgroundColor: palette.surfaceSunken,
            }}
          >
            <Icon name={meta.glyph as IconName} size={dense ? 14 : 16} color={palette.brand} />
            <Text variant={dense ? 'caption' : 'label'} tone="secondary">
              {meta.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
