import React from 'react';
import { Pressable, View } from 'react-native';

import { JourneyOption } from '@/types';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/primitives/Text';
import { Surface } from '@/components/primitives/Surface';
import { Icon } from '@/components/primitives/Icon';
import { CrowdingMeter } from './CrowdingMeter';
import { clockTime, durationLabel } from '@/utils/time';
import { money, pluralise } from '@/utils/format';
import { stationName } from '@/data/stations';

/**
 * A search result. The two times are the loudest things on the card because
 * that is what a person scans a list of trains for; price is second; everything
 * else is supporting detail that should not compete.
 */
export function ServiceCard({
  option,
  operator,
  onPress,
}: {
  option: JourneyOption;
  operator?: string;
  onPress(): void;
}) {
  const { palette, space, radius } = useTheme();
  const leg = option.legs[0]!;
  const cheapest = option.fares.reduce((min, fare) => (fare.priceMinor < min.priceMinor ? fare : min), option.fares[0]!);
  const lowStock = cheapest.seatsRemaining !== null && cheapest.seatsRemaining <= 8;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${clockTime(leg.departure)} to ${stationName(leg.destinationStationId)}, arriving ${clockTime(
        leg.arrival,
      )}, from ${money(cheapest.priceMinor, cheapest.currency)}`}
      style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1, marginBottom: space.md })}
    >
      <Surface padding={space.lg}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text variant="title">{clockTime(leg.departure)}</Text>
          <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: space.sm }}>
            <Text variant="caption" tone="tertiary">
              {durationLabel(option.durationMinutes)}
            </Text>
            <View
              style={{
                height: 1,
                alignSelf: 'stretch',
                backgroundColor: palette.hairline,
                marginVertical: 5,
              }}
            />
            <Text variant="caption" tone="tertiary">
              {option.changes === 0 ? 'Direct' : pluralise(option.changes, 'change')}
            </Text>
          </View>
          <Text variant="title">{clockTime(leg.arrival)}</Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: space.lg,
            paddingTop: space.md,
            borderTopWidth: 1,
            borderTopColor: palette.hairline,
          }}
        >
          <View style={{ flex: 1, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="train" size={13} color={palette.textTertiary} />
              <Text variant="caption" tone="tertiary" numberOfLines={1}>
                {operator ?? 'Meridian Rail'}
                {leg.platform ? ` · Platform ${leg.platform}` : ''}
              </Text>
            </View>
            <CrowdingMeter level={option.expectedCrowding} compact />
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text variant="headline">{money(cheapest.priceMinor, cheapest.currency)}</Text>
            {lowStock ? (
              <View
                style={{
                  marginTop: 3,
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                  borderRadius: radius.xs,
                  backgroundColor: palette.warningSoft,
                }}
              >
                <Text variant="caption" style={{ color: palette.warning }}>
                  {cheapest.seatsRemaining} left at this price
                </Text>
              </View>
            ) : (
              <Text variant="caption" tone="tertiary" style={{ marginTop: 3 }}>
                single, from
              </Text>
            )}
          </View>
        </View>
      </Surface>
    </Pressable>
  );
}
