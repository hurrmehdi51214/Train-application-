import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';
import { Screen, GUTTER } from '@/components/primitives/Screen';
import { Text } from '@/components/primitives/Text';
import { Icon } from '@/components/primitives/Icon';
import { Button } from '@/components/primitives/Button';
import { Divider } from '@/components/primitives/Divider';
import { Map } from '@/components/map/Map';
import { MapMarker } from '@/components/map/types';
import { RouteTimeline } from '@/components/rail/RouteTimeline';
import { LiveDot, PlatformPanel } from '@/components/rail/LiveStatus';
import { DisruptionNote } from '@/components/rail/DisruptionNote';
import { useLiveService } from '@/hooks/useLiveService';
import { useTick } from '@/hooks/useTick';
import { useJourneyStore } from '@/state/useJourneyStore';
import { upcomingTickets, useTicketStore } from '@/state/useTicketStore';
import { getStation, stationName } from '@/data/stations';
import { clockTime, durationLabel, minutesBetween, relativeLabel } from '@/utils/time';
import { JourneyPhase } from '@/types';

const PHASE: Record<JourneyPhase, { title: string; detail: string }> = {
  idle: { title: 'Not started', detail: 'This journey has not begun yet.' },
  'to-station': {
    title: 'On your way',
    detail: 'Head for the station. We will tell you the platform as soon as it is set.',
  },
  'at-station': {
    title: 'Boarding soon',
    detail: 'Your train is being prepared. Make your way to the platform and find your coach.',
  },
  onboard: { title: 'Under way', detail: 'Settle in. We will nudge you well before your stop.' },
  approaching: {
    title: 'Your stop is next',
    detail: 'Gather your things and make your way towards the doors.',
  },
  arrived: { title: 'Arrived', detail: 'Mind the gap. Onward connections are below.' },
  completed: { title: 'Journey complete', detail: 'Hope it went well.' },
};

/**
 * The live journey.
 *
 * The map is the screen. Everything else - the phase banner, the platform, the
 * calling points - hangs off it, because the one question this screen exists to
 * answer is "where am I and when do I get off".
 */
