import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { Passengers, TravelClass } from '@/types';
import { todayIso } from '@/data/trains';

interface RecentSearch {
  originId: string;
  destinationId: string;
  at: number;
}

interface SearchState {
  originId: string | null;
  destinationId: string | null;
  date: string;
  passengers: Passengers;
  travelClass: TravelClass | null;
  recents: RecentSearch[];

  setOrigin(id: string | null): void;
  setDestination(id: string | null): void;
  setDate(date: string): void;
  setPassengers(next: Passengers): void;
  setTravelClass(next: TravelClass | null): void;
  swap(): void;
  remember(): void;
  /** True once the search is complete enough to run. */
  isReady(): boolean;
  totalTravellers(): number;
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set, get) => ({
      originId: 'stn-khi-cantt',
      destinationId: 'stn-lhr',
      date: todayIso(),
      passengers: { adults: 1, children: 0, infants: 0 },
      travelClass: null,
      recents: [],

      setOrigin: (id) => set({ originId: id }),
      setDestination: (id) => set({ destinationId: id }),
      setDate: (date) => set({ date }),
      setPassengers: (passengers) => set({ passengers }),
      setTravelClass: (travelClass) => set({ travelClass }),

      swap: () => set((s) => ({ originId: s.destinationId, destinationId: s.originId })),

      remember: () => {
        const { originId, destinationId, recents } = get();
        if (!originId || !destinationId) return;
        const deduped = recents.filter((r) => !(r.originId === originId && r.destinationId === destinationId));
        set({ recents: [{ originId, destinationId, at: Date.now() }, ...deduped].slice(0, 8) });
      },

      isReady: () => {
        const { originId, destinationId } = get();
        return Boolean(originId && destinationId && originId !== destinationId);
      },

      totalTravellers: () => {
        const { adults, children } = get().passengers;
        return adults + children;
      },
    }),
    {
      name: 'safar.search',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      partialize: (state) => ({
        originId: state.originId,
        destinationId: state.destinationId,
        passengers: state.passengers,
        travelClass: state.travelClass,
        recents: state.recents,
      }),
    },
  ),
);
