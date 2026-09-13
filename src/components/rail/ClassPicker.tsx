import React from 'react';
import { View } from 'react-native';

import { CoachOffer } from '@/types';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/primitives/Text';
import { Icon } from '@/components/primitives/Icon';
import { Touchable } from '@/components/primitives/Touchable';
import { CLASS_BLURB, CLASS_LABEL, CLASS_ORDER } from '@/data/network';
import { crowdingCopy, money, berthNoun } from '@/utils/format';
import { amenityMeta } from '@/data/discovery';

/**
 * Choosing a class.
 *
 * This is the most consequential decision in the whole booking - the difference
 * between a seat in an open coach and a lockable four-berth cabin for a
 * thirty-hour journey - so it gets full-width rows rather than a segmented
 * control, and each row says what you actually get rather than just its name.
 *
 * Availability is stated in real numbers when it is low. "3 berths left" moves
 * people; "limited availability" does not, and it is the kind of vague urgency
 * that makes an app feel like it is manipulating you.
 */
export function ClassPicker({
  offers,
  value,
  onChange,
}: {
  offers: CoachOffer[];
  value: string | null;
  onChange: (travelClass: CoachOffer['travelClass']) => void;
}) {
  const { palette, radius, space } = useTheme();

  const ordered = [...offers].sort(
    (a, b) => CLASS_ORDER.indexOf(a.travelClass) - CLASS_ORDER.indexOf(b.travelClass),
  );

  return (
    <View style={{ gap: space.md }}>
      {ordered.map((offer) => {
        const selected = offer.travelClass === value;
        const soldOut = offer.available <= 0;
        const scarce = offer.available > 0 && offer.available <= 12;

        return (
          <Touchable
            key={offer.travelClass}
            onPress={() => !soldOut && onChange(offer.travelClass)}
            disabled={soldOut}
            haptic="selection"
            scaleTo={0.985}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled: soldOut }}
            accessibilityLabel={`${CLASS_LABEL[offer.travelClass]}, ${money(offer.fareMinor)} per person, ${
              soldOut ? 'sold out' : `${offer.available} ${berthNoun(offer.travelClass)}s left`
            }`}
            style={{
              borderRadius: radius.md,
              borderWidth: selected ? 2 : 1,
              borderColor: selected ? palette.textPrimary : palette.border,
              padding: space.base,
              opacity: soldOut ? 0.45 : 1,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
              <View style={{ flex: 1 }}>
                <Text variant="label">{CLASS_LABEL[offer.travelClass]}</Text>
                <Text variant="body" tone="secondary" style={{ marginTop: 2 }}>
                  {CLASS_BLURB[offer.travelClass]}
                </Text>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginTop: space.md }}>
                  {offer.amenities.slice(0, 4).map((amenity) => (
                    <View key={amenity} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Icon
                        name={amenityMeta[amenity].icon as never}
                        size={13}
                        color={palette.textSecondary}
                        strokeWidth={1.9}
                      />
                      <Text variant="caption" tone="secondary">
                        {amenityMeta[amenity].label}
                      </Text>
                    </View>
                  ))}
                </View>

                <Text
                  variant="caption"
                  tone={soldOut ? 'error' : scarce ? 'warning' : 'secondary'}
                  style={{ marginTop: space.sm }}
                >
                  {soldOut
                    ? 'Sold out on this train'
                    : scarce
                      ? `Only ${offer.available} ${berthNoun(offer.travelClass)}${offer.available === 1 ? '' : 's'} left`
                      : crowdingCopy[offer.crowding].detail}
                </Text>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <Text variant="price">{money(offer.fareMinor)}</Text>
                <Text variant="caption" tone="secondary">
                  per person
                </Text>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    marginTop: space.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: selected ? palette.textPrimary : 'transparent',
                    borderWidth: selected ? 0 : 1.5,
                    borderColor: palette.borderStrong,
                  }}
                >
                  {selected ? <Icon name="check" size={13} color={palette.surface} strokeWidth={2.6} /> : null}
                </View>
              </View>
            </View>
          </Touchable>
        );
      })}
    </View>
  );
}
