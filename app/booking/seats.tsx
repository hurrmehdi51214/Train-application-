import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { Screen, Section } from '@/components/primitives/Screen';
import { Text } from '@/components/primitives/Text';
import { Surface } from '@/components/primitives/Surface';
import { Button } from '@/components/primitives/Button';
import { Icon } from '@/components/primitives/Icon';
import { Chip } from '@/components/primitives/Chip';
import { CarriageStrip } from '@/components/rail/CarriageStrip';
import { CrowdingMeter } from '@/components/rail/CrowdingMeter';
import { AmenityGrid } from '@/components/rail/AmenityGrid';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/state/useSettingsStore';
import { getJourneyOption } from '@/data/services';
import { getService } from '@/data/services';
import { stationName } from '@/data/stations';
import { clockTime, durationLabel } from '@/utils/time';
import { crowdingCopy, money } from '@/utils/format';
import { FareOption } from '@/types';

export default function SeatsScreen() {
  const { palette, space, radius } = useTheme();
  const { journeyId } = useLocalSearchParams<{ journeyId: string }>();
  const preferQuiet = useSettingsStore((s) => s.preferQuietCoach);

  const journey = useMemo(() => (journeyId ? getJourneyOption(journeyId) : undefined), [journeyId]);
  const service = useMemo(
    () => (journey ? getService(journey.legs[0]!.serviceId) : undefined),
    [journey],
  );

  const [fareId, setFareId] = useState<string>(() => journey?.fares[0]?.id ?? '');
  const fare = journey?.fares.find((f) => f.id === fareId) ?? journey?.fares[0];

  const eligible = useMemo(
    () => (service?.carriages ?? []).filter((c) => c.class === (fare?.class ?? 'standard') && !c.outOfService),
    [service, fare],
  );

  const [coach, setCoach] = useState<string | null>(null);
  const [seat, setSeat] = useState<string | null>(null);

  const selectedCarriage = eligible.find((c) => c.letter === coach) ?? eligible[0];

  // The quietest eligible coach, which is what "pick for me" should actually do.
  const recommended = useMemo(() => {
    const sorted = [...eligible].sort((a, b) => a.occupancy - b.occupancy);
    if (preferQuiet) {
      const quiet = sorted.find((c) => c.amenities.includes('quiet'));
      if (quiet) return quiet;
    }
    return sorted[0];
  }, [eligible, preferQuiet]);

  if (!journey || !service) {
    return (
      <Screen title="Journey unavailable" back>
        <Section>
          <Surface padding={space.xl}>
            <Text variant="body" tone="secondary">
              That journey is no longer on sale. Search again to see current trains.
            </Text>
          </Surface>
        </Section>
      </Screen>
    );
  }

  const leg = journey.legs[0]!;

  return (
    <Screen
      title="Choose your seat"
      eyebrow={`${clockTime(leg.departure)} to ${stationName(leg.destinationStationId)}`}
      back
      footer={
        <Button
          label={fare ? `Continue · ${money(fare.priceMinor, fare.currency)}` : 'Continue'}
          icon="arrow-right"
          size="lg"
          fullWidth
          onPress={() =>
            router.push(
              `/booking/checkout?journeyId=${encodeURIComponent(journey.id)}&fareId=${encodeURIComponent(
                fare?.id ?? '',
              )}&coach=${encodeURIComponent(coach ?? recommended?.letter ?? '')}&seat=${encodeURIComponent(seat ?? '')}`,
            )
          }
        />
      }
    >
      <Section title="Fare">
        {journey.fares.map((option) => (
          <FareRow
            key={option.id}
            fare={option}
            selected={option.id === fareId}
            onPress={() => {
              setFareId(option.id);
              setCoach(null);
              setSeat(null);
            }}
          />
        ))}
      </Section>

      <Section title="How busy each coach is">
        <Surface padding={space.lg}>
          <CarriageStrip
            carriages={eligible}
            selected={coach ?? recommended?.letter ?? null}
            onSelect={(letter) => {
              setCoach(letter);
              setSeat(null);
            }}
          />

          {selectedCarriage ? (
            <View style={{ marginTop: space.xl }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text variant="headline">Coach {selectedCarriage.letter}</Text>
                <CrowdingMeter level={selectedCarriage.crowding} />
              </View>
              <Text variant="callout" tone="secondary" style={{ marginTop: 4 }}>
                {crowdingCopy[selectedCarriage.crowding].detail} · about{' '}
                {Math.round(selectedCarriage.seats * (1 - selectedCarriage.occupancy))} seats free of{' '}
                {selectedCarriage.seats}
              </Text>

              <View style={{ marginTop: space.lg }}>
                <AmenityGrid amenities={selectedCarriage.amenities} dense />
              </View>
            </View>
          ) : null}

          {recommended && recommended.letter !== coach ? (
            <Pressable
              onPress={() => setCoach(recommended.letter)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.sm,
                marginTop: space.lg,
                padding: space.md,
                borderRadius: radius.sm,
                backgroundColor: palette.successSoft,
              }}
            >
              <Icon name="check" size={15} color={palette.success} />
              <Text variant="caption" style={{ color: palette.success, flex: 1 }}>
                Coach {recommended.letter} is the quietest{preferQuiet ? ' quiet coach' : ''} on this train.
                Tap to pick it.
              </Text>
            </Pressable>
          ) : null}
        </Surface>

        <Text variant="caption" tone="tertiary" style={{ marginTop: space.sm }}>
          Crowding comes from the train's own passenger counters and refreshes at each stop. It is a
          measurement, not a booking count, so it reflects people standing too.
        </Text>
      </Section>

      {selectedCarriage ? (
        <Section title={`Seats in coach ${selectedCarriage.letter}`}>
          <Surface padding={space.lg}>
            <SeatMap
              carriage={selectedCarriage.letter}
              occupancy={selectedCarriage.occupancy}
              selected={seat}
              onSelect={setSeat}
            />
            <View style={{ flexDirection: 'row', gap: space.lg, marginTop: space.lg }}>
              <Legend color={palette.surfaceSunken} label="Free" />
              <Legend color={palette.textTertiary} label="Taken" />
              <Legend color={palette.brand} label="Yours" />
            </View>
          </Surface>
          <Text variant="caption" tone="tertiary" style={{ marginTop: space.sm }}>
            Prefer not to choose? Leave it and we will reserve the best free seat in coach{' '}
            {selectedCarriage.letter} at the moment of booking.
          </Text>
        </Section>
      ) : null}

      <Section title="This journey">
        <Surface padding={space.lg}>
          <Row label="Service" value={`${service.headcode} · ${service.operator}`} />
          <Row label="Departs" value={`${clockTime(leg.departure)} from ${stationName(leg.originStationId)}`} />
          <Row label="Arrives" value={`${clockTime(leg.arrival)} at ${stationName(leg.destinationStationId)}`} />
          <Row label="Duration" value={durationLabel(journey.durationMinutes)} />
          <Row label="Carbon" value={`${(journey.carbonGramsPerPassenger / 1000).toFixed(1)} kg per passenger`} last />
        </Surface>
      </Section>
    </Screen>
  );
}

