import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';

import { Call, TrainService } from '@/types';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/primitives/Text';
import { Icon } from '@/components/primitives/Icon';
import { stationName } from '@/data/stations';
import { clockTime, delayLabel } from '@/utils/time';

/**
 * The calling-points rail.
 *
 * The train marker sits *between* two stops and slides down the rail as the
 * service progresses, which is the one detail that makes a journey feel tracked
 * rather than listed. Passed stops go quiet; the stop you board at and the stop
 * you leave at stay loud, because those are the only two rows that will ever be
 * read in a hurry.
 */

export interface RouteRailProps {
  service: TrainService;
  /** 0..1 along the whole service. */
  progress: number;
  boardingStationId?: string;
  alightingStationId?: string;
  /** Collapses intermediate stops the passenger is not travelling through. */
  compact?: boolean;
}

const ROW_HEIGHT = 66;
const RAIL_X = 22;

export function RouteRail({
  service,
  progress,
  boardingStationId,
  alightingStationId,
  compact = false,
}: RouteRailProps) {
  const { palette, space } = useTheme();
  const calls = service.calls;

  const boardingIndex = calls.findIndex((c) => c.stationId === boardingStationId);
  const alightingIndex = calls.findIndex((c) => c.stationId === alightingStationId);

  const visible = compact
    ? calls.filter(
        (_, index) =>
          boardingIndex < 0 ||
          alightingIndex < 0 ||
          (index >= boardingIndex && index <= alightingIndex),
      )
    : calls;

  // Position along the visible rows rather than the whole service, so a
  // compacted rail still shows the marker where the passenger expects it.
  const firstVisible = visible[0]?.sequence ?? 0;
  const lastVisible = visible[visible.length - 1]?.sequence ?? calls.length - 1;
  const span = Math.max(1, lastVisible - firstVisible);
  const localProgress = Math.min(
    1,
    Math.max(0, (progress * (calls.length - 1) - firstVisible) / span),
  );

  const markerY = useRef(new Animated.Value(localProgress * (visible.length - 1) * ROW_HEIGHT)).current;

  useEffect(() => {
    Animated.timing(markerY, {
      toValue: localProgress * (visible.length - 1) * ROW_HEIGHT,
      duration: 900,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [localProgress, visible.length, markerY]);

  const railHeight = Math.max(0, (visible.length - 1) * ROW_HEIGHT);

  return (
    <View style={{ paddingVertical: space.sm }}>
      <View style={{ height: railHeight + ROW_HEIGHT }}>
        {/* the rail itself */}
        <View
          style={{
            position: 'absolute',
            left: RAIL_X,
            top: ROW_HEIGHT / 2,
            width: 3,
            height: railHeight,
            borderRadius: 2,
            backgroundColor: palette.surfaceSunken,
          }}
        />
        {/* travelled portion */}
        <View
          style={{
            position: 'absolute',
            left: RAIL_X,
            top: ROW_HEIGHT / 2,
            width: 3,
            height: railHeight * localProgress,
            borderRadius: 2,
            backgroundColor: palette.brand,
          }}
        />

        {visible.map((call, index) => (
          <CallRow
            key={`${call.stationId}-${call.sequence}`}
            call={call}
            index={index}
            passed={call.sequence < progress * (calls.length - 1) - 0.02}
            isBoarding={call.stationId === boardingStationId}
            isAlighting={call.stationId === alightingStationId}
          />
        ))}

        {/* the train */}
        <Animated.View
          style={{
            position: 'absolute',
            left: RAIL_X - 13,
            top: ROW_HEIGHT / 2 - 14,
            transform: [{ translateY: markerY }],
          }}
        >
          <View
            style={{
              width: 29,
              height: 29,
              borderRadius: 15,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: palette.brand,
              borderWidth: 3,
              borderColor: palette.canvas,
            }}
          >
            <Icon name="train" size={15} color={palette.onBrand} strokeWidth={1.9} />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

function CallRow({
  call,
  index,
  passed,
  isBoarding,
  isAlighting,
}: {
  call: Call;
  index: number;
  passed: boolean;
  isBoarding: boolean;
  isAlighting: boolean;
}) {
  const { palette } = useTheme();
  const emphasised = isBoarding || isAlighting;
  const time = clockTime(call.expectedDeparture ?? call.expectedArrival);
  const scheduled = clockTime(call.scheduledDeparture ?? call.scheduledArrival);
  const late = call.delayMinutes > 1;

  return (
    <View
      style={{
        position: 'absolute',
        top: index * ROW_HEIGHT,
        left: 0,
        right: 0,
        height: ROW_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <View style={{ width: RAIL_X * 2, alignItems: 'center' }}>
        <View
          style={{
            width: emphasised ? 13 : 9,
            height: emphasised ? 13 : 9,
            borderRadius: 7,
            backgroundColor: emphasised ? palette.canvas : passed ? palette.brand : palette.surfaceSunken,
            borderWidth: emphasised ? 3 : 0,
            borderColor: palette.brand,
          }}
        />
      </View>

      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text
          variant={emphasised ? 'headline' : 'bodyStrong'}
          tone={passed && !emphasised ? 'tertiary' : 'primary'}
          numberOfLines={1}
        >
          {stationName(call.stationId)}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
          {call.platform ? (
            <Text variant="caption" tone={call.platformConfirmed ? 'secondary' : 'tertiary'}>
              {call.platformConfirmed ? `Platform ${call.platform}` : `Platform ${call.platform} (expected)`}
            </Text>
          ) : (
            <Text variant="caption" tone="tertiary">
              Platform not yet announced
            </Text>
          )}
        </View>
      </View>

      <View style={{ alignItems: 'flex-end', minWidth: 74 }}>
        <Text variant="numeric" tone={late ? 'accent' : passed && !emphasised ? 'tertiary' : 'primary'}>
          {time}
        </Text>
        {late ? (
          <Text
            variant="caption"
            tone="tertiary"
            style={{ textDecorationLine: 'line-through', marginTop: 1 }}
          >
            {scheduled}
          </Text>
        ) : (
          <Text variant="caption" tone="tertiary" style={{ marginTop: 1 }}>
            {delayLabel(call.delayMinutes)}
          </Text>
        )}
      </View>
    </View>
  );
}
