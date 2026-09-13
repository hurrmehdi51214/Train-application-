import React from 'react';
import { Platform, Share, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/primitives/Text';
import { Icon } from '@/components/primitives/Icon';
import { Button } from '@/components/primitives/Button';
import { Touchable } from '@/components/primitives/Touchable';
import { Logo } from '@/components/brand/Logo';
import { config } from '@/services/config';
import { GUTTER } from '@/components/primitives/Screen';

/**
 * The public install code.
 *
 * One URL, one QR. The link resolves server-side to the right destination -
 * App Store, Play Store, or the installable web build - so a poster on a
 * platform at Karachi Cantt, a card at a booking window and a share sheet all
 * use the same code, and none of them go stale when a store listing moves.
 */
export default function InstallScreen() {
  const { palette, space, radius } = useTheme();
  const insets = useSafeAreaInsets();

  const share = () => {
    void Share.share({
      message: `Safar · Pakistan Railways tickets, live trains and platform numbers: ${config.installUrl}`,
      url: config.installUrl,
      title: 'Safar',
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.surface, paddingTop: insets.top + space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.md }}>
        <Touchable
          onPress={() => router.back()}
          scaleTo={0.88}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="close" size={19} />
        </Touchable>
      </View>

      <View style={{ flex: 1, paddingHorizontal: GUTTER, justifyContent: 'center' }}>
        <View style={{ alignItems: 'center' }}>
          <Logo size={40} />
        </View>

        <Text variant="hero" align="center" style={{ marginTop: space.xl }}>
          Scan to install
        </Text>
        <Text variant="bodyLarge" tone="secondary" align="center" style={{ marginTop: space.sm }}>
          Point any phone camera at this code. It opens the right store on its own.
        </Text>

        <View style={{ alignItems: 'center', marginTop: space.xxl }}>
          <View
            style={{
              padding: space.lg,
              borderRadius: radius.lg,
              backgroundColor: '#FFFFFF',
              borderWidth: 1,
              borderColor: palette.border,
            }}
          >
            <QRCode value={config.installUrl} size={206} color="#111111" backgroundColor="#FFFFFF" ecl="Q" quietZone={8} />
          </View>

          <View
            style={{
              marginTop: space.base,
              paddingHorizontal: space.base,
              paddingVertical: space.sm,
              borderRadius: radius.pill,
              backgroundColor: palette.fill,
            }}
          >
            <Text variant="bodyMedium" tone="secondary">
              {config.installUrl.replace(/^https?:\/\//, '')}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.xxl, marginTop: space.xxl }}>
          <Platformette label="iOS" detail="15.1 or later" />
          <Platformette label="Android" detail="9 or later" />
          <Platformette label="Web" detail="any browser" />
        </View>
      </View>

      <View style={{ paddingHorizontal: GUTTER, paddingBottom: insets.bottom + space.xl }}>
        <Button
          label={Platform.OS === 'web' ? 'Copy link' : 'Share link'}
          icon="share"
          iconPosition="leading"
          size="lg"
          fullWidth
          onPress={share}
        />
        <Text variant="caption" tone="tertiary" align="center" style={{ marginTop: space.md }}>
          The same code goes on station posters. It never expires.
        </Text>
      </View>
    </View>
  );
}

function Platformette({ label, detail }: { label: string; detail: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text variant="bodyMedium">{label}</Text>
      <Text variant="caption" tone="secondary" style={{ marginTop: 2 }}>
        {detail}
      </Text>
    </View>
  );
}
