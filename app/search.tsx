import React, { useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/primitives/Text';
import { Icon } from '@/components/primitives/Icon';
import { Button } from '@/components/primitives/Button';
import { Touchable } from '@/components/primitives/Touchable';
import { Photo } from '@/components/primitives/Photo';
import { Stepper } from '@/components/primitives/Stepper';
import { Divider } from '@/components/primitives/Divider';
import { Calendar } from '@/components/search/Calendar';
import { useSearchStore } from '@/state/useSearchStore';
import { searchStations, getStation, stationName } from '@/data/stations';
import { servedStationIds } from '@/data/trains';
import { DESTINATIONS } from '@/data/discovery';
import { photo } from '@/data/photos';
import { dayLabel } from '@/utils/time';
import { pluralise } from '@/utils/format';

type Step = 'where' | 'when' | 'who';

/**
 * The search flow.
 *
 * Airbnb's three-card accordion: Where, When, Who. Only one card is open at a
 * time, the closed ones collapse to a single summary line, and finishing one
 * advances to the next automatically. It works because it turns a five-field
 * form into three decisions, each of which gets the whole screen.
 *
 * The one change for a railway: "Where" is two fields, not one. A stay has a
 * destination; a journey has an origin *and* a destination, and pretending
 * otherwise would mean asking for the origin somewhere else and breaking the
 * flow in half.
 */
export default function SearchScreen() {
  const { palette, space, radius, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ step?: Step }>();

  const store = useSearchStore();
  const [step, setStep] = useState<Step>(params.step ?? 'where');
  const [field, setField] = useState<'origin' | 'destination'>('origin');
  const [query, setQuery] = useState('');

  const served = useMemo(() => new Set(servedStationIds()), []);
  const results = useMemo(
    () => searchStations(query, 40).filter((s) => served.has(s.id)),
    [query, served],
  );

  const origin = store.originId ? getStation(store.originId) : undefined;
  const destination = store.destinationId ? getStation(store.destinationId) : undefined;
  const travellers = store.totalTravellers();

  const pick = (stationId: string) => {
    if (field === 'origin') {
      store.setOrigin(stationId);
      if (!store.destinationId || store.destinationId === stationId) {
        setField('destination');
        setQuery('');
        return;
      }
      setField('destination');
      setQuery('');
    } else {
      store.setDestination(stationId);
      setQuery('');
      setStep('when');
    }
  };

  const run = () => {
    store.remember();
    router.dismissTo('/(tabs)');
    router.push('/results');
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.fill }}>
      <View
        style={{
          paddingTop: insets.top + space.sm,
          paddingHorizontal: space.base,
          paddingBottom: space.md,
          backgroundColor: palette.fill,
        }}
      >
        <Touchable
          onPress={() => router.back()}
          scaleTo={0.88}
          accessibilityRole="button"
          accessibilityLabel="Close search"
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: palette.surface,
            borderWidth: 1,
            borderColor: palette.border,
          }}
        >
          <Icon name="close" size={17} />
        </Touchable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space.base, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ------------------------------------------------------------ WHERE */}
        <StepCard
          open={step === 'where'}
          title="Where to?"
          summaryLabel="Route"
          summaryValue={
            origin && destination ? `${origin.name} → ${destination.name}` : 'Add stations'
          }
          onOpen={() => setStep('where')}
        >
          <View
            style={{
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: palette.border,
              backgroundColor: palette.surface,
              overflow: 'hidden',
            }}
          >
            <FieldRow
              label="From"
              value={origin?.name ?? ''}
              placeholder="Departure station"
              active={field === 'origin'}
              query={query}
              onQuery={setQuery}
              onFocus={() => {
                setField('origin');
                setQuery('');
              }}
            />
            <Divider inset={space.base} />
            <FieldRow
              label="To"
              value={destination?.name ?? ''}
              placeholder="Arrival station"
              active={field === 'destination'}
              query={query}
              onQuery={setQuery}
              onFocus={() => {
                setField('destination');
                setQuery('');
              }}
            />
          </View>

          <Touchable
            onPress={store.swap}
            haptic="selection"
            scaleTo={0.92}
            accessibilityRole="button"
            accessibilityLabel="Swap origin and destination"
            style={{
              alignSelf: 'flex-end',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              marginTop: space.md,
              paddingHorizontal: space.md,
              paddingVertical: space.sm,
              borderRadius: radius.pill,
              backgroundColor: palette.surface,
              borderWidth: 1,
              borderColor: palette.border,
            }}
          >
            <Icon name="swap" size={15} />
            <Text variant="caption">Swap</Text>
          </Touchable>

          {query.length > 0 ? (
            <View style={{ marginTop: space.base }}>
              {results.length === 0 ? (
                <Text variant="body" tone="secondary" style={{ paddingVertical: space.base }}>
                  No station on the network matches “{query}”.
                </Text>
              ) : (
                results.map((station) => (
                  <Touchable
                    key={station.id}
                    onPress={() => pick(station.id)}
                    haptic="selection"
                    scaleTo={0.99}
                    accessibilityRole="button"
                    accessibilityLabel={`${station.name}, ${station.city}`}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md }}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: radius.sm,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: palette.fill,
                      }}
                    >
                      <Icon name="train" size={19} color={palette.textSecondary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyMedium">{station.name}</Text>
                      <Text variant="caption" tone="secondary">
                        {station.city}, {station.province} · {station.code}
                      </Text>
                    </View>
                    <Text variant="caption" tone="tertiary" urdu>
                      {station.nameUrdu}
                    </Text>
                  </Touchable>
                ))
              )}
            </View>
          ) : (
            <>
              {store.recents.length > 0 ? (
                <View style={{ marginTop: space.xl }}>
                  <Text variant="bodyMedium" style={{ marginBottom: space.md }}>
                    Recent searches
                  </Text>
                  {store.recents.slice(0, 3).map((recent) => (
                    <Touchable
                      key={`${recent.originId}-${recent.destinationId}`}
                      onPress={() => {
                        store.setOrigin(recent.originId);
                        store.setDestination(recent.destinationId);
                        setStep('when');
                      }}
                      haptic="selection"
                      scaleTo={0.99}
                      accessibilityRole="button"
                      style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md }}
                    >
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: radius.sm,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: palette.fill,
                        }}
                      >
                        <Icon name="clock" size={18} color={palette.textSecondary} />
                      </View>
                      <Text variant="body" style={{ flex: 1 }} numberOfLines={1}>
                        {stationName(recent.originId)} → {stationName(recent.destinationId)}
                      </Text>
                    </Touchable>
                  ))}
                </View>
              ) : null}

              <Text variant="bodyMedium" style={{ marginTop: space.xl, marginBottom: space.md }}>
                Popular destinations
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
                {DESTINATIONS.slice(0, 6).map((destinationOption) => {
                  const image = photo(destinationOption.photoKey);
                  return (
                    <Touchable
                      key={destinationOption.id}
                      fade
                      onPress={() => pick(destinationOption.stationId)}
                      accessibilityRole="button"
                      accessibilityLabel={destinationOption.city}
                      style={{ width: 100 }}
                    >
                      <Photo uri={image?.url} height={100} radius={radius.sm} />
                      <Text variant="caption" style={{ marginTop: 6 }} numberOfLines={1}>
                        {destinationOption.city}
                      </Text>
                    </Touchable>
                  );
                })}
              </View>
            </>
          )}
        </StepCard>

        {/* ------------------------------------------------------------- WHEN */}
        <StepCard
          open={step === 'when'}
          title="When are you travelling?"
          summaryLabel="Date"
          summaryValue={dayLabel(`${store.date}T09:00:00`)}
          onOpen={() => setStep('when')}
        >
          <Calendar
            value={store.date}
            onChange={(date) => {
              store.setDate(date);
              setStep('who');
            }}
          />
        </StepCard>

        {/* -------------------------------------------------------------- WHO */}
        <StepCard
          open={step === 'who'}
          title="Who's travelling?"
          summaryLabel="Travellers"
          summaryValue={pluralise(travellers, 'traveller')}
          onOpen={() => setStep('who')}
        >
          <Stepper
            label="Adults"
            caption="12 and over"
            value={store.passengers.adults}
            min={1}
            max={6}
            onChange={(adults) => store.setPassengers({ ...store.passengers, adults })}
          />
          <Divider />
          <Stepper
            label="Children"
            caption="Ages 2 to 11, half fare"
            value={store.passengers.children}
            max={6}
            onChange={(children) => store.setPassengers({ ...store.passengers, children })}
          />
          <Divider />
          <Stepper
            label="Infants"
            caption="Under 2, travel free on a lap"
            value={store.passengers.infants}
            max={3}
            onChange={(infants) => store.setPassengers({ ...store.passengers, infants })}
          />

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
            <Icon name="info" size={15} color={palette.textSecondary} />
            <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
              Pakistan Railways requires a CNIC number for every adult on a reserved berth. You can add
              these at checkout.
            </Text>
          </View>
        </StepCard>
      </ScrollView>

      {/* Sticky action bar. */}
      <View
        style={[
          {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: space.base,
            paddingHorizontal: space.xl,
            paddingTop: space.base,
            paddingBottom: insets.bottom + space.base,
            backgroundColor: palette.surface,
            borderTopWidth: 1,
            borderTopColor: palette.border,
          },
          shadow.sheet,
        ]}
      >
        <Touchable
          onPress={() => {
            store.setTravelClass(null);
            store.setPassengers({ adults: 1, children: 0, infants: 0 });
            setQuery('');
            setStep('where');
          }}
          scaleTo={0.96}
          accessibilityRole="button"
          accessibilityLabel="Clear all"
        >
          <Text variant="bodyMedium" style={{ textDecorationLine: 'underline' }}>
            Clear all
          </Text>
        </Touchable>

        <Button
          label="Search trains"
          icon="search"
          iconPosition="leading"
          size="lg"
          onPress={run}
          disabled={!store.isReady()}
        />
      </View>
    </View>
  );
}