export default function JourneyScreen() {
  const { palette, space, radius } = useTheme();
  const { serviceId } = useLocalSearchParams<{ serviceId: string }>();
  const now = useTick(20_000);

  const { service, geometry, position, loading, fromCache, refresh } = useLiveService(serviceId);

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

  const boardingCall = service?.calls.find((c) => c.stationId === ticket?.originStationId);
  const alightingCall = service?.calls.find((c) => c.stationId === ticket?.destinationStationId);
  const focusCall = phase === 'to-station' || phase === 'at-station' ? boardingCall : alightingCall;

  const markers = useMemo<MapMarker[]>(() => {
    if (!service) return [];
    const list: MapMarker[] = service.calls.map((call) => {
      const station = getStation(call.stationId);
      return {
        id: call.stationId,
        coordinate: station?.coordinate ?? { lat: 0, lon: 0 },
        kind:
          call.stationId === ticket?.originStationId
            ? 'origin'
            : call.stationId === ticket?.destinationStationId
              ? 'destination'
              : 'station',
        label: station?.name,
        passed: call.status === 'departed' || call.status === 'arrived',
      };
    });
    if (position) {
      list.push({
        id: 'train',
        coordinate: position.coordinate,
        kind: 'train',
        bearing: position.bearing,
      });
    }
    return list;
  }, [service, position, ticket]);

  if (loading && !service) {
    return (
      <Screen title="Live journey" back>
        <View style={{ paddingVertical: 80, alignItems: 'center' }}>
          <ActivityIndicator color={palette.brand} />
        </View>
      </Screen>
    );
  }

  if (!service) {
    return (
      <Screen title="Live journey" back>
        <View style={{ paddingHorizontal: GUTTER, paddingTop: space.xl }}>
          <Icon name="alert" size={24} color={palette.error} />
          <Text variant="subheading" style={{ marginTop: space.md }}>
            We cannot find that train
          </Text>
          <Text variant="body" tone="secondary" style={{ marginTop: 4 }}>
            It may have been cancelled or renumbered. Check your ticket for the latest details.
          </Text>
        </View>
      </Screen>
    );
  }

  const copy = PHASE[phase];
  const minutesRemaining = alightingCall
    ? minutesBetween(new Date(now), alightingCall.expectedArrival ?? alightingCall.scheduledArrival ?? '')
    : null;

  return (
    <Screen title={service.name} back onRefresh={refresh}>
      <View style={{ paddingHorizontal: GUTTER }}>
        <Map markers={markers} polyline={geometry} height={280} interactive />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: space.md, marginLeft: -4 }}>
          <LiveDot size={6} color={fromCache ? palette.textTertiary : palette.success} />
          <Text variant="captionMedium" tone={fromCache ? 'tertiary' : 'success'}>
            {/* "Live · 0 km/h" on a train that has not left yet is technically
                true and completely useless. Say what is actually happening. */}
            {fromCache
              ? 'Last known position'
              : (position?.progress ?? 0) <= 0
                ? `Departs ${clockTime(boardingCall?.expectedDeparture ?? service.calls[0]?.expectedDeparture)} from ${stationName(service.originStationId)}`
                : (position?.progress ?? 0) >= 1
                  ? 'Arrived at the terminus'
                  : `Live · ${position?.speedKph ?? 0} km/h`}
          </Text>
        </View>

        <Text variant="title" style={{ marginTop: space.sm }}>
          {copy.title}
        </Text>
        <Text variant="bodyLarge" tone="secondary" style={{ marginTop: 4 }}>
          {copy.detail}
        </Text>

        {minutesRemaining !== null && minutesRemaining > 0 && phase !== 'idle' ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.sm,
              marginTop: space.base,
              padding: space.md,
              borderRadius: radius.sm,
              backgroundColor: palette.fill,
            }}
          >
            <Icon name="clock" size={16} color={palette.textSecondary} />
            <Text variant="body" tone="secondary" style={{ flex: 1 }}>
              {durationLabel(minutesRemaining)} to{' '}
              {stationName(ticket?.destinationStationId ?? service.destinationStationId)}
            </Text>
          </View>
        ) : null}
      </View>

      {service.disruptions.length > 0 ? (
        <View style={{ paddingHorizontal: GUTTER, marginTop: space.lg }}>
          {service.disruptions.map((disruption) => (
            <DisruptionNote key={disruption.id} disruption={disruption} />
          ))}
        </View>
      ) : null}

      {focusCall ? (
        <View style={{ paddingHorizontal: GUTTER, marginTop: space.lg }}>
          <Text variant="heading" style={{ marginBottom: space.md }}>
            {phase === 'to-station' || phase === 'at-station' ? 'Your departure' : 'Your arrival'}
          </Text>
          <PlatformPanel call={focusCall} live={!fromCache} />
        </View>
      ) : null}

      <Divider style={{ marginVertical: space.lg, marginHorizontal: GUTTER }} />

      <View style={{ paddingHorizontal: GUTTER }}>
        <Text variant="heading" style={{ marginBottom: space.md }}>
          Calling at
        </Text>
        <RouteTimeline
          service={service}
          progress={position?.progress ?? 0}
          boardingStationId={ticket?.originStationId}
          alightingStationId={ticket?.destinationStationId}
        />
      </View>

      {(phase === 'approaching' || phase === 'arrived' || phase === 'completed') && ticket ? (
        <View style={{ paddingHorizontal: GUTTER, marginTop: space.lg }}>
          <Button
            label={`Getting around ${stationName(ticket.destinationStationId)}`}
            icon="arrow-right"
            fullWidth
            onPress={() => router.push(`/station/${ticket.destinationStationId}`)}
          />
        </View>
      ) : null}

      <View style={{ paddingHorizontal: GUTTER, marginTop: space.lg, gap: space.sm }}>
        <Text variant="caption" tone="tertiary">
          Position updated {relativeLabel(position?.recordedAt)} from{' '}
          {position?.source === 'gps'
            ? 'the train'
            : position?.source === 'trackside'
              ? 'trackside signalling'
              : 'the published timetable'}
          .
        </Text>
        {alightingCall && alightingCall.delayMinutes > 15 ? (
          <Text variant="caption" tone="tertiary">
            Running {durationLabel(alightingCall.delayMinutes)} late. Pakistan Railways refunds part of the
            fare on long delays; the claim form is in your Profile.
          </Text>
        ) : null}
        {active ? (
          <Button label="Stop tracking" variant="ghost" size="sm" onPress={endJourney} />
        ) : null}
      </View>
    </Screen>
  );
}
