import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/primitives/Text';
import { Icon, IconName } from '@/components/primitives/Icon';
import { Touchable } from '@/components/primitives/Touchable';
import { useJourneyStore } from '@/state/useJourneyStore';
import { useWishlistStore } from '@/state/useWishlistStore';

const TABS: Array<{ name: string; label: string; icon: IconName }> = [
  { name: 'index', label: 'Explore', icon: 'compass' },
  { name: 'wishlists', label: 'Wishlists', icon: 'heart' },
  { name: 'trips', label: 'Trips', icon: 'ticket' },
  { name: 'inbox', label: 'Inbox', icon: 'message' },
  { name: 'profile', label: 'Profile', icon: 'user' },
];

/**
 * The tab bar.
 *
 * Airbnb's, down to the details that matter: it sits flat against the bottom
 * with a single hairline above it rather than floating, the icon fills rather
 * than changing colour alone when active, and the label is 10px and always
 * visible. A floating pill bar looks modern in a screenshot and costs you the
 * bottom 90px of every list.
 *
 * Two additions the railway earns: a live dot on Trips while a journey is
 * running, and a count on Wishlists.
 */
function TabBar({ state, navigation }: BottomTabBarProps) {
  const { palette, space } = useTheme();
  const insets = useSafeAreaInsets();
  const activeJourney = useJourneyStore((s) => s.active);
  const savedCount = useWishlistStore((s) => s.saved.length);

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: palette.surface,
        borderTopWidth: 1,
        borderTopColor: palette.border,
        paddingTop: space.sm,
        paddingBottom: Math.max(insets.bottom, space.sm),
      }}
    >
      {TABS.map((tab) => {
        const routeIndex = state.routes.findIndex((r) => r.name === tab.name);
        const route = state.routes[routeIndex];
        const focused = state.index === routeIndex;
        const live = tab.name === 'trips' && activeJourney !== null;
        const badge = tab.name === 'wishlists' && savedCount > 0 ? savedCount : null;

        return (
          <Touchable
            key={tab.name}
            haptic="selection"
            scaleTo={0.9}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={tab.label}
            onPress={() => {
              if (!route) return;
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            style={{ flex: 1, alignItems: 'center', gap: 3, paddingVertical: 2 }}
          >
            <View>
              <Icon
                name={tab.icon}
                size={23}
                filled={focused}
                color={focused ? palette.brand : palette.textSecondary}
                strokeWidth={focused ? 2 : 1.7}
              />
              {live ? (
                <View
                  style={{
                    position: 'absolute',
                    top: -1,
                    right: -3,
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: palette.success,
                    borderWidth: 1.5,
                    borderColor: palette.surface,
                  }}
                />
              ) : null}
              {badge ? (
                <View
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -8,
                    minWidth: 15,
                    height: 15,
                    paddingHorizontal: 4,
                    borderRadius: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: palette.brand,
                  }}
                >
                  <Text variant="caption" style={{ color: palette.onBrand, fontSize: 10, lineHeight: 13 }}>
                    {badge}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text
              variant="caption"
              style={{
                fontSize: 10,
                lineHeight: 13,
                color: focused ? palette.brand : palette.textSecondary,
                fontWeight: focused ? '700' : '500',
              }}
            >
              {tab.label}
            </Text>
          </Touchable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="wishlists" />
      <Tabs.Screen name="trips" />
      <Tabs.Screen name="inbox" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
