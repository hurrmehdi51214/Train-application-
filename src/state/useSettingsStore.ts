import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Appearance = 'system' | 'light' | 'dark';
export type Language = 'en' | 'ur';

interface SettingsState {
  appearance: Appearance;
  language: Language;
  passengerName: string;
  cnicLast6: string;
  phone: string;

  notifyJourneyStart: boolean;
  notifyApproaching: boolean;
  notifyArrival: boolean;
  notifyDisruption: boolean;
  /** Minutes before the stop to warn. */
  approachWarningMinutes: number;

  preferLowerBerth: boolean;
  keepMapsOffline: boolean;
  hasOnboarded: boolean;

  set<K extends keyof SettingsState>(key: K, value: SettingsState[K]): void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      appearance: 'system',
      language: 'en',
      passengerName: '',
      cnicLast6: '',
      phone: '',

      // Someone who books a train wants to know it left. These are opt-out.
      notifyJourneyStart: true,
      notifyApproaching: true,
      notifyArrival: true,
      notifyDisruption: true,
      approachWarningMinutes: 15,

      preferLowerBerth: false,
      keepMapsOffline: true,
      hasOnboarded: false,

      set: (key, value) => set({ [key]: value } as Partial<SettingsState>),
    }),
    {
      name: 'safar.settings',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      partialize: (state) => {
        const { set: _set, ...rest } = state;
        return rest;
      },
    },
  ),
);