/** One accordion card. Closed it is a summary row; open it owns the screen. */
function StepCard({
  open,
  title,
  summaryLabel,
  summaryValue,
  onOpen,
  children,
}: {
  open: boolean;
  title: string;
  summaryLabel: string;
  summaryValue: string;
  onOpen: () => void;
  children: React.ReactNode;
}) {
  const { palette, radius, space, shadow } = useTheme();
  const fade = useRef(new Animated.Value(open ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.timing(fade, { toValue: open ? 1 : 0, duration: 200, useNativeDriver: true }).start();
  }, [open, fade]);

  if (!open) {
    return (
      <Touchable
        onPress={onOpen}
        scaleTo={0.99}
        haptic="selection"
        accessibilityRole="button"
        accessibilityLabel={`${summaryLabel}: ${summaryValue}. Tap to change`}
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: palette.surface,
            borderRadius: radius.lg,
            paddingHorizontal: space.xl,
            paddingVertical: space.base,
            marginBottom: space.md,
          },
          shadow.card,
        ]}
      >
        <Text variant="bodyMedium" tone="secondary">
          {summaryLabel}
        </Text>
        <Text variant="bodyMedium" numberOfLines={1} style={{ maxWidth: '64%', textAlign: 'right' }}>
          {summaryValue}
        </Text>
      </Touchable>
    );
  }

  return (
    <Animated.View
      style={[
        {
          backgroundColor: palette.surface,
          borderRadius: radius.lg,
          padding: space.xl,
          marginBottom: space.md,
          opacity: fade,
        },
        shadow.card,
      ]}
    >
      <Text variant="display" style={{ marginBottom: space.lg }}>
        {title}
      </Text>
      {children}
    </Animated.View>
  );
}

