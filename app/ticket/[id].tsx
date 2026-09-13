import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/primitives/Text';
import { Icon } from '@/components/primitives/Icon';
import { Button } from '@/components/primitives/Button';
import { Touchable } from '@/components/primitives/Touchable';
import { Divider } from '@/components/primitives/Divider';
import { Pill } from '@/components/primitives/Pill';
import { QrTicket } from '@/components/rail/QrTicket';
import { useTicketStore } from '@/state/useTicketStore';
import { useJourneyStore } from '@/state/useJourneyStore';
import { api } from '@/services/apiClient';
import { getService } from '@/data/trains';
import { CLASS_LABEL } from '@/data/network';
import { getStation, stationName } from '@/data/stations';
import { GUTTER } from '@/components/primitives/Screen';
import { clockTime, dayLabel, durationLabel, minutesBetween } from '@/utils/time';
import { groupPnr, money } from '@/utils/format';

/**
 * The ticket.
 *
 * Deliberately not a Screen with a scrolling header: this gets opened
 * one-handed, in a queue, and every pixel above the fold belongs to the code
 * and the PNR. Screen brightness is the other half of that, which a production
 * build raises here via expo-brightness.
 *
 * The perforated notch is the only skeumorphic thing in the product and it
 * earns its place - it is what makes this read instantly as a ticket rather
 * than as another card.
 */
