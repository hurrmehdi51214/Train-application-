import {
  Coordinate,
  JourneyOption,
  LastMileOption,
  PassengerDetail,
  Station,
  Ticket,
  TrainPosition,
  TrainService,
  TravelClass,
} from '@/types';
import { config } from './config';
import { accessToken, deviceId, TokenSet } from './auth';
import * as offline from './offline';
import { STATIONS } from '@/data/stations';
import { allServices, getService, searchJourneys, serviceGeometry, todayIso } from '@/data/trains';
import { lastMileFor } from '@/data/lastMile';
import { issueFixtureTicket } from './ticketIssuer';

/**
 * The only place in the app that talks to the network.
 *
 * Every read follows the same rule: serve the cache immediately if we have it,
 * then reconcile in the background. Callers get a `Result` that says where the
 * data came from, so a screen can honestly label itself "last saved" instead of
 * silently showing yesterday's platform number.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface Result<T> {
  data: T;
  source: 'network' | 'cache';
  stale?: boolean;
}

async function refreshTokens(refreshToken: string): Promise<TokenSet> {
  const response = await fetch(`${config.apiBaseUrl}/auth/refresh`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) throw new ApiError('Session expired', response.status);
  const json = (await response.json()) as { accessToken: string; refreshToken: string; expiresIn: number };
  return {
    accessToken: json.accessToken,
    refreshToken: json.refreshToken,
    expiresAt: Date.now() + json.expiresIn * 1000,
  };
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  anonymous?: boolean;
  signal?: AbortSignal;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, anonymous = false } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);
  options.signal?.addEventListener('abort', () => controller.abort());

  const headers: Record<string, string> = {
    accept: 'application/json',
    'x-safar-client': 'mobile',
    'x-device-id': await deviceId(),
  };
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (!anonymous) {
    const token = await accessToken(refreshTokens);
    if (token) headers.authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${config.apiBaseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      let code: string | undefined;
      let message = `Request failed (${response.status})`;
      try {
        const problem = (await response.json()) as { code?: string; message?: string };
        code = problem.code;
        if (problem.message) message = problem.message;
      } catch {
        /* a non-JSON error body is not worth failing twice over */
      }
      throw new ApiError(message, response.status, code);
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

/** Cache-first read with a network reconcile, plus fixture support. */
async function cachedRead<T>(
  cacheKey: string,
  ttlMs: number | null,
  fetcher: () => Promise<T>,
  fixture: () => T,
): Promise<Result<T>> {
  if (config.useFixtures) {
    const data = fixture();
    await offline.write(cacheKey, data, ttlMs);
    return { data, source: 'network' };
  }

  try {
    const data = await fetcher();
    await offline.write(cacheKey, data, ttlMs);
    return { data, source: 'network' };
  } catch (error) {
    const cached = await offline.read<T>(cacheKey);
    if (cached) return { data: cached.value, source: 'cache', stale: cached.freshness === 'stale' };
    throw error;
  }
}

export const api = {
  /** Pinned: search and the offline map must work with no connection, forever. */
  stations(): Promise<Result<Station[]>> {
    return cachedRead(offline.cacheKeys.stations, null, () => request<Station[]>('/stations'), () => STATIONS);
  },

  service(id: string, date = todayIso()): Promise<Result<TrainService>> {
    return cachedRead(
      offline.cacheKeys.service(id),
      2 * 60_000,
      () => request<TrainService>(`/services/${encodeURIComponent(id)}?date=${date}`),
      () => {
        const service = getService(id, date);
        if (!service) throw new ApiError('Service not found', 404, 'service_not_found');
        return service;
      },
    );
  },

  /** Route alignment. Pinned - track does not move, and the map needs it offline. */
  async geometry(serviceId: string): Promise<Coordinate[]> {
    const key = offline.cacheKeys.geometry(serviceId);
    const cached = await offline.read<Coordinate[]>(key);
    if (cached) return cached.value;

    const service = getService(serviceId);
    const line = service ? serviceGeometry(service) : [];
    if (line.length) await offline.pin(key, line);
    return line;
  },

  searchJourneys(originId: string, destinationId: string, date = todayIso()): Promise<Result<JourneyOption[]>> {
    return cachedRead(
      offline.cacheKeys.journeySearch(originId, destinationId, date),
      3 * 60_000,
      () =>
        request<JourneyOption[]>(
          `/journeys?origin=${encodeURIComponent(originId)}&destination=${encodeURIComponent(destinationId)}&date=${date}`,
        ),
      () => searchJourneys(originId, destinationId, date),
    );
  },

  featured(): Promise<Result<TrainService[]>> {
    return cachedRead(
      'featured',
      5 * 60_000,
      () => request<TrainService[]>('/services/featured'),
      () => allServices(),
    );
  },

  departures(stationId: string): Promise<Result<TrainService[]>> {
    return cachedRead(
      offline.cacheKeys.board(stationId),
      60_000,
      () => request<TrainService[]>(`/stations/${encodeURIComponent(stationId)}/departures`),
      () => allServices().filter((s) => s.calls.some((c) => c.stationId === stationId)),
    );
  },

  lastMile(stationId: string): Promise<Result<LastMileOption[]>> {
    return cachedRead(
      offline.cacheKeys.lastMile(stationId),
      2 * 60_000,
      () => request<LastMileOption[]>(`/stations/${encodeURIComponent(stationId)}/connections`),
      () => lastMileFor(stationId),
    );
  },

  positions(serviceIds: string[]): Promise<TrainPosition[]> {
    if (config.useFixtures) return Promise.resolve([]);
    return request<TrainPosition[]>(`/positions?services=${serviceIds.map(encodeURIComponent).join(',')}`);
  },

  /**
   * Purchase. The gateway is the only thing that can mint a ticket - the client
   * never signs anything - and the call is idempotent on `idempotencyKey` so a
   * retry after a dropped connection cannot double-charge.
   */
  async purchase(input: {
    journeyId: string;
    travelClass: TravelClass;
    passengers: PassengerDetail[];
    preferLowerBerth: boolean;
    idempotencyKey: string;
  }): Promise<Ticket> {
    if (config.useFixtures) return issueFixtureTicket(input);
    return request<Ticket>('/tickets', { method: 'POST', body: input });
  },

  async boardTicket(ticketId: string): Promise<void> {
    if (config.useFixtures) return;
    try {
      await request<void>(`/tickets/${encodeURIComponent(ticketId)}/board`, { method: 'POST' });
    } catch (error) {
      // Boarding must survive a dead signal on a platform: queue and move on.
      await offline.enqueue({ path: `/tickets/${ticketId}/board`, method: 'POST', body: {} });
      if (!(error instanceof ApiError)) throw error;
    }
  },

  flushOutbox() {
    return offline.flush((item) =>
      request<void>(item.path, { method: item.method, body: item.body }).then(() => undefined),
    );
  },
};

export { request as rawRequest };
