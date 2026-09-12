import React from 'react';
import { Pressable, View } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/primitives/Text';
import { Icon, IconName } from '@/components/primitives/Icon';
import { LiveDot } from '@/components/primitives/LiveDot';
import { useJourneyStore } from '@/state/useJourneyStore';
import { useTicketStore } from '@/state/useTicketStore';

const TABS: Array<{ name: string; label: string; icon: IconName }> = [
  { name: 'index', label: 'Today', icon: 'train' },
  { name: 'plan', label: 'Plan', icon: 'search' },
  { name: 'tickets', label: 'Tickets', icon: 'ticket' },
  { name: 'account', label: 'Account', icon: 'settings' },
];

/**
 * A hand-built tab bar rather than the stock one. Two things it does that the
 * default cannot: it shows a live pulse on Tickets while a journey is running,
 * and it sits on a translucent slab that keeps the serif headings above it from
 * colliding with the labels.
 */
function TabBar({ state, navigation }: BottomTabBarProps) {
  const { palette, space, radius, elevation } = useTheme();
  const insets = useSafeAreaInsets();
  const activeJourney = useJourneyStore((s) => s.active);
  const ticketCount = useTicketStore((s) => s.tickets.length);

  return (
    <View
      style={[
        {
          position: 'absolute',
          left: space.lg,
          right: space.lg,
          bottom: insets.bottom > 0 ? insets.bottom : space.md,
          flexDirection: 'row',
          backgroundColor: palette.surface,
          borderRadius: radius.xl,
          paddingVertical: space.sm,
          paddingHorizontal: space.xs,
          borderWidth: palette.mode === 'dark' ? 1 : 0,
          borderColor: palette.hairline,
        },
        elevation.floating,
      ]}
    >
      {TABS.map((tab, index) => {
        const route = state.routes.find((r) => r.name === tab.name);
        const focused = state.index === state.routes.findIndex((r) => r.name === tab.name);
        const showLive = tab.name === 'tickets' && activeJourney !== null;
        const showCount = tab.name === 'tickets' && !showLive && ticketCount > 0;

        return (
          <Pressable
            key={tab.name}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={tab.label}
            onPress={() => {
              if (!route) return;
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            style={{ flex: 1, alignItems: 'center', paddingVertical: space.xs }}
          >
            <View>
              <Icon
                name={tab.icon}
                size={22}
                color={focused ? palette.brand : palette.textTertiary}
                strokeWidth={focused ? 1.95 : 1.6}
              />
              {showLive ? (
                <View style={{ position: 'absolute', top: -6, right: -10 }}>
                  <LiveDot size={6} />
                </View>
              ) : null}
              {showCount ? (
                <View
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -9,
                    minWidth: 15,
                    height: 15,
                    borderRadius: 8,
                    paddingHorizontal: 4,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: palette.brand,
                  }}
                >
                  <Text variant="caption" style={{ color: palette.onBrand, fontSize: 10 }}>
                    {ticketCount}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text
              variant="caption"
              style={{
                marginTop: 4,
                color: focused ? palette.brand : palette.textTertiary,
                fontWeight: focused ? '700' : '500',
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="plan" />
      <Tabs.Screen name="tickets" />
      <Tabs.Screen name="account" />
    </Tabs>
  );
}
