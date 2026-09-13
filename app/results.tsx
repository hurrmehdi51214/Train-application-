import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/primitives/Text';
import { Icon } from '@/components/primitives/Icon';
import { Pill } from '@/components/primitives/Pill';
import { Touchable } from '@/components/primitives/Touchable';
import { TrainCardSkeleton } from '@/components/primitives/Skeleton';
import { SearchPill } from '@/components/search/SearchPill';
import { TrainCard, TrainCardCompact } from '@/components/rail/TrainCard';
import { Map } from '@/components/map/Map';
import { MapMarker } from '@/components/map/types';
import { useSearchStore } from '@/state/useSearchStore';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/services/apiClient';
import { getService } from '@/data/trains';
import { getStation, stationCity, stationName } from '@/data/stations';
import { GUTTER } from '@/components/primitives/Screen';
import { dayLabel } from '@/utils/time';
import { moneyShort, pluralise } from '@/utils/format';
import { Coordinate, JourneyOption } from '@/types';

type Sort = 'departure' | 'price' | 'duration' | 'rating';

const SORTS: Array<{ value: Sort; label: string }> = [
  { value: 'departure', label: 'Earliest' },
  { value: 'price', label: 'Lowest fare' },
  { value: 'duration', label: 'Fastest' },
  { value: 'rating', label: 'Best rated' },
];

/**
 * Results.
 *
 * List by default with a floating "Map" pill, exactly as Airbnb does it - and
 * for the same reason: on a phone, a map is a second view of the same list, not
 * a replacement for it. Switching is one tap, the pill stays put, and the list
 * keeps its scroll position underneath.
 */
