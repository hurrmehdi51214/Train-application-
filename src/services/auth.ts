import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Token handling.
 *
 * Access tokens are short-lived and held in memory only. The refresh token is
 * the only thing that touches disk, and it goes into the platform keystore
 * (Keychain on iOS, EncryptedSharedPreferences via Keystore on Android) rather
 * than AsyncStorage, so it is not readable from a backup or an adb pull.
 *
 * On web there is no keystore. Rather than pretend, we degrade explicitly: the
 * refresh token is never persisted in the browser and the session ends when the
 * tab closes. That is the honest trade-off, and it is documented in
 * docs/SECURITY.md.
 */

const REFRESH_KEY = 'safar.refresh-token';
const DEVICE_KEY = 'safar.device-id';

interface TokenSet {
  accessToken: string;
  refreshToken: string;
  /** Epoch millis. */
  expiresAt: number;
}

let inMemory: TokenSet | null = null;
let refreshInFlight: Promise<TokenSet | null> | null = null;

const canUseKeystore = Platform.OS !== 'web';

async function secureSet(key: string, value: string): Promise<void> {
  if (!canUseKeystore) return;
  await SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

async function secureGet(key: string): Promise<string | null> {
  if (!canUseKeystore) return null;
  return SecureStore.getItemAsync(key);
}

export async function storeSession(tokens: TokenSet): Promise<void> {
  inMemory = tokens;
  await secureSet(REFRESH_KEY, tokens.refreshToken);
}

export async function clearSession(): Promise<void> {
  inMemory = null;
  if (canUseKeystore) await SecureStore.deleteItemAsync(REFRESH_KEY);
}

/** Stable per-install identifier used for device binding on ticket issuance. */
export async function deviceId(): Promise<string> {
  const existing = await secureGet(DEVICE_KEY);
  if (existing) return existing;
  const generated = `dev_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  await secureSet(DEVICE_KEY, generated);
  return generated;
}

/**
 * Returns a usable access token, refreshing when it is within 60s of expiry.
 * Concurrent callers share a single refresh so a burst of requests after a cold
 * start cannot stampede the token endpoint.
 */
export async function accessToken(
  refresh: (refreshToken: string) => Promise<TokenSet>,
): Promise<string | null> {
  const skew = 60_000;
  if (inMemory && inMemory.expiresAt - skew > Date.now()) return inMemory.accessToken;

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const token = inMemory?.refreshToken ?? (await secureGet(REFRESH_KEY));
      if (!token) return null;
      try {
        const next = await refresh(token);
        await storeSession(next);
        return next;
      } catch {
        await clearSession();
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }

  const result = await refreshInFlight;
  return result?.accessToken ?? null;
}

export function currentSession(): TokenSet | null {
  return inMemory;
}

export type { TokenSet };
