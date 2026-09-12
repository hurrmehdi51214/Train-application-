import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Appearance = 'system' | 'light' | 'dark';

interface SettingsState {
  appearance: Appearance;
  passengerName: string;
  /** Alerts the passenger has opted into. Off by default is not helpful here -
   *  someone who books a train wants to know it left. Disruption is opt-out. */
  notifyJourneyStart: boolean;
  notifyApproaching: boolean;
  notifyArrival: boolean;
  notifyDisruption: boolean;
  /** Minutes before the stop to warn. 5 is the default the ops team recommends. */
  approachWarningMinutes: number;
  preferQuietCoach: boolean;
  requireStepFree: boolean;
  keepMapsOffline: boolean;
  hasCompletedOnboarding: boolean;
  set<K extends keyof SettingsState>(key: K, value: SettingsState[K]): void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      appearance: 'system',
      passengerName: '',
      notifyJourneyStart: true,
      notifyApproaching: true,
      notifyArrival: true,
      notifyDisruption: true,
      approachWarningMinutes: 5,
      preferQuietCoach: false,
      requireStepFree: false,
      keepMapsOffline: true,
      hasCompletedOnboarding: false,
      set: (key, value) => set({ [key]: value } as Partial<SettingsState>),
    }),
    {
      name: 'meridian.settings',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: (state) => {
        const { set: _set, ...rest } = state;
        return rest;
      },
    },
  ),
);
