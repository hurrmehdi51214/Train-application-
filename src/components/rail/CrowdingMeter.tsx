import React from 'react';
import { View } from 'react-native';

import { CrowdingLevel } from '@/types';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/primitives/Text';
import { crowdingCopy } from '@/utils/format';

const LEVELS: CrowdingLevel[] = ['empty', 'light', 'moderate', 'busy', 'full'];

export function crowdingColor(level: CrowdingLevel, palette: { success: string; warning: string; critical: string; textTertiary: string }) {
  switch (level) {
    case 'empty':
    case 'light':
      return palette.success;
    case 'moderate':
      return palette.warning;
    case 'busy':
    case 'full':
      return palette.critical;
    default:
      return palette.textTertiary;
  }
}

/**
 * Five bars rather than a percentage. Passengers do not need to know a coach is
 * 68% full; they need to know whether they will get a seat. The label carries
 * that judgement so the visual does not have to be read precisely.
 */
export function CrowdingMeter({
  level,
  showLabel = true,
  compact = false,
}: {
  level: CrowdingLevel;
  showLabel?: boolean;
  compact?: boolean;
}) {
  const { palette, space } = useTheme();
  const activeIndex = LEVELS.indexOf(level);
  const tint = crowdingColor(level, palette);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2.5 }}>
        {LEVELS.map((_, index) => (
          <View
            key={index}
            style={{
              width: compact ? 3 : 4,
              height: (compact ? 6 : 8) + index * (compact ? 1.6 : 2.4),
              borderRadius: 2,
              backgroundColor: index <= activeIndex ? tint : palette.surfaceSunken,
            }}
          />
        ))}
      </View>
      {showLabel ? (
        <Text variant={compact ? 'caption' : 'label'} style={{ color: tint }}>
          {crowdingCopy[level].label}
        </Text>
      ) : null}
    </View>
  );
}
