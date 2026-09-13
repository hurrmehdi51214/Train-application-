import React, { useEffect, useState } from 'react';
import { Alert, Linking, Switch, View } from 'react-native';
import { router } from 'expo-router';

import { Screen, GUTTER } from '@/components/primitives/Screen';
import { Text } from '@/components/primitives/Text';
import { Icon, IconName } from '@/components/primitives/Icon';
import { Divider } from '@/components/primitives/Divider';
import { Touchable } from '@/components/primitives/Touchable';
import { Segmented } from '@/components/primitives/Segmented';
import { LogoMark } from '@/components/brand/Logo';
import { useTheme } from '@/theme/ThemeProvider';
import { Appearance, useSettingsStore } from '@/state/useSettingsStore';
import { useTicketStore } from '@/state/useTicketStore';
import { useWishlistStore } from '@/state/useWishlistStore';
import { useNetworkStore } from '@/state/useNetworkStore';
import { cacheFootprintBytes, evictUnpinned } from '@/services/offline';
import { ensurePermissions } from '@/services/notifications';
import { canRenderMaps } from '@/services/googleMaps';
import { initials } from '@/utils/format';

export default function ProfileScreen() {
  const { palette, space, radius } = useTheme();
  const settings = useSettingsStore();
  const ticketCount = useTicketStore((s) => s.tickets.length);
  const savedCount = useWishlistStore((s) => s.saved.length);
  const { online, queued } = useNetworkStore();

  const [footprint, setFootprint] = useState<number | null>(null);
  const [notificationsBlocked, setNotificationsBlocked] = useState(false);

  useEffect(() => {
    void cacheFootprintBytes().then(setFootprint);
  }, []);

  const askForNotifications = async () => {
    const granted = await ensurePermissions();
    setNotificationsBlocked(!granted);
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
    <Screen tabBarSpacing contentStyle={{ paddingTop: 0 }}>
      <View style={{ paddingHorizontal: GUTTER, paddingTop: space.base, paddingBottom: space.lg }}>
        <Text variant="hero">Profile</Text>
      </View>

      <View style={{ paddingHorizontal: GUTTER }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.base }}>
          <View
            style={{
              width: 62,
              height: 62,
              borderRadius: 31,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: palette.brand,
            }}
          >
            <Text variant="heading" style={{ color: palette.onBrand }}>
              {settings.passengerName ? initials(settings.passengerName) : '–'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="subheading">{settings.passengerName || 'Guest traveller'}</Text>
            <Text variant="caption" tone="secondary" style={{ marginTop: 2 }}>
              {ticketCount} ticket{ticketCount === 1 ? '' : 's'} · {savedCount} saved ·{' '}
              {online ? 'online' : `offline${queued ? `, ${queued} queued` : ''}`}
            </Text>
          </View>
        </View>
      </View>

      <Divider style={{ marginVertical: space.lg, marginHorizontal: GUTTER }} />

      <Group title="Journey alerts">
        <Toggle
          icon="train"
          label="When my journey starts"
          detail="One alert as the train leaves your station."
          value={settings.notifyJourneyStart}
          onChange={(v) => {
            settings.set('notifyJourneyStart', v);
            if (v) void askForNotifications();
          }}
        />
        <Toggle
          icon="bell"
          label="Before my stop"
          detail={`A nudge ${settings.approachWarningMinutes} minutes out, so you can get to the doors.`}
          value={settings.notifyApproaching}
          onChange={(v) => {
            settings.set('notifyApproaching', v);
            if (v) void askForNotifications();
          }}
        />
        <Toggle
          icon="pin"
          label="On arrival"
          detail="Confirms you are there, with onward connections."
          value={settings.notifyArrival}
          onChange={(v) => settings.set('notifyArrival', v)}
        />
        <Toggle
          icon="alert"
          label="Delays and platform changes"
          detail="Only for trains you are actually booked on."
          value={settings.notifyDisruption}
          onChange={(v) => settings.set('notifyDisruption', v)}
        />

        <View style={{ marginTop: space.base }}>
          <Text variant="caption" tone="secondary" style={{ marginBottom: space.sm }}>
            Warn me this far before my stop
          </Text>
          <Segmented<'10' | '15' | '30'>
            value={String(settings.approachWarningMinutes) as '10' | '15' | '30'}
            onChange={(value) => settings.set('approachWarningMinutes', Number(value))}
            options={[
              { value: '10', label: '10 min' },
              { value: '15', label: '15 min' },
              { value: '30', label: '30 min' },
            ]}
          />
          <Text variant="caption" tone="tertiary" style={{ marginTop: space.sm }}>
            Long-distance halts can be brief. Fifteen minutes is enough to pack up and get down the coach.
          </Text>
        </View>

        {notificationsBlocked ? (
          <Text variant="caption" tone="error" style={{ marginTop: space.sm }}>
            Notifications are blocked in system settings, so none of these will arrive.
          </Text>
        ) : null}
      </Group>

      <Group title="Travel preferences">
        <Toggle
          icon="bed"
          label="Prefer lower berths"
          detail="Used when the reservation system allots your berth."
          value={settings.preferLowerBerth}
          onChange={(v) => settings.set('preferLowerBerth', v)}
        />
        <Toggle
          icon="download"
          label="Keep maps offline"
          detail="Route and station maps stay on the device."
          value={settings.keepMapsOffline}
          onChange={(v) => settings.set('keepMapsOffline', v)}
        />
      </Group>

      <Group title="Appearance">
        <Segmented<Appearance>
          value={settings.appearance}
          onChange={(value) => settings.set('appearance', value)}
          options={[
            { value: 'system', label: 'System' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
        />
      </Group>

      <Group title="Storage">
        <Text variant="body" tone="secondary">
          {footprint === null
            ? 'Measuring…'
            : `${(footprint / 1024).toFixed(0)} KB of timetables and maps cached. Tickets are stored separately and are never cleared automatically.`}
        </Text>
        <Touchable
          onPress={async () => {
            const removed = await evictUnpinned();
            setFootprint(await cacheFootprintBytes());
            Alert.alert(
              'Cache cleared',
              `Removed ${removed} cached item${removed === 1 ? '' : 's'}. Your tickets are untouched.`,
            );
          }}
          scaleTo={0.97}
          style={{
            alignSelf: 'flex-start',
            marginTop: space.md,
            paddingHorizontal: space.base,
            paddingVertical: space.sm + 2,
            borderRadius: radius.sm,
            backgroundColor: palette.fill,
          }}
        >
          <Text variant="bodyMedium">Clear cached timetables</Text>
        </Touchable>
      </Group>

      <Group title="More">
        <LinkRow icon="qr" label="Install code" detail="Share Safar by QR" onPress={() => router.push('/install')} />
        <LinkRow
          icon="ticket"
          label="Refunds and cancellations"
          detail="Pakistan Railways' clerkage rules"
          onPress={() =>
            Alert.alert(
              'Refunds',
              'Cancellations more than 48 hours before departure are refunded less a 10% clerkage charge. Inside 48 hours the deduction rises, and a ticket cancelled after departure is not refundable. This build links out to the operator portal to file a claim.',
            )
          }
        />
        <LinkRow
          icon="help"
          label="Delay compensation"
          detail="When a train runs badly late"
          onPress={() =>
            Alert.alert(
              'Delay compensation',
              'Pakistan Railways refunds a portion of the fare on long delays, claimed against your PNR at the booking office or online. Safar keeps every PNR on this device so you always have the number.',
            )
          }
        />
        <LinkRow
          icon="lock"
          label="Privacy"
          detail="What we store, and where"
          onPress={() =>
            Alert.alert(
              'Privacy',
              'Tickets, wishlists and settings stay on this device. Location is read only while a station or live-journey screen is open and is never sent to us. CNIC digits are sent once, to Pakistan Railways, to issue the ticket.',
            )
          }
        />
      </Group>

      <View style={{ paddingHorizontal: GUTTER, alignItems: 'center', gap: space.sm, marginTop: space.lg }}>
        <LogoMark size={34} variant="bare" />
        <Text variant="caption" tone="tertiary" align="center">
          Safar · an independent app for Pakistan Railways{'\n'}
          {canRenderMaps() ? 'Maps by Google' : 'Offline vector maps · add a Google Maps key for full maps'}
        </Text>
      </View>
    </Screen>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  const { space } = useTheme();
  return (
    <View style={{ paddingHorizontal: GUTTER, marginBottom: space.xxl }}>
      <Text variant="heading" style={{ marginBottom: space.md }}>
        {title}
      </Text>
      {children}
    </View>
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
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.base, paddingVertical: space.md }}>
      <Icon name={icon} size={20} color={palette.textSecondary} />
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium">{label}</Text>
        <Text variant="caption" tone="secondary" style={{ marginTop: 1 }}>
          {detail}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: palette.brand, false: palette.border }}
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
    <Touchable
      onPress={onPress}
      scaleTo={0.99}
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${detail}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: space.base, paddingVertical: space.md }}
    >
      <Icon name={icon} size={20} color={palette.textSecondary} />
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium">{label}</Text>
        <Text variant="caption" tone="secondary" style={{ marginTop: 1 }}>
          {detail}
        </Text>
      </View>
      <Icon name="chevron-right" size={17} color={palette.textTertiary} />
    </Touchable>
  );
}
