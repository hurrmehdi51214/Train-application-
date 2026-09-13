import React from 'react';
import { View } from 'react-native';

import { Disruption } from '@/types';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/primitives/Text';
import { Icon } from '@/components/primitives/Icon';
import { relativeLabel } from '@/utils/time';

export function DisruptionNote({ disruption }: { disruption: Disruption }) {
  const { palette, radius, space } = useTheme();

  const tint =
    disruption.severity === 'major'
      ? { fg: palette.error, bg: palette.errorSoft }
      : disruption.severity === 'minor'
        ? { fg: palette.warning, bg: palette.warningSoft }
        : { fg: palette.info, bg: palette.infoSoft };

  return (
    <View
      accessibilityRole="alert"
      style={{
        backgroundColor: tint.bg,
        borderRadius: radius.md,
        padding: space.base,
        flexDirection: 'row',
        gap: space.md,
      }}
    >
      <Icon name={disruption.severity === 'info' ? 'info' : 'alert'} size={19} color={tint.fg} />
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium" style={{ color: tint.fg }}>
          {disruption.title}
        </Text>
        <Text variant="body" tone="secondary" style={{ marginTop: 3 }}>
          {disruption.detail}
        </Text>
        <Text variant="caption" tone="tertiary" style={{ marginTop: 6 }}>
          Updated {relativeLabel(disruption.issuedAt)}
        </Text>
      </View>
    </View>
  );
}
