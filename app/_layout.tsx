import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { useNetworkStore } from '@/state/useNetworkStore';
import { configureChannels } from '@/services/notifications';
import { api } from '@/services/apiClient';

void SplashScreen.preventAutoHideAsync();

function Shell() {
  const { palette } = useTheme();
  const startNetworkWatch = useNetworkStore((s) => s.start);

  useEffect(() => {
    const stop = startNetworkWatch();

    void (async () => {
      await configureChannels();
      // Warm the pinned reference data on first run so the offline map and
      // station search are ready before anyone asks for them.
      try {
        await api.stations();
      } catch {
        /* first run with no signal is fine - the bundle has a copy */
      }
      await SplashScreen.hideAsync();
    })();

    return stop;
  }, [startNetworkWatch]);

  return (
    <>
      <StatusBar style={palette.mode === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.canvas },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
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
