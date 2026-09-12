import * as Location from 'expo-location';

import { Coordinate } from '@/types';

/**
 * Location access.
 *
 * Permission is asked for at the moment it buys the user something - the first
 * time they open navigation to a station, not on first launch. Foreground
 * accuracy is `Balanced` while walking (10m is plenty for "turn left at the
 * concourse") and drops further onboard, because a GPS fix every second for two
 * hours is a flat battery at the other end.
 */

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export async function requestForeground(): Promise<PermissionState> {
  const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
  if (status === Location.PermissionStatus.GRANTED) return 'granted';
  return canAskAgain ? 'undetermined' : 'denied';
}

export async function currentPosition(): Promise<Coordinate | null> {
  try {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { lat: position.coords.latitude, lon: position.coords.longitude };
  } catch {
    return null;
  }
}

export interface WatchHandle {
  remove(): void;
}

export async function watchPosition(
  onUpdate: (coordinate: Coordinate, headingDegrees: number | null) => void,
  mode: 'walking' | 'onboard' = 'walking',
): Promise<WatchHandle> {
  const subscription = await Location.watchPositionAsync(
    mode === 'walking'
      ? { accuracy: Location.Accuracy.Balanced, distanceInterval: 8, timeInterval: 3_000 }
      : { accuracy: Location.Accuracy.Low, distanceInterval: 250, timeInterval: 30_000 },
    (position) => {
      onUpdate(
        { lat: position.coords.latitude, lon: position.coords.longitude },
        position.coords.heading ?? null,
      );
    },
  );
  return { remove: () => subscription.remove() };
}

/** Last known fix, which returns instantly and is good enough to draw a map. */
export async function lastKnown(): Promise<Coordinate | null> {
  try {
    const position = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000 });
    if (!position) return null;
    return { lat: position.coords.latitude, lon: position.coords.longitude };
  } catch {
    return null;
  }
}
