import React, { useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { Screen, Section } from '@/components/primitives/Screen';
import { Text } from '@/components/primitives/Text';
import { Surface } from '@/components/primitives/Surface';
import { Button } from '@/components/primitives/Button';
import { Icon } from '@/components/primitives/Icon';
import { Chip } from '@/components/primitives/Chip';
import { Divider } from '@/components/primitives/Divider';
import { useTheme } from '@/theme/ThemeProvider';
import { useSearchStore } from '@/state/useSearchStore';
import { getStation, searchStations, STATIONS } from '@/data/stations';
import { Station } from '@/types';

type Field = 'origin' | 'destination' | null;

export default function PlanScreen() {
  const { palette, space, radius } = useTheme();
  const { originId, destinationId, setOrigin, setDestination, swap, remember } = useSearchStore();

  const [editing, setEditing] = useState<Field>(null);
  const [query, setQuery] = useState('');
  const [when, setWhen] = useState<'now' | 'later'>('now');

  const origin = originId ? getStation(originId) : undefined;
  const destination = destinationId ? getStation(destinationId) : undefined;
  const results = useMemo(() => (editing ? searchStations(query) : []), [editing, query]);

  const ready = Boolean(originId && destinationId && originId !== destinationId);

  const pick = (station: Station) => {
    if (editing === 'origin') setOrigin(station.id);
    if (editing === 'destination') setDestination(station.id);
    setEditing(null);
    setQuery('');
  };

  return (
    <Screen title="Plan a journey" subtitle="Two stations and a time. That is the whole form.">
      <Section>
        <Surface padding={space.xs}>
          <StationField
            role="From"
            station={origin}
            active={editing === 'origin'}
            onPress={() => {
              setEditing('origin');
              setQuery('');
            }}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Divider inset={54} style={{ flex: 1 }} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Swap origin and destination"
              onPress={swap}
              hitSlop={10}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                marginHorizontal: space.sm,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: palette.surfaceSunken,
              }}
            >
              <Icon name="swap" size={17} color={palette.brand} />
            </Pressable>
          </View>
          <StationField
            role="To"
            station={destination}
            active={editing === 'destination'}
            onPress={() => {
              setEditing('destination');
              setQuery('');
            }}
          />
        </Surface>

        {editing ? (
          <Surface padding={space.sm} style={{ marginTop: space.sm }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.sm,
                paddingHorizontal: space.md,
                paddingVertical: space.sm,
                backgroundColor: palette.surfaceSunken,
                borderRadius: radius.sm,
              }}
            >
              <Icon name="search" size={16} color={palette.textTertiary} />
              <TextInput
                autoFocus
                value={query}
                onChangeText={setQuery}
                placeholder="Station name or three-letter code"
                placeholderTextColor={palette.textTertiary}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="search"
                style={{ flex: 1, color: palette.textPrimary, fontSize: 15, paddingVertical: 4 }}
              />
              <Pressable onPress={() => setEditing(null)} hitSlop={10}>
                <Text variant="label" tone="brand">
                  Cancel
                </Text>
              </Pressable>
            </View>

            <View style={{ marginTop: space.sm }}>
              {results.length === 0 ? (
                <Text variant="callout" tone="tertiary" style={{ padding: space.lg }}>
                  No station matches “{query}”.
                </Text>
              ) : (
                results.map((station, index) => (
                  <View key={station.id}>
                    {index > 0 ? <Divider inset={space.lg} /> : null}
                    <Pressable
                      onPress={() => pick(station)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: space.md,
                        paddingHorizontal: space.lg,
                        gap: space.md,
                      }}
                    >
                      <View
                        style={{
                          width: 42,
                          paddingVertical: 3,
                          borderRadius: radius.xs,
                          alignItems: 'center',
                          backgroundColor: palette.surfaceSunken,
                        }}
                      >
                        <Text variant="numeric" tone="secondary" style={{ fontSize: 12 }}>
                          {station.code}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text variant="bodyStrong">{station.name}</Text>
                        <Text variant="caption" tone="tertiary">
                          {station.city} · {station.platforms.length} platforms
                        </Text>
                      </View>
                      {station.facilities.includes('step-free') ? (
                        <Icon name="wheelchair" size={15} color={palette.textTertiary} />
                      ) : null}
                    </Pressable>
                  </View>
                ))
              )}
            </View>
          </Surface>
        ) : null}
      </Section>

      {!editing ? (
        <>
          <Section title="When">
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Chip label="Leave now" selected={when === 'now'} onPress={() => setWhen('now')} icon="clock" />
              <Chip label="Pick a time" selected={when === 'later'} onPress={() => setWhen('later')} icon="calendar" />
            </View>
            {when === 'later' ? (
              <Text variant="caption" tone="tertiary" style={{ marginTop: space.md }}>
                Timed searches use the operator's published timetable, which extends 12 weeks ahead.
              </Text>
            ) : null}
          </Section>

          <Section title="Popular from here">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {STATIONS.filter((s) => s.id !== originId)
                .slice(0, 5)
                .map((station) => (
                  <Chip
                    key={station.id}
                    label={station.name}
                    onPress={() => setDestination(station.id)}
                    selected={station.id === destinationId}
                  />
                ))}
            </View>
          </Section>
        </>
      ) : null}

      <Section>
        <Button
          label={ready ? 'Find trains' : 'Choose two stations'}
          icon="arrow-right"
          size="lg"
          disabled={!ready}
          fullWidth
          onPress={() => {
            remember();
            router.push('/booking/results');
          }}
        />
      </Section>
    </Screen>
  );
}

function StationField({
  role,
  station,
  active,
  onPress,
}: {
  role: string;
  station: Station | undefined;
  active: boolean;
  onPress(): void;
}) {
  const { palette, space, radius } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${role}: ${station?.name ?? 'not set'}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: space.lg,
        paddingHorizontal: space.lg,
        borderRadius: radius.md,
        backgroundColor: active ? palette.surfaceSunken : 'transparent',
        gap: space.md,
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: palette.surfaceSunken,
        }}
      >
        <Icon name={role === 'From' ? 'pin' : 'train'} size={16} color={palette.brand} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="overline" tone="tertiary">
          {role}
        </Text>
        <Text variant="headline" tone={station ? 'primary' : 'tertiary'} numberOfLines={1}>
          {station?.name ?? 'Choose a station'}
        </Text>
      </View>
      <Icon name="chevron-right" size={17} color={palette.textTertiary} />
    </Pressable>
  );
}
