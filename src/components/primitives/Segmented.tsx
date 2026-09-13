import React, { useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';
import { Touchable } from './Touchable';

export interface SegmentedProps<T extends string> {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange(value: T): void;
}

export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  const { palette, radius, space, spring, shadow } = useTheme();
  const [width, setWidth] = useState(0);
  const slide = useRef(new Animated.Value(0)).current;

  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const segmentWidth = width > 0 ? (width - 8) / options.length : 0;

  const onLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    setWidth(next);
    slide.setValue((index * (next - 8)) / options.length);
  };

  return (
    <View
      onLayout={onLayout}
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        backgroundColor: palette.fill,
        borderRadius: radius.pill,
        padding: 4,
      }}
    >
      {segmentWidth > 0 ? (
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 4,
              left: 4,
              bottom: 4,
              width: segmentWidth,
              borderRadius: radius.pill,
              backgroundColor: palette.surface,
              transform: [{ translateX: slide }],
            },
            shadow.card,
          ]}
        />
      ) : null}

      {options.map((option, i) => (
        <Touchable
          key={option.value}
          haptic="selection"
          scaleTo={1}
          accessibilityRole="tab"
          accessibilityState={{ selected: option.value === value }}
          onPress={() => {
            Animated.spring(slide, { toValue: i * segmentWidth, useNativeDriver: true, ...spring.press }).start();
            onChange(option.value);
          }}
          style={{ flex: 1, alignItems: 'center', paddingVertical: space.sm + 2 }}
        >
          <Text variant="bodyMedium" tone={option.value === value ? 'primary' : 'secondary'}>
            {option.label}
          </Text>
        </Touchable>
      ))}
    </View>
  );
}