export default function TicketScreen() {
  const { palette, space, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const { id, justBooked } = useLocalSearchParams<{ id: string; justBooked?: string }>();

  const ticket = useTicketStore((s) => (id ? s.byId(id) : undefined));
  const updateTicket = useTicketStore((s) => s.update);
  const beginJourney = useJourneyStore((s) => s.begin);
  const activeJourney = useJourneyStore((s) => s.active);

  const [boarding, setBoarding] = useState(false);

  useEffect(() => {
    if (justBooked && Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [justBooked]);

  if (!ticket) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.surface, padding: GUTTER, paddingTop: insets.top + 64 }}>
        <Text variant="title">Ticket not found</Text>
        <Text variant="body" tone="secondary" style={{ marginTop: space.sm }}>
          It may have been removed from this device.
        </Text>
        <Button label="Back to trips" onPress={() => router.replace('/(tabs)/trips')} style={{ marginTop: space.lg }} />
      </View>
    );
  }

  const service = getService(ticket.serviceId);
  const origin = getStation(ticket.originStationId);
  const isActive = activeJourney?.ticketId === ticket.id;
  const minutesUntil = minutesBetween(new Date(), ticket.departure);

  const board = async () => {
    setBoarding(true);
    try {
      await api.boardTicket(ticket.id);
      updateTicket(ticket.id, { status: 'boarded' });
      beginJourney(ticket);
      router.push(`/journey/${ticket.serviceId}`);
    } finally {
      setBoarding(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.fill }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingTop: insets.top + space.sm,
          paddingHorizontal: space.md,
          paddingBottom: space.sm,
        }}
      >
        <Touchable
          onPress={() => router.back()}
          scaleTo={0.88}
          accessibilityRole="button"
          accessibilityLabel="Close ticket"
          style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="chevron-down" size={20} />
        </Touchable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text variant="captionMedium" tone="secondary">
            {dayLabel(ticket.departure)} · {clockTime(ticket.departure)}
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space.base, paddingBottom: insets.bottom + space.h2 }}
        showsVerticalScrollIndicator={false}
      >
        {/* The ticket itself. */}
        <View style={{ backgroundColor: palette.surface, borderRadius: radius.lg, overflow: 'hidden' }}>
          <View style={{ alignItems: 'center', paddingTop: space.xl, paddingHorizontal: space.xl }}>
            <Pill
              label={ticket.status === 'boarded' ? 'On board' : 'Confirmed'}
              size="sm"
              tone={ticket.status === 'boarded' ? 'success' : 'brand'}
            />

            <Text variant="title" align="center" style={{ marginTop: space.md }}>
              {stationName(ticket.originStationId)}
            </Text>
            <View style={{ marginVertical: 4 }}>
              <Icon name="chevron-down" size={18} color={palette.textTertiary} />
            </View>
            <Text variant="title" align="center">
              {stationName(ticket.destinationStationId)}
            </Text>

            <Text variant="caption" tone="secondary" style={{ marginTop: space.sm }}>
              {service?.name ?? 'Pakistan Railways'} · {service?.number ?? ''}
            </Text>

            <View style={{ marginTop: space.xl }}>
              <QrTicket ticket={ticket} />
            </View>

            <Text variant="hero" style={{ marginTop: space.base, letterSpacing: 2, fontSize: 26 }}>
              {groupPnr(ticket.pnr)}
            </Text>
            <Text variant="caption" tone="secondary" style={{ marginTop: 2, marginBottom: space.xl }}>
              Show this at the gate, or read the PNR to staff
            </Text>
          </View>

          {/* Perforation. */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 18, height: 18, borderRadius: 9, marginLeft: -9, backgroundColor: palette.fill }} />
            <View
              style={{
                flex: 1,
                borderTopWidth: 1,
                borderStyle: 'dashed',
                borderColor: palette.border,
                height: 1,
              }}
            />
            <View style={{ width: 18, height: 18, borderRadius: 9, marginRight: -9, backgroundColor: palette.fill }} />
          </View>

          <View style={{ padding: space.xl }}>
            <View style={{ flexDirection: 'row' }}>
              <Detail label="Class" value={CLASS_LABEL[ticket.travelClass]} flex />
              <Detail label="Coach" value={ticket.passengers[0]?.coach ?? '–'} flex />
              <Detail label="Berth" value={ticket.passengers[0]?.berth ?? '–'} flex />
            </View>

            <Divider style={{ marginVertical: space.base }} />

            <Text variant="caption" tone="secondary" style={{ marginBottom: space.sm }}>
              {ticket.passengers.length === 1 ? 'Traveller' : 'Travellers'}
            </Text>
            {ticket.passengers.map((passenger, index) => (
              <View
                key={index}
                style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}
              >
                <Text variant="body">{passenger.name}</Text>
                <Text variant="body" tone="secondary">
                  {passenger.coach}
                  {passenger.berth ? `/${passenger.berth}` : ''}
                  {passenger.berthType && passenger.berthType !== 'seat' ? ` · ${passenger.berthType}` : ''}
                </Text>
              </View>
            ))}

            <Divider style={{ marginVertical: space.base }} />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="body" tone="secondary">
                Valid for
              </Text>
              <Text variant="body">
                {clockTime(ticket.departure)} – {clockTime(ticket.arrival)} (
                {durationLabel(minutesBetween(ticket.departure, ticket.arrival))})
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              <Text variant="body" tone="secondary">
                Paid
              </Text>
              <Text variant="bodyMedium">{money(ticket.totalMinor)}</Text>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.base }}>
          <View style={{ flex: 1 }}>
            <Button
              label={isActive ? 'Live journey' : 'Board'}
              icon="train"
              iconPosition="leading"
              fullWidth
              loading={boarding}
              onPress={isActive ? () => router.push(`/journey/${ticket.serviceId}`) : board}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label="Get to station"
              variant="outline"
              icon="pin"
              iconPosition="leading"
              fullWidth
              onPress={() => router.push(`/station/${ticket.originStationId}`)}
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
              padding: space.base,
              borderRadius: radius.md,
              backgroundColor: palette.surface,
            }}
          >
            <Icon name="walk" size={17} color={palette.textSecondary} />
            <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
              Allow about {origin.concourseWalkMinutes} minutes from the entrance of {origin.name} to the
              platform. Reserved coaches are marked on the platform boards.
            </Text>
          </View>
        ) : null}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.sm,
            marginTop: space.md,
            padding: space.base,
            borderRadius: radius.md,
            backgroundColor: palette.successSoft,
          }}
        >
          <Icon name="download" size={16} color={palette.success} />
          <Text variant="caption" style={{ color: palette.success, flex: 1 }}>
            Saved to this device. This ticket and its barcode work with no signal at all.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Detail({ label, value, flex }: { label: string; value: string; flex?: boolean }) {
  return (
    <View style={flex ? { flex: 1 } : undefined}>
      <Text variant="caption" tone="secondary">
        {label}
      </Text>
      <Text variant="label" style={{ marginTop: 2 }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
