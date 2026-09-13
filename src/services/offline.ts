import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Offline layer.
 *
 * Two distinct jobs, deliberately kept apart:
 *   1. A read-through cache with an explicit freshness contract, so a screen
 *      can render instantly from disk and then reconcile.
 *   2. A durable outbox for writes made while offline (activating a ticket,
 *      acknowledging a disruption) that replays in order once we are back.
 *
 * Tickets and station/map reference data are pinned: they are written with no
 * TTL and are never evicted, because a ticket that expires out of the cache at
 * a barrier with no signal is the single worst failure this app can have.
 */

const PREFIX = 'safar.cache.';
const OUTBOX_KEY = 'safar.outbox';

export interface CacheEntry<T> {
  value: T;
  storedAt: number;
  /** null means pinned - never considered stale, never evicted. */
  ttlMs: number | null;
}

export type Freshness = 'fresh' | 'stale' | 'pinned' | 'missing';

export async function write<T>(key: string, value: T, ttlMs: number | null = 5 * 60_000): Promise<void> {
  const entry: CacheEntry<T> = { value, storedAt: Date.now(), ttlMs };
  await AsyncStorage.setItem(PREFIX + key, JSON.stringify(entry));
}

export async function read<T>(key: string): Promise<{ value: T; freshness: Freshness } | null> {
  const raw = await AsyncStorage.getItem(PREFIX + key);
  if (!raw) return null;
  try {
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (entry.ttlMs === null) return { value: entry.value, freshness: 'pinned' };
    const age = Date.now() - entry.storedAt;
    return { value: entry.value, freshness: age <= entry.ttlMs ? 'fresh' : 'stale' };
  } catch {
    // A corrupt entry is worse than no entry - drop it rather than crash a screen.
    await AsyncStorage.removeItem(PREFIX + key);
    return null;
  }
}

export async function pin<T>(key: string, value: T): Promise<void> {
  await write(key, value, null);
}

export async function drop(key: string): Promise<void> {
  await AsyncStorage.removeItem(PREFIX + key);
}

/** Clears everything that is not pinned. Used by "free up space" in settings. */
export async function evictUnpinned(): Promise<number> {
  const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX));
  const pairs = await AsyncStorage.multiGet(keys);
  const removable: string[] = [];
  for (const [key, raw] of pairs) {
    if (!raw) continue;
    try {
      const entry = JSON.parse(raw) as CacheEntry<unknown>;
      if (entry.ttlMs !== null) removable.push(key);
    } catch {
      removable.push(key);
    }
  }
  if (removable.length) await AsyncStorage.multiRemove(removable);
  return removable.length;
}

export async function cacheFootprintBytes(): Promise<number> {
  const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX));
  const pairs = await AsyncStorage.multiGet(keys);
  return pairs.reduce((sum, [, raw]) => sum + (raw ? raw.length : 0), 0);
}

/* ------------------------------- outbox ---------------------------------- */

export interface OutboxItem {
  id: string;
  path: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  body: unknown;
  queuedAt: number;
  attempts: number;
}

async function loadOutbox(): Promise<OutboxItem[]> {
  const raw = await AsyncStorage.getItem(OUTBOX_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as OutboxItem[];
  } catch {
    return [];
  }
}

async function saveOutbox(items: OutboxItem[]): Promise<void> {
  await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(items));
}

export async function enqueue(item: Omit<OutboxItem, 'id' | 'queuedAt' | 'attempts'>): Promise<void> {
  const items = await loadOutbox();
  items.push({
    ...item,
    id: `out_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    queuedAt: Date.now(),
    attempts: 0,
  });
  await saveOutbox(items);
}

export async function pendingCount(): Promise<number> {
  return (await loadOutbox()).length;
}

/**
 * Replays queued writes oldest-first. Stops at the first failure so ordering is
 * preserved - a ticket activation must not overtake the purchase that created
 * it. Items that fail five times are dropped and reported, because an outbox
 * that can never drain is a silent bug.
 */
export async function flush(
  send: (item: OutboxItem) => Promise<void>,
  onDropped?: (item: OutboxItem, error: unknown) => void,
): Promise<{ sent: number; remaining: number }> {
  const items = await loadOutbox();
  let sent = 0;

  while (items.length > 0) {
    const item = items[0]!;
    try {
      await send(item);
      items.shift();
      sent += 1;
    } catch (error) {
      item.attempts += 1;
      if (item.attempts >= 5) {
        items.shift();
        onDropped?.(item, error);
        continue;
      }
      break;
    }
  }

  await saveOutbox(items);
  return { sent, remaining: items.length };
}

export const cacheKeys = {
  stations: 'stations',
  service: (id: string) => `service.${id}`,
  journeySearch: (from: string, to: string, date: string) => `search.${from}.${to}.${date}`,
  board: (stationId: string) => `board.${stationId}`,
  ticket: (id: string) => `ticket.${id}`,
  lastMile: (stationId: string) => `lastmile.${stationId}`,
  geometry: (serviceId: string) => `geometry.${serviceId}`,
} as const;
