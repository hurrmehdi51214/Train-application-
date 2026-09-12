import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface RecentSearch {
  originId: string;
  destinationId: string;
  at: number;
}

interface SearchState {
  originId: string | null;
  destinationId: string | null;
  whenIso: string | null;
  recents: RecentSearch[];
  setOrigin(id: string | null): void;
  setDestination(id: string | null): void;
  setWhen(iso: string | null): void;
  swap(): void;
  remember(): void;
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set, get) => ({
      originId: 'stn-kgx',
      destinationId: 'stn-yrk',
      whenIso: null,
      recents: [],

      setOrigin: (id) => set({ originId: id }),
      setDestination: (id) => set({ destinationId: id }),
      setWhen: (iso) => set({ whenIso: iso }),

      swap: () => set((state) => ({ originId: state.destinationId, destinationId: state.originId })),

      remember: () => {
        const { originId, destinationId, recents } = get();
        if (!originId || !destinationId) return;
        const entry: RecentSearch = { originId, destinationId, at: Date.now() };
        const deduped = recents.filter(
          (r) => !(r.originId === originId && r.destinationId === destinationId),
        );
        set({ recents: [entry, ...deduped].slice(0, 6) });
      },
    }),
    {
      name: 'meridian.search',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: (state) => ({
        originId: state.originId,
        destinationId: state.destinationId,
        recents: state.recents,
        whenIso: null,
      }),
    },
  ),
);
