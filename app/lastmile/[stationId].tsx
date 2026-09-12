import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { Screen, Section } from '@/components/primitives/Screen';
import { Text } from '@/components/primitives/Text';
import { Surface } from '@/components/primitives/Surface';
import { Icon, IconName } from '@/components/primitives/Icon';
import { Chip } from '@/components/primitives/Chip';
import { Divider } from '@/components/primitives/Divider';
import { useTheme } from '@/theme/ThemeProvider';
import { useAsync } from '@/hooks/useAsync';
import { useTick } from '@/hooks/useTick';
import { api } from '@/services/apiClient';
import { getStation } from '@/data/stations';
import { LastMileOption, TransitMode } from '@/types';
import { clockTime, relativeLabel } from '@/utils/time';
import { modeCopy } from '@/utils/format';

const MODE_ICON: Record<TransitMode, IconName> = {
  bus: 'bus',
  tram: 'tram',
  metro: 'metro',
  ferry: 'ferry',
  bike: 'bike',
  scooter: 'scooter',
  taxi: 'taxi',
  walk: 'walk',
};

/**
 * Last-mile connections.
 *
 * Ordered by when you can realistically be on board - the walk to the stop is
 * added to the departure before sorting, so a bus leaving in three minutes from
 * a stand eight minutes away correctly ranks below one leaving in ten.
 */
export default function LastMileScreen() {
  const { palette, space, radius } = useTheme();
  const { stationId } = useLocalSearchParams<{ stationId: string }>();
  const now = useTick(30_000);
  const station = stationId ? getStation(stationId) : undefined;

  const { data, loading, reload } = useAsync(() => api.lastMile(stationId ?? ''), [stationId]);
  const [filter, setFilter] = useState<TransitMode | 'all'>('all');

  const options = useMemo(() => {
    const list = data?.data ?? [];
    const filtered = filter === 'all' ? list : list.filter((option) => option.mode === filter);
    return [...filtered].sort((a, b) => catchableAt(a, now) - catchableAt(b, now));
  }, [data, filter, now]);

  const modes = useMemo(() => {
    const present = new Set((data?.data ?? []).map((option) => option.mode));
    return Array.from(present);
  }, [data]);

  return (
    <Screen
      title="Onward from here"
      eyebrow={station?.name ?? 'Connections'}
      subtitle="Local transit leaving the station, soonest you can actually catch it first."
      back
      onRefresh={reload}
      refreshing={loading && Boolean(data)}
    >
      {modes.length > 1 ? (
        <Section>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            <Chip label="Everything" selected={filter === 'all'} onPress={() => setFilter('all')} />
            {modes.map((mode) => (
              <Chip
                key={mode}
                label={modeCopy[mode]}
                icon={MODE_ICON[mode]}
                selected={filter === mode}
                onPress={() => setFilter(mode)}
              />
            ))}
          </View>
        </Section>
      ) : null}

      <Section>
        {options.length === 0 ? (
          <Surface padding={space.xl}>
            <Icon name="bus" size={22} color={palette.textTertiary} />
            <Text variant="headline" style={{ marginTop: space.md }}>
              {loading ? 'Looking for connections…' : 'No connections listed here'}
            </Text>
            {!loading ? (
              <Text variant="body" tone="secondary" style={{ marginTop: 4 }}>
                We only show transit we have a live feed for. There may still be buses outside -
                check the station's own departure boards.
              </Text>
            ) : null}
          </Surface>
        ) : (
          options.map((option) => (
            <View key={option.id} style={{ marginBottom: space.md }}>
              <Surface padding={space.lg}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: radius.sm,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: palette.surfaceSunken,
                    }}
                  >
                    <Icon name={MODE_ICON[option.mode]} size={20} color={palette.brand} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                      <Text variant="headline">{option.line}</Text>
                      {option.accessible ? (
                        <Icon name="wheelchair" size={14} color={palette.textTertiary} />
                      ) : null}
                    </View>
                    <Text variant="callout" tone="secondary" numberOfLines={2} style={{ marginTop: 1 }}>
                      {option.headsign}
                    </Text>
                    <Text variant="caption" tone="tertiary" style={{ marginTop: 4 }}>
                      {option.boardingPoint} · {option.walkMinutesToBoarding} min walk · {option.operator}
                    </Text>
                  </View>
                </View>

                {option.departures.length > 0 ? (
                  <>
                    <Divider style={{ marginVertical: space.md }} />
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                      {option.departures.slice(0, 4).map((departure, index) => {
                        const reachable = catchableAt(option, now) <= new Date(departure).getTime();
                        const missed = new Date(departure).getTime() - now < option.walkMinutesToBoarding * 60_000;
                        return (
                          <View
                            key={departure}
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 5,
                              borderRadius: radius.xs,
                              backgroundColor: index === 0 && !missed ? palette.successSoft : palette.surfaceSunken,
                            }}
                          >
                            <Text
                              variant="numeric"
                              style={{
                                color: missed
                                  ? palette.textTertiary
                                  : index === 0
                                    ? palette.success
                                    : palette.textSecondary,
                                textDecorationLine: missed ? 'line-through' : 'none',
                              }}
                            >
                              {clockTime(departure)}
                            </Text>
                          </View>
                        );
                      })}
                      {option.frequencyMinutes ? (
                        <Text variant="caption" tone="tertiary" style={{ alignSelf: 'center' }}>
                          then every {option.frequencyMinutes} min
                        </Text>
                      ) : null}
                    </View>
                    <Text variant="caption" tone="tertiary" style={{ marginTop: space.sm }}>
                      Next one you can make: {relativeLabel(new Date(catchableAt(option, now)).toISOString(), new Date(now))}
                      {option.fareNote ? ` · ${option.fareNote}` : ''}
                    </Text>
                  </>
                ) : option.fareNote ? (
                  <>
                    <Divider style={{ marginVertical: space.md }} />
                    <Text variant="caption" tone="tertiary">
                      {option.fareNote}
                    </Text>
                  </>
                ) : null}
              </Surface>
            </View>
          ))
        )}
      </Section>

      {data?.source === 'cache' ? (
        <Section>
          <Text variant="caption" tone="tertiary">
            Saved copy - live departure times need a connection.
          </Text>
        </Section>
      ) : null}
    </Screen>
  );
}

/** Epoch millis of the first departure the passenger could physically board. */
function catchableAt(option: LastMileOption, now: number): number {
  const earliest = now + option.walkMinutesToBoarding * 60_000;
  const next = option.departures.map((d) => new Date(d).getTime()).find((t) => t >= earliest);
  if (next) return next;
  if (option.departures.length === 0) return earliest;
  // Everything listed has gone; fall back to the headway if we know it.
  const last = new Date(option.departures[option.departures.length - 1]!).getTime();
  return last + (option.frequencyMinutes ?? 30) * 60_000;
}
