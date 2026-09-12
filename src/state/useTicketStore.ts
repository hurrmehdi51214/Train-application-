import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { Ticket } from '@/types';
import * as offline from '@/services/offline';

interface TicketState {
  tickets: Ticket[];
  add(ticket: Ticket): Promise<void>;
  update(id: string, patch: Partial<Ticket>): void;
  remove(id: string): Promise<void>;
  byId(id: string): Ticket | undefined;
}

const DONE: Ticket['status'][] = ['used', 'expired', 'refunded'];

/**
 * Derivations are plain functions over the ticket array, not store selectors.
 *
 * A selector that builds a new array on every call breaks `useSyncExternalStore`:
 * it compares snapshots by identity, sees a different one each render, and
 * re-renders forever. Components select `state.tickets` - a stable reference -
 * and memoise these.
 */
export function upcomingTickets(tickets: Ticket[], now = Date.now()): Ticket[] {
  return tickets
    .filter((t) => !DONE.includes(t.status) && new Date(t.arrival).getTime() > now - 30 * 60_000)
    .sort((a, b) => new Date(a.departure).getTime() - new Date(b.departure).getTime());
}

export function pastTickets(tickets: Ticket[], now = Date.now()): Ticket[] {
  return tickets
    .filter((t) => DONE.includes(t.status) || new Date(t.arrival).getTime() <= now - 30 * 60_000)
    .sort((a, b) => new Date(b.departure).getTime() - new Date(a.departure).getTime());
}

export const useTicketStore = create<TicketState>()(
  persist(
    (set, get) => ({
      tickets: [],

      async add(ticket) {
        set((state) => ({ tickets: [ticket, ...state.tickets.filter((t) => t.id !== ticket.id)] }));
        // Pinned separately from the zustand blob: a ticket must survive a
        // corrupt settings migration, so it gets its own durable copy.
        await offline.pin(offline.cacheKeys.ticket(ticket.id), ticket);
      },

      update(id, patch) {
        set((state) => ({
          tickets: state.tickets.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        }));
        const updated = get().tickets.find((t) => t.id === id);
        if (updated) void offline.pin(offline.cacheKeys.ticket(id), updated);
      },

      async remove(id) {
        set((state) => ({ tickets: state.tickets.filter((t) => t.id !== id) }));
        await offline.drop(offline.cacheKeys.ticket(id));
      },

      byId: (id) => get().tickets.find((t) => t.id === id),
    }),
    {
      name: 'meridian.tickets',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: (state) => ({ tickets: state.tickets }),
    },
  ),
);
