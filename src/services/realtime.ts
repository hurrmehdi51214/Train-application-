import { TrainPosition, TrainService } from '@/types';
import { config } from './config';
import { pointAlong } from '@/utils/geo';

/**
 * Live position feed.
 *
 * Against a real gateway this is a WebSocket carrying position and call-status
 * deltas. Two properties matter more than throughput:
 *   - Reconnect must back off, or a train entering a tunnel turns 50,000 phones
 *     into a synchronised retry storm the moment it comes out the other side.
 *   - The UI must keep moving between packets. Trackside feeds update every
 *     10–30 seconds; a marker that teleports every 20s looks broken, so we
 *     dead-reckon along the known alignment between updates.
 */

type Listener = (position: TrainPosition) => void;

interface Subscription {
  close(): void;
}

const BACKOFF_MS = [1_000, 2_000, 5_000, 10_000, 30_000];

class PositionStream {
  private socket: WebSocket | null = null;
  private attempt = 0;
  private closed = false;
  private readonly listeners = new Map<string, Set<Listener>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  subscribe(serviceId: string, listener: Listener): Subscription {
    const set = this.listeners.get(serviceId) ?? new Set<Listener>();
    set.add(listener);
    this.listeners.set(serviceId, set);
    this.ensureConnected();
    this.send({ type: 'subscribe', serviceId });

    return {
      close: () => {
        set.delete(listener);
        if (set.size === 0) {
          this.listeners.delete(serviceId);
          this.send({ type: 'unsubscribe', serviceId });
        }
        if (this.listeners.size === 0) this.disconnect();
      },
    };
  }

  private send(message: unknown) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  private ensureConnected() {
    if (this.closed || this.socket || config.useFixtures) return;
    try {
      const socket = new WebSocket(config.realtimeUrl);
      this.socket = socket;

      socket.onopen = () => {
        this.attempt = 0;
        for (const serviceId of this.listeners.keys()) {
          this.send({ type: 'subscribe', serviceId });
        }
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(String(event.data)) as { type: string; position?: TrainPosition };
          if (payload.type === 'position' && payload.position) {
            this.listeners.get(payload.position.serviceId)?.forEach((fn) => fn(payload.position!));
          }
        } catch {
          /* a malformed frame is not worth tearing the socket down for */
        }
      };

      socket.onerror = () => socket.close();
      socket.onclose = () => {
        this.socket = null;
        this.scheduleReconnect();
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.closed || this.listeners.size === 0 || this.reconnectTimer) return;
    const base = BACKOFF_MS[Math.min(this.attempt, BACKOFF_MS.length - 1)]!;
    // Full jitter: spreads a whole trainload of reconnects across the window.
    const delay = Math.random() * base;
    this.attempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.ensureConnected();
    }, delay);
  }

  private disconnect() {
    this.socket?.close();
    this.socket = null;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }
}

export const positionStream = new PositionStream();

/**
 * Derives a position from the timetable alone. Used as the fixture feed, and as
 * the fallback whenever the live feed has nothing for a service - a train that
 * is running to time is exactly where the timetable says it is.
 */
export function timetablePosition(service: TrainService, now = Date.now()): TrainPosition {
  const calls = service.calls;
  const first = calls[0];
  const last = calls[calls.length - 1];
  if (!first || !last) {
    return {
      serviceId: service.id,
      coordinate: service.geometry[0] ?? { lat: 0, lon: 0 },
      bearing: 0,
      speedKph: 0,
      progress: 0,
      nextCallSequence: 0,
      recordedAt: new Date(now).toISOString(),
      source: 'interpolated',
    };
  }

  const start = new Date(first.expectedDeparture ?? first.scheduledDeparture ?? Date.now()).getTime();
  const end = new Date(last.expectedArrival ?? last.scheduledArrival ?? Date.now()).getTime();

  // Progress is interpolated call-to-call rather than start-to-end, so the
  // marker sits on the right station at the right minute even when the middle
  // of the route runs at a different average speed.
  let progress = 0;
  let nextCallSequence = 0;

  if (now <= start) {
    progress = 0;
    nextCallSequence = 0;
  } else if (now >= end) {
    progress = 1;
    nextCallSequence = last.sequence;
  } else {
    for (let i = 1; i < calls.length; i += 1) {
      const prev = calls[i - 1]!;
      const curr = calls[i]!;
      const prevTime = new Date(prev.expectedDeparture ?? prev.scheduledDeparture ?? start).getTime();
      const currTime = new Date(curr.expectedArrival ?? curr.scheduledArrival ?? end).getTime();
      if (now <= currTime) {
        const span = Math.max(1, currTime - prevTime);
        const local = Math.min(1, Math.max(0, (now - prevTime) / span));
        const callFraction = 1 / (calls.length - 1);
        progress = (i - 1) * callFraction + local * callFraction;
        nextCallSequence = curr.sequence;
        break;
      }
    }
  }

  const { point, bearing } = pointAlong(service.geometry, progress);
  const elapsedHours = Math.max(0.001, (Math.min(now, end) - start) / 3_600_000);
  const speedKph = progress <= 0 || progress >= 1 ? 0 : Math.round((progress * 320) / elapsedHours);

  return {
    serviceId: service.id,
    coordinate: point,
    bearing,
    speedKph: Math.min(200, speedKph),
    progress,
    nextCallSequence,
    recordedAt: new Date(now).toISOString(),
    source: 'interpolated',
  };
}
