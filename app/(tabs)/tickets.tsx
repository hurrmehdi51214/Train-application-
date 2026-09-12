import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

import { Screen, Section } from '@/components/primitives/Screen';
import { Text } from '@/components/primitives/Text';
import { Surface } from '@/components/primitives/Surface';
import { Button } from '@/components/primitives/Button';
import { Icon } from '@/components/primitives/Icon';
import { Segmented } from '@/components/primitives/Segmented';
import { TicketCard } from '@/components/rail/TicketCard';
import { useTheme } from '@/theme/ThemeProvider';
import { pastTickets, upcomingTickets, useTicketStore } from '@/state/useTicketStore';
import { useTick } from '@/hooks/useTick';

export default function TicketsScreen() {
  const { palette, space } = useTheme();
  const now = useTick(60_000);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  const tickets = useTicketStore((s) => s.tickets);
  const upcoming = useMemo(() => upcomingTickets(tickets, now), [tickets, now]);
  const past = useMemo(() => pastTickets(tickets, now), [tickets, now]);
  const list = tab === 'upcoming' ? upcoming : past;

  return (
    <Screen
      title="Tickets"
      subtitle="Everything here works with no signal, including the barcode."
    >
      <Section>
        <Segmented<'upcoming' | 'past'>
          value={tab}
          onChange={setTab}
          options={[
            { value: 'upcoming', label: `Upcoming${upcoming.length ? ` (${upcoming.length})` : ''}` },
            { value: 'past', label: 'Past' },
          ]}
        />
      </Section>

      <Section>
        {list.length === 0 ? (
          <Surface padding={space.xxl}>
            <Icon name="ticket" size={26} color={palette.textTertiary} />
            <Text variant="headline" style={{ marginTop: space.md }}>
              {tab === 'upcoming' ? 'No tickets yet' : 'Nothing in your history'}
            </Text>
            <Text variant="body" tone="secondary" style={{ marginTop: 4 }}>
              {tab === 'upcoming'
                ? 'Book a train and the ticket lands here, downloaded and ready for the barrier.'
                : 'Tickets move here once the journey is over.'}
            </Text>
            {tab === 'upcoming' ? (
              <Button
                label="Find a train"
                icon="arrow-right"
                onPress={() => router.push('/plan')}
                style={{ marginTop: space.xl }}
                fullWidth
              />
            ) : null}
          </Surface>
        ) : (
          list.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} onPress={() => router.push(`/ticket/${ticket.id}`)} />
          ))
        )}
      </Section>

      {tab === 'upcoming' && list.length > 0 ? (
        <Section>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.sm,
              padding: space.lg,
              borderRadius: 14,
              backgroundColor: palette.successSoft,
            }}
          >
            <Icon name="download" size={16} color={palette.success} />
            <Text variant="caption" style={{ color: palette.success, flex: 1 }}>
              All {list.length} ticket{list.length === 1 ? '' : 's'} and the maps for their stations are
              saved on this device.
            </Text>
          </View>
        </Section>
      ) : null}
    </Screen>
  );
}
