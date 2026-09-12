import type { Server } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';

import { fetchPositions } from '../db/legacyRail.js';
import { toPosition } from '../db/mappers.js';
import { verifyAccessToken } from '../middleware/auth.js';

/**
 * Position broadcast.
 *
 * One poll of the railway's position table per tick, fanned out to every
 * subscriber - not one query per connected phone. With a busy service that is
 * the difference between a single indexed read every two seconds and several
 * thousand, and the operator's replica is a shared resource we are a guest on.
 *
 * Subscriptions are per-socket sets of service ids; the poll only asks for the
 * union of what someone is actually watching.
 */

interface Client {
  socket: WebSocket;
  subject: string;
  services: Set<string>;
  alive: boolean;
}

const POLL_MS = 2_000;
const MAX_SUBSCRIPTIONS_PER_CLIENT = 8;

export function attachPositionStream(server: Server, path = '/v1/stream'): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });
  const clients = new Set<Client>();

  server.on('upgrade', (request, socket, head) => {
    if (!request.url?.startsWith(path)) return;

    // Authenticate before the upgrade completes: an unauthenticated socket
    // should never exist, not even briefly.
    const url = new URL(request.url, 'http://localhost');
    const token = url.searchParams.get('access_token') ?? '';
    let subject: string;
    try {
      subject = verifyAccessToken(token).subject;
    } catch {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      const client: Client = { socket: ws, subject, services: new Set(), alive: true };
      clients.add(client);

      ws.on('pong', () => {
        client.alive = true;
      });

      ws.on('message', (raw) => {
        try {
          const message = JSON.parse(String(raw)) as { type?: string; serviceId?: string };
          if (!message.serviceId) return;
          if (message.type === 'subscribe' && client.services.size < MAX_SUBSCRIPTIONS_PER_CLIENT) {
            client.services.add(message.serviceId);
          }
          if (message.type === 'unsubscribe') client.services.delete(message.serviceId);
        } catch {
          /* a malformed frame from one client is not everyone else's problem */
        }
      });

      ws.on('close', () => clients.delete(client));
      ws.on('error', () => clients.delete(client));
    });
  });

  // Drop sockets that have stopped answering - a phone that went into a tunnel
  // and never came back otherwise holds a slot forever.
  const heartbeat = setInterval(() => {
    for (const client of clients) {
      if (!client.alive) {
        client.socket.terminate();
        clients.delete(client);
        continue;
      }
      client.alive = false;
      client.socket.ping();
    }
  }, 30_000);

  const poll = setInterval(async () => {
    const watched = new Set<string>();
    for (const client of clients) for (const id of client.services) watched.add(id);
    if (watched.size === 0) return;

    try {
      const rows = await fetchPositions(Array.from(watched));
      const byService = new Map(rows.map((row) => [row.service_id, row]));

      for (const client of clients) {
        for (const serviceId of client.services) {
          const row = byService.get(serviceId);
          if (!row) continue;
          client.socket.send(JSON.stringify({ type: 'position', position: toPosition(row, 2) }));
        }
      }
    } catch (error) {
      // A blip on the replica must not take the socket server down with it.
      console.error('[positions] poll failed', error instanceof Error ? error.message : error);
    }
  }, POLL_MS);

  wss.on('close', () => {
    clearInterval(poll);
    clearInterval(heartbeat);
  });

  return wss;
}
