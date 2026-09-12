import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';

import { Screen, Section, GUTTER } from '@/components/primitives/Screen';
import { Text } from '@/components/primitives/Text';
import { Surface } from '@/components/primitives/Surface';
import { Button } from '@/components/primitives/Button';
import { Icon } from '@/components/primitives/Icon';
import { Chip } from '@/components/primitives/Chip';
import { LiveDot } from '@/components/primitives/LiveDot';
import { MapCanvas } from '@/components/map/MapCanvas';
import { PlatformCard } from '@/components/rail/PlatformCard';
import { DisruptionCard } from '@/components/rail/DisruptionCard';
import { useTheme } from '@/theme/ThemeProvider';
import { upcomingTickets, useTicketStore } from '@/state/useTicketStore';
import { useSearchStore } from '@/state/useSearchStore';
import { useSettingsStore } from '@/state/useSettingsStore';
import { useLiveService } from '@/hooks/useLiveService';
import { useTick } from '@/hooks/useTick';
import { getStation, stationName } from '@/data/stations';
import { clockTime, dayLabel, durationLabel, minutesBetween, relativeLabel } from '@/utils/time';

export default function TodayScreen() {
  const { palette, space } = useTheme();
  const now = useTick(20_000);
  const tickets = useTicketStore((s) => s.tickets);
  const upcoming = useMemo(() => upcomingTickets(tickets, now), [tickets, now]);
  const recents = useSearchStore((s) => s.recents);
  const setOrigin = useSearchStore((s) => s.setOrigin);
  const setDestination = useSearchStore((s) => s.setDestination);
  const passengerName = useSettingsStore((s) => s.passengerName);

  const nextTicket = upcoming[0] ?? null;
  const { service, position } = useLiveService(nextTicket?.serviceId);

  const boardingCall = useMemo(
    () => service?.calls.find((c) => c.stationId === nextTicket?.originStationId),
    [service, nextTicket],
  );

  const greeting = useMemo(() => {
    const hour = new Date(now).getHours();
    const period = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    return passengerName ? `${period}, ${passengerName.split(' ')[0]}` : period;
  }, [now, passengerName]);

  const minutesToDeparture = nextTicket ? minutesBetween(new Date(now), nextTicket.departure) : null;

  return (
    <Screen title={greeting} eyebrow="Meridian Rail">
      {nextTicket && service ? (
        <Section title="Your next journey">
          <Pressable onPress={() => router.push(`/journey/${service.id}`)}>
            <Surface padding={0} style={{ overflow: 'hidden' }}>
              <MapCanvas
                height={168}
                route={service.geometry}
                stations={service.calls.map((call) => ({
                  id: call.stationId,
                  name: stationName(call.stationId),
                  coordinate: getStation(call.stationId)?.coordinate ?? { lat: 0, lon: 0 },
                  emphasis:
                    call.stationId === nextTicket.originStationId ||
                    call.stationId === nextTicket.destinationStationId
                      ? 'primary'
                      : 'secondary',
                  passed: call.status === 'departed' || call.status === 'arrived',
                }))}
                train={position ? { coordinate: position.coordinate, bearing: position.bearing } : null}
                labelStations={false}
              />

              <View style={{ padding: space.lg }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: space.sm }}>
                  <LiveDot size={6} />
                  <Text variant="overline" tone="success">
                    {minutesToDeparture !== null && minutesToDeparture > 0
                      ? `Departs ${relativeLabel(nextTicket.departure, new Date(now))}`
                      : 'In progress'}
                  </Text>
                </View>

                <Text variant="title" numberOfLines={1}>
                  {stationName(nextTicket.originStationId)} → {stationName(nextTicket.destinationStationId)}
                </Text>

                <View style={{ flexDirection: 'row', gap: space.lg, marginTop: space.md }}>
                  <Fact label="Departs" value={clockTime(nextTicket.departure)} />
                  <Fact label="Arrives" value={clockTime(nextTicket.arrival)} />
                  <Fact
                    label="Duration"
                    value={durationLabel(minutesBetween(nextTicket.departure, nextTicket.arrival))}
                  />
                  {nextTicket.coach ? <Fact label="Coach" value={nextTicket.coach} /> : null}
                </View>
              </View>
            </Surface>
          </Pressable>

          {boardingCall ? (
            <View style={{ marginTop: space.md }}>
              <PlatformCard call={boardingCall} />
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.md }}>
            <View style={{ flex: 1 }}>
              <Button
                label="Ticket"
                icon="qr"
                iconPosition="leading"
                onPress={() => router.push(`/ticket/${nextTicket.id}`)}
                fullWidth
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label="Get there"
                variant="secondary"
                icon="pin"
                iconPosition="leading"
                onPress={() => router.push(`/navigate/${nextTicket.originStationId}`)}
                fullWidth
              />
            </View>
          </View>

          {service.disruptions.map((disruption) => (
            <View key={disruption.id} style={{ marginTop: space.md }}>
              <DisruptionCard disruption={disruption} />
            </View>
          ))}
        </Section>
      ) : (
        <Section>
          <Surface padding={space.xxl}>
            <Icon name="train" size={28} color={palette.brand} />
            <Text variant="title" style={{ marginTop: space.md }}>
              Nothing booked yet
            </Text>
            <Text variant="body" tone="secondary" style={{ marginTop: 6 }}>
              Find a train, and everything else - platform, coach, delays, the walk to the station -
              follows on its own.
            </Text>
            <Button
              label="Plan a journey"
              icon="arrow-right"
              onPress={() => router.push('/plan')}
              style={{ marginTop: space.xl }}
              fullWidth
            />
          </Surface>
        </Section>
      )}

      {upcoming.length > 1 ? (
        <Section title="Also booked">
          {upcoming.slice(1, 4).map((ticket) => (
            <Pressable
              key={ticket.id}
              onPress={() => router.push(`/ticket/${ticket.id}`)}
              style={{ marginBottom: space.sm }}
            >
              <Surface padding={space.lg}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong" numberOfLines={1}>
                      {stationName(ticket.originStationId)} → {stationName(ticket.destinationStationId)}
                    </Text>
                    <Text variant="caption" tone="tertiary" style={{ marginTop: 2 }}>
                      {dayLabel(ticket.departure)} · {clockTime(ticket.departure)}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={18} color={palette.textTertiary} />
                </View>
              </Surface>
            </Pressable>
          ))}
        </Section>
      ) : null}

      {recents.length > 0 ? (
        <Section title="Book again">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {recents.map((recent) => (
              <Chip
                key={`${recent.originId}-${recent.destinationId}`}
                label={`${getStation(recent.originId)?.code ?? '?'} → ${getStation(recent.destinationId)?.code ?? '?'}`}
                icon="swap"
                onPress={() => {
                  setOrigin(recent.originId);
                  setDestination(recent.destinationId);
                  router.push('/booking/results');
                }}
              />
            ))}
          </View>
        </Section>
      ) : null}

      <Section title="Share the app">
        <Pressable onPress={() => router.push('/install')}>
          <Surface padding={space.lg}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: palette.surfaceSunken,
                }}
              >
                <Icon name="qr" size={22} color={palette.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">Install code</Text>
                <Text variant="caption" tone="tertiary" style={{ marginTop: 2 }}>
                  A QR anyone can scan to get Meridian Rail on their phone
                </Text>
              </View>
              <Icon name="chevron-right" size={18} color={palette.textTertiary} />
            </View>
          </Surface>
        </Pressable>
      </Section>

      <View style={{ paddingHorizontal: GUTTER }}>
        <Text variant="caption" tone="tertiary">
          Live times come from the operator's control system. Platforms are confirmed by the station
          and can change at short notice.
        </Text>
      </View>
    </Screen>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text variant="overline" tone="tertiary">
        {label}
      </Text>
      <Text variant="numeric" style={{ marginTop: 2 }}>
        {value}
      </Text>
    </View>
  );
}