function FieldRow({
  label,
  value,
  placeholder,
  active,
  query,
  onQuery,
  onFocus,
}: {
  label: string;
  value: string;
  placeholder: string;
  active: boolean;
  query: string;
  onQuery: (next: string) => void;
  onFocus: () => void;
}) {
  const { palette, space } = useTheme();

  return (
    <Touchable
      onPress={onFocus}
      scaleTo={1}
      haptic="none"
      accessibilityRole="button"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        paddingHorizontal: space.base,
        paddingVertical: space.md,
        backgroundColor: active ? palette.fill : 'transparent',
      }}
    >
      <Icon name={label === 'From' ? 'pin' : 'train'} size={18} color={palette.textSecondary} />
      <View style={{ flex: 1 }}>
        <Text variant="caption" tone="secondary">
          {label}
        </Text>
        {active ? (
          <TextInput
            autoFocus
            value={query}
            onChangeText={onQuery}
            placeholder={placeholder}
            placeholderTextColor={palette.textTertiary}
            autoCorrect={false}
            returnKeyType="search"
            style={{
              color: palette.textPrimary,
              fontSize: 16,
              paddingVertical: 2,
              // The web build needs the outline removed explicitly.
              ...(typeof document === 'undefined' ? {} : { outlineStyle: 'none' as never }),
            }}
          />
        ) : (
          <Text variant="bodyLarge" tone={value ? 'primary' : 'tertiary'} numberOfLines={1}>
            {value || placeholder}
          </Text>
        )}
      </View>
    </Touchable>
  );
}
