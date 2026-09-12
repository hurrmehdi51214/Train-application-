import React, { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, Switch, View } from 'react-native';
import { router } from 'expo-router';

import { Screen, Section } from '@/components/primitives/Screen';
import { Text } from '@/components/primitives/Text';
import { Surface } from '@/components/primitives/Surface';
import { Icon, IconName } from '@/components/primitives/Icon';
import { Divider } from '@/components/primitives/Divider';
import { Segmented } from '@/components/primitives/Segmented';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettingsStore, Appearance } from '@/state/useSettingsStore';
import { useTicketStore } from '@/state/useTicketStore';
import { useNetworkStore } from '@/state/useNetworkStore';
import { cacheFootprintBytes, evictUnpinned } from '@/services/offline';
import { ensurePermissions } from '@/services/notifications';
import { initials } from '@/utils/format';

export default function AccountScreen() {
  const { palette, space, radius } = useTheme();
  const settings = useSettingsStore();
  const ticketCount = useTicketStore((s) => s.tickets.length);
  const { online, queued } = useNetworkStore();

  const [footprint, setFootprint] = useState<number | null>(null);
  const [notificationsAllowed, setNotificationsAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    void cacheFootprintBytes().then(setFootprint);
  }, []);

  const requestNotifications = async () => {
    const granted = await ensurePermissions();
    setNotificationsAllowed(granted);
    if (!granted) {
      Alert.alert(
        'Notifications are off',
        'Journey alerts need notification permission. You can turn it on in system settings.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open settings', onPress: () => void Linking.openSettings() },
        ],
      );
    }
  };

  return (
    <Screen title="Account">
      <Section>
        <Surface padding={space.lg}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: palette.brand,
              }}
            >
              <Text variant="headline" style={{ color: palette.onBrand }}>
                {settings.passengerName ? initials(settings.passengerName) : '-'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="headline">{settings.passengerName || 'Guest passenger'}</Text>
              <Text variant="caption" tone="tertiary" style={{ marginTop: 2 }}>
                {ticketCount} ticket{ticketCount === 1 ? '' : 's'} on this device ·{' '}
                {online ? 'online' : `offline${queued ? `, ${queued} queued` : ''}`}
              </Text>
            </View>
          </View>
        </Surface>
      </Section>

      <Section title="Journey alerts">
        <Surface padding={space.xs}>
          <Toggle
            icon="train"
            label="When my journey starts"
            detail="One alert as the train leaves your station."
            value={settings.notifyJourneyStart}
            onChange={(v) => {
              settings.set('notifyJourneyStart', v);
              if (v) void requestNotifications();
            }}
          />
          <Divider inset={56} />
          <Toggle
            icon="bell"
            label="Before my stop"
            detail={`A nudge ${settings.approachWarningMinutes} minutes out, so you can get to the doors.`}
            value={settings.notifyApproaching}
            onChange={(v) => {
              settings.set('notifyApproaching', v);
              if (v) void requestNotifications();
            }}
          />
          <Divider inset={56} />
          <Toggle
            icon="pin"
            label="On arrival"
            detail="Confirms you are there, with onward connections."
            value={settings.notifyArrival}
            onChange={(v) => settings.set('notifyArrival', v)}
          />
          <Divider inset={56} />
          <Toggle
            icon="alert"
            label="Delays and platform changes"
            detail="Only for trains you are actually booked on."
            value={settings.notifyDisruption}
            onChange={(v) => settings.set('notifyDisruption', v)}
          />
        </Surface>

        <View style={{ marginTop: space.md }}>
          <Text variant="overline" tone="tertiary" style={{ marginBottom: space.sm }}>
            Warn me this far before my stop
          </Text>
          <Segmented<'3' | '5' | '10'>
            value={String(settings.approachWarningMinutes) as '3' | '5' | '10'}
            onChange={(value) => settings.set('approachWarningMinutes', Number(value))}
            options={[
              { value: '3', label: '3 min' },
              { value: '5', label: '5 min' },
              { value: '10', label: '10 min' },
            ]}
          />
        </View>

        {notificationsAllowed === false ? (
          <Text variant="caption" tone="critical" style={{ marginTop: space.sm }}>
            Notifications are blocked in system settings, so none of these will arrive.
          </Text>
        ) : null}
      </Section>

      <Section title="Travel preferences">
        <Surface padding={space.xs}>
          <Toggle
            icon="quiet"
            label="Prefer the quiet coach"
            detail="Used when we pick a coach for you."
            value={settings.preferQuietCoach}
            onChange={(v) => settings.set('preferQuietCoach', v)}
          />
          <Divider inset={56} />
          <Toggle
            icon="wheelchair"
            label="Only step-free routes"
            detail="Hides connections that need stairs."
            value={settings.requireStepFree}
            onChange={(v) => settings.set('requireStepFree', v)}
          />
          <Divider inset={56} />
          <Toggle
            icon="download"
            label="Keep maps offline"
            detail="Station and route maps stay on the device."
            value={settings.keepMapsOffline}
            onChange={(v) => settings.set('keepMapsOffline', v)}
          />
        </Surface>
      </Section>

      <Section title="Appearance">
        <Segmented<Appearance>
          value={settings.appearance}
          onChange={(value) => settings.set('appearance', value)}
          options={[
            { value: 'system', label: 'System' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
        />
      </Section>

      <Section title="Storage">
        <Surface padding={space.lg}>
          <Text variant="body" tone="secondary">
            {footprint === null
              ? 'Measuring…'
              : `${(footprint / 1024).toFixed(0)} KB of timetables and maps cached. Tickets are stored separately and are never cleared automatically.`}
          </Text>
          <Pressable
            onPress={async () => {
              const removed = await evictUnpinned();
              setFootprint(await cacheFootprintBytes());
              Alert.alert('Cache cleared', `Removed ${removed} cached item${removed === 1 ? '' : 's'}. Your tickets are untouched.`);
            }}
            style={{
              marginTop: space.md,
              alignSelf: 'flex-start',
              paddingHorizontal: space.lg,
              paddingVertical: space.sm + 2,
              borderRadius: radius.sm,
              backgroundColor: palette.surfaceSunken,
            }}
          >
            <Text variant="label" tone="brand">
              Clear cached timetables
            </Text>
          </Pressable>
        </Surface>
      </Section>

      <Section title="More">
        <Surface padding={space.xs}>
          <LinkRow icon="qr" label="Install code" detail="Share the app by QR" onPress={() => router.push('/install')} />
          <Divider inset={56} />
          <LinkRow
            icon="ticket"
            label="Delay repay"
            detail="Claim when a journey runs 15+ minutes late"
            onPress={() =>
              Alert.alert(
                'Delay repay',
                'Claims are filed against the operator with your ticket reference. This build links out to the operator portal.',
              )
            }
          />
          <Divider inset={56} />
          <LinkRow
            icon="lock"
            label="Privacy"
            detail="What we store, and where"
            onPress={() =>
              Alert.alert(
                'Privacy',
                'Tickets and settings stay on this device. Location is used only while a navigation or live-journey screen is open, and is never sent to us.',
              )
            }
          />
        </Surface>
      </Section>
    </Screen>
  );
}

function Toggle({
  icon,
  label,
  detail,
  value,
  onChange,
}: {
  icon: IconName;
  label: string;
  detail: string;
  value: boolean;
  onChange(value: boolean): void;
}) {
  const { palette, space } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: space.md,
        paddingHorizontal: space.lg,
        gap: space.md,
      }}
    >
      <Icon name={icon} size={19} color={palette.textSecondary} />
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{label}</Text>
        <Text variant="caption" tone="tertiary" style={{ marginTop: 1 }}>
          {detail}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: palette.brand, false: palette.surfaceSunken }}
        thumbColor={palette.surface}
        accessibilityLabel={label}
      />
    </View>
  );
}

function LinkRow({
  icon,
  label,
  detail,
  onPress,
}: {
  icon: IconName;
  label: string;
  detail: string;
  onPress(): void;
}) {
  const { palette, space } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: space.md + 2,
        paddingHorizontal: space.lg,
        gap: space.md,
      }}
    >
      <Icon name={icon} size={19} color={palette.textSecondary} />
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{label}</Text>
        <Text variant="caption" tone="tertiary" style={{ marginTop: 1 }}>
          {detail}
        </Text>
      </View>
      <Icon name="chevron-right" size={17} color={palette.textTertiary} />
    </Pressable>
  );
}
