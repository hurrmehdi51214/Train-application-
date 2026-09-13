import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GUTTER, Section, TAB_CLEARANCE } from '@/components/primitives/Screen';
import { Text } from '@/components/primitives/Text';
import { Icon } from '@/components/primitives/Icon';
import { Photo } from '@/components/primitives/Photo';
import { Touchable } from '@/components/primitives/Touchable';
import { OfflineBanner } from '@/components/primitives/OfflineBanner';
import { TrainCardSkeleton } from '@/components/primitives/Skeleton';
import { SearchPill } from '@/components/search/SearchPill';
import { CategoryRail } from '@/components/search/CategoryRail';
import { TrainCard } from '@/components/rail/TrainCard';
import { useTheme } from '@/theme/ThemeProvider';
import { useSearchStore } from '@/state/useSearchStore';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/services/apiClient';
import { CATEGORIES, DESTINATIONS } from '@/data/discovery';
import { photo } from '@/data/photos';
import { stationCity } from '@/data/stations';
import { dayLabel } from '@/utils/time';
import { pluralise } from '@/utils/format';

/**
 * Explore.
 *
 * Airbnb's home screen is a search pill, a category rail and a column of
 * photographs - no hero, no form, no dashboard. That works here for the same
 * reason it works there: most people opening this app are half-deciding whether
 * to travel at all, and a photograph of the Bolan Pass argues for that better
 * than an empty origin field ever will.
 */
export default function ExploreScreen() {
  const { palette, space, radius } = useTheme();
  const insets = useSafeAreaInsets();

  const { originId, destinationId, date, totalTravellers } = useSearchStore();
  const [category, setCategory] = useState('all');

  const { data, loading } = useAsync(() => api.featured(), []);
  const services = data?.data ?? [];

  const active = CATEGORIES.find((c) => c.id === category) ?? CATEGORIES[0]!;
  const filtered = useMemo(
    () => services.filter((service) => active.filter(service.id)),
    [services, active],
  );

  const travellers = totalTravellers();
  // Cities, not station names: "Karachi → Lahore" fits and reads; "Karachi
  // Cantt → Lahore Junction" truncates on every phone made.
  const searchSummary =
    originId && destinationId
      ? `${stationCity(originId)} → ${stationCity(destinationId)}`
      : 'Anywhere in Pakistan';

  return (
    <View style={{ flex: 1, backgroundColor: palette.surface }}>
      <View style={{ paddingTop: insets.top + space.sm, backgroundColor: palette.surface }}>
        <View style={{ paddingHorizontal: GUTTER, paddingBottom: space.md }}>
          <SearchPill
            primary={searchSummary}
            secondary={`${dayLabel(`${date}T09:00:00`)} · ${pluralise(travellers, 'traveller')}`}
            onPress={() => router.push('/search')}
            onFilters={() => router.push('/search?step=who')}
          />
        </View>

        <CategoryRail categories={CATEGORIES} value={category} onChange={setCategory} />
      </View>

      <OfflineBanner />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: space.xl, paddingBottom: TAB_CLEARANCE + insets.bottom }}
      >
        <View style={{ paddingHorizontal: GUTTER }}>
          {loading && filtered.length === 0 ? (
            <>
              <TrainCardSkeleton />
              <TrainCardSkeleton />
            </>
          ) : (
            filtered.map((service) => (
              <TrainCard
                key={service.id}
                service={service}
                onPress={() => router.push(`/train/${service.id}`)}
              />
            ))
          )}

          {!loading && filtered.length === 0 ? (
            <View style={{ paddingVertical: space.h2, alignItems: 'center' }}>
              <Icon name="train" size={30} color={palette.textTertiary} />
              <Text variant="subheading" style={{ marginTop: space.base }}>
                Nothing in this category
              </Text>
              <Text variant="body" tone="secondary" align="center" style={{ marginTop: 4 }}>
                Try another category, or search a route directly.
              </Text>
            </View>
          ) : null}
        </View>

        {/* Destinations. Photography doing the work, as on Airbnb's own
            "Inspiration for future getaways" rail. */}
        <Section title="Where to next" subtitle="Cities on the network, and what they are known for" flush>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: GUTTER, gap: space.md }}
          >
            {DESTINATIONS.map((destination) => {
              const image = photo(destination.photoKey);
              return (
                <Touchable
                  key={destination.id}
                  fade
                  onPress={() => router.push(`/station/${destination.stationId}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`${destination.city}. ${destination.blurb}`}
                  style={{ width: 172 }}
                >
                  <Photo uri={image?.url} height={172} radius={radius.md} />
                  <Text variant="bodyMedium" style={{ marginTop: space.sm }}>
                    {destination.city}
                  </Text>
                  <Text variant="caption" tone="secondary" numberOfLines={2} style={{ marginTop: 1 }}>
                    {destination.blurb}
                  </Text>
                </Touchable>
              );
            })}
          </ScrollView>
        </Section>

        <Section>
          <Touchable
            onPress={() => router.push('/install')}
            fade
            accessibilityRole="button"
            accessibilityLabel="Get the install QR code"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.base,
              padding: space.base,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: palette.border,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: radius.sm,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: palette.brandSoft,
              }}
            >
              <Icon name="qr" size={21} color={palette.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium">Share Safar</Text>
              <Text variant="caption" tone="secondary" style={{ marginTop: 1 }}>
                A QR anyone can scan to install it
              </Text>
            </View>
            <Icon name="chevron-right" size={18} color={palette.textTertiary} />
          </Touchable>
        </Section>

        <View style={{ paddingHorizontal: GUTTER }}>
          <Text variant="caption" tone="tertiary">
            Live times come from Pakistan Railways. Platforms are set by the station and can change at
            short notice. Photographs are from Wikimedia Commons under their original licences.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
