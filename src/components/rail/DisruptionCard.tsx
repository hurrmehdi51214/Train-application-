import React from 'react';
import { View } from 'react-native';

import { ServiceDisruption } from '@/types';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/primitives/Text';
import { Icon } from '@/components/primitives/Icon';
import { relativeLabel } from '@/utils/time';

export function DisruptionCard({ disruption }: { disruption: ServiceDisruption }) {
  const { palette, radius, space } = useTheme();

  const tint =
    disruption.severity === 'major'
      ? { fg: palette.critical, bg: palette.criticalSoft }
      : disruption.severity === 'minor'
        ? { fg: palette.warning, bg: palette.warningSoft }
        : { fg: palette.info, bg: palette.infoSoft };

  return (
    <View
      accessibilityRole="alert"
      style={{
        backgroundColor: tint.bg,
        borderRadius: radius.md,
        padding: space.lg,
        flexDirection: 'row',
        gap: space.md,
      }}
    >
      <View style={{ paddingTop: 2 }}>
        <Icon name={disruption.severity === 'info' ? 'info' : 'alert'} size={18} color={tint.fg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="headline" style={{ color: tint.fg }}>
          {disruption.title}
        </Text>
        <Text variant="callout" tone="secondary" style={{ marginTop: 4 }}>
          {disruption.detail}
        </Text>
        <Text variant="caption" tone="tertiary" style={{ marginTop: 8 }}>
          Updated {relativeLabel(disruption.issuedAt)}
        </Text>
      </View>
    </View>
  );
}