function FareRow({ fare, selected, onPress }: { fare: FareOption; selected: boolean; onPress(): void }) {
  const { palette, space, radius } = useTheme();

  const title =
    fare.class === 'first'
      ? 'First Class'
      : fare.flexibility === 'advance'
        ? 'Advance single'
        : fare.flexibility === 'off-peak'
          ? 'Off-peak single'
          : 'Anytime single';

  return (
    <Pressable onPress={onPress} style={{ marginBottom: space.sm }}>
      <Surface
        padding={space.lg}
        bordered
        style={{ borderColor: selected ? palette.brand : palette.hairline, borderWidth: selected ? 2 : 1 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text variant="headline">{title}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: space.sm }}>
              {fare.changeable ? <Chip label="Changeable" compact tone="success" /> : <Chip label="Fixed train" compact />}
              {fare.refundable ? <Chip label="Refundable" compact tone="success" /> : null}
              {fare.seatsRemaining !== null && fare.seatsRemaining <= 8 ? (
                <Chip label={`${fare.seatsRemaining} left`} compact tone="warning" />
              ) : null}
            </View>
          </View>
          <View style={{ alignItems: 'flex-end', marginLeft: space.md }}>
            <Text variant="title">{money(fare.priceMinor, fare.currency)}</Text>
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                marginTop: space.sm,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: selected ? palette.brand : 'transparent',
                borderWidth: selected ? 0 : 1.5,
                borderColor: palette.hairline,
              }}
            >
              {selected ? <Icon name="check" size={12} color={palette.onBrand} strokeWidth={2.6} /> : null}
            </View>
          </View>
        </View>
        {selected ? (
          <View style={{ marginTop: space.md, paddingTop: space.md, borderTopWidth: 1, borderTopColor: palette.hairline }}>
            {fare.conditions.map((condition) => (
              <View key={condition} style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
                <Text variant="caption" tone="tertiary">
                  ·
                </Text>
                <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
                  {condition}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </Surface>
    </Pressable>
  );
}

/**
 * A schematic rather than a literal floor plan: 2+2 rows with an aisle, which is
 * enough for someone to say "window, facing forward, not by the toilet". Which
 * seats are taken is derived from the same occupancy figure the crowding meter
 * uses, so the two can never disagree on screen.
 */
function SeatMap({
  carriage,
  occupancy,
  selected,
  onSelect,
}: {
  carriage: string;
  occupancy: number;
  selected: string | null;
  onSelect(seat: string | null): void;
}) {
  const { palette, space, radius } = useTheme();
  const rows = 11;

  /**
   * Deterministic pseudo-occupancy: the same coach always looks the same within
   * a session, which stops seats flickering between renders.
   *
   * Every seat index is scored once and the busiest `target` are taken, rather
   * than drawing indices until enough are unique. Drawing would be the obvious
   * approach and is a trap: a stepping sequence over a fixed modulus can cycle
   * before it has visited enough distinct seats, and the loop never ends.
   */
  const taken = useMemo(() => {
    const total = rows * 4;
    const target = Math.min(total, Math.round(total * occupancy));
    const order = Array.from({ length: total }, (_, index) => index)
      // A cheap integer hash, stable across renders and platforms.
      .sort((a, b) => ((a * 2654435761) % 1013) - ((b * 2654435761) % 1013));
    return new Set(
      order.slice(0, target).map((index) => {
        const row = Math.floor(index / 4) + 1;
        const letter = ['A', 'B', 'C', 'D'][index % 4]!;
        return `${row}${letter}`;
      }),
    );
  }, [occupancy, rows]);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {Array.from({ length: rows }, (_, rowIndex) => {
          const row = rowIndex + 1;
          return (
            <View key={row} style={{ gap: 4, alignItems: 'center' }}>
              <Text variant="caption" tone="tertiary" style={{ fontSize: 10 }}>
                {row}
              </Text>
              {['A', 'B', 'aisle', 'C', 'D'].map((letter) => {
                if (letter === 'aisle') return <View key="aisle" style={{ height: 10 }} />;
                const id = `${row}${letter}`;
                const isTaken = taken.has(id);
                const isSelected = selected === id;
                return (
                  <Pressable
                    key={id}
                    disabled={isTaken}
                    accessibilityRole="button"
                    accessibilityLabel={`Seat ${id} in coach ${carriage}, ${isTaken ? 'taken' : 'free'}`}
                    accessibilityState={{ disabled: isTaken, selected: isSelected }}
                    onPress={() => onSelect(isSelected ? null : id)}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: radius.xs,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isSelected
                        ? palette.brand
                        : isTaken
                          ? palette.textTertiary
                          : palette.surfaceSunken,
                      opacity: isTaken ? 0.35 : 1,
                    }}
                  >
                    <Text
                      variant="caption"
                      style={{ fontSize: 10, color: isSelected ? palette.onBrand : palette.textSecondary }}
                    >
                      {letter}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          );
        })}
      </View>
      <View style={{ width: space.lg }} />
    </ScrollView>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  const { space } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 }}>
      <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: color }} />
      <Text variant="caption" tone="tertiary">
        {label}
      </Text>
    </View>
  );
}

function Row({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  const { palette, space } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: space.sm + 2,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: palette.hairline,
        gap: space.lg,
      }}
    >
      <Text variant="callout" tone="tertiary">
        {label}
      </Text>
      <Text variant="callout" style={{ flex: 1, textAlign: 'right' }} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}
