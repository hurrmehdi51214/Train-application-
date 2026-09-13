import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { Call, JourneyPhase, TrainService } from '@/types';
import { stationName } from '@/data/stations';
import { clockTime, delayLabel } from '@/utils/time';

/**
 * Journey notifications.
 *
 * The rule we hold ourselves to: every notification must be something the
 * passenger would act on. "Your train has left" is useful once. "Your train is
 * still on time" is noise, and noise is how an app gets its notifications
 * turned off, which is how someone misses the one alert that mattered.
 *
 * Each phase fires at most once per journey; the journey store keeps
 * `lastNotifiedPhase` so a re-render or a reconnect cannot re-fire it.
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function ensurePermissions(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  if (!existing.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return requested.granted;
}

export async function configureChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('journey', {
    name: 'Your journey',
    description: 'Departure, approach and arrival alerts for a journey in progress.',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 180, 90, 180],
    lightColor: '#0E7A3A',
  });
  await Notifications.setNotificationChannelAsync('disruption', {
    name: 'Delays and disruption',
    description: 'Changes to a train you are booked on: delays, platform changes, cancellations.',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 260],
    lightColor: '#B8730B',
  });
}

interface Notice {
  title: string;
  body: string;
  channel: 'journey' | 'disruption';
}

function noticeForPhase(phase: JourneyPhase, service: TrainService, call: Call | undefined): Notice | null {
  switch (phase) {
    case 'onboard':
      return {
        channel: 'journey',
        title: 'You\u2019re on your way',
        body: `The ${service.name} has left ${stationName(service.originStationId)}. Settle in \u2014 we\u2019ll wake you before your stop.`,
      };
    case 'approaching':
      return {
        channel: 'journey',
        title: 'Your stop is next',
        body: call
          ? `${stationName(call.stationId)} coming up${call.platform ? `, platform ${call.platform}` : ''}. Time to gather your things.`
          : 'Your stop is coming up. Time to gather your things.',
      };
    case 'arrived':
      return {
        channel: 'journey',
        title: `Arrived at ${call ? stationName(call.stationId) : 'your destination'}`,
        body: call?.platform
          ? `Platform ${call.platform}. Tap to see buses, rickshaws and rides from here.`
          : 'Tap to see buses, rickshaws and rides from here.',
      };
    default:
      return null;
  }
}

/** Fires the phase notification. Returns false when nothing was worth sending. */
export async function notifyPhase(
  phase: JourneyPhase,
  service: TrainService,
  call?: Call,
): Promise<boolean> {
  const notice = noticeForPhase(phase, service, call);
  if (!notice) return false;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: notice.title,
      body: notice.body,
      data: { serviceId: service.id, phase },
      ...(Platform.OS === 'android' ? { channelId: notice.channel } : {}),
    },
    trigger: null,
  });
  return true;
}

/** A delay or platform change the passenger has not already been told about. */
export async function notifyDisruption(service: TrainService, call: Call, previous?: Call): Promise<void> {
  const delayChanged = previous ? previous.delayMinutes !== call.delayMinutes : call.delayMinutes > 2;
  const platformChanged = Boolean(previous && previous.platform !== call.platform && call.platform);

  if (!delayChanged && !platformChanged) return;

  const where = stationName(call.stationId);
  const title = platformChanged
    ? `Platform change at ${where}`
    : `${service.name} is ${delayLabel(call.delayMinutes).toLowerCase()}`;
  const parts: string[] = [];
  if (platformChanged) parts.push(`Now platform ${call.platform}.`);
  if (delayChanged && call.delayMinutes > 0) {
    parts.push(`Now expected ${clockTime(call.expectedDeparture ?? call.expectedArrival)}.`);
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body: parts.join(' ') || 'Tap for details.',
      data: { serviceId: service.id, stationId: call.stationId },
      ...(Platform.OS === 'android' ? { channelId: 'disruption' } : {}),
    },
    trigger: null,
  });
}

export async function cancelAll(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
}
