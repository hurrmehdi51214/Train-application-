import React, { useMemo, useState } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/primitives/Text';
import { Icon } from '@/components/primitives/Icon';
import { Touchable } from '@/components/primitives/Touchable';

/**
 * The date picker.
 *
 * A month grid rather than a wheel or a native dialog, because choosing a train
 * date is a *comparison* - people want to see that the 14th is a Saturday and
 * that the 16th is a public holiday before they commit. A wheel hides all of
 * that behind one visible row.
 *
 * Dates in the past are rendered, not removed. A grid that silently starts on
 * the 13th is disorienting; one that shows the 1st to 12th greyed out is not.
 */

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function iso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function Calendar({
  value,
  onChange,
  /** How far ahead tickets are on sale. Pakistan Railways sells 30 days out. */
  daysAhead = 30,
}: {
  value: string;
  onChange: (date: string) => void;
  daysAhead?: number;
}) {
  const { palette, space, radius } = useTheme();
  const today = useMemo(() => new Date(), []);

  const [cursor, setCursor] = useState(() => {
    const [y, m] = value.split('-').map(Number);
    return { year: y ?? today.getFullYear(), month: (m ?? 1) - 1 };
  });

  const lastSaleDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + daysAhead);
    return d;
  }, [today, daysAhead]);

  const firstWeekday = new Date(cursor.year, cursor.month, 1).getDay();
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();

  const cells: Array<number | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const shift = (direction: -1 | 1) => {
    setCursor((current) => {
      const next = new Date(current.year, current.month + direction, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: space.base,
        }}
      >
        <Touchable
          onPress={() => shift(-1)}
          scaleTo={0.88}
          haptic="selection"
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="chevron-left" size={18} />
        </Touchable>

        <Text variant="subheading">
          {MONTHS[cursor.month]} {cursor.year}
        </Text>

        <Touchable
          onPress={() => shift(1)}
          scaleTo={0.88}
          haptic="selection"
          accessibilityRole="button"
          accessibilityLabel="Next month"
          style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="chevron-right" size={18} />
        </Touchable>
      </View>

      <View style={{ flexDirection: 'row', marginBottom: space.sm }}>
        {WEEKDAYS.map((day, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <Text variant="caption" tone="tertiary">
              {day}
            </Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((day, index) => {
          if (day === null) {
            return <View key={`pad-${index}`} style={{ width: `${100 / 7}%`, height: 44 }} />;
          }

          const dateIso = iso(cursor.year, cursor.month, day);
          const dateMs = new Date(cursor.year, cursor.month, day).getTime();
          const past = dateMs < startOfToday;
          const beyond = dateMs > lastSaleDate.getTime();
          const disabled = past || beyond;
          const selected = dateIso === value;
          const isToday = dateMs === startOfToday;

          return (
            <View key={dateIso} style={{ width: `${100 / 7}%`, height: 44, padding: 2 }}>
              <Touchable
                onPress={() => !disabled && onChange(dateIso)}
                disabled={disabled}
                haptic="selection"
                scaleTo={0.85}
                accessibilityRole="button"
                accessibilityLabel={`${day} ${MONTHS[cursor.month]}`}
                accessibilityState={{ selected, disabled }}
                style={{
                  flex: 1,
                  borderRadius: radius.pill,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: selected ? palette.textPrimary : 'transparent',
                  borderWidth: isToday && !selected ? 1 : 0,
                  borderColor: palette.borderStrong,
                  opacity: disabled ? 0.3 : 1,
                }}
              >
                <Text
                  variant="bodyMedium"
                  style={{ color: selected ? palette.surface : palette.textPrimary }}
                >
                  {day}
                </Text>
              </Touchable>
            </View>
          );
        })}
      </View>

      <Text variant="caption" tone="tertiary" style={{ marginTop: space.md }}>
        Pakistan Railways opens reservations {daysAhead} days ahead. Sleeper berths on the Green Line and
        Tezgam usually go in the first week.
      </Text>
    </View>
  );
}
