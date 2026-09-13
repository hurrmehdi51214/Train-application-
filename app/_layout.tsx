import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';

import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { useNetworkStore } from '@/state/useNetworkStore';
import { configureChannels } from '@/services/notifications';
import { api } from '@/services/apiClient';

void SplashScreen.preventAutoHideAsync();

function Shell() {
  const { palette, isDark } = useTheme();
  const startNetworkWatch = useNetworkStore((s) => s.start);

  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  useEffect(() => {
    const stop = startNetworkWatch();

    void (async () => {
      await configureChannels();
      // Warm the pinned reference data so search and the offline map are ready
      // before anyone asks for them.
      try {
        await api.stations();
      } catch {
        /* a first run with no signal is fine - the bundle has a copy */
      }
    })();

    return stop;
  }, [startNetworkWatch]);

  useEffect(() => {
    // Hold the splash until the typeface is ready. A first frame in the system
    // font that then reflows into Manrope is worse than 200ms more of splash.
    if (fontsLoaded) void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.surface },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="search" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="ticket/[id]" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="install" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Shell />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
