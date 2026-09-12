import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { ActiveJourney, Call, JourneyPhase, Ticket, TrainService } from '@/types';
import { notifyDisruption, notifyPhase } from '@/services/notifications';
import { useSettingsStore } from './useSettingsStore';

/**
 * The state machine behind the live journey.
 *
 * Phases only ever move forward. A train that briefly reports itself as
 * "approaching" and then falls back to "onboard" (which happens when a trackside
 * sensor is missed) must not re-notify, so `advance` refuses to move backwards
 * and `lastNotifiedPhase` is the gate on sending anything.
 */

const ORDER: JourneyPhase[] = [
  'idle',
  'to-station',
  'at-station',
  'onboard',
  'approaching',
  'arrived',
  'completed',
];

function rank(phase: JourneyPhase): number {
  return ORDER.indexOf(phase);
}

interface JourneyState {
  active: ActiveJourney | null;
  /** Snapshot of the last calls we saw, to diff platform/delay changes against. */
  lastCalls: Record<string, Call>;
  begin(ticket: Ticket): void;
  end(): void;
  /** Feeds a fresh service snapshot in; returns the phase after reconciling. */
  reconcile(ticket: Ticket, service: TrainService, now?: number): Promise<JourneyPhase>;
  markPassed(sequence: number): void;
}

function phaseFor(ticket: Ticket, service: TrainService, now: number, warnMinutes: number): JourneyPhase {
  const boarding = service.calls.find((c) => c.stationId === ticket.originStationId);
  const alighting = service.calls.find((c) => c.stationId === ticket.destinationStationId);
  if (!boarding || !alighting) return 'idle';

  const departure = new Date(boarding.expectedDeparture ?? boarding.scheduledDeparture ?? 0).getTime();
  const arrival = new Date(alighting.expectedArrival ?? alighting.scheduledArrival ?? 0).getTime();

  if (now >= arrival + 12 * 60_000) return 'completed';
  if (now >= arrival) return 'arrived';
  if (now >= arrival - warnMinutes * 60_000) return 'approaching';
  if (now >= departure) return 'onboard';
  // Before departure: "at-station" once the train is berthed and boarding.
  if (now >= departure - 10 * 60_000) return 'at-station';
  return 'to-station';
}

export const useJourneyStore = create<JourneyState>()(
  persist(
    (set, get) => ({
      active: null,
      lastCalls: {},

      begin(ticket) {
        set({
          active: {
            ticketId: ticket.id,
            serviceId: ticket.serviceId,
            phase: 'to-station',
            startedAt: null,
            passedCallSequences: [],
            lastNotifiedPhase: null,
          },
          lastCalls: {},
        });
      },

      end() {
        set({ active: null, lastCalls: {} });
      },

      markPassed(sequence) {
        set((state) => {
          if (!state.active) return state;
          if (state.active.passedCallSequences.includes(sequence)) return state;
          return {
            active: {
              ...state.active,
              passedCallSequences: [...state.active.passedCallSequences, sequence].sort((a, b) => a - b),
            },
          };
        });
      },

      async reconcile(ticket, service, now = Date.now()) {
        const settings = useSettingsStore.getState();
        const active = get().active;
        const next = phaseFor(ticket, service, now, settings.approachWarningMinutes);

        // --- disruption diffing, independent of phase ---------------------
        if (settings.notifyDisruption) {
          const previous = get().lastCalls;
          const relevant = service.calls.filter(
            (c) => c.stationId === ticket.originStationId || c.stationId === ticket.destinationStationId,
          );
          for (const call of relevant) {
            const before = previous[`${service.id}:${call.stationId}`];
            if (before) await notifyDisruption(service, call, before);
          }
          set({
            lastCalls: {
              ...previous,
              ...Object.fromEntries(relevant.map((c) => [`${service.id}:${c.stationId}`, c])),
            },
          });
        }

        if (!active) return next;
        // Never regress: a dropped sensor reading is not a reason to un-arrive.
        const phase = rank(next) > rank(active.phase) ? next : active.phase;

        const passed = service.calls
          .filter((c) => c.status === 'departed' || c.status === 'arrived')
          .map((c) => c.sequence);

        const wants: Record<string, boolean> = {
          onboard: settings.notifyJourneyStart,
          approaching: settings.notifyApproaching,
          arrived: settings.notifyArrival,
        };

        let lastNotifiedPhase = active.lastNotifiedPhase;
        if (phase !== active.lastNotifiedPhase && wants[phase]) {
          const call =
            phase === 'onboard'
              ? service.calls.find((c) => c.stationId === ticket.originStationId)
              : service.calls.find((c) => c.stationId === ticket.destinationStationId);
          const sent = await notifyPhase(phase, service, call);
          if (sent) lastNotifiedPhase = phase;
        }

        set({
          active: {
            ...active,
            phase,
            startedAt: active.startedAt ?? (rank(phase) >= rank('onboard') ? new Date(now).toISOString() : null),
            passedCallSequences: passed,
            lastNotifiedPhase,
          },
        });

        return phase;
      },
    }),
    {
      name: 'meridian.journey',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: (state) => ({ active: state.active, lastCalls: state.lastCalls }),
    },
  ),
);
