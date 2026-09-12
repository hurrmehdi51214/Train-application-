import React, { useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router } from 'expo-router';

import { Screen, Section } from '@/components/primitives/Screen';
import { Text } from '@/components/primitives/Text';
import { Surface } from '@/components/primitives/Surface';
import { Icon } from '@/components/primitives/Icon';
import { Segmented } from '@/components/primitives/Segmented';
import { ServiceCard } from '@/components/rail/ServiceCard';
import { useTheme } from '@/theme/ThemeProvider';
import { useSearchStore } from '@/state/useSearchStore';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/services/apiClient';
import { stationName } from '@/data/stations';
import { allServices } from '@/data/services';

type Sort = 'departure' | 'price' | 'duration';

export default function ResultsScreen() {
  const { palette, space } = useTheme();
  const originId = useSearchStore((s) => s.originId);
  const destinationId = useSearchStore((s) => s.destinationId);
  const [sort, setSort] = useState<Sort>('departure');

  const { data, loading, error, reload } = useAsync(
    () => api.searchJourneys(originId ?? '', destinationId ?? ''),
    [originId, destinationId],
  );

  const operators = useMemo(() => {
    const map = new Map<string, string>();
    allServices().forEach((service) => map.set(service.id, service.operator));
    return map;
  }, []);

  const options = useMemo(() => {
    const list = [...(data?.data ?? [])];
    switch (sort) {
      case 'price':
        return list.sort(
          (a, b) =>
            Math.min(...a.fares.map((f) => f.priceMinor)) - Math.min(...b.fares.map((f) => f.priceMinor)),
        );
      case 'duration':
        return list.sort((a, b) => a.durationMinutes - b.durationMinutes);
      default:
        return list.sort(
          (a, b) => new Date(a.legs[0]!.departure).getTime() - new Date(b.legs[0]!.departure).getTime(),
        );
    }
  }, [data, sort]);

  return (
    <Screen
      title={`${stationName(originId ?? '')} → ${stationName(destinationId ?? '')}`}
      eyebrow="Trains today"
      back
      onRefresh={reload}
      refreshing={loading && Boolean(data)}
    >
      <Section>
        <Segmented<Sort>
          value={sort}
          onChange={setSort}
          options={[
            { value: 'departure', label: 'Earliest' },
            { value: 'price', label: 'Cheapest' },
            { value: 'duration', label: 'Fastest' },
          ]}
        />
      </Section>

      {data?.source === 'cache' ? (
        <Section>
          <Surface padding={space.md} level="sunken" elevated={false}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Icon name="offline" size={15} color={palette.textTertiary} />
              <Text variant="caption" tone="tertiary" style={{ flex: 1 }}>
                Showing the last results saved on this device. Times may have moved since.
              </Text>
            </View>
          </Surface>
        </Section>
      ) : null}

      <Section>
        {loading && !data ? (
          <View style={{ paddingVertical: space.h3, alignItems: 'center' }}>
            <ActivityIndicator color={palette.brand} />
            <Text variant="caption" tone="tertiary" style={{ marginTop: space.md }}>
              Checking live times…
            </Text>
          </View>
        ) : error ? (
          <Surface padding={space.xl}>
            <Icon name="alert" size={22} color={palette.critical} />
            <Text variant="headline" style={{ marginTop: space.md }}>
              Could not reach the timetable
            </Text>
            <Text variant="body" tone="secondary" style={{ marginTop: 4 }}>
              {error.message}
            </Text>
          </Surface>
        ) : options.length === 0 ? (
          <Surface padding={space.xl}>
            <Icon name="train" size={22} color={palette.textTertiary} />
            <Text variant="headline" style={{ marginTop: space.md }}>
              No direct trains on this route today
            </Text>
            <Text variant="body" tone="secondary" style={{ marginTop: 4 }}>
              Try a different pair of stations, or check back closer to the time.
            </Text>
          </Surface>
        ) : (
          options.map((option) => (
            <ServiceCard
              key={option.id}
              option={option}
              operator={operators.get(option.legs[0]!.serviceId)}
              onPress={() => router.push(`/booking/seats?journeyId=${encodeURIComponent(option.id)}`)}
            />
          ))
        )}
      </Section>
    </Screen>
  );
}
