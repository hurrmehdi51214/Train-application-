import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';
import { Icon } from './Icon';

/**
 * Airbnb's rating treatment: a filled star, the score to two decimals, and the
 * review count in brackets and a lighter weight. No five-star row - one star
 * plus a number reads faster and takes a quarter of the space.
 */
export function Rating({
  value,
  count,
  size = 'md',
  showCount = true,
}: {
  value: number;
  count?: number;
  size?: 'sm' | 'md';
  showCount?: boolean;
}) {
  const { palette } = useTheme();
  const small = size === 'sm';

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Icon name="star" size={small ? 12 : 14} filled color={palette.star} />
      <Text variant={small ? 'caption' : 'bodyMedium'}>{value.toFixed(2)}</Text>
      {showCount && count !== undefined ? (
        <Text variant={small ? 'caption' : 'body'} tone="secondary">
          ({count.toLocaleString('en-PK')})
        </Text>
      ) : null}
    </View>
  );
}
