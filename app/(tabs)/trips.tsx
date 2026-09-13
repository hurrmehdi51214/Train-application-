import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

import { Screen, GUTTER } from '@/components/primitives/Screen';
import { Text } from '@/components/primitives/Text';
import { Icon } from '@/components/primitives/Icon';
import { Button } from '@/components/primitives/Button';
import { Photo } from '@/components/primitives/Photo';
import { Touchable } from '@/components/primitives/Touchable';
import { Pill } from '@/components/primitives/Pill';
import { Segmented } from '@/components/primitives/Segmented';
import { useTheme } from '@/theme/ThemeProvider';
import { pastTickets, upcomingTickets, useTicketStore } from '@/state/useTicketStore';
import { useTick } from '@/hooks/useTick';
import { getService } from '@/data/trains';
import { CLASS_LABEL } from '@/data/network';
import { stationName } from '@/data/stations';
import { photo } from '@/data/photos';
import { clockTime, dayLabel, relativeLabel } from '@/utils/time';
import { Ticket } from '@/types';

/** Trips. Airbnb's "Upcoming / Past" split, with the ticket one tap away. */
export default function TripsScreen() {
  const { palette, space, radius } = useTheme();
  const now = useTick(60_000);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  const tickets = useTicketStore((s) => s.tickets);
  const upcoming = useMemo(() => upcomingTickets(tickets, now), [tickets, now]);
  const past = useMemo(() => pastTickets(tickets, now), [tickets, now]);
  const list = tab === 'upcoming' ? upcoming : past;

  return (
    <Screen tabBarSpacing contentStyle={{ paddingTop: 0 }}>
      <View style={{ paddingHorizontal: GUTTER, paddingTop: space.base, paddingBottom: space.lg }}>
        <Text variant="hero">Trips</Text>
        <Text variant="body" tone="secondary" style={{ marginTop: 4 }}>
          Every ticket here works with no signal, barcode included.
        </Text>
      </View>

      <View style={{ paddingHorizontal: GUTTER, marginBottom: space.lg }}>
        <Segmented<'upcoming' | 'past'>
          value={tab}
          onChange={setTab}
          options={[
            { value: 'upcoming', label: `Upcoming${upcoming.length ? ` (${upcoming.length})` : ''}` },
            { value: 'past', label: 'Past' },
          ]}
        />
      </View>

      <View style={{ paddingHorizontal: GUTTER }}>
        {list.length === 0 ? (
          <View style={{ paddingVertical: space.h2, alignItems: 'center' }}>
            <Icon name="ticket" size={32} color={palette.textTertiary} />
            <Text variant="subheading" style={{ marginTop: space.base }}>
              {tab === 'upcoming' ? 'No trips booked' : 'Nothing in your history'}
            </Text>
            <Text variant="body" tone="secondary" align="center" style={{ marginTop: 4, maxWidth: 300 }}>
              {tab === 'upcoming'
                ? 'Book a train and the ticket lands here, downloaded and ready for the gate.'
                : 'Tickets move here once the journey is over.'}
            </Text>
            {tab === 'upcoming' ? (
              <Button label="Find a train" onPress={() => router.push('/search')} style={{ marginTop: space.lg }} />
            ) : null}
          </View>
        ) : (
          list.map((ticket) => <TripCard key={ticket.id} ticket={ticket} now={now} />)
        )}
      </View>
    </Screen>
  );
}

function TripCard({ ticket, now }: { ticket: Ticket; now: number }) {
  const { palette, space, radius, shadow } = useTheme();
  const service = getService(ticket.serviceId);
  const uri = photo(service?.photoKeys[0] ?? '')?.url;
  const soon = new Date(ticket.departure).getTime() - now < 24 * 60 * 60_000;

  return (
    <Touchable
      onPress={() => router.push(`/ticket/${ticket.id}`)}
      fade
      accessibilityRole="button"
      accessibilityLabel={`Ticket from ${stationName(ticket.originStationId)} to ${stationName(ticket.destinationStationId)}, ${dayLabel(ticket.departure)}`}
      style={[
        {
          borderRadius: radius.lg,
          overflow: 'hidden',
          backgroundColor: palette.surface,
          borderWidth: 1,
          borderColor: palette.border,
          marginBottom: space.base,
        },
        shadow.card,
      ]}
    >
      <Photo uri={uri} height={132} radius={0} />

      <View style={{ padding: space.base }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
            {dayLabel(ticket.departure)} · {clockTime(ticket.departure)}
          </Text>
          {soon && ticket.status !== 'completed' ? (
            <Pill label={relativeLabel(ticket.departure, new Date(now))} size="sm" tone="brand" />
          ) : null}
        </View>

        <Text variant="subheading" numberOfLines={1} style={{ marginTop: 4 }}>
          {stationName(ticket.originStationId)} → {stationName(ticket.destinationStationId)}
        </Text>
        <Text variant="body" tone="secondary" numberOfLines={1} style={{ marginTop: 2 }}>
          {service?.name ?? 'Pakistan Railways'} · {CLASS_LABEL[ticket.travelClass]}
          {ticket.passengers[0]?.coach ? ` · coach ${ticket.passengers[0].coach}` : ''}
        </Text>
      </View>
    </Touchable>
  );
}
