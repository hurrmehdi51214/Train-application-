import React, { useMemo } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

import { Screen, GUTTER } from '@/components/primitives/Screen';
import { Text } from '@/components/primitives/Text';
import { Icon } from '@/components/primitives/Icon';
import { Button } from '@/components/primitives/Button';
import { TrainCard } from '@/components/rail/TrainCard';
import { useTheme } from '@/theme/ThemeProvider';
import { useWishlistStore } from '@/state/useWishlistStore';
import { allServices } from '@/data/trains';

export default function WishlistsScreen() {
  const { palette, space } = useTheme();
  const saved = useWishlistStore((s) => s.saved);

  const services = useMemo(() => {
    const all = allServices();
    // Preserve the order things were saved in, not the timetable order.
    return saved.map((id) => all.find((s) => s.id === id)).filter((s): s is NonNullable<typeof s> => Boolean(s));
  }, [saved]);

  return (
    <Screen tabBarSpacing contentStyle={{ paddingTop: 0 }}>
      <View style={{ paddingHorizontal: GUTTER, paddingTop: space.base, paddingBottom: space.lg }}>
        <Text variant="hero">Wishlists</Text>
        <Text variant="body" tone="secondary" style={{ marginTop: 4 }}>
          {services.length === 0
            ? 'Trains you save are kept here, on this device.'
            : `${services.length} saved train${services.length === 1 ? '' : 's'}`}
        </Text>
      </View>

      <View style={{ paddingHorizontal: GUTTER }}>
        {services.length === 0 ? (
          <View style={{ paddingVertical: space.h2, alignItems: 'center' }}>
            <Icon name="heart" size={32} color={palette.textTertiary} />
            <Text variant="subheading" style={{ marginTop: space.base }}>
              Nothing saved yet
            </Text>
            <Text variant="body" tone="secondary" align="center" style={{ marginTop: 4, maxWidth: 300 }}>
              Tap the heart on any train and it will be waiting here next time, with or without a connection.
            </Text>
            <Button
              label="Start exploring"
              onPress={() => router.push('/(tabs)')}
              style={{ marginTop: space.lg }}
            />
          </View>
        ) : (
          services.map((service) => (
            <TrainCard key={service.id} service={service} onPress={() => router.push(`/train/${service.id}`)} />
          ))
        )}
      </View>
    </Screen>
  );
}
