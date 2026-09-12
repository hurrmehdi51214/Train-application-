import React from 'react';
import { Platform, Pressable, Share, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/primitives/Text';
import { Surface } from '@/components/primitives/Surface';
import { Button } from '@/components/primitives/Button';
import { Icon } from '@/components/primitives/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { config } from '@/services/config';

/**
 * The public install code.
 *
 * One URL, one QR. The link resolves server-side to the right destination -
 * App Store, Play Store, or the installable web build - so a poster at a
 * station, a card at a ticket office and a share sheet all use the same code
 * and none of them go stale when a store listing moves.
 */
export default function InstallScreen() {
  const { palette, space, radius } = useTheme();
  const insets = useSafeAreaInsets();

  const share = () => {
    void Share.share({
      message: `Meridian Rail - tickets, live trains and platform numbers: ${config.installUrl}`,
      url: config.installUrl,
      title: 'Meridian Rail',
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.canvas, paddingTop: insets.top + space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.md }}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ padding: 8 }} accessibilityLabel="Close">
          <Icon name="arrow-left" size={22} />
        </Pressable>
      </View>

      <View style={{ flex: 1, paddingHorizontal: space.xl, justifyContent: 'center' }}>
        <Text variant="display" align="center">
          Scan to install
        </Text>
        <Text variant="body" tone="secondary" align="center" style={{ marginTop: space.sm }}>
          Point any phone camera at this code. It opens the right store automatically.
        </Text>

        <View style={{ alignItems: 'center', marginTop: space.h2 }}>
          <Surface padding={space.xl} style={{ backgroundColor: '#FFFFFF' }}>
            <QRCode value={config.installUrl} size={214} color="#0B1A22" backgroundColor="#FFFFFF" ecl="Q" quietZone={8} />
          </Surface>

          <View
            style={{
              marginTop: space.lg,
              paddingHorizontal: space.lg,
              paddingVertical: space.sm,
              borderRadius: radius.pill,
              backgroundColor: palette.surfaceSunken,
            }}
          >
            <Text variant="numeric" tone="secondary">
              {config.installUrl.replace(/^https?:\/\//, '')}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.xxl, marginTop: space.h2 }}>
          <Platformette label="iOS" detail="15.1 or later" />
          <Platformette label="Android" detail="9 or later" />
          <Platformette label="Web" detail="any browser" />
        </View>
      </View>

      <View style={{ paddingHorizontal: space.xl, paddingBottom: insets.bottom + space.xl }}>
        <Button
          label={Platform.OS === 'web' ? 'Copy link' : 'Share link'}
          icon="share"
          iconPosition="leading"
          size="lg"
          fullWidth
          onPress={share}
        />
        <Text variant="caption" tone="tertiary" align="center" style={{ marginTop: space.md }}>
          The same code is printed on station posters. It never expires.
        </Text>
      </View>
    </View>
  );
}

function Platformette({ label, detail }: { label: string; detail: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text variant="label">{label}</Text>
      <Text variant="caption" tone="tertiary" style={{ marginTop: 2 }}>
        {detail}
      </Text>
    </View>
  );
}
