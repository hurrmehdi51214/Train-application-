import React, { useMemo, useRef, useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { Screen, Section } from '@/components/primitives/Screen';
import { Text } from '@/components/primitives/Text';
import { Surface } from '@/components/primitives/Surface';
import { Button } from '@/components/primitives/Button';
import { Icon } from '@/components/primitives/Icon';
import { Divider } from '@/components/primitives/Divider';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/state/useSettingsStore';
import { useTicketStore } from '@/state/useTicketStore';
import { api } from '@/services/apiClient';
import {
  availableMethods,
  idempotencyKey,
  openPaymentSheet,
  PaymentMethod,
} from '@/services/payments';
import { getJourneyOption } from '@/data/services';
import { stationName } from '@/data/stations';
import { clockTime, dayLabel, durationLabel } from '@/utils/time';
import { money } from '@/utils/format';

export default function CheckoutScreen() {
  const { palette, space, radius } = useTheme();
  const params = useLocalSearchParams<{ journeyId: string; fareId: string; coach?: string; seat?: string }>();
  const savedName = useSettingsStore((s) => s.passengerName);
  const setSetting = useSettingsStore((s) => s.set);
  const addTicket = useTicketStore((s) => s.add);

  const journey = useMemo(() => (params.journeyId ? getJourneyOption(params.journeyId) : undefined), [params.journeyId]);
  const fare = journey?.fares.find((f) => f.id === params.fareId) ?? journey?.fares[0];

  const methods = useMemo(() => availableMethods(), []);
  const [method, setMethod] = useState<PaymentMethod>(() => methods.find((m) => m.default) ?? methods[0]!);
  const [name, setName] = useState(savedName);
  const [busy, setBusy] = useState(false);

  // Held across retries so a repeated attempt reuses one key, per payments.ts.
  const attemptNonce = useRef(Math.random().toString(36).slice(2));

  if (!journey || !fare) {
    return (
      <Screen title="Checkout" back>
        <Section>
          <Surface padding={space.xl}>
            <Text variant="body" tone="secondary">
              This fare is no longer available. Search again for current prices.
            </Text>
          </Surface>
        </Section>
      </Screen>
    );
  }

  const leg = journey.legs[0]!;
  const bookingFeeMinor = 0;
  const totalMinor = fare.priceMinor + bookingFeeMinor;

  const pay = async () => {
    if (name.trim().length < 2) {
      Alert.alert('Passenger name needed', 'Tickets are checked against the name on them.');
      return;
    }
    setBusy(true);
    try {
      const payment = await openPaymentSheet({
        amountMinor: totalMinor,
        currency: fare.currency,
        method,
      });

      if (payment.status === 'cancelled') return;
      if (payment.status !== 'succeeded') {
        Alert.alert('Payment not completed', payment.message ?? 'Your bank declined the payment.');
        return;
      }

      setSetting('passengerName', name.trim());

      const ticket = await api.purchase({
        journeyId: journey.id,
        fareId: fare.id,
        passengerName: name.trim(),
        coach: params.coach || null,
        seat: params.seat || null,
        idempotencyKey: idempotencyKey(journey.id, fare.id, attemptNonce.current),
      });

      await addTicket(ticket);
      router.replace(`/ticket/${ticket.id}?justBooked=1`);
    } catch (error) {
      Alert.alert(
        'Could not issue your ticket',
        error instanceof Error
          ? `${error.message}. If you were charged, the payment will be released automatically within 24 hours.`
          : 'Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      title="Confirm and pay"
      back
      footer={
        <>
          <Button
            label={busy ? 'Paying…' : `Pay ${money(totalMinor, fare.currency)}`}
            icon="lock"
            iconPosition="leading"
            size="lg"
            fullWidth
            loading={busy}
            onPress={pay}
          />
          <Text variant="caption" tone="tertiary" align="center" style={{ marginTop: space.sm }}>
            Card details are handled by our payment provider and never reach this app.
          </Text>
        </>
      }
    >
      <Section title="Journey">
        <Surface padding={space.lg}>
          <Text variant="overline" tone="tertiary">
            {dayLabel(leg.departure)}
          </Text>
          <Text variant="title" style={{ marginTop: 4 }} numberOfLines={2}>
            {stationName(leg.originStationId)} → {stationName(leg.destinationStationId)}
          </Text>
          <Text variant="body" tone="secondary" style={{ marginTop: 6 }}>
            {clockTime(leg.departure)} – {clockTime(leg.arrival)} · {durationLabel(journey.durationMinutes)} ·
            {' '}
            {journey.changes === 0 ? 'direct' : `${journey.changes} change`}
          </Text>

          <Divider style={{ marginVertical: space.lg }} />

          <View style={{ flexDirection: 'row', gap: space.xxl }}>
            <Detail label="Class" value={fare.class === 'first' ? 'First' : 'Standard'} />
            <Detail label="Coach" value={params.coach || 'Best available'} />
            <Detail label="Seat" value={params.seat || 'Best available'} />
          </View>
        </Surface>
      </Section>

      <Section title="Passenger">
        <Surface padding={space.lg}>
          <Text variant="overline" tone="tertiary">
            Name on ticket
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="As it appears on your ID"
            placeholderTextColor={palette.textTertiary}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            style={{
              marginTop: space.sm,
              paddingVertical: space.md,
              paddingHorizontal: space.md,
              borderRadius: radius.sm,
              backgroundColor: palette.surfaceSunken,
              color: palette.textPrimary,
              fontSize: 16,
            }}
          />
        </Surface>
      </Section>

      <Section title="Payment method">
        <Surface padding={space.xs}>
          {methods.map((option, index) => (
            <View key={option.id}>
              {index > 0 ? <Divider inset={space.lg} /> : null}
              <Pressable
                onPress={() => setMethod(option)}
                accessibilityRole="radio"
                accessibilityState={{ selected: option.id === method.id }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: space.lg,
                  paddingHorizontal: space.lg,
                  gap: space.md,
                }}
              >
                <Icon
                  name={option.kind === 'platform-pay' ? 'lock' : 'ticket'}
                  size={18}
                  color={palette.textSecondary}
                />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{option.label}</Text>
                  {option.hint ? (
                    <Text variant="caption" tone="tertiary">
                      Ending {option.hint}
                    </Text>
                  ) : null}
                </View>
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: option.id === method.id ? palette.brand : 'transparent',
                    borderWidth: option.id === method.id ? 0 : 1.5,
                    borderColor: palette.hairline,
                  }}
                >
                  {option.id === method.id ? (
                    <Icon name="check" size={12} color={palette.onBrand} strokeWidth={2.6} />
                  ) : null}
                </View>
              </Pressable>
            </View>
          ))}
        </Surface>
      </Section>

      <Section title="Price">
        <Surface padding={space.lg}>
          <PriceRow label={fare.class === 'first' ? 'First Class single' : 'Standard single'} value={money(fare.priceMinor, fare.currency)} />
          <PriceRow label="Booking fee" value={bookingFeeMinor === 0 ? 'None' : money(bookingFeeMinor, fare.currency)} />
          <Divider style={{ marginVertical: space.md }} />
          <PriceRow label="Total" value={money(totalMinor, fare.currency)} strong />
        </Surface>
        <Text variant="caption" tone="tertiary" style={{ marginTop: space.sm }}>
          {fare.refundable
            ? 'Refundable up to 28 days after the travel date, less any admin fee.'
            : 'This fare is non-refundable and valid only on the booked train.'}
        </Text>
      </Section>
    </Screen>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text variant="overline" tone="tertiary">
        {label}
      </Text>
      <Text variant="bodyStrong" style={{ marginTop: 2 }}>
        {value}
      </Text>
    </View>
  );
}

function PriceRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
      <Text variant={strong ? 'headline' : 'body'} tone={strong ? 'primary' : 'secondary'}>
        {label}
      </Text>
      <Text variant={strong ? 'headline' : 'body'}>{value}</Text>
    </View>
  );
}
