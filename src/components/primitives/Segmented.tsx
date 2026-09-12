import React, { useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, Pressable, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

export interface SegmentedProps<T extends string> {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange(value: T): void;
}

export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  const { palette, radius, space } = useTheme();
  const [width, setWidth] = useState(0);
  const slide = useRef(new Animated.Value(0)).current;

  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const segmentWidth = width > 0 ? (width - 8) / options.length : 0;

  const onLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    setWidth(next);
    slide.setValue((index * (next - 8)) / options.length);
  };

  const select = (nextIndex: number, nextValue: T) => {
    Animated.spring(slide, {
      toValue: nextIndex * segmentWidth,
      useNativeDriver: true,
      speed: 22,
      bounciness: 6,
    }).start();
    onChange(nextValue);
  };

  return (
    <View
      onLayout={onLayout}
      style={{
        flexDirection: 'row',
        backgroundColor: palette.surfaceSunken,
        borderRadius: radius.md,
        padding: 4,
      }}
    >
      {segmentWidth > 0 ? (
        <Animated.View
          style={{
            position: 'absolute',
            top: 4,
            left: 4,
            bottom: 4,
            width: segmentWidth,
            borderRadius: radius.sm,
            backgroundColor: palette.surface,
            transform: [{ translateX: slide }],
          }}
        />
      ) : null}
      {options.map((option, i) => (
        <Pressable
          key={option.value}
          accessibilityRole="tab"
          accessibilityState={{ selected: option.value === value }}
          onPress={() => select(i, option.value)}
          style={{ flex: 1, alignItems: 'center', paddingVertical: space.sm + 1 }}
        >
          <Text variant="label" tone={option.value === value ? 'primary' : 'secondary'}>
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
