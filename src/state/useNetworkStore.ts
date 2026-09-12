import { create } from 'zustand';

import { api } from '@/services/apiClient';
import { observe } from '@/services/network';
import { pendingCount } from '@/services/offline';

interface NetworkStoreState {
  online: boolean;
  connectionType: string;
  queued: number;
  /** Set while an outbox flush is running, so the banner can say so. */
  syncing: boolean;
  start(): () => void;
  refreshQueue(): Promise<void>;
}

export const useNetworkStore = create<NetworkStoreState>((set, get) => ({
  online: true,
  connectionType: 'unknown',
  queued: 0,
  syncing: false,

  start() {
    void get().refreshQueue();
    return observe(async (state) => {
      const wasOffline = !get().online;
      set({ online: state.online, connectionType: state.type });

      // Coming back from offline is the only moment worth draining the outbox.
      if (state.online && wasOffline) {
        set({ syncing: true });
        try {
          await api.flushOutbox();
        } finally {
          set({ syncing: false });
          await get().refreshQueue();
        }
      }
    });
  },

  async refreshQueue() {
    set({ queued: await pendingCount() });
  },
}));
