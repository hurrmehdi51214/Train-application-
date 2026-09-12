import Constants from 'expo-constants';

interface Extra {
  apiBaseUrl?: string;
  realtimeUrl?: string;
  installUrl?: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

function read(envKey: string, extraValue: string | undefined, fallback: string): string {
  const fromEnv = process.env[envKey];
  return (fromEnv && fromEnv.length > 0 ? fromEnv : undefined) ?? extraValue ?? fallback;
}

export const config = {
  apiBaseUrl: read('EXPO_PUBLIC_API_BASE_URL', extra.apiBaseUrl, 'https://api.meridianrail.example/v1'),
  realtimeUrl: read('EXPO_PUBLIC_REALTIME_URL', extra.realtimeUrl, 'wss://realtime.meridianrail.example/v1/stream'),
  installUrl: read('EXPO_PUBLIC_INSTALL_URL', extra.installUrl, 'https://install.meridianrail.example'),
  /**
   * With no gateway reachable the app runs against the bundled fixtures. This
   * is what makes the repository runnable straight after `npm install`; point
   * EXPO_PUBLIC_API_BASE_URL at a real gateway and set this to false.
   */
  useFixtures: process.env.EXPO_PUBLIC_USE_FIXTURES !== 'false',
  requestTimeoutMs: 12_000,
} as const;
