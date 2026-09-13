import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { Coordinate, TrainPosition, TrainService } from '@/types';
import { api } from '@/services/apiClient';
import { positionStream, timetablePosition } from '@/services/realtime';

/**
 * Everything a live screen needs about one service: the latest snapshot, the
 * position to draw, and whether what you are looking at came off the network.
 *
 * Polling stops when the app is backgrounded. A live map that keeps refreshing
 * in someone's pocket for a two-hour journey is a battery complaint, and iOS
 * will eventually stop honouring the timers anyway.
 */
export function useLiveService(serviceId: string | null | undefined, refreshMs = 20_000) {
  const [service, setService] = useState<TrainService | null>(null);
  const [geometry, setGeometry] = useState<Coordinate[]>([]);
  const [position, setPosition] = useState<TrainPosition | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  const serviceRef = useRef<TrainService | null>(null);
  serviceRef.current = service;
  const geometryRef = useRef<Coordinate[]>([]);
  geometryRef.current = geometry;

  const load = useCallback(async () => {
    if (!serviceId) return;
    try {
      const result = await api.service(serviceId);
      const line = await api.geometry(serviceId);
      setService(result.data);
      setGeometry(line);
      setFromCache(result.source === 'cache');
      setError(null);
      // Until a live packet arrives, the timetable is the best position we have.
      setPosition((current) => current ?? timetablePosition(result.data, line));
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error('Could not load service'));
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Live feed, with the timetable as the fallback when nothing is publishing.
  useEffect(() => {
    if (!serviceId) return;
    const subscription = positionStream.subscribe(serviceId, (next) => setPosition(next));
    return () => subscription.close();
  }, [serviceId]);

  // Dead-reckoning tick: keeps the marker moving between feed packets.
  useEffect(() => {
    const timer = setInterval(() => {
      const current = serviceRef.current;
      if (!current) return;
      setPosition((existing) => {
        if (existing && existing.source !== 'timetable') {
          const age = Date.now() - new Date(existing.recordedAt).getTime();
          // Trust a real fix for 45s; after that the timetable is more honest
          // than a stale GPS point sitting still in the middle of a field.
          if (age < 45_000) return existing;
        }
        return timetablePosition(current, geometryRef.current);
      });
    }, 4_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer) return;
      timer = setInterval(() => void load(), refreshMs);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    start();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void load();
        start();
      } else {
        stop();
      }
    });

    return () => {
      stop();
      subscription.remove();
    };
  }, [load, refreshMs]);

  return { service, geometry, position, loading, fromCache, error, refresh: load };
}
