import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Platform, Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { Screen, Section } from '@/components/primitives/Screen';
import { Text } from '@/components/primitives/Text';
import { Surface } from '@/components/primitives/Surface';
import { Button } from '@/components/primitives/Button';
import { Icon } from '@/components/primitives/Icon';
import { Chip } from '@/components/primitives/Chip';
import { MapCanvas } from '@/components/map/MapCanvas';
import { useTheme } from '@/theme/ThemeProvider';
import { Coordinate } from '@/types';
import { getStation } from '@/data/stations';
import { walkingRoute } from '@/data/geometry';
import { facilityMeta } from '@/data/amenities';
import { currentPosition, lastKnown, requestForeground, watchPosition } from '@/services/location';
import { bearingDegrees, distanceMeters, formatDistance, walkingMinutes } from '@/utils/geo';

/**
 * Live navigation to the departure station.
 *
 * We do not try to be a turn-by-turn app. The honest job here is: which way is
 * the station, how far, which entrance should you use for your platform, and how
 * long the walk inside takes once you are through the door - the part every
 * general-purpose maps app gets wrong, because it stops at the building.
 * "Open in Maps" hands off for the street-level detail.
 */
export default function NavigateScreen() {
  const { palette, space, radius } = useTheme();
  const { stationId } = useLocalSearchParams<{ stationId: string }>();
  const station = stationId ? getStation(stationId) : undefined;

  const [position, setPosition] = useState<Coordinate | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [permission, setPermission] = useState<'granted' | 'denied' | 'undetermined' | 'asking'>('asking');
  const [entranceId, setEntranceId] = useState<string | null>(null);

  useEffect(() => {
    let handle: { remove(): void } | null = null;
    let cancelled = false;

    void (async () => {
      const cached = await lastKnown();
      if (cached && !cancelled) setPosition(cached);

      const state = await requestForeground();
      if (cancelled) return;
      setPermission(state);
      if (state !== 'granted') return;

      const fix = await currentPosition();
      if (fix && !cancelled) setPosition(fix);

      handle = await watchPosition((coordinate, course) => {
        setPosition(coordinate);
        setHeading(course);
      }, 'walking');
    })();

    return () => {
      cancelled = true;
      handle?.remove();
    };
  }, []);

  const entrance = useMemo(() => {
    if (!station) return null;
    if (entranceId) return station.entrances.find((e) => e.id === entranceId) ?? station.entrances[0] ?? null;
    if (!position) return station.entrances[0] ?? null;
    // Default to whichever door is actually nearest to the passenger.
    return [...station.entrances].sort(
      (a, b) => distanceMeters(position, a.coordinate) - distanceMeters(position, b.coordinate),
    )[0] ?? null;
  }, [station, entranceId, position]);

  const walk = useMemo(() => {
    if (!position || !entrance) return [];
    return walkingRoute(position, entrance.coordinate);
  }, [position, entrance]);

  const metres = position && entrance ? distanceMeters(position, entrance.coordinate) : null;
  const bearing = position && entrance ? bearingDegrees(position, entrance.coordinate) : null;

  if (!station) {
    return (
      <Screen title="Station not found" back>
        <Section>
          <Surface padding={space.xl}>
            <Text variant="body" tone="secondary">
              We do not have that station in our reference data.
            </Text>
          </Surface>
        </Section>
      </Screen>
    );
  }

  const openInMaps = () => {
    const { lat, lon } = entrance?.coordinate ?? station.coordinate;
    const label = encodeURIComponent(station.name);
    const url =
      Platform.OS === 'ios'
        ? `http://maps.apple.com/?daddr=${lat},${lon}&dirflg=w&q=${label}`
        : `geo:${lat},${lon}?q=${lat},${lon}(${label})`;
    void Linking.openURL(url);
  };

  return (
    <Screen
      title={`Getting to ${station.name}`}
      eyebrow="Live navigation"
      back
      footer={
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 1 }}>
            <Button label="Open in Maps" variant="secondary" icon="arrow-up-right" fullWidth onPress={openInMaps} />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label="Onward transit"
              icon="bus"
              iconPosition="leading"
              fullWidth
              onPress={() => router.push(`/lastmile/${station.id}`)}
            />
          </View>
        </View>
      }
    >
      <Section>
        <Surface padding={0} style={{ overflow: 'hidden' }}>
          <MapCanvas
            height={250}
            walking={walk}
            user={position}
            stations={[
              {
                id: station.id,
                name: station.name,
                coordinate: entrance?.coordinate ?? station.coordinate,
                emphasis: 'primary',
              },
            ]}
            include={position ? [position] : []}
            showGrid
          />

          <View style={{ padding: space.lg }}>
            {permission === 'denied' ? (
              <>
                <Text variant="headline">Location is off</Text>
                <Text variant="body" tone="secondary" style={{ marginTop: 4 }}>
                  Turn on location for Meridian Rail to see the walk from where you are. The station
                  details below work either way.
                </Text>
              </>
            ) : metres !== null && bearing !== null ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                  <View
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 26,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: palette.surfaceSunken,
                      transform: [{ rotate: `${bearing - (heading ?? 0)}deg` }],
                    }}
                  >
                    <Icon name="arrow-right" size={24} color={palette.brand} strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="title">{formatDistance(metres)}</Text>
                    <Text variant="body" tone="secondary">
                      about {walkingMinutes(metres)} min walk to {entrance?.label ?? 'the entrance'}
                    </Text>
                  </View>
                </View>
                <Text variant="caption" tone="tertiary" style={{ marginTop: space.md }}>
                  The arrow points at the entrance{heading !== null ? ', relative to the way you are facing' : ''}.
                  Then allow {station.concourseWalkMinutes} minutes inside the station to reach the platform.
                </Text>
              </>
            ) : (
              <Text variant="body" tone="secondary">
                Finding your position…
              </Text>
            )}
          </View>
        </Surface>
      </Section>

      {station.entrances.length > 1 ? (
        <Section title="Which entrance">
          <View style={{ gap: space.sm }}>
            {station.entrances.map((option) => {
              const selected = option.id === entrance?.id;
              const away = position ? distanceMeters(position, option.coordinate) : null;
              return (
                <Pressable key={option.id} onPress={() => setEntranceId(option.id)}>
                  <Surface
                    padding={space.lg}
                    bordered
                    style={{
                      borderWidth: selected ? 2 : 1,
                      borderColor: selected ? palette.brand : palette.hairline,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                      <Icon name="pin" size={17} color={selected ? palette.brand : palette.textTertiary} />
                      <View style={{ flex: 1 }}>
                        <Text variant="bodyStrong">{option.label}</Text>
                        {away !== null ? (
                          <Text variant="caption" tone="tertiary">
                            {formatDistance(away)} · {walkingMinutes(away)} min
                          </Text>
                        ) : null}
                      </View>
                      {selected ? <Icon name="check" size={16} color={palette.brand} strokeWidth={2.4} /> : null}
                    </View>
                  </Surface>
                </Pressable>
              );
            })}
          </View>
        </Section>
      ) : null}

      <Section title="At the station">
        <Surface padding={space.lg}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {station.facilities.map((facility) => (
              <Chip key={facility} label={facilityMeta[facility].label} compact />
            ))}
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.sm,
              marginTop: space.lg,
              padding: space.md,
              borderRadius: radius.sm,
              backgroundColor: palette.surfaceSunken,
            }}
          >
            <Icon name="walk" size={15} color={palette.textSecondary} />
            <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
              {station.platforms.length} platforms · typically {station.concourseWalkMinutes} minutes from
              the entrance to the far platform.
            </Text>
          </View>
        </Surface>
      </Section>
    </Screen>
  );
}
