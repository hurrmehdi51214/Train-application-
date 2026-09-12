import React from 'react';
import { Pressable, View } from 'react-native';

import { Ticket } from '@/types';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/primitives/Text';
import { Surface } from '@/components/primitives/Surface';
import { Icon } from '@/components/primitives/Icon';
import { stationName } from '@/data/stations';
import { clockTime, dayLabel } from '@/utils/time';
import { groupReference } from '@/utils/format';

/**
 * The wallet row. The notch on both edges is the one skeuomorphic thing in the
 * whole product, and it earns its place: it is what makes a list of these read
 * instantly as "tickets" rather than "cards".
 */
export function TicketCard({ ticket, onPress }: { ticket: Ticket; onPress(): void }) {
  const { palette, radius, space } = useTheme();

  const statusTint =
    ticket.status === 'activated'
      ? { fg: palette.success, bg: palette.successSoft, label: 'Activated' }
      : ticket.status === 'valid'
        ? { fg: palette.brand, bg: palette.surfaceSunken, label: 'Ready' }
        : { fg: palette.textTertiary, bg: palette.surfaceSunken, label: ticket.status === 'used' ? 'Used' : 'Expired' };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Ticket from ${stationName(ticket.originStationId)} to ${stationName(
        ticket.destinationStationId,
      )}, ${dayLabel(ticket.departure)} at ${clockTime(ticket.departure)}`}
      style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1, marginBottom: space.md })}
    >
      <Surface padding={0} style={{ overflow: 'hidden' }}>
        <View style={{ padding: space.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="overline" tone="tertiary">
              {dayLabel(ticket.departure)} · {clockTime(ticket.departure)}
            </Text>
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: radius.xs,
                backgroundColor: statusTint.bg,
              }}
            >
              <Text variant="caption" style={{ color: statusTint.fg }}>
                {statusTint.label}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: space.md }}>
            <View style={{ flex: 1 }}>
              <Text variant="title" numberOfLines={1}>
                {stationName(ticket.originStationId)}
              </Text>
            </View>
            <View style={{ paddingHorizontal: space.sm }}>
              <Icon name="arrow-right" size={18} color={palette.textTertiary} />
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text variant="title" numberOfLines={1} style={{ textAlign: 'right' }}>
                {stationName(ticket.destinationStationId)}
              </Text>
            </View>
          </View>
        </View>

        {/* perforation */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: 16,
              height: 16,
              borderRadius: 8,
              marginLeft: -8,
              backgroundColor: palette.canvas,
            }}
          />
          <View
            style={{
              flex: 1,
              height: 1,
              borderStyle: 'dashed',
              borderTopWidth: 1,
              borderColor: palette.hairline,
            }}
          />
          <View
            style={{
              width: 16,
              height: 16,
              borderRadius: 8,
              marginRight: -8,
              backgroundColor: palette.canvas,
            }}
          />
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: space.lg,
            paddingVertical: space.md,
          }}
        >
          <View style={{ flexDirection: 'row', gap: space.lg }}>
            <Detail label="Coach" value={ticket.coach ?? '-'} />
            <Detail label="Seat" value={ticket.seat ?? '-'} />
            <Detail label="Class" value={ticket.class === 'first' ? 'First' : 'Standard'} />
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text variant="overline" tone="tertiary">
              Ref
            </Text>
            <Text variant="numeric" tone="secondary">
              {groupReference(ticket.reference)}
            </Text>
          </View>
        </View>
      </Surface>
    </Pressable>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text variant="overline" tone="tertiary">
        {label}
      </Text>
      <Text variant="numeric">{value}</Text>
    </View>
  );
}