export default function ResultsScreen() {
  const { palette, space, radius, shadow } = useTheme();
  const insets = useSafeAreaInsets();

  const { originId, destinationId, date, totalTravellers } = useSearchStore();
  const [sort, setSort] = useState<Sort>('departure');
  const [view, setView] = useState<'list' | 'map'>('list');
  const [selected, setSelected] = useState<string | null>(null);
  const [geometry, setGeometry] = useState<Coordinate[]>([]);

  const { data, loading, reload } = useAsync(
    () => api.searchJourneys(originId ?? '', destinationId ?? '', date),
    [originId, destinationId, date],
  );

  const options = useMemo(() => {
    const list = [...(data?.data ?? [])];
    const cheapest = (o: JourneyOption) => Math.min(...o.offers.map((offer) => offer.fareMinor));
    switch (sort) {
      case 'price':
        return list.sort((a, b) => cheapest(a) - cheapest(b));
      case 'duration':
        return list.sort((a, b) => a.durationMinutes - b.durationMinutes);
      case 'rating':
        return list.sort((a, b) => b.rating - a.rating);
      default:
        return list.sort((a, b) => new Date(a.departure).getTime() - new Date(b.departure).getTime());
    }
  }, [data, sort]);

  // The map draws the corridor everyone is travelling, taken from the first
  // result - all of these trains run the same rails between the same two points.
  useEffect(() => {
    const first = options[0];
    if (!first) return;
    let cancelled = false;
    void api.geometry(first.serviceId).then((line) => {
      if (cancelled) return;
      const service = getService(first.serviceId);
      if (!service) return setGeometry(line);
      // Trim the alignment to the leg the passenger actually booked.
      const from = service.calls.find((c) => c.stationId === first.originStationId);
      const to = service.calls.find((c) => c.stationId === first.destinationStationId);
      if (!from || !to || line.length < 2) return setGeometry(line);
      const start = Math.floor((from.sequence / (service.calls.length - 1)) * (line.length - 1));
      const end = Math.ceil((to.sequence / (service.calls.length - 1)) * (line.length - 1));
      setGeometry(line.slice(Math.max(0, start), Math.min(line.length, end + 1)));
    });
    return () => {
      cancelled = true;
    };
  }, [options]);

  const markers = useMemo<MapMarker[]>(() => {
    const list: MapMarker[] = [];
    const origin = originId ? getStation(originId) : undefined;
    const destination = destinationId ? getStation(destinationId) : undefined;
    if (origin) list.push({ id: origin.id, coordinate: origin.coordinate, kind: 'origin', label: origin.name });
    if (destination) {
      list.push({ id: destination.id, coordinate: destination.coordinate, kind: 'destination', label: destination.name });
    }

    // Price pins sit along the corridor, fanned out so they do not stack.
    options.forEach((option, index) => {
      if (!origin || !destination || geometry.length < 2) return;
      const t = (index + 1) / (options.length + 1);
      const point = geometry[Math.round(t * (geometry.length - 1))];
      if (!point) return;
      list.push({
        id: option.id,
        coordinate: point,
        kind: 'price',
        label: moneyShort(Math.min(...option.offers.map((o) => o.fareMinor))),
        selected: option.id === selected,
      });
    });
    return list;
  }, [originId, destinationId, options, geometry, selected]);

  const travellers = totalTravellers();
  const selectedOption = options.find((o) => o.id === selected) ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: palette.surface }}>
      <View
        style={{
          paddingTop: insets.top + space.sm,
          paddingHorizontal: GUTTER,
          paddingBottom: space.md,
          backgroundColor: palette.surface,
          borderBottomWidth: 1,
          borderBottomColor: palette.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Touchable
            onPress={() => router.back()}
            scaleTo={0.88}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="chevron-left" size={20} />
          </Touchable>
          <View style={{ flex: 1 }}>
            <SearchPill
              compact
              primary={`${stationCity(originId ?? '')} → ${stationCity(destinationId ?? '')}`}
              secondary={`${dayLabel(`${date}T09:00:00`)} · ${pluralise(travellers, 'traveller')}`}
              onPress={() => router.push('/search')}
            />
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: space.sm, paddingTop: space.md }}
        >
          {SORTS.map((option) => (
            <Pill
              key={option.value}
              label={option.label}
              size="sm"
              selected={sort === option.value}
              onPress={() => setSort(option.value)}
            />
          ))}
        </ScrollView>
      </View>

      {view === 'map' ? (
        <View style={{ flex: 1 }}>
          <Map
            markers={markers}
            polyline={geometry}
            interactive
            rounded={false}
            height={undefined as never}
            style={{ flex: 1, borderRadius: 0 }}
            onMarkerPress={(id) => setSelected(id)}
          />

          {selectedOption ? (
            <View
              style={[
                {
                  position: 'absolute',
                  left: space.base,
                  right: space.base,
                  bottom: insets.bottom + 76,
                  backgroundColor: palette.surface,
                  borderRadius: radius.lg,
                  paddingHorizontal: space.base,
                },
                shadow.raised,
              ]}
            >
              {(() => {
                const service = getService(selectedOption.serviceId);
                if (!service) return null;
                return (
                  <TrainCardCompact
                    service={service}
                    option={selectedOption}
                    onPress={() => router.push(`/train/${service.id}?journeyId=${encodeURIComponent(selectedOption.id)}`)}
                  />
                );
              })()}
            </View>
          ) : null}
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: space.lg, paddingBottom: 120 + insets.bottom }}
        >
          <Text variant="caption" tone="secondary" style={{ marginBottom: space.base }}>
            {loading && options.length === 0
              ? 'Checking Pakistan Railways…'
              : `${pluralise(options.length, 'train')} on ${dayLabel(`${date}T09:00:00`).toLowerCase()}`}
            {data?.source === 'cache' ? ' · showing your last saved results' : ''}
          </Text>

          {loading && options.length === 0 ? (
            <>
              <TrainCardSkeleton />
              <TrainCardSkeleton />
              <TrainCardSkeleton />
            </>
          ) : options.length === 0 ? (
            <View style={{ paddingVertical: space.h2, alignItems: 'center' }}>
              <Icon name="train" size={30} color={palette.textTertiary} />
              <Text variant="subheading" style={{ marginTop: space.base }}>
                No direct train on this route
              </Text>
              <Text variant="body" tone="secondary" align="center" style={{ marginTop: 4, maxWidth: 280 }}>
                Not every pair of stations is joined by a through service. Try a nearby junction like Rohri,
                Multan Cantt or Lahore.
              </Text>
              <Touchable
                onPress={() => router.push('/search')}
                scaleTo={0.96}
                style={{ marginTop: space.lg }}
                accessibilityRole="button"
              >
                <Text variant="bodyMedium" style={{ textDecorationLine: 'underline' }}>
                  Change search
                </Text>
              </Touchable>
            </View>
          ) : (
            options.map((option) => {
              const service = getService(option.serviceId);
              if (!service) return null;
              return (
                <TrainCard
                  key={option.id}
                  service={service}
                  option={option}
                  onPress={() => router.push(`/train/${service.id}?journeyId=${encodeURIComponent(option.id)}`)}
                />
              );
            })
          )}
        </ScrollView>
      )}

      {/* The floating view toggle. */}
      <View
        style={{
          position: 'absolute',
          bottom: insets.bottom + space.xl,
          left: 0,
          right: 0,
          alignItems: 'center',
        }}
        pointerEvents="box-none"
      >
        <Touchable
          onPress={() => setView((v) => (v === 'list' ? 'map' : 'list'))}
          haptic="medium"
          scaleTo={0.94}
          accessibilityRole="button"
          accessibilityLabel={view === 'list' ? 'Show map' : 'Show list'}
          style={[
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.sm,
              paddingHorizontal: space.base,
              paddingVertical: space.md,
              borderRadius: radius.pill,
              backgroundColor: palette.textPrimary,
            },
            shadow.floating,
          ]}
        >
          <Text variant="bodyMedium" style={{ color: palette.surface }}>
            {view === 'list' ? 'Map' : 'List'}
          </Text>
          <Icon name={view === 'list' ? 'map' : 'list'} size={16} color={palette.surface} />
        </Touchable>
      </View>
    </View>
  );
}
