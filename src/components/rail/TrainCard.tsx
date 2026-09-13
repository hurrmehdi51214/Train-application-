import React from 'react';
import { View } from 'react-native';

import { JourneyOption, TrainService } from '@/types';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/primitives/Text';
import { Icon } from '@/components/primitives/Icon';
import { Rating } from '@/components/primitives/Rating';
import { Heart } from '@/components/primitives/Heart';
import { Touchable } from '@/components/primitives/Touchable';
import { PhotoCarousel } from '@/components/primitives/PhotoCarousel';
import { useWishlistStore } from '@/state/useWishlistStore';
import { photo } from '@/data/photos';
import { CLASS_LABEL } from '@/data/network';
import { stationName } from '@/data/stations';
import { clockTime, dayOffset, durationLabel } from '@/utils/time';
import { money } from '@/utils/format';

/**
 * The listing card.
 *
 * Straight out of Airbnb's grid and for the same reasons: the photograph does
 * the selling, the title line carries the rating on its right, two grey lines
 * carry the detail, and the price goes last in bold. Nothing is boxed, nothing
 * has a shadow, and the only border in the whole card is the rounded corner of
 * the image.
 *
 * The one departure from Airbnb is the departure/arrival strip: a train is
 * bought on its times far more than on its photograph, so the times get a row
 * of their own directly under the image.
 */
export function TrainCard({
  service,
  option,
  onPress,
}: {
  service: TrainService;
  /** When present, times and fares are for this leg rather than the whole run. */
  option?: JourneyOption;
  onPress: () => void;
}) {
  const { palette, space } = useTheme();
  const saved = useWishlistStore((s) => s.has(service.id));
  const toggle = useWishlistStore((s) => s.toggle);

  const uris = service.photoKeys.map((key) => photo(key)?.url).filter((u): u is string => Boolean(u));

  const originId = option?.originStationId ?? service.originStationId;
  const destinationId = option?.destinationStationId ?? service.destinationStationId;

  const cheapest = (option?.offers ?? service.offers).reduce(
    (min, offer) => (offer.fareMinor < min.fareMinor ? offer : min),
    (option?.offers ?? service.offers)[0]!,
  );

  const departure = option?.departure ?? service.calls[0]?.expectedDeparture ?? null;
  const arrival =
    option?.arrival ?? service.calls[service.calls.length - 1]?.expectedArrival ?? null;
  const duration =
    option?.durationMinutes ??
    (departure && arrival
      ? Math.round((new Date(arrival).getTime() - new Date(departure).getTime()) / 60_000)
      : 0);
  const overnight = departure && arrival ? dayOffset(departure, arrival) > 0 : false;
  const lowStock = cheapest.available > 0 && cheapest.available <= 12;

  return (
    <Touchable
      onPress={onPress}
      fade
      accessibilityRole="button"
      accessibilityLabel={`${service.name}, ${stationName(originId)} to ${stationName(destinationId)}, departs ${clockTime(departure)}, rated ${service.rating} from ${service.reviewCount} reviews, from ${money(cheapest.fareMinor)}`}
      style={{ marginBottom: space.xxl }}
    >
      <PhotoCarousel
        uris={uris}
        height={232}
        accessibilityLabel={`Photos of the ${service.name}`}
        overlay={<Heart saved={saved} onToggle={() => toggle(service.id)} onPhoto />}
      />

      {/* Title line: name on the left, rating hard right, Airbnb-style. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: space.md, gap: space.sm }}>
        <Text variant="label" numberOfLines={1} style={{ flex: 1 }}>
          {service.name}
        </Text>
        <Rating value={service.rating} showCount={false} />
      </View>

      <Text variant="body" tone="secondary" numberOfLines={1} style={{ marginTop: 2 }}>
        {stationName(originId)} to {stationName(destinationId)}
      </Text>

      {/* Times. A train is bought on these more than on the photograph. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm }}>
        <Text variant="bodyMedium">{clockTime(departure)}</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: palette.border }} />
        <Text variant="caption" tone="secondary">
          {durationLabel(duration)}
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: palette.border }} />
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text variant="bodyMedium">{clockTime(arrival)}</Text>
          {overnight ? (
            <Text variant="caption" tone="secondary" style={{ marginLeft: 2 }}>
              +{dayOffset(departure!, arrival!)}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm }}>
        {overnight ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name="moon" size={13} color={palette.textSecondary} />
            <Text variant="caption" tone="secondary">
              Overnight
            </Text>
          </View>
        ) : null}
        <Text variant="caption" tone="secondary">
          {service.number} · {CLASS_LABEL[cheapest.travelClass]} and up
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: space.sm }}>
        <Text variant="label">{money(cheapest.fareMinor)}</Text>
        <Text variant="body" tone="secondary">
          per person
        </Text>
        {lowStock ? (
          <Text variant="caption" tone="error" style={{ marginLeft: space.xs }}>
            · {cheapest.available} left
          </Text>
        ) : null}
      </View>
    </Touchable>
  );
}

/**
 * Compact variant for the results list under a map, where the photo has to
 * share the row rather than own it.
 */
export function TrainCardCompact({
  service,
  option,
  onPress,
}: {
  service: TrainService;
  option: JourneyOption;
  onPress: () => void;
}) {
  const { palette, space, radius } = useTheme();
  const uri = photo(service.photoKeys[0] ?? '')?.url;
  const cheapest = option.offers.reduce((min, o) => (o.fareMinor < min.fareMinor ? o : min), option.offers[0]!);

  return (
    <Touchable
      onPress={onPress}
      fade
      accessibilityRole="button"
      accessibilityLabel={`${service.name}, departs ${clockTime(option.departure)}, from ${money(cheapest.fareMinor)}`}
      style={{
        flexDirection: 'row',
        gap: space.md,
        paddingVertical: space.md,
        borderBottomWidth: 1,
        borderBottomColor: palette.border,
      }}
    >
      <View style={{ width: 104, height: 104, borderRadius: radius.md, overflow: 'hidden' }}>
        <PhotoCarousel uris={uri ? [uri] : []} height={104} radius={radius.md} />
      </View>

      <View style={{ flex: 1, justifyContent: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Text variant="bodyMedium" numberOfLines={1} style={{ flex: 1 }}>
            {service.name}
          </Text>
          <Rating value={service.rating} size="sm" showCount={false} />
        </View>
        <Text variant="caption" tone="secondary" style={{ marginTop: 3 }}>
          {clockTime(option.departure)} – {clockTime(option.arrival)} · {durationLabel(option.durationMinutes)}
        </Text>
        <Text variant="caption" tone="secondary" style={{ marginTop: 2 }}>
          {CLASS_LABEL[cheapest.travelClass]} and up
        </Text>
        <Text variant="bodyMedium" style={{ marginTop: 5 }}>
          {money(cheapest.fareMinor)}
        </Text>
      </View>
    </Touchable>
  );
}
