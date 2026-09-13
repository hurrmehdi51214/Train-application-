import React, { useMemo, useRef, useState } from 'react';
import { Alert, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';
import { Screen, GUTTER } from '@/components/primitives/Screen';
import { Text } from '@/components/primitives/Text';
import { Icon } from '@/components/primitives/Icon';
import { Button } from '@/components/primitives/Button';
import { Touchable } from '@/components/primitives/Touchable';
import { Divider } from '@/components/primitives/Divider';
import { Photo } from '@/components/primitives/Photo';
import { Rating } from '@/components/primitives/Rating';
import { useSearchStore } from '@/state/useSearchStore';
import { useSettingsStore } from '@/state/useSettingsStore';
import { useTicketStore } from '@/state/useTicketStore';
import { api } from '@/services/apiClient';
import { availableMethods, idempotencyKey, openPaymentSheet, PaymentMethod } from '@/services/payments';
import { getJourneyOption, getService } from '@/data/trains';
import { CLASS_LABEL, partyFareMinor } from '@/data/network';
import { stationName } from '@/data/stations';
import { photo } from '@/data/photos';
import { clockTime, dayLabel, durationLabel } from '@/utils/time';
import { money, pluralise } from '@/utils/format';
import { PassengerDetail, TravelClass } from '@/types';

/**
 * Confirm and pay.
 *
 * One page, as Airbnb does it: the thing you are buying at the top, then the
 * decisions still outstanding, then the money, then one button. No wizard, no
 * progress bar - a booking that takes four screens feels four times as risky as
 * one that takes one.
 *
 * The CNIC fields are not decoration. Pakistan Railways will not issue a
 * reserved berth without one per adult, so collecting them here is the
 * difference between a ticket and a disappointment at the counter.
 */
export default function BookScreen() {
  const { palette, space, radius } = useTheme();
  const { journeyId, class: classParam } = useLocalSearchParams<{ journeyId: string; class?: TravelClass }>();

  const passengers = useSearchStore((s) => s.passengers);
  const settings = useSettingsStore();
  const addTicket = useTicketStore((s) => s.add);

  const journey = useMemo(() => (journeyId ? getJourneyOption(journeyId) : undefined), [journeyId]);
  const service = useMemo(() => (journey ? getService(journey.serviceId) : undefined), [journey]);

  const offer =
    journey?.offers.find((o) => o.travelClass === classParam) ??
    journey?.offers.reduce((min, o) => (o.fareMinor < min.fareMinor ? o : min), journey.offers[0]!);

  const methods = useMemo(() => availableMethods(), []);
  const [method, setMethod] = useState<PaymentMethod>(() => methods.find((m) => m.recommended) ?? methods[0]!);
  const [busy, setBusy] = useState(false);

  const totalAdults = passengers.adults;
  const totalChildren = passengers.children;

  const [people, setPeople] = useState<PassengerDetail[]>(() =>
    Array.from({ length: totalAdults + totalChildren }, (_, index) => ({
      name: index === 0 ? settings.passengerName : '',
      cnicLast6: null,
      age: index < totalAdults ? 30 : 8,
      gender: null,
      coach: null,
      berth: null,
      berthType: null,
    })),
  );

  // Held across retries so a repeated attempt reuses one idempotency key.
  const attemptNonce = useRef(Math.random().toString(36).slice(2));

  if (!journey || !service || !offer) {
    return (
      <Screen title="Booking" back>
        <View style={{ paddingHorizontal: GUTTER, paddingTop: space.xl }}>
          <Text variant="bodyLarge" tone="secondary">
            This fare is no longer available. Search again for current trains.
          </Text>
          <Button label="Back to search" onPress={() => router.replace('/(tabs)')} style={{ marginTop: space.lg }} />
        </View>
      </Screen>
    );
  }

  const subtotal = partyFareMinor(offer.fareMinor, { ...passengers, infants: 0 });
  const reservationFee = 0;
  const total = subtotal + reservationFee;

  const updatePerson = (index: number, patch: Partial<PassengerDetail>) => {
    setPeople((current) => current.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  };

  const missing = people.filter((p) => p.name.trim().length < 2).length;
  const adultsMissingCnic = people
    .slice(0, totalAdults)
    .filter((p) => !p.cnicLast6 || p.cnicLast6.length !== 6).length;

  const pay = async () => {
    if (missing > 0) {
      Alert.alert('Names needed', 'Every traveller needs the name that is on their CNIC or B-form.');
      return;
    }
    if (adultsMissingCnic > 0) {
      Alert.alert(
        'CNIC needed',
        'Pakistan Railways requires the last 6 digits of a CNIC for each adult on a reserved berth.',
      );
      return;
    }

    setBusy(true);
    try {
      const payment = await openPaymentSheet({ amountMinor: total, method });
      if (payment.status === 'cancelled') return;
      if (payment.status !== 'succeeded') {
        Alert.alert('Payment not completed', payment.message ?? 'Your bank or wallet declined the payment.');
        return;
      }

      settings.set('passengerName', people[0]!.name.trim());

      const ticket = await api.purchase({
        journeyId: journey.id,
        travelClass: offer.travelClass,
        passengers: people.map((p) => ({ ...p, name: p.name.trim() })),
        preferLowerBerth: settings.preferLowerBerth,
        idempotencyKey: idempotencyKey(journey.id, offer.travelClass, attemptNonce.current),
      });

      await addTicket(ticket);
      router.replace(`/ticket/${ticket.id}?justBooked=1`);
    } catch (error) {
      Alert.alert(
        'Could not issue your ticket',
        error instanceof Error
          ? `${error.message}. If you were charged, the payment is released automatically within 24 hours.`
          : 'Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  const heroUri = photo(service.photoKeys[0] ?? '')?.url;

  return (
    <Screen
      title="Confirm and pay"
      back
      footer={
        <Button
          label={busy ? 'Paying…' : `Pay ${money(total)}`}
          icon="lock"
          iconPosition="leading"
          size="lg"
          fullWidth
          loading={busy}
          onPress={pay}
        />
      }
    >
      <View style={{ paddingHorizontal: GUTTER }}>
        {/* What you are buying. */}
        <View style={{ flexDirection: 'row', gap: space.base, paddingVertical: space.base }}>
          <Photo uri={heroUri} width={104} height={90} radius={radius.md} />
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text variant="bodyMedium" numberOfLines={1}>
              {service.name}
            </Text>
            <Text variant="caption" tone="secondary" style={{ marginTop: 2 }} numberOfLines={1}>
              {stationName(journey.originStationId)} → {stationName(journey.destinationStationId)}
            </Text>
            <Text variant="caption" tone="secondary" style={{ marginTop: 2 }}>
              {CLASS_LABEL[offer.travelClass]}
            </Text>
            <View style={{ marginTop: 4 }}>
              <Rating value={service.rating} count={service.reviewCount} size="sm" />
            </View>
          </View>
        </View>

        <Divider style={{ marginVertical: space.base }} />

        <Text variant="heading">Your journey</Text>
        <Row label="Date" value={dayLabel(journey.departure)} />
        <Row
          label="Times"
          value={`${clockTime(journey.departure)} – ${clockTime(journey.arrival)} (${durationLabel(journey.durationMinutes)})`}
        />
        <Row label="Travellers" value={pluralise(totalAdults + totalChildren, 'traveller')} />
        <Row label="Class" value={CLASS_LABEL[offer.travelClass]} />

        <Divider style={{ marginVertical: space.base }} />

        <Text variant="heading" style={{ marginBottom: space.sm }}>
          Who's travelling
        </Text>
        <Text variant="body" tone="secondary" style={{ marginBottom: space.base }}>
          Each name must match the CNIC or B-form that traveller will carry.
        </Text>

        {people.map((person, index) => (
          <View
            key={index}
            style={{
              borderWidth: 1,
              borderColor: palette.border,
              borderRadius: radius.md,
              padding: space.base,
              marginBottom: space.md,
            }}
          >
            <Text variant="captionMedium" tone="secondary" style={{ marginBottom: space.sm }}>
              {index < totalAdults ? `Adult ${index + 1}` : `Child ${index - totalAdults + 1}`}
            </Text>

            <Field
              label="Full name"
              value={person.name}
              placeholder="As printed on the CNIC"
              autoCapitalize="words"
              onChange={(name) => updatePerson(index, { name })}
            />

            {index < totalAdults ? (
              <Field
                label="CNIC (last 6 digits)"
                value={person.cnicLast6 ?? ''}
                placeholder="000000"
                keyboardType="number-pad"
                maxLength={6}
                onChange={(digits) => updatePerson(index, { cnicLast6: digits.replace(/\D/g, '') })}
              />
            ) : (
              <Field
                label="Age"
                value={person.age ? String(person.age) : ''}
                placeholder="Years"
                keyboardType="number-pad"
                maxLength={2}
                onChange={(age) => updatePerson(index, { age: Number(age.replace(/\D/g, '')) || null })}
              />
            )}
          </View>
        ))}

        <Touchable
          onPress={() => settings.set('preferLowerBerth', !settings.preferLowerBerth)}
          scaleTo={0.99}
          haptic="selection"
          accessibilityRole="checkbox"
          accessibilityState={{ checked: settings.preferLowerBerth }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: settings.preferLowerBerth ? palette.textPrimary : 'transparent',
              borderWidth: settings.preferLowerBerth ? 0 : 1.5,
              borderColor: palette.borderStrong,
            }}
          >
            {settings.preferLowerBerth ? <Icon name="check" size={13} color={palette.surface} strokeWidth={2.6} /> : null}
          </View>
          <Text variant="body" style={{ flex: 1 }}>
            Ask for lower berths where available
          </Text>
        </Touchable>

        <Divider style={{ marginVertical: space.base }} />

        <Text variant="heading" style={{ marginBottom: space.base }}>
          How you'll pay
        </Text>
        {methods.map((option, index) => (
          <View key={option.id}>
            {index > 0 ? <Divider /> : null}
            <Touchable
              onPress={() => setMethod(option)}
              haptic="selection"
              scaleTo={0.99}
              accessibilityRole="radio"
              accessibilityState={{ selected: option.id === method.id }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.base }}
            >
              <Icon
                name={option.kind === 'card' ? 'card' : option.kind === 'bank-transfer' ? 'lock' : 'globe'}
                size={20}
                color={palette.textSecondary}
              />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                  <Text variant="bodyMedium">{option.label}</Text>
                  {option.recommended ? (
                    <Text variant="caption" tone="brand">
                      Most used
                    </Text>
                  ) : null}
                </View>
                <Text variant="caption" tone="secondary" style={{ marginTop: 1 }}>
                  {option.caption}
                </Text>
              </View>
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: option.id === method.id ? palette.textPrimary : 'transparent',
                  borderWidth: option.id === method.id ? 0 : 1.5,
                  borderColor: palette.borderStrong,
                }}
              >
                {option.id === method.id ? (
                  <Icon name="check" size={12} color={palette.surface} strokeWidth={2.6} />
                ) : null}
              </View>
            </Touchable>
          </View>
        ))}

        <Divider style={{ marginVertical: space.base }} />

        <Text variant="heading" style={{ marginBottom: space.base }}>
          Price details
        </Text>
        <PriceRow
          label={`${CLASS_LABEL[offer.travelClass]} × ${totalAdults} adult${totalAdults === 1 ? '' : 's'}`}
          value={money(offer.fareMinor * totalAdults)}
        />
        {totalChildren > 0 ? (
          <PriceRow
            label={`Child half fare × ${totalChildren}`}
            value={money(Math.round(offer.fareMinor * 0.5) * totalChildren)}
          />
        ) : null}
        {passengers.infants > 0 ? (
          <PriceRow label={`Infants × ${passengers.infants}`} value="Free" />
        ) : null}
        <PriceRow label="Reservation fee" value={reservationFee === 0 ? 'Included' : money(reservationFee)} />
        <Divider style={{ marginVertical: space.md }} />
        <PriceRow label="Total (PKR)" value={money(total)} strong />

        <View
          style={{
            flexDirection: 'row',
            gap: space.sm,
            marginTop: space.base,
            padding: space.md,
            borderRadius: radius.sm,
            backgroundColor: palette.fill,
          }}
        >
          <Icon name="lock" size={15} color={palette.textSecondary} />
          <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
            Your wallet PIN and card details are handled by the payment provider and never reach this app.
          </Text>
        </View>

        <Text variant="caption" tone="tertiary" style={{ marginTop: space.base }}>
          Cancellations more than 48 hours before departure are refunded less a 10% clerkage charge, per
          Pakistan Railways' published rules.
        </Text>
      </View>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const { space } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: space.base,
        paddingVertical: space.sm,
      }}
    >
      <Text variant="body" tone="secondary">
        {label}
      </Text>
      <Text variant="body" style={{ flex: 1, textAlign: 'right' }} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function PriceRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
      <Text variant={strong ? 'label' : 'bodyLarge'} tone={strong ? 'primary' : 'secondary'}>
        {label}
      </Text>
      <Text variant={strong ? 'label' : 'bodyLarge'}>{value}</Text>
    </View>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChange,
  keyboardType,
  maxLength,
  autoCapitalize,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (next: string) => void;
  keyboardType?: 'default' | 'number-pad';
  maxLength?: number;
  autoCapitalize?: 'none' | 'words';
}) {
  const { palette, radius, space } = useTheme();
  return (
    <View style={{ marginTop: space.sm }}>
      <Text variant="caption" tone="secondary">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={palette.textTertiary}
        keyboardType={keyboardType}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        style={{
          marginTop: 4,
          paddingHorizontal: space.md,
          paddingVertical: space.md,
          borderRadius: radius.sm,
          backgroundColor: palette.fill,
          color: palette.textPrimary,
          fontSize: 16,
          ...(typeof document === 'undefined' ? {} : { outlineStyle: 'none' as never }),
        }}
      />
    </View>
  );
}
