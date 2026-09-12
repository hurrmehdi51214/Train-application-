import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { Screen, Section } from '@/components/primitives/Screen';
import { Text } from '@/components/primitives/Text';
import { Surface } from '@/components/primitives/Surface';
import { Button } from '@/components/primitives/Button';
import { Icon } from '@/components/primitives/Icon';
import { LiveDot } from '@/components/primitives/LiveDot';
import { MapCanvas } from '@/components/map/MapCanvas';
import { RouteRail } from '@/components/rail/RouteRail';
import { PlatformCard } from '@/components/rail/PlatformCard';
import { DisruptionCard } from '@/components/rail/DisruptionCard';
import { CarriageStrip } from '@/components/rail/CarriageStrip';
import { AmenityGrid } from '@/components/rail/AmenityGrid';
import { CrowdingMeter } from '@/components/rail/CrowdingMeter';
import { useTheme } from '@/theme/ThemeProvider';
import { useLiveService } from '@/hooks/useLiveService';
import { useTick } from '@/hooks/useTick';
import { useJourneyStore } from '@/state/useJourneyStore';
import { upcomingTickets, useTicketStore } from '@/state/useTicketStore';
import { getStation, stationName } from '@/data/stations';
import { clockTime, delayLabel, durationLabel, minutesBetween, relativeLabel } from '@/utils/time';
import { crowdingCopy } from '@/utils/format';
import { JourneyPhase } from '@/types';

const PHASE_COPY: Record<JourneyPhase, { title: string; detail: string }> = {
  idle: { title: 'Not started', detail: 'This journey has not begun yet.' },
  'to-station': { title: 'On your way', detail: 'Head for the station - we will tell you the platform as soon as it is set.' },
  'at-station': { title: 'Boarding soon', detail: 'Your train is being prepared. Make your way to the platform.' },
  onboard: { title: 'Underway', detail: 'Sit back. We will nudge you before your stop.' },
  approaching: { title: 'Your stop is next', detail: 'Gather your things and make your way to the doors.' },
  arrived: { title: 'Arrived', detail: 'Mind the gap. Onward connections are below.' },
  completed: { title: 'Journey complete', detail: 'Hope it went well.' },
};

