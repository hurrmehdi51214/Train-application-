import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';
import { Icon } from './Icon';
import { Touchable } from './Touchable';

/**
 * The guest stepper.
 *
 * Circular outline buttons, a fixed-width number between them, and the label
 * and its caption on the left. Straight out of Airbnb's "Who's coming?" sheet,
 * and it earns the copy: getting the minus button to disable at the right
 * moment is most of what makes this control feel finished.
 */
export function Stepper({
  label,
  caption,
  value,
  onChange,
  min = 0,
  max = 9,
}: {
  label: string;
  caption?: string;
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
}) {
  const { palette, space } = useTheme();

  const control = (direction: -1 | 1, disabled: boolean) => (
    <Touchable
      onPress={() => onChange(value + direction)}
      disabled={disabled}
      haptic="selection"
      scaleTo={0.88}
      accessibilityRole="button"
      accessibilityLabel={`${direction === 1 ? 'Add' : 'Remove'} ${label}`}
      accessibilityState={{ disabled }}
      style={{
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: disabled ? palette.border : palette.borderStrong,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Icon
        name={direction === 1 ? 'plus' : 'minus'}
        size={16}
        color={disabled ? palette.textTertiary : palette.textSecondary}
      />
    </Touchable>
  );

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: space.base,
      }}
    >
      <View style={{ flex: 1, paddingRight: space.base }}>
        <Text variant="label">{label}</Text>
        {caption ? (
          <Text variant="body" tone="secondary" style={{ marginTop: 2 }}>
            {caption}
          </Text>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        {control(-1, value <= min)}
        <Text variant="label" style={{ minWidth: 24, textAlign: 'center' }}>
          {value}
        </Text>
        {control(1, value >= max)}
      </View>
    </View>
  );
}
