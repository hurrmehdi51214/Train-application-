import Constants from 'expo-constants';

interface Extra {
  apiBaseUrl?: string;
  realtimeUrl?: string;
  installUrl?: string;
  mapsProxyUrl?: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

function read(envKey: string, extraValue: string | undefined, fallback: string): string {
  const fromEnv = process.env[envKey];
  return (fromEnv && fromEnv.length > 0 ? fromEnv : undefined) ?? extraValue ?? fallback;
}

export const config = {
  apiBaseUrl: read('EXPO_PUBLIC_API_BASE_URL', extra.apiBaseUrl, 'https://api.safar.pk/v1'),
  realtimeUrl: read('EXPO_PUBLIC_REALTIME_URL', extra.realtimeUrl, 'wss://realtime.safar.pk/v1/stream'),
  installUrl: read('EXPO_PUBLIC_INSTALL_URL', extra.installUrl, 'https://get.safar.pk'),

  /**
   * Client-side Maps SDK key. Public by nature - it ships in the bundle - so it
   * must be restricted in the Google Cloud console to this app's iOS bundle id,
   * Android signing certificate and web referrer, with only the Maps SDKs
   * enabled on it. Never put a server key here.
   */
  googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',

  /**
   * Where the Directions / Geocoding / Places proxy lives. Defaults to the
   * gateway's own `/maps` namespace; override only to point at a standalone
   * maps proxy.
   */
  mapsProxyUrl: read('EXPO_PUBLIC_MAPS_PROXY_URL', extra.mapsProxyUrl, ''),

  /**
   * With no gateway reachable the app runs against the bundled Pakistan
   * Railways timetable. This is what makes the repository runnable straight
   * after `npm install`; point EXPO_PUBLIC_API_BASE_URL at a real gateway and
   * set EXPO_PUBLIC_USE_FIXTURES=false.
   */
  useFixtures: process.env.EXPO_PUBLIC_USE_FIXTURES !== 'false',

  requestTimeoutMs: 12_000,
  currency: 'PKR' as const,
  locale: 'en-PK',
} as const;
