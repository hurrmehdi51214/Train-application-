import React, { useRef } from 'react';
import { Animated, Platform, RefreshControl, ScrollView, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';
import { Icon } from './Icon';
import { Touchable } from './Touchable';
import { OfflineBanner } from './OfflineBanner';

/** The gutter every screen shares. Airbnb runs 24px on phones. */
export const GUTTER = 24;
/** Clearance for the floating tab bar. */
export const TAB_CLEARANCE = 96;

export interface ScreenProps {
  children: React.ReactNode;
  /** Small centred title in the bar, as Airbnb does it. */
  title?: string;
  back?: boolean;
  onBack?: () => void;
  /** Rendered at the right of the bar. */
  action?: React.ReactNode;
  scrollable?: boolean;
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
  /** Pinned above the safe area, e.g. a Reserve bar. */
  footer?: React.ReactNode;
  /** Removes the bar entirely for full-bleed photo screens. */
  bare?: boolean;
  /** Extra bottom padding; set when the screen is inside the tab bar. */
  tabBarSpacing?: boolean;
  contentStyle?: ViewStyle;
  /** Fades the bar's border in as content scrolls under it. */
  stickyHeader?: boolean;
}

export function Screen({
  children,
  title,
  back = false,
  onBack,
  action,
  scrollable = true,
  onRefresh,
  refreshing = false,
  footer,
  bare = false,
  tabBarSpacing = false,
  contentStyle,
  stickyHeader = true,
}: ScreenProps) {
  const { palette, space } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;

  const borderOpacity = scrollY.interpolate({
    inputRange: [0, 24],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const header = bare ? null : (
    <View style={{ paddingTop: insets.top, backgroundColor: palette.surface, zIndex: 2 }}>
      <View
        style={{
          minHeight: 52,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: space.md,
        }}
      >
        <View style={{ width: 44, alignItems: 'flex-start' }}>
          {back ? (
            <Touchable
              onPress={onBack ?? (() => router.back())}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              scaleTo={0.9}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="chevron-left" size={22} />
            </Touchable>
          ) : null}
        </View>

        <View style={{ flex: 1, alignItems: 'center' }}>
          {title ? (
            <Text variant="subheading" numberOfLines={1}>
              {title}
            </Text>
          ) : null}
        </View>

        <View style={{ minWidth: 44, alignItems: 'flex-end' }}>{action}</View>
      </View>

      {stickyHeader ? (
        <Animated.View style={{ height: 1, backgroundColor: palette.border, opacity: borderOpacity }} />
      ) : null}
    </View>
  );

  const padding = {
    paddingBottom:
      (footer ? 88 : tabBarSpacing ? TAB_CLEARANCE : space.xxl) + insets.bottom,
    paddingTop: bare ? 0 : space.sm,
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.surface }}>
      {header}
      {bare ? null : <OfflineBanner />}

      {scrollable ? (
        <Animated.ScrollView
          contentContainerStyle={[padding, contentStyle]}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
            useNativeDriver: true,
          })}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={palette.brand}
                colors={[palette.brand]}
                progressBackgroundColor={palette.surface}
              />
            ) : undefined
          }
        >
          {children}
        </Animated.ScrollView>
      ) : (
        <View style={[{ flex: 1 }, contentStyle]}>{children}</View>
      )}

      {footer ? (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: GUTTER,
            paddingTop: space.base,
            paddingBottom: insets.bottom + space.base,
            backgroundColor: palette.surface,
            borderTopWidth: 1,
            borderTopColor: palette.border,
            ...(Platform.OS === 'web' ? {} : {}),
          }}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );
}

/** A titled block with the standard gutter. `flush` opts out for full-bleed rails. */
export function Section({
  title,
  subtitle,
  action,
  children,
  flush = false,
  spacing = 32,
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  flush?: boolean;
  spacing?: number;
}) {
  const { space } = useTheme();
  return (
    <View style={{ marginBottom: spacing }}>
      {title ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            paddingHorizontal: GUTTER,
            marginBottom: subtitle ? space.xs : space.md,
          }}
        >
          <Text variant="heading">{title}</Text>
          {action}
        </View>
      ) : null}
      {subtitle ? (
        <Text variant="body" tone="secondary" style={{ paddingHorizontal: GUTTER, marginBottom: space.base }}>
          {subtitle}
        </Text>
      ) : null}
      <View style={{ paddingHorizontal: flush ? 0 : GUTTER }}>{children}</View>
    </View>
  );
}
