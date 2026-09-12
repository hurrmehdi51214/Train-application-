import { useCallback, useEffect, useState } from 'react';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Minimal async-read hook. Deliberately not a data-fetching library: the cache
 * and the freshness contract live in services/offline.ts, so all a screen needs
 * here is "run this, tell me when it settles, let me re-run it".
 */
export function useAsync<T>(run: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const callback = useCallback(run, deps);

  const reload = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));
    try {
      const data = await callback();
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: error instanceof Error ? error : new Error(String(error)) });
    }
  }, [callback]);

  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true }));
    callback()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({ data: null, loading: false, error: error instanceof Error ? error : new Error(String(error)) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [callback]);

  return { ...state, reload };
}
