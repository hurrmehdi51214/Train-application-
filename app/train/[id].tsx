import React, { useMemo, useState } from 'react';
import { Animated, ScrollView, Share, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/primitives/Text';
import { Icon } from '@/components/primitives/Icon';
import { Button } from '@/components/primitives/Button';
import { Touchable } from '@/components/primitives/Touchable';
import { Heart } from '@/components/primitives/Heart';
import { Divider } from '@/components/primitives/Divider';
import { Rating } from '@/components/primitives/Rating';
import { Pill } from '@/components/primitives/Pill';
import { PhotoCarousel } from '@/components/primitives/PhotoCarousel';
import { Sheet } from '@/components/primitives/Sheet';
import { ClassPicker } from '@/components/rail/ClassPicker';
import { AmenityList } from '@/components/rail/AmenityList';
import { ReviewList } from '@/components/rail/ReviewList';
import { DisruptionNote } from '@/components/rail/DisruptionNote';
import { RouteTimeline, RouteHeadline } from '@/components/rail/RouteTimeline';
import { Map } from '@/components/map/Map';
import { MapMarker } from '@/components/map/types';
import { useWishlistStore } from '@/state/useWishlistStore';
import { useSearchStore } from '@/state/useSearchStore';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/services/apiClient';
import { getJourneyOption, getService } from '@/data/trains';
import { CLASS_LABEL } from '@/data/network';
import { getStation, stationName } from '@/data/stations';
import { credit, photo } from '@/data/photos';
import { config } from '@/services/config';
import { GUTTER } from '@/components/primitives/Screen';
import { clockTime, dayLabel, durationLabel } from '@/utils/time';
import { money } from '@/utils/format';
import { TravelClass } from '@/types';

const HERO_HEIGHT = 320;

/**
 * The listing page.
 *
 * Structurally this is Airbnb's: full-bleed photography with floating circular
 * controls, a title block, the host, the highlights, the description, the
 * amenities behind a "show all" sheet, a map, and reviews - with a sticky price
 * bar pinned to the bottom the entire way down.
 *
 * The railway's contribution is where the class picker sits: high, above the
 * description, because on a thirty-hour journey the class is the decision and
 * everything below it is only reassurance.
 */
export default function TrainScreen() {
  const { palette, space, radius, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const { id, journeyId } = useLocalSearchParams<{ id: string; journeyId?: string }>();

  const scrollY = React.useRef(new Animated.Value(0)).current;
  const [showAmenities, setShowAmenities] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [travelClass, setTravelClass] = useState<TravelClass | null>(null);

  const saved = useWishlistStore((s) => (id ? s.has(id) : false));
  const toggleSaved = useWishlistStore((s) => s.toggle);
  const searchDate = useSearchStore((s) => s.date);

  const service = useMemo(() => (id ? getService(id, searchDate) : undefined), [id, searchDate]);
  const option = useMemo(() => (journeyId ? getJourneyOption(journeyId) : undefined), [journeyId]);
  const { data: geometry } = useAsync(() => (id ? api.geometry(id) : Promise.resolve([])), [id]);

  if (!service) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.surface, padding: GUTTER, paddingTop: insets.top + 64 }}>
        <Text variant="title">Train not found</Text>
        <Text variant="body" tone="secondary" style={{ marginTop: space.sm }}>
          It may have been renumbered or withdrawn.
        </Text>
        <Button label="Back" onPress={() => router.back()} style={{ marginTop: space.xl }} />
      </View>
    );
  }

  const originId = option?.originStationId ?? service.originStationId;
  const destinationId = option?.destinationStationId ?? service.destinationStationId;
  const offers = option?.offers ?? service.offers;
  const chosen = offers.find((o) => o.travelClass === travelClass) ?? null;
  const cheapest = offers.reduce((min, o) => (o.fareMinor < min.fareMinor ? o : min), offers[0]!);

  const departure = option?.departure ?? service.calls[0]?.expectedDeparture ?? '';
  const arrival = option?.arrival ?? service.calls[service.calls.length - 1]?.expectedArrival ?? '';
  const duration =
    option?.durationMinutes ??
    (departure && arrival ? Math.round((new Date(arrival).getTime() - new Date(departure).getTime()) / 60_000) : 0);

  const uris = service.photoKeys.map((key) => photo(key)?.url).filter((u): u is string => Boolean(u));
  const heroCredit = photo(service.photoKeys[0] ?? '');

  const markers: MapMarker[] = service.calls.map((call) => {
    const station = getStation(call.stationId);
    return {
      id: call.stationId,
      coordinate: station?.coordinate ?? { lat: 0, lon: 0 },
      kind:
        call.stationId === originId ? 'origin' : call.stationId === destinationId ? 'destination' : 'station',
      label: station?.name,
    };
  });

  // The bar fades in as the hero scrolls away, so the controls always have
  // something to sit on.
  const barOpacity = scrollY.interpolate({
    inputRange: [HERO_HEIGHT - 140, HERO_HEIGHT - 60],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const allAmenities = Array.from(new Set(offers.flatMap((o) => o.amenities)));

  const circle = (child: React.ReactNode, onPress: () => void, label: string) => (
    <Touchable
      onPress={onPress}
      scaleTo={0.88}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        {
          width: 34,
          height: 34,
          borderRadius: 17,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: palette.surface,
        },
        shadow.floating,
      ]}
    >
      {child}
    </Touchable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: palette.surface }}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
      >
        <PhotoCarousel uris={uris} height={HERO_HEIGHT} radius={0} accessibilityLabel={`Photos of the ${service.name}`} />

        <View style={{ paddingHorizontal: GUTTER, paddingTop: space.lg }}>
          <Text variant="display">{service.name}</Text>
          <Text variant="bodyLarge" tone="secondary" urdu style={{ marginTop: 2 }}>
            {service.nameUrdu}
          </Text>

          <Text variant="bodyLarge" style={{ marginTop: space.md }}>
            {stationName(originId)} to {stationName(destinationId)}
          </Text>
          <Text variant="body" tone="secondary" style={{ marginTop: 2 }}>
            {durationLabel(duration)} · {service.calls.length} stops · {service.line}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.md }}>
            <Rating value={service.rating} count={service.reviewCount} />
            {service.featured ? <Pill label="Guest favourite" icon="flame" size="sm" tone="brand" /> : null}
          </View>
        </View>

        <Divider style={{ marginVertical: space.lg, marginHorizontal: GUTTER }} />

        {/* Operator, as Airbnb frames the host. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.base, paddingHorizontal: GUTTER }}>
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: palette.brandSoft,
            }}
          >
            <Icon name="train" size={22} color={palette.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="label">Operated by {service.operator}</Text>
            <Text variant="caption" tone="secondary" style={{ marginTop: 1 }}>
              Train {service.number} · running daily
            </Text>
          </View>
          <Icon name="verified" size={20} color={palette.brand} />
        </View>

        <Divider style={{ marginVertical: space.lg, marginHorizontal: GUTTER }} />

        {service.disruptions.length > 0 ? (
          <View style={{ paddingHorizontal: GUTTER, marginBottom: space.lg }}>
            {service.disruptions.map((disruption) => (
              <DisruptionNote key={disruption.id} disruption={disruption} />
            ))}
          </View>
        ) : null}

        {/* Times, the thing this is actually bought on. */}
        <View style={{ paddingHorizontal: GUTTER }}>
          <RouteHeadline
            originId={originId}
            destinationId={destinationId}
            departure={departure}
            arrival={arrival}
            durationMinutes={duration}
          />
          <Text variant="caption" tone="secondary" style={{ marginTop: space.md }}>
            Departs {dayLabel(departure)} at {clockTime(departure)} from platform{' '}
            {option?.platform ?? service.calls[0]?.platform ?? '–'}
          </Text>
        </View>

        <Divider style={{ marginVertical: space.lg, marginHorizontal: GUTTER }} />

        {/* The decision. */}
        <View style={{ paddingHorizontal: GUTTER }}>
          <Text variant="heading" style={{ marginBottom: space.base }}>
            Choose a class
          </Text>
          <ClassPicker offers={offers} value={travelClass} onChange={setTravelClass} />
        </View>

        <Divider style={{ marginVertical: space.lg, marginHorizontal: GUTTER }} />

        <View style={{ paddingHorizontal: GUTTER }}>
          <Text variant="heading" style={{ marginBottom: space.sm }}>
            About this train
          </Text>
          <Text variant="bodyLarge" numberOfLines={showAbout ? undefined : 4}>
            {service.about}
          </Text>
          {!showAbout ? (
            <Touchable onPress={() => setShowAbout(true)} scaleTo={0.97} style={{ marginTop: space.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text variant="bodyMedium" style={{ textDecorationLine: 'underline' }}>
                  Show more
                </Text>
                <Icon name="chevron-right" size={14} />
              </View>
            </Touchable>
          ) : null}
        </View>

        <Divider style={{ marginVertical: space.lg, marginHorizontal: GUTTER }} />

        <View style={{ paddingHorizontal: GUTTER }}>
          <Text variant="heading" style={{ marginBottom: space.sm }}>
            What's on board
          </Text>
          <AmenityList amenities={allAmenities} limit={5} />
          {allAmenities.length > 5 ? (
            <Button
              label={`Show all ${allAmenities.length} amenities`}
              variant="outline"
              onPress={() => setShowAmenities(true)}
              fullWidth
              style={{ marginTop: space.base }}
            />
          ) : null}
        </View>

        <Divider style={{ marginVertical: space.lg, marginHorizontal: GUTTER }} />

        <View style={{ paddingHorizontal: GUTTER }}>
          <Text variant="heading" style={{ marginBottom: space.sm }}>
            Where you'll travel
          </Text>
          <Text variant="body" tone="secondary" style={{ marginBottom: space.base }}>
            {service.line} · {service.calls[service.calls.length - 1]?.distanceKm ?? 0} km end to end
          </Text>
          <Map
            markers={markers}
            polyline={geometry ?? []}
            height={240}
            interactive={false}
            onPress={() => router.push(`/journey/${service.id}`)}
          />
          {!config.googleMapsApiKey ? (
            <Text variant="caption" tone="tertiary" style={{ marginTop: space.sm }}>
              Offline route map. Add a Google Maps key to see streets and terrain.
            </Text>
          ) : null}

          <View style={{ marginTop: space.lg }}>
            <RouteTimeline
              service={service}
              progress={0}
              boardingStationId={originId}
              alightingStationId={destinationId}
            />
          </View>
        </View>

        <Divider style={{ marginVertical: space.lg, marginHorizontal: GUTTER }} />

        <View style={{ paddingHorizontal: GUTTER }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.lg }}>
            <Icon name="star" size={17} filled color={palette.star} />
            <Text variant="heading">
              {service.rating.toFixed(2)} · {service.reviewCount.toLocaleString('en-PK')} reviews
            </Text>
          </View>
          <ReviewList reviews={service.reviews} limit={3} />
        </View>

        {heroCredit ? (
          <Text variant="caption" tone="tertiary" style={{ paddingHorizontal: GUTTER, marginTop: space.xl }}>
            Photo: {credit(heroCredit)}, via Wikimedia Commons
          </Text>
        ) : null}
      </Animated.ScrollView>

      {/* Floating controls over the hero. */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: insets.top + 52,
          backgroundColor: palette.surface,
          opacity: barOpacity,
          borderBottomWidth: 1,
          borderBottomColor: palette.border,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: insets.top + space.sm,
          left: GUTTER,
          right: GUTTER,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {circle(<Icon name="chevron-left" size={19} />, () => router.back(), 'Go back')}
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {circle(
            <Icon name="share" size={17} />,
            () => {
              void Share.share({
                message: `${service.name} (${service.number}) · ${stationName(originId)} to ${stationName(destinationId)} on Safar: ${config.installUrl}`,
              });
            },
            'Share this train',
          )}
          <View
            style={[
              {
                width: 34,
                height: 34,
                borderRadius: 17,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: palette.surface,
              },
              shadow.floating,
            ]}
          >
            <Heart saved={saved} onToggle={() => toggleSaved(service.id)} size={19} />
          </View>
        </View>
      </View>

      {/* Sticky price bar. */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: space.base,
          paddingHorizontal: GUTTER,
          paddingTop: space.base,
          paddingBottom: insets.bottom + space.base,
          backgroundColor: palette.surface,
          borderTopWidth: 1,
          borderTopColor: palette.border,
        }}
      >
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <Text variant="price">{money((chosen ?? cheapest).fareMinor)}</Text>
            <Text variant="body" tone="secondary">
              per person
            </Text>
          </View>
          <Text variant="caption" tone="secondary" style={{ marginTop: 1 }}>
            {chosen ? CLASS_LABEL[chosen.travelClass] : `from ${CLASS_LABEL[cheapest.travelClass]}`} ·{' '}
            {dayLabel(departure)}
          </Text>
        </View>

        <Button
          label={chosen ? 'Reserve' : 'Choose class'}
          size="lg"
          onPress={() => {
            if (!chosen) {
              setTravelClass(cheapest.travelClass);
              return;
            }
            const bookingId = option?.id ?? `${service.id}:${originId}:${destinationId}:${searchDate}`;
            router.push(`/book/${encodeURIComponent(bookingId)}?class=${chosen.travelClass}`);
          }}
        />
      </View>

      <Sheet visible={showAmenities} onClose={() => setShowAmenities(false)} title="What's on board">
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
          <AmenityList amenities={allAmenities} />
          <View style={{ height: space.xl }} />
        </ScrollView>
      </Sheet>
    </View>
  );
}
