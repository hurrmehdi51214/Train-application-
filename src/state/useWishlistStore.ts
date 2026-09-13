import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface WishlistState {
  /** Service ids, most recently saved first. */
  saved: string[];
  toggle(serviceId: string): void;
  has(serviceId: string): boolean;
  clear(): void;
}

/**
 * The wishlist.
 *
 * Local only, on purpose: saving a train is a private act and there is nothing
 * here worth a round-trip. It persists across launches, which is the only
 * property that matters - a heart that forgets is worse than no heart.
 */
export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      saved: [],
      toggle: (serviceId) =>
        set((state) => ({
          saved: state.saved.includes(serviceId)
            ? state.saved.filter((id) => id !== serviceId)
            : [serviceId, ...state.saved],
        })),
      has: (serviceId) => get().saved.includes(serviceId),
      clear: () => set({ saved: [] }),
    }),
    {
      name: 'safar.wishlist',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: (state) => ({ saved: state.saved }),
    },
  ),
);
