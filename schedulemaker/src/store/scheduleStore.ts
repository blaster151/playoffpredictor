/**
 * Zustand store for schedule state management
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { AppState, Game, Bye, TeamId, Week, UIMode, FeasibilityResult } from '@/types';
import { initializeScheduleState, DEFAULT_RULES } from '@/lib/state/initialization';
import { placeGame, removeGame, assignBye, removeBye } from '@/lib/state/actions';
import { quickFeasibilityCheck, fullFeasibilityCheck } from '@/lib/feasibility';

interface ScheduleStore extends AppState {
  // Actions
  placeGame: (game: Game) => void;
  removeGame: (gameId: string) => void;
  assignBye: (bye: Bye) => void;
  removeBye: (teamId: TeamId, week: Week) => void;
  setWeek: (week: Week) => void;
  setTeam: (teamId: TeamId | null) => void;
  setMode: (mode: UIMode) => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
  runFeasibilityCheck: (full?: boolean) => void;
}

const initialSchedule = initializeScheduleState(DEFAULT_RULES);

export const useScheduleStore = create<ScheduleStore>()(
  immer((set, get) => ({
    mode: 'week-by-week',
    currentWeek: 1,
    currentTeam: null,
    schedule: initialSchedule,
    feasibility: [],
    history: [initialSchedule],
    historyIndex: 0,

    placeGame: (game: Game) => {
      set((state) => {
        // Save to history before making changes
        if (state.historyIndex < state.history.length - 1) {
          state.history = state.history.slice(0, state.historyIndex + 1);
        }
        
        // Clone current state for history
        const newSchedule = JSON.parse(JSON.stringify(state.schedule));
        
        // Place the game
        placeGame(state.schedule, game);
        
        // Add to history
        state.history.push(newSchedule);
        state.historyIndex++;
        
        // Run quick feasibility check
        const results = quickFeasibilityCheck(state.schedule);
        state.feasibility = results;
      });
    },

    removeGame: (gameId: string) => {
      set((state) => {
        // Save to history
        if (state.historyIndex < state.history.length - 1) {
          state.history = state.history.slice(0, state.historyIndex + 1);
        }
        
        const newSchedule = JSON.parse(JSON.stringify(state.schedule));
        
        removeGame(state.schedule, gameId);
        
        state.history.push(newSchedule);
        state.historyIndex++;
        
        const results = quickFeasibilityCheck(state.schedule);
        state.feasibility = results;
      });
    },

    assignBye: (bye: Bye) => {
      set((state) => {
        if (state.historyIndex < state.history.length - 1) {
          state.history = state.history.slice(0, state.historyIndex + 1);
        }
        
        const newSchedule = JSON.parse(JSON.stringify(state.schedule));
        
        assignBye(state.schedule, bye);
        
        state.history.push(newSchedule);
        state.historyIndex++;
        
        const results = quickFeasibilityCheck(state.schedule);
        state.feasibility = results;
      });
    },

    removeBye: (teamId: TeamId, week: Week) => {
      set((state) => {
        if (state.historyIndex < state.history.length - 1) {
          state.history = state.history.slice(0, state.historyIndex + 1);
        }
        
        const newSchedule = JSON.parse(JSON.stringify(state.schedule));
        
        removeBye(state.schedule, teamId, week);
        
        state.history.push(newSchedule);
        state.historyIndex++;
        
        const results = quickFeasibilityCheck(state.schedule);
        state.feasibility = results;
      });
    },

    setWeek: (week: Week) => {
      set({ currentWeek: week });
    },

    setTeam: (teamId: TeamId | null) => {
      set({ currentTeam: teamId });
    },

    setMode: (mode: UIMode) => {
      set({ mode });
    },

    undo: () => {
      set((state) => {
        if (state.historyIndex > 0) {
          state.historyIndex--;
          state.schedule = state.history[state.historyIndex];
          const results = quickFeasibilityCheck(state.schedule);
          state.feasibility = results;
        }
      });
    },

    redo: () => {
      set((state) => {
        if (state.historyIndex < state.history.length - 1) {
          state.historyIndex++;
          state.schedule = state.history[state.historyIndex];
          const results = quickFeasibilityCheck(state.schedule);
          state.feasibility = results;
        }
      });
    },

    reset: () => {
      const newSchedule = initializeScheduleState(DEFAULT_RULES);
      set({
        schedule: newSchedule,
        history: [newSchedule],
        historyIndex: 0,
        feasibility: [],
        currentWeek: 1,
        currentTeam: null,
      });
    },

    runFeasibilityCheck: (full = false) => {
      const state = get();
      const results = full 
        ? fullFeasibilityCheck(state.schedule)
        : quickFeasibilityCheck(state.schedule);
      set({ feasibility: results });
    },
  }))
);

