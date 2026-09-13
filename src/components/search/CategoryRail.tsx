import React, { useRef } from 'react';
import { Animated, ScrollView, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/primitives/Text';
import { Photo } from '@/components/primitives/Photo';
import { Touchable } from '@/components/primitives/Touchable';
import { GUTTER } from '@/components/primitives/Screen';
import { Category } from '@/data/discovery';
import { photo } from '@/data/photos';

/**
 * The category rail.
 *
 * Airbnb's is a row of tiny illustrated icons under the search bar, and it is
 * the single most-used control in their whole app. This one uses cropped
 * photographs instead of illustrations - circular, 28px, desaturated until
 * selected - because we have real pictures of these trains and these passes,
 * and a photograph of the Bolan is a better argument for tapping "Scenic" than
 * any icon would be.
 *
 * The underline slides between items rather than cutting, which is what stops a
 * horizontally scrolling tab row from feeling like a jump cut.
 */
export function CategoryRail({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: string;
  onChange: (id: string) => void;
}) {
  const { palette, space, spring } = useTheme();
  const scroller = useRef<ScrollView>(null);
  const positions = useRef<Record<string, { x: number; width: number }>>({});
  const underlineX = useRef(new Animated.Value(0)).current;
  const underlineW = useRef(new Animated.Value(0)).current;

  const select = (id: string) => {
    const spot = positions.current[id];
    if (spot) {
      Animated.parallel([
        Animated.spring(underlineX, { toValue: spot.x, useNativeDriver: false, ...spring.press }),
        Animated.spring(underlineW, { toValue: spot.width, useNativeDriver: false, ...spring.press }),
      ]).start();
      scroller.current?.scrollTo({ x: Math.max(0, spot.x - 80), animated: true });
    }
    onChange(id);
  };

  return (
    <View>
      <ScrollView
        ref={scroller}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: GUTTER, gap: space.xl }}
      >
        {categories.map((category) => {
          const active = category.id === value;
          const image = photo(category.photoKey);
          return (
            <Touchable
              key={category.id}
              onPress={() => select(category.id)}
              haptic="selection"
              scaleTo={0.94}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={category.label}
              onLayout={(e) => {
                const { x, width } = e.nativeEvent.layout;
                positions.current[category.id] = { x, width };
                if (active) {
                  underlineX.setValue(x);
                  underlineW.setValue(width);
                }
              }}
              style={{ alignItems: 'center', gap: 6, paddingBottom: space.md }}
            >
              <View style={{ opacity: active ? 1 : 0.45 }}>
                <Photo
                  uri={image?.url}
                  width={30}
                  height={30}
                  radius={15}
                  accessibilityLabel=""
                />
              </View>
              <Text
                variant="caption"
                style={{
                  color: active ? palette.textPrimary : palette.textSecondary,
                  fontWeight: active ? '700' : '500',
                }}
                numberOfLines={1}
              >
                {category.label}
              </Text>
            </Touchable>
          );
        })}
      </ScrollView>

      <View style={{ height: 2, backgroundColor: palette.border }}>
        <Animated.View
          style={{
            position: 'absolute',
            height: 2,
            backgroundColor: palette.textPrimary,
            left: Animated.add(underlineX, new Animated.Value(GUTTER)),
            width: underlineW,
          }}
        />
      </View>
    </View>
  );
}
