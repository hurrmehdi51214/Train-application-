import React, { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/primitives/Text';
import { Surface } from '@/components/primitives/Surface';
import { Button } from '@/components/primitives/Button';
import { Icon } from '@/components/primitives/Icon';
import { Divider } from '@/components/primitives/Divider';
import { QrTicket } from '@/components/rail/QrTicket';
import { useTheme } from '@/theme/ThemeProvider';
import { useTicketStore } from '@/state/useTicketStore';
import { useJourneyStore } from '@/state/useJourneyStore';
import { api } from '@/services/apiClient';
import { getStation, stationName } from '@/data/stations';
import { clockTime, dayLabel, durationLabel, minutesBetween } from '@/utils/time';
import { groupReference, money } from '@/utils/format';

/**
 * The barrier screen.
 *
 * Deliberately not a Screen with a collapsing title: this view gets opened
 * one-handed, in a queue, and every pixel above the fold belongs to the code.
 * Screen brightness is the other half of that, which a production build raises
 * here via expo-brightness.
 */
export default function TicketScreen() {
  const { palette, space, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const { id, justBooked } = useLocalSearchParams<{ id: string; justBooked?: string }>();

  const ticket = useTicketStore((s) => (id ? s.byId(id) : undefined));
  const updateTicket = useTicketStore((s) => s.update);
  const beginJourney = useJourneyStore((s) => s.begin);
  const activeJourney = useJourneyStore((s) => s.active);

  const [activating, setActivating] = useState(false);

  useEffect(() => {
    if (justBooked && Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [justBooked]);

  if (!ticket) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.canvas, padding: space.xl, paddingTop: insets.top + 60 }}>
        <Text variant="title">Ticket not found</Text>
        <Text variant="body" tone="secondary" style={{ marginTop: space.sm }}>
          It may have been removed from this device.
        </Text>
        <Button label="Back to tickets" onPress={() => router.replace('/tickets')} style={{ marginTop: space.xl }} />
      </View>
    );
  }

  const origin = getStation(ticket.originStationId);
  const minutesUntil = minutesBetween(new Date(), ticket.departure);
  const isActive = activeJourney?.ticketId === ticket.id;

  const activate = async () => {
    setActivating(true);
    try {
      await api.activateTicket(ticket.id);
      updateTicket(ticket.id, { status: 'activated' });
      beginJourney(ticket);
      router.push(`/journey/${ticket.serviceId}`);
    } finally {
      setActivating(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.canvas }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingTop: insets.top + 8,
          paddingHorizontal: space.md,
          paddingBottom: space.sm,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Close ticket" style={{ padding: 8 }}>
          <Icon name="arrow-left" size={22} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text variant="overline" tone="tertiary">
            {dayLabel(ticket.departure)} · {clockTime(ticket.departure)}
          </Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space.xl, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Surface padding={space.xl} style={{ alignItems: 'center' }}>
          <Text variant="overline" tone="brand">
            {ticket.status === 'activated' ? 'Activated' : 'Valid ticket'}
          </Text>
          <Text variant="title" align="center" style={{ marginTop: space.sm }}>
            {stationName(ticket.originStationId)}
          </Text>
          <View style={{ marginVertical: 6 }}>
            <Icon name="chevron-down" size={18} color={palette.textTertiary} />
          </View>
          <Text variant="title" align="center">
            {stationName(ticket.destinationStationId)}
          </Text>

          <View style={{ marginTop: space.xl }}>
            <QrTicket ticket={ticket} />
          </View>

          <Text variant="numericLarge" style={{ marginTop: space.lg, letterSpacing: 2 }}>
            {groupReference(ticket.reference)}
          </Text>
          <Text variant="caption" tone="tertiary" style={{ marginTop: 2 }}>
            Show this code at the barrier, or read the reference to staff
          </Text>
        </Surface>

        <Surface padding={space.lg} style={{ marginTop: space.md }}>
          <View style={{ flexDirection: 'row' }}>
            <Fact label="Coach" value={ticket.coach ?? 'Any'} flex />
            <Fact label="Seat" value={ticket.seat ?? 'Any'} flex />
            <Fact label="Class" value={ticket.class === 'first' ? 'First' : 'Standard'} flex />
          </View>
          <Divider style={{ marginVertical: space.md }} />
          <Fact label="Passenger" value={ticket.passengerName} />
          <View style={{ height: space.md }} />
          <Fact
            label="Valid for"
            value={`${clockTime(ticket.departure)} – ${clockTime(ticket.arrival)} (${durationLabel(
              minutesBetween(ticket.departure, ticket.arrival),
            )})`}
          />
          <View style={{ height: space.md }} />
          <Fact label="Paid" value={money(ticket.priceMinor, ticket.currency)} />
        </Surface>

        <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.md }}>
          <View style={{ flex: 1 }}>
            <Button
              label={isActive ? 'Live journey' : 'Start journey'}
              icon="train"
              iconPosition="leading"
              loading={activating}
              fullWidth
              onPress={isActive ? () => router.push(`/journey/${ticket.serviceId}`) : activate}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label="Get to station"
              variant="secondary"
              icon="pin"
              iconPosition="leading"
              fullWidth
              onPress={() => router.push(`/navigate/${ticket.originStationId}`)}
            />
          </View>
        </View>

        {minutesUntil > 0 && origin ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.sm,
              marginTop: space.md,
              padding: space.lg,
              borderRadius: radius.md,
              backgroundColor: palette.surfaceSunken,
            }}
          >
            <Icon name="walk" size={16} color={palette.textSecondary} />
            <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
              Allow about {origin.concourseWalkMinutes} minutes from the entrance of{' '}
              {origin.name} to the platform.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Fact({ label, value, flex = false }: { label: string; value: string; flex?: boolean }) {
  return (
    <View style={flex ? { flex: 1 } : undefined}>
      <Text variant="overline" tone="tertiary">
        {label}
      </Text>
      <Text variant="bodyStrong" style={{ marginTop: 2 }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
