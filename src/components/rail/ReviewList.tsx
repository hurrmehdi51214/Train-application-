import React from 'react';
import { View } from 'react-native';

import { Review } from '@/types';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/primitives/Text';
import { Icon } from '@/components/primitives/Icon';
import { CLASS_LABEL } from '@/data/network';
import { initials } from '@/utils/format';

/**
 * Reviews.
 *
 * Airbnb's treatment: an avatar circle, the name, the month, then the body in
 * full. The one addition here is the class the reviewer travelled in - a
 * five-star review of AC Sleeper tells you almost nothing about Economy on the
 * same train, and hiding that would make the whole rating meaningless.
 */
export function ReviewList({ reviews, limit }: { reviews: Review[]; limit?: number }) {
  const { palette, space } = useTheme();
  const shown = limit ? reviews.slice(0, limit) : reviews;

  return (
    <View style={{ gap: space.xl }}>
      {shown.map((review) => (
        <View key={review.id}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: palette.fill,
              }}
            >
              <Text variant="bodyMedium" tone="secondary">
                {initials(review.author)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium">{review.author}</Text>
              <Text variant="caption" tone="secondary">
                {review.when} · {CLASS_LABEL[review.travelClass]}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 2, marginTop: space.md }}>
            {Array.from({ length: 5 }, (_, i) => (
              <Icon
                key={i}
                name="star"
                size={11}
                filled={i < review.rating}
                color={i < review.rating ? palette.star : palette.border}
              />
            ))}
          </View>

          <Text variant="bodyLarge" style={{ marginTop: space.sm }}>
            {review.body}
          </Text>
        </View>
      ))}
    </View>
  );
}
