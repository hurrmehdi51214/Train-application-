import * as Network from 'expo-network';

export interface NetworkState {
  online: boolean;
  type: string;
}

export async function currentState(): Promise<NetworkState> {
  try {
    const state = await Network.getNetworkStateAsync();
    return {
      online: Boolean(state.isConnected && state.isInternetReachable !== false),
      type: String(state.type ?? 'unknown'),
    };
  } catch {
    // Assume online rather than locking the UI into an offline banner we cannot
    // clear - a failed request will correct us soon enough.
    return { online: true, type: 'unknown' };
  }
}

/** Polls rather than subscribes: expo-network has no listener on every platform. */
export function observe(onChange: (state: NetworkState) => void, intervalMs = 8_000) {
  let stopped = false;
  let previous: boolean | null = null;

  const tick = async () => {
    if (stopped) return;
    const state = await currentState();
    if (previous === null || previous !== state.online) {
      previous = state.online;
      onChange(state);
    }
  };

  void tick();
  const timer = setInterval(tick, intervalMs);
  return () => {
    stopped = true;
    clearInterval(timer);
  };
}
