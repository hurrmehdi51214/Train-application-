import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';

import { Call, TrainService } from '@/types';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/primitives/Text';
import { stationName } from '@/data/stations';
import { clockTime, delayLabel, durationLabel } from '@/utils/time';

const ROW = 64;
const RAIL_X = 7;

/**
 * The calling-points list.
 *
 * The dot for the train sits *between* two stops and slides down the rail as
 * the service runs, which is the one detail that makes a journey feel tracked
 * rather than listed. Stops the train has already passed go quiet; the two that
 * belong to your ticket stay loud, because those are the only rows anyone reads
 * in a hurry.
 */
export function RouteTimeline({
  service,
  progress,
  boardingStationId,
  alightingStationId,
  /** Hides stops outside your leg. */
  onlyMyLeg = false,
}: {
  service: TrainService;
  progress: number;
  boardingStationId?: string;
  alightingStationId?: string;
  onlyMyLeg?: boolean;
}) {
  const { palette } = useTheme();
  const calls = service.calls;

  const boardIndex = calls.findIndex((c) => c.stationId === boardingStationId);
  const alightIndex = calls.findIndex((c) => c.stationId === alightingStationId);

  const visible =
    onlyMyLeg && boardIndex >= 0 && alightIndex >= 0
      ? calls.filter((_, i) => i >= boardIndex && i <= alightIndex)
      : calls;

  const first = visible[0]?.sequence ?? 0;
  const last = visible[visible.length - 1]?.sequence ?? calls.length - 1;
  const span = Math.max(1, last - first);
  const local = Math.min(1, Math.max(0, (progress * (calls.length - 1) - first) / span));

  const railHeight = Math.max(0, (visible.length - 1) * ROW);
  const markerY = useRef(new Animated.Value(local * railHeight)).current;

  useEffect(() => {
    Animated.timing(markerY, {
      toValue: local * railHeight,
      duration: 900,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [local, railHeight, markerY]);

  return (
    <View style={{ height: railHeight + ROW }}>
      <View
        style={{
          position: 'absolute',
          left: RAIL_X,
          top: ROW / 2,
          width: 2,
          height: railHeight,
          backgroundColor: palette.border,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: RAIL_X,
          top: ROW / 2,
          width: 2,
          height: railHeight * local,
          backgroundColor: palette.brand,
        }}
      />

      {visible.map((call, index) => (
        <CallRow
          key={`${call.stationId}-${call.sequence}`}
          call={call}
          index={index}
          passed={call.sequence < progress * (calls.length - 1) - 0.02}
          emphasised={call.stationId === boardingStationId || call.stationId === alightingStationId}
        />
      ))}

      {progress > 0 && progress < 1 ? (
        <Animated.View
          style={{
            position: 'absolute',
            left: RAIL_X - 5,
            top: ROW / 2 - 6,
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: palette.brand,
            borderWidth: 3,
            borderColor: palette.surface,
            transform: [{ translateY: markerY }],
          }}
        />
      ) : null}
    </View>
  );
}

function CallRow({
  call,
  index,
  passed,
  emphasised,
}: {
  call: Call;
  index: number;
  passed: boolean;
  emphasised: boolean;
}) {
  const { palette, space } = useTheme();
  const late = call.delayMinutes > 1;
  const time = clockTime(call.expectedDeparture ?? call.expectedArrival);
  const scheduled = clockTime(call.scheduledDeparture ?? call.scheduledArrival);

  return (
    <View
      style={{
        position: 'absolute',
        top: index * ROW,
        left: 0,
        right: 0,
        height: ROW,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <View style={{ width: RAIL_X * 2 + 2, alignItems: 'center' }}>
        <View
          style={{
            width: emphasised ? 12 : 8,
            height: emphasised ? 12 : 8,
            borderRadius: 6,
            backgroundColor: emphasised ? palette.surface : passed ? palette.brand : palette.border,
            borderWidth: emphasised ? 3 : 0,
            borderColor: palette.brand,
          }}
        />
      </View>

      <View style={{ flex: 1, paddingLeft: space.md, paddingRight: space.sm }}>
        <Text
          variant={emphasised ? 'label' : 'body'}
          tone={passed && !emphasised ? 'tertiary' : 'primary'}
          numberOfLines={1}
        >
          {stationName(call.stationId)}
        </Text>
        <Text variant="caption" tone="tertiary" numberOfLines={1} style={{ marginTop: 1 }}>
          {call.platform
            ? `Platform ${call.platform}${call.platformConfirmed ? '' : ' (expected)'}`
            : 'Platform not yet set'}
          {call.haltMinutes > 0 ? ` · ${call.haltMinutes} min halt` : ''}
        </Text>
      </View>

      <View style={{ alignItems: 'flex-end', minWidth: 66 }}>
        <Text variant={emphasised ? 'bodyMedium' : 'body'} tone={late ? 'warning' : passed && !emphasised ? 'tertiary' : 'primary'}>
          {time}
        </Text>
        {late ? (
          <Text variant="caption" tone="tertiary" style={{ textDecorationLine: 'line-through' }}>
            {scheduled}
          </Text>
        ) : (
          <Text variant="caption" tone="tertiary">
            {delayLabel(call.delayMinutes)}
          </Text>
        )}
      </View>
    </View>
  );
}

/** The two-station summary used above a timeline. */
export function RouteHeadline({
  originId,
  destinationId,
  departure,
  arrival,
  durationMinutes,
}: {
  originId: string;
  destinationId: string;
  departure: string;
  arrival: string;
  durationMinutes: number;
}) {
  const { palette, space } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ flex: 1 }}>
        <Text variant="title">{clockTime(departure)}</Text>
        <Text variant="body" tone="secondary" numberOfLines={1}>
          {stationName(originId)}
        </Text>
      </View>

      <View style={{ alignItems: 'center', paddingHorizontal: space.md, flex: 1 }}>
        <Text variant="caption" tone="secondary">
          {durationLabel(durationMinutes)}
        </Text>
        <View style={{ height: 1, alignSelf: 'stretch', backgroundColor: palette.border, marginVertical: 6 }} />
        <Text variant="caption" tone="tertiary">
          direct
        </Text>
      </View>

      <View style={{ flex: 1, alignItems: 'flex-end' }}>
        <Text variant="title">{clockTime(arrival)}</Text>
        <Text variant="body" tone="secondary" numberOfLines={1} style={{ textAlign: 'right' }}>
          {stationName(destinationId)}
        </Text>
      </View>
    </View>
  );
}
