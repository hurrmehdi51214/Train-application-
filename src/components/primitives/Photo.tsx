import React from 'react';
import { View, ViewStyle } from 'react-native';
import { Image, ImageContentFit } from 'expo-image';

import { useTheme } from '@/theme/ThemeProvider';

/**
 * Photographs.
 *
 * `expo-image` rather than RN's `Image` for three reasons that all show up on a
 * photo-led screen: it has a real memory + disk cache, it cross-fades instead of
 * popping in, and it takes a blurhash placeholder so a card never flashes an
 * empty grey rectangle while scrolling.
 *
 * The placeholder below is a soft neutral gradient - deliberately not a spinner.
 * A spinner on every card in a list is visual noise; a warm blur reads as "a
 * photo is arriving" and stops the layout from flickering.
 */
const PLACEHOLDER = 'L6Pj0^jE.AyE_3t7t7R**0o#DgR4';

export interface PhotoProps {
  uri?: string;
  /** Fills its parent unless a width/height is given. */
  width?: number | `${number}%`;
  height?: number | `${number}%`;
  radius?: number;
  contentFit?: ImageContentFit;
  style?: ViewStyle;
  /** Alt text. Photos of places need it as much as any other image. */
  accessibilityLabel?: string;
  priority?: 'low' | 'normal' | 'high';
}

export function Photo({
  uri,
  width = '100%',
  height = '100%',
  radius,
  contentFit = 'cover',
  style,
  accessibilityLabel,
  priority = 'normal',
}: PhotoProps) {
  const { palette, radius: radii } = useTheme();

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius: radius ?? radii.md,
          overflow: 'hidden',
          backgroundColor: palette.fill,
        } as ViewStyle,
        style,
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: '100%', height: '100%' }}
          contentFit={contentFit}
          placeholder={{ blurhash: PLACEHOLDER }}
          placeholderContentFit="cover"
          transition={260}
          cachePolicy="memory-disk"
          priority={priority}
          accessible={Boolean(accessibilityLabel)}
          accessibilityLabel={accessibilityLabel}
        />
      ) : null}
    </View>
  );
}
