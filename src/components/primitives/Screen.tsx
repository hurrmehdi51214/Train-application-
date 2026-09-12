import React, { useRef } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';
import { Icon } from './Icon';
import { OfflineBanner } from './OfflineBanner';

/** Standard horizontal gutter, exported so sections can opt out for full-bleed. */
export const GUTTER = 20;

/** Height of the floating tab bar plus its bottom offset. */
const TAB_BAR_CLEARANCE = 108;

export interface ScreenProps {
  title?: string;
  /** Sits above the title in small caps. Use for context, never for a second title. */
  eyebrow?: string;
  subtitle?: string;
  children: React.ReactNode;
  scrollable?: boolean;
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
  /** Rendered pinned to the bottom above the safe area, e.g. a purchase CTA. */
  footer?: React.ReactNode;
  back?: boolean;
  action?: React.ReactNode;
  contentPadding?: number;
}

/**
 * The large serif title shrinks into the sticky bar as you scroll. It is the
 * one piece of chrome shared by every screen, so it is worth the 40 lines: it
 * keeps the header height honest and never leaves a title orphaned mid-fade.
 */
export function Screen({
  title,
  eyebrow,
  subtitle,
  children,
  scrollable = true,
  onRefresh,
  refreshing = false,
  footer,
  back = false,
  action,
  contentPadding = 20,
}: ScreenProps) {
  const { palette, space } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;

  const COLLAPSE_AT = 44;
  const largeOpacity = scrollY.interpolate({
    inputRange: [0, COLLAPSE_AT],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const compactOpacity = scrollY.interpolate({
    inputRange: [COLLAPSE_AT * 0.6, COLLAPSE_AT],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const barBorder = scrollY.interpolate({
    inputRange: [COLLAPSE_AT * 0.6, COLLAPSE_AT],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const header = title ? (
    <>
      <View style={[styles.bar, { paddingTop: insets.top + 6, backgroundColor: palette.canvas }]}>
        <View style={styles.barRow}>
          {back ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={12}
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Icon name="arrow-left" size={22} color={palette.textPrimary} />
            </Pressable>
          ) : (
            <View style={styles.backButton} />
          )}
          <Animated.View style={{ flex: 1, opacity: compactOpacity, alignItems: 'center' }}>
            <Text variant="headline" numberOfLines={1}>
              {title}
            </Text>
          </Animated.View>
          <View style={styles.action}>{action}</View>
        </View>
        <Animated.View
          style={{
            height: 1,
            backgroundColor: palette.hairline,
            opacity: barBorder,
            marginTop: 8,
          }}
        />
      </View>
      <OfflineBanner />
    </>
  ) : null;

  const titleBlock = title ? (
    <Animated.View style={{ opacity: largeOpacity, paddingHorizontal: contentPadding, paddingBottom: space.lg }}>
      {eyebrow ? (
        <Text variant="overline" tone="brand" style={{ marginBottom: 6 }}>
          {eyebrow}
        </Text>
      ) : null}
      <Text variant="display">{title}</Text>
      {subtitle ? (
        <Text variant="body" tone="secondary" style={{ marginTop: 6 }}>
          {subtitle}
        </Text>
      ) : null}
    </Animated.View>
  ) : null;

  const body = (
    <>
      {titleBlock}
      {children}
    </>
  );

  return (
    <View style={{ flex: 1, backgroundColor: palette.canvas }}>
      {header}
      {scrollable ? (
        <Animated.ScrollView
          contentContainerStyle={{
            paddingTop: title ? space.md : insets.top + space.md,
            // The tab bar floats over the content, so the resting bottom padding
            // has to clear it or the last card sits underneath.
            paddingBottom: (footer ? 96 : TAB_BAR_CLEARANCE) + insets.bottom,
          }}
          scrollEventThrottle={16}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
            useNativeDriver: true,
          })}
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={palette.brand}
                colors={[palette.brand]}
              />
            ) : undefined
          }
        >
          {body}
        </Animated.ScrollView>
      ) : (
        <View style={{ flex: 1, paddingTop: title ? space.md : insets.top + space.md }}>{body}</View>
      )}

      {footer ? (
        <View
          style={[
            styles.footer,
            {
              paddingBottom: insets.bottom + 12,
              backgroundColor: palette.surface,
              borderTopColor: palette.hairline,
            },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { paddingHorizontal: 8 },
  barRow: { flexDirection: 'row', alignItems: 'center', minHeight: 34 },
  backButton: { width: 44, height: 34, alignItems: 'flex-start', justifyContent: 'center', paddingLeft: 8 },
  action: { minWidth: 44, alignItems: 'flex-end', paddingRight: 8 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: Platform.OS === 'android' ? 1 : 0.5,
  },
});

export function Section({
  title,
  action,
  children,
  padded = true,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  padded?: boolean;
}) {
  const { space } = useTheme();
  return (
    <View style={{ marginBottom: space.xxl }}>
      {title ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: padded ? GUTTER : 0,
            marginBottom: space.md,
          }}
        >
          <Text variant="overline" tone="tertiary">
            {title}
          </Text>
          {action}
        </View>
      ) : null}
      <View style={{ paddingHorizontal: padded ? GUTTER : 0 }}>{children}</View>
    </View>
  );
}
