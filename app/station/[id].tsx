import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Platform, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';
import { Screen, GUTTER } from '@/components/primitives/Screen';
import { Text } from '@/components/primitives/Text';
import { Icon, IconName } from '@/components/primitives/Icon';
import { Button } from '@/components/primitives/Button';
import { Pill } from '@/components/primitives/Pill';
import { Photo } from '@/components/primitives/Photo';
import { Divider } from '@/components/primitives/Divider';
import { Touchable } from '@/components/primitives/Touchable';
import { Map } from '@/components/map/Map';
import { MapMarker } from '@/components/map/types';
import { useAsync } from '@/hooks/useAsync';
import { useTick } from '@/hooks/useTick';
import { api } from '@/services/apiClient';
import { currentPosition, lastKnown, requestForeground, watchPosition } from '@/services/location';
import { walkingRoute as googleWalkingRoute } from '@/services/googleMaps';
import { getStation, stationName } from '@/data/stations';
import { facilityMeta, modeLabel } from '@/data/discovery';
import { photo } from '@/data/photos';
import { bearingDegrees, distanceMeters, formatDistance, walkingMinutes } from '@/utils/geo';
import { clockTime, relativeLabel } from '@/utils/time';
import { money } from '@/utils/format';
import { Coordinate, LastMileOption, TransitMode } from '@/types';

const MODE_ICON: Record<TransitMode, IconName> = {
  bus: 'bus',
  metrobus: 'bus',
  brt: 'metro',
  rickshaw: 'rickshaw',
  taxi: 'taxi',
  'ride-hailing': 'car',
  walk: 'walk',
};

/**
 * A station.
 *
 * Two jobs, in this order: getting you *to* it, and getting you *away* from it.
 *
 * The navigation half deliberately does not try to be turn-by-turn. The honest
 * question is "which way, how far, and how long once I am inside" - and that
 * last part is the bit every general-purpose maps app gets wrong, because it
 * stops at the building. "Open in Maps" hands off for street-level detail.
 */