export default function LiveJourneyScreen() {
  const { palette, space, radius } = useTheme();
  const { serviceId } = useLocalSearchParams<{ serviceId: string }>();
  const now = useTick(15_000);

  const { service, position, loading, fromCache, refresh } = useLiveService(serviceId);
  const active = useJourneyStore((s) => s.active);
  const reconcile = useJourneyStore((s) => s.reconcile);
  const endJourney = useJourneyStore((s) => s.end);
  const tickets = useTicketStore((s) => s.tickets);
  const ticket = useMemo(
    () =>
      active?.ticketId
        ? tickets.find((t) => t.id === active.ticketId)
        : upcomingTickets(tickets).find((t) => t.serviceId === serviceId),
    [tickets, active?.ticketId, serviceId],
  );

  // Feeding the store is what actually fires the journey notifications.
  useEffect(() => {
    if (!ticket || !service) return;
    void reconcile(ticket, service, now);
  }, [ticket, service, now, reconcile]);

  const phase = active?.phase ?? 'idle';

  const boardingCall = useMemo(
    () => service?.calls.find((c) => c.stationId === ticket?.originStationId),
    [service, ticket],
  );
  const alightingCall = useMemo(
    () => service?.calls.find((c) => c.stationId === ticket?.destinationStationId),
    [service, ticket],
  );

  const focusCall =
    phase === 'to-station' || phase === 'at-station' ? boardingCall : alightingCall;

  const myCarriage = service?.carriages.find((c) => c.letter === ticket?.coach);

  if (loading && !service) {
    return (
      <Screen title="Live journey" back>
        <Section>
          <View style={{ paddingVertical: space.h3, alignItems: 'center' }}>
            <ActivityIndicator color={palette.brand} />
          </View>
        </Section>
      </Screen>
    );
  }

  if (!service) {
    return (
      <Screen title="Live journey" back>
        <Section>
          <Surface padding={space.xl}>
            <Icon name="alert" size={22} color={palette.critical} />
            <Text variant="headline" style={{ marginTop: space.md }}>
              We cannot find that service
            </Text>
            <Text variant="body" tone="secondary" style={{ marginTop: 4 }}>
              It may have been cancelled or renumbered. Check your ticket for the latest details.
            </Text>
          </Surface>
        </Section>
      </Screen>
    );
  }

  const copy = PHASE_COPY[phase];
  const minutesRemaining = alightingCall
    ? minutesBetween(new Date(now), alightingCall.expectedArrival ?? alightingCall.scheduledArrival ?? '')
    : null;

  return (
    <Screen
      title={`${service.headcode} to ${stationName(service.destination)}`}
      eyebrow={service.operator}
      back
      onRefresh={refresh}
    >
      <Section>
        <Surface padding={0} style={{ overflow: 'hidden' }}>
          <MapCanvas
            height={280}
            route={service.geometry}
            stations={service.calls.map((call) => ({
              id: call.stationId,
              name: stationName(call.stationId),
              coordinate: getStation(call.stationId)?.coordinate ?? { lat: 0, lon: 0 },
              emphasis:
                call.stationId === ticket?.originStationId || call.stationId === ticket?.destinationStationId
                  ? 'primary'
                  : 'secondary',
              passed: call.status === 'departed' || call.status === 'arrived',
            }))}
            train={position ? { coordinate: position.coordinate, bearing: position.bearing } : null}
          />

          <View style={{ padding: space.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <LiveDot size={6} color={fromCache ? palette.textTertiary : palette.success} />
              <Text variant="overline" tone={fromCache ? 'tertiary' : 'success'}>
                {fromCache ? 'Last known position' : `Live · ${position?.speedKph ?? 0} km/h`}
              </Text>
            </View>
            <Text variant="title" style={{ marginTop: space.sm }}>
              {copy.title}
            </Text>
            <Text variant="body" tone="secondary" style={{ marginTop: 4 }}>
              {copy.detail}
            </Text>

            {minutesRemaining !== null && minutesRemaining > 0 && phase !== 'idle' ? (
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
                <Icon name="clock" size={15} color={palette.textSecondary} />
                <Text variant="callout" tone="secondary">
                  {durationLabel(minutesRemaining)} to {stationName(ticket?.destinationStationId ?? service.destination)}
                  {alightingCall ? ` · arriving ${clockTime(alightingCall.expectedArrival)}` : ''}
                </Text>
              </View>
            ) : null}
          </View>
        </Surface>
      </Section>

      {service.disruptions.length > 0 ? (
        <Section title="Service update">
          {service.disruptions.map((disruption) => (
            <View key={disruption.id} style={{ marginBottom: space.sm }}>
              <DisruptionCard disruption={disruption} />
            </View>
          ))}
        </Section>
      ) : null}

      {focusCall ? (
        <Section title={phase === 'to-station' || phase === 'at-station' ? 'Your departure' : 'Your arrival'}>
          <PlatformCard call={focusCall} live={!fromCache} />
        </Section>
      ) : null}

      <Section title="Calling at">
        <Surface padding={space.lg}>
          <RouteRail
            service={service}
            progress={position?.progress ?? 0}
            boardingStationId={ticket?.originStationId}
            alightingStationId={ticket?.destinationStationId}
          />
        </Surface>
      </Section>

      <Section title="On this train">
        <Surface padding={space.lg}>
          <CarriageStrip carriages={service.carriages} reservedCoach={ticket?.coach ?? null} />

          {myCarriage ? (
            <View style={{ marginTop: space.xl }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text variant="headline">Your coach, {myCarriage.letter}</Text>
                <CrowdingMeter level={myCarriage.crowding} />
              </View>
              <Text variant="callout" tone="secondary" style={{ marginTop: 4 }}>
                {crowdingCopy[myCarriage.crowding].detail}
              </Text>
              <View style={{ marginTop: space.lg }}>
                <AmenityGrid amenities={myCarriage.amenities} dense />
              </View>
            </View>
          ) : (
            <Text variant="callout" tone="tertiary" style={{ marginTop: space.lg }}>
              Tap a coach to see how busy it is and what is on board.
            </Text>
          )}
        </Surface>
      </Section>

      {(phase === 'approaching' || phase === 'arrived' || phase === 'completed') && ticket ? (
        <Section title="Getting onwards">
          <Button
            label={`Connections from ${stationName(ticket.destinationStationId)}`}
            icon="arrow-right"
            fullWidth
            onPress={() => router.push(`/lastmile/${ticket.destinationStationId}`)}
          />
        </Section>
      ) : null}

      <Section>
        <View style={{ gap: space.sm }}>
          {alightingCall && alightingCall.delayMinutes > 1 ? (
            <Text variant="caption" tone="tertiary">
              Running {delayLabel(alightingCall.delayMinutes).toLowerCase()}. If you arrive more than 15
              minutes late you may be entitled to compensation - Account has the form.
            </Text>
          ) : null}
          <Text variant="caption" tone="tertiary">
            Position updated {relativeLabel(position?.recordedAt)} from{' '}
            {position?.source === 'gps'
              ? 'the train'
              : position?.source === 'trackside'
                ? 'trackside signalling'
                : 'the timetable'}
            .
          </Text>
          {active ? (
            <Button label="End tracking" variant="ghost" size="sm" onPress={endJourney} />
          ) : null}
        </View>
      </Section>
    </Screen>
  );
}
