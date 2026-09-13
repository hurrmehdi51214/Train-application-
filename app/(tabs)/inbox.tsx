import React, { useMemo } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

import { Screen, GUTTER } from '@/components/primitives/Screen';
import { Text } from '@/components/primitives/Text';
import { Icon } from '@/components/primitives/Icon';
import { Touchable } from '@/components/primitives/Touchable';
import { useTheme } from '@/theme/ThemeProvider';
import { upcomingTickets, useTicketStore } from '@/state/useTicketStore';
import { useTick } from '@/hooks/useTick';
import { allServices, getService } from '@/data/trains';
import { stationName } from '@/data/stations';
import { relativeLabel, clockTime, dayLabel } from '@/utils/time';
import { groupPnr } from '@/utils/format';

interface Message {
  id: string;
  from: string;
  title: string;
  body: string;
  at: string;
  unread: boolean;
  icon: 'train' | 'alert' | 'ticket' | 'info';
  onPress?: () => void;
}

/**
 * Inbox.
 *
 * Not a chat product, and it does not pretend to be one. What actually arrives
 * for a rail passenger is operational: a booking confirmation, a delay on a
 * train you are on, engineering work on a route you have saved. So the inbox is
 * built from your own tickets and the live disruption feed rather than from an
 * empty messaging table.
 */
export default function InboxScreen() {
  const { palette, space, radius } = useTheme();
  const now = useTick(60_000);
  const tickets = useTicketStore((s) => s.tickets);

  const messages = useMemo<Message[]>(() => {
    const out: Message[] = [];

    for (const ticket of upcomingTickets(tickets, now)) {
      const service = getService(ticket.serviceId);
      out.push({
        id: `booking-${ticket.id}`,
        from: 'Pakistan Railways',
        title: 'Booking confirmed',
        body: `PNR ${groupPnr(ticket.pnr)} · ${service?.name ?? 'your train'} from ${stationName(
          ticket.originStationId,
        )} on ${dayLabel(ticket.departure)} at ${clockTime(ticket.departure)}.`,
        at: ticket.issuedAt,
        unread: true,
        icon: 'ticket',
        onPress: () => router.push(`/ticket/${ticket.id}`),
      });
    }

    for (const service of allServices()) {
      for (const disruption of service.disruptions) {
        out.push({
          id: disruption.id,
          from: 'Service updates',
          title: disruption.title,
          body: disruption.detail,
          at: disruption.issuedAt,
          unread: false,
          icon: 'alert',
          onPress: () => router.push(`/train/${service.id}`),
        });
      }
    }

    out.push({
      id: 'welcome',
      from: 'Safar',
      title: 'Your tickets work offline',
      body: 'Every ticket you buy is saved to this device with a barcode that regenerates on its own. No signal needed at the gate, in a tunnel, or anywhere on the Bolan.',
      at: new Date(now - 36 * 60 * 60_000).toISOString(),
      unread: false,
      icon: 'info',
    });

    return out.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [tickets, now]);

  return (
    <Screen tabBarSpacing contentStyle={{ paddingTop: 0 }}>
      <View style={{ paddingHorizontal: GUTTER, paddingTop: space.base, paddingBottom: space.lg }}>
        <Text variant="hero">Inbox</Text>
        <Text variant="body" tone="secondary" style={{ marginTop: 4 }}>
          Confirmations, delays and engineering work on trains you care about.
        </Text>
      </View>

      <View style={{ paddingHorizontal: GUTTER }}>
        {messages.map((message, index) => (
          <Touchable
            key={message.id}
            onPress={message.onPress ?? (() => undefined)}
            disabled={!message.onPress}
            scaleTo={0.99}
            accessibilityRole={message.onPress ? 'button' : undefined}
            accessibilityLabel={`${message.title}. ${message.body}`}
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
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor:
                  message.icon === 'alert' ? palette.warningSoft : palette.brandSoft,
              }}
            >
              <Icon
                name={message.icon === 'alert' ? 'alert' : message.icon === 'ticket' ? 'ticket' : 'train'}
                size={20}
                color={message.icon === 'alert' ? palette.warning : palette.brand}
              />
            </View>

            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <Text variant="bodyMedium" numberOfLines={1} style={{ flex: 1 }}>
                  {message.title}
                </Text>
                <Text variant="caption" tone="tertiary">
                  {relativeLabel(message.at, new Date(now))}
                </Text>
              </View>
              <Text variant="caption" tone="secondary" style={{ marginTop: 1 }}>
                {message.from}
              </Text>
              <Text variant="body" tone="secondary" numberOfLines={3} style={{ marginTop: 4 }}>
                {message.body}
              </Text>
            </View>

            {message.unread ? (
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  marginTop: space.base,
                  backgroundColor: palette.brand,
                }}
              />
            ) : null}
          </Touchable>
        ))}
      </View>
    </Screen>
  );
}