export default function StationScreen() {
  const { palette, space, radius } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const now = useTick(30_000);

  const station = id ? getStation(id) : undefined;

  const [position, setPosition] = useState<Coordinate | null>(null);
  const [permission, setPermission] = useState<'granted' | 'denied' | 'undetermined' | 'asking'>('asking');
  const [walkPath, setWalkPath] = useState<Coordinate[]>([]);

  const { data: connections } = useAsync(() => api.lastMile(id ?? ''), [id]);
  const { data: board } = useAsync(() => api.departures(id ?? ''), [id]);

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

      handle = await watchPosition((coordinate) => setPosition(coordinate), 'walking');
    })();

    return () => {
      cancelled = true;
      handle?.remove();
    };
  }, []);

  // A real walking route from Google when a key is configured; a straight
  // bearing when not. Both answer "which way", one of them knows about roads.
  useEffect(() => {
    if (!position || !station) return;
    let cancelled = false;
    void googleWalkingRoute(position, station.coordinate).then((leg) => {
      if (!cancelled && leg) setWalkPath(leg.polyline);
    });
    return () => {
      cancelled = true;
    };
  }, [position, station]);

  const departures = useMemo(() => {
    if (!board?.data || !id) return [];
    return board.data
      .map((service) => {
        const call = service.calls.find((c) => c.stationId === id);
        return call ? { service, call } : null;
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
      .filter((entry) => {
        const at = new Date(entry.call.expectedDeparture ?? entry.call.expectedArrival ?? '').getTime();
        return at > now - 20 * 60_000;
      })
      .sort(
        (a, b) =>
          new Date(a.call.expectedDeparture ?? a.call.expectedArrival ?? '').getTime() -
          new Date(b.call.expectedDeparture ?? b.call.expectedArrival ?? '').getTime(),
      )
      .slice(0, 6);
  }, [board, id, now]);

  if (!station) {
    return (
      <Screen title="Station" back>
        <View style={{ paddingHorizontal: GUTTER, paddingTop: space.xl }}>
          <Text variant="bodyLarge" tone="secondary">
            We do not have that station in our reference data.
          </Text>
        </View>
      </Screen>
    );
  }

  const metres = position ? distanceMeters(position, station.coordinate) : null;
  const bearing = position ? bearingDegrees(position, station.coordinate) : null;
  const image = photo(station.photoKey);

  const markers: MapMarker[] = [
    { id: station.id, coordinate: station.coordinate, kind: 'destination', label: station.name },
    ...(position ? [{ id: 'you', coordinate: position, kind: 'user' as const }] : []),
  ];

  const openInMaps = () => {
    const { lat, lon } = station.coordinate;
    const label = encodeURIComponent(station.name);
    const url =
      Platform.OS === 'ios'
        ? `http://maps.apple.com/?daddr=${lat},${lon}&dirflg=w&q=${label}`
        : Platform.OS === 'android'
          ? `geo:${lat},${lon}?q=${lat},${lon}(${label})`
          : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=walking`;
    void Linking.openURL(url);
  };

  return (
    <Screen title={station.name} back>
      <View style={{ paddingHorizontal: GUTTER }}>
        <Photo uri={image?.url} height={190} radius={radius.md} accessibilityLabel={`${station.name} station`} />

        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: space.base, gap: space.md }}>
          <View style={{ flex: 1 }}>
            <Text variant="display">{station.name}</Text>
            <Text variant="bodyLarge" tone="secondary" urdu style={{ marginTop: 2 }}>
              {station.nameUrdu}
            </Text>
            <Text variant="body" tone="secondary" style={{ marginTop: space.sm }}>
              {station.city}, {station.province} · {station.code} · {station.line}
            </Text>
          </View>
        </View>
      </View>

      <Divider style={{ marginVertical: space.lg, marginHorizontal: GUTTER }} />

      {/* Getting there. */}
      <View style={{ paddingHorizontal: GUTTER }}>
        <Text variant="heading" style={{ marginBottom: space.md }}>
          Getting there
        </Text>

        <Map markers={markers} walkingPath={walkPath} height={210} interactive={false} include={position ? [position] : []} />

        {permission === 'denied' ? (
          <Text variant="body" tone="secondary" style={{ marginTop: space.md }}>
            Location is off, so we cannot show the walk from where you are. Everything below still works.
          </Text>
        ) : metres !== null && bearing !== null ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.base, marginTop: space.base }}>
            <View
              style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: palette.fill,
                transform: [{ rotate: `${bearing}deg` }],
              }}
            >
              <Icon name="arrow-right" size={22} color={palette.brand} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="subheading">{formatDistance(metres)} away</Text>
              <Text variant="body" tone="secondary">
                about {walkingMinutes(metres)} min on foot, then {station.concourseWalkMinutes} min inside
              </Text>
            </View>
          </View>
        ) : (
          <Text variant="body" tone="secondary" style={{ marginTop: space.md }}>
            Finding your position…
          </Text>
        )}

        <Button
          label="Open in Maps"
          variant="outline"
          icon="arrow-up-right"
          fullWidth
          onPress={openInMaps}
          style={{ marginTop: space.base }}
        />
      </View>

      <Divider style={{ marginVertical: space.lg, marginHorizontal: GUTTER }} />

      {/* At the station. */}
      <View style={{ paddingHorizontal: GUTTER }}>
        <Text variant="heading" style={{ marginBottom: space.md }}>
          At the station
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {station.facilities.map((facility) => (
            <Pill
              key={facility}
              label={facilityMeta[facility].label}
              icon={facilityMeta[facility].icon as IconName}
              size="sm"
            />
          ))}
        </View>
        <Text variant="caption" tone="tertiary" style={{ marginTop: space.md }}>
          {station.platforms} platforms · allow {station.concourseWalkMinutes} minutes from the entrance to the
          far platform.
        </Text>
      </View>

      {departures.length > 0 ? (
        <>
          <Divider style={{ marginVertical: space.lg, marginHorizontal: GUTTER }} />
          <View style={{ paddingHorizontal: GUTTER }}>
            <Text variant="heading" style={{ marginBottom: space.md }}>
              Next departures
            </Text>
            {departures.map(({ service, call }, index) => (
              <Touchable
                key={`${service.id}-${call.sequence}`}
                onPress={() => router.push(`/train/${service.id}`)}
                scaleTo={0.99}
                accessibilityRole="button"
                accessibilityLabel={`${service.name} at ${clockTime(call.expectedDeparture)}`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.base,
                  paddingVertical: space.md,
                  borderTopWidth: index === 0 ? 0 : 1,
                  borderTopColor: palette.border,
                }}
              >
                <Text variant="label" style={{ minWidth: 52 }}>
                  {clockTime(call.expectedDeparture ?? call.expectedArrival)}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium" numberOfLines={1}>
                    {service.name}
                  </Text>
                  <Text variant="caption" tone="secondary" numberOfLines={1}>
                    {service.number} to {stationName(service.destinationStationId)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text variant="caption" tone={call.delayMinutes > 5 ? 'warning' : 'secondary'}>
                    {call.delayMinutes > 1 ? `${call.delayMinutes} min late` : 'On time'}
                  </Text>
                  <Text variant="caption" tone="tertiary">
                    Plat {call.platform ?? '–'}
                  </Text>
                </View>
              </Touchable>
            ))}
          </View>
        </>
      ) : null}

      <Divider style={{ marginVertical: space.lg, marginHorizontal: GUTTER }} />

      {/* Onward. */}
      <View style={{ paddingHorizontal: GUTTER }}>
        <Text variant="heading" style={{ marginBottom: space.xs }}>
          Onward from here
        </Text>
        <Text variant="body" tone="secondary" style={{ marginBottom: space.base }}>
          Sorted by the soonest you could actually be on board, walk included.
        </Text>

        {(connections?.data ?? [])
          .slice()
          .sort((a, b) => catchableAt(a, now) - catchableAt(b, now))
          .map((option, index) => (
            <View
              key={option.id}
              style={{
                flexDirection: 'row',
                gap: space.base,
                paddingVertical: space.base,
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: palette.border,
              }}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: radius.sm,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: palette.fill,
                }}
              >
                <Icon name={MODE_ICON[option.mode]} size={20} color={palette.textPrimary} />
              </View>

              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                  <Text variant="bodyMedium" numberOfLines={1} style={{ flex: 1 }}>
                    {option.name}
                  </Text>
                  <Text variant="caption" tone="secondary">
                    {modeLabel[option.mode]}
                  </Text>
                </View>
                <Text variant="body" tone="secondary" numberOfLines={2} style={{ marginTop: 1 }}>
                  {option.headsign}
                </Text>
                <Text variant="caption" tone="tertiary" style={{ marginTop: 3 }}>
                  {option.boardingPoint} · {option.walkMinutesToBoarding} min walk
                </Text>

                {option.departures.length > 0 ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm }}>
                    {option.departures.slice(0, 3).map((departure) => {
                      const missed =
                        new Date(departure).getTime() - now < option.walkMinutesToBoarding * 60_000;
                      return (
                        <View
                          key={departure}
                          style={{
                            paddingHorizontal: 9,
                            paddingVertical: 4,
                            borderRadius: radius.xs,
                            backgroundColor: missed ? palette.fill : palette.successSoft,
                          }}
                        >
                          <Text
                            variant="caption"
                            style={{
                              color: missed ? palette.textTertiary : palette.success,
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
                ) : null}

                <Text variant="caption" tone="tertiary" style={{ marginTop: space.sm }}>
                  {option.departures.length > 0
                    ? `Next you can make: ${relativeLabel(new Date(catchableAt(option, now)).toISOString(), new Date(now))}`
                    : 'Available now'}
                  {option.fareMinor !== null ? ` · ${money(option.fareMinor)}` : ''}
                  {option.note ? ` · ${option.note}` : ''}
                </Text>
              </View>
            </View>
          ))}
      </View>
    </Screen>
  );
}

/** Epoch millis of the first departure the passenger could physically board. */
function catchableAt(option: LastMileOption, now: number): number {
  const earliest = now + option.walkMinutesToBoarding * 60_000;
  const next = option.departures.map((d) => new Date(d).getTime()).find((t) => t >= earliest);
  if (next) return next;
  if (option.departures.length === 0) return earliest;
  const last = new Date(option.departures[option.departures.length - 1]!).getTime();
  return last + (option.frequencyMinutes ?? 30) * 60_000;
}
