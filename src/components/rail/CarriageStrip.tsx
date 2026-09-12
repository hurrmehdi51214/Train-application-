import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Carriage } from '@/types';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/primitives/Text';
import { Icon } from '@/components/primitives/Icon';
import { crowdingColor } from './CrowdingMeter';
import { crowdingCopy } from '@/utils/format';

/**
 * The formation, drawn as the train actually stands at the platform: front of
 * the train to the left, in the direction of travel. Getting the orientation
 * right matters more than it sounds - someone reading this is standing on a
 * platform deciding which way to walk.
 */
export function CarriageStrip({
  carriages,
  selected,
  onSelect,
  /** Where the passenger's reserved coach is, highlighted even if not selected. */
  reservedCoach,
}: {
  carriages: Carriage[];
  selected?: string | null;
  onSelect?(letter: string): void;
  reservedCoach?: string | null;
}) {
  const { palette, radius, space } = useTheme();
  const ordered = [...carriages].sort((a, b) => a.position - b.position);

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: space.sm }}>
        <Text variant="caption" tone="tertiary">
          Front of train
        </Text>
        <Text variant="caption" tone="tertiary">
          Rear
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {ordered.map((carriage) => {
          const isSelected = selected === carriage.letter;
          const isReserved = reservedCoach === carriage.letter;
          const tint = crowdingColor(carriage.crowding, palette);
          const Wrapper = onSelect ? Pressable : View;

          return (
            <Wrapper
              key={carriage.letter}
              onPress={onSelect ? () => onSelect(carriage.letter) : undefined}
              accessibilityRole={onSelect ? 'button' : undefined}
              accessibilityLabel={`Coach ${carriage.letter}, ${crowdingCopy[carriage.crowding].label}, ${
                carriage.class === 'first' ? 'First Class' : 'Standard'
              }`}
              accessibilityState={onSelect ? { selected: isSelected } : undefined}
              style={{
                width: 62,
                paddingVertical: space.md,
                borderRadius: radius.md,
                alignItems: 'center',
                backgroundColor: isSelected ? palette.brand : palette.surfaceSunken,
                borderWidth: isReserved && !isSelected ? 2 : 0,
                borderColor: palette.brand,
                opacity: carriage.outOfService ? 0.4 : 1,
              }}
            >
              <Text
                variant="headline"
                style={{ color: isSelected ? palette.onBrand : palette.textPrimary }}
              >
                {carriage.letter}
              </Text>
              <Text
                variant="caption"
                style={{
                  color: isSelected ? palette.onBrand : palette.textTertiary,
                  marginTop: 1,
                  opacity: isSelected ? 0.85 : 1,
                }}
              >
                {carriage.class === 'first' ? '1st' : 'Std'}
              </Text>

              <View
                style={{
                  height: 4,
                  width: 30,
                  borderRadius: 2,
                  marginTop: space.sm,
                  backgroundColor: isSelected ? palette.onBrand : palette.hairline,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    height: 4,
                    width: `${Math.round(Math.min(1, carriage.occupancy) * 100)}%`,
                    backgroundColor: isSelected ? palette.onBrand : tint,
                  }}
                />
              </View>

              {carriage.amenities.includes('wheelchair-space') ? (
                <View style={{ marginTop: 6 }}>
                  <Icon
                    name="wheelchair"
                    size={13}
                    color={isSelected ? palette.onBrand : palette.textTertiary}
                  />
                </View>
              ) : null}
            </Wrapper>
          );
        })}
      </ScrollView>
    </View>
  );
}
