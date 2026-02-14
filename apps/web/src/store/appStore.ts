import { create } from 'zustand';

export type ScenarioState = 'idle' | 'drawing' | 'configuring' | 'generating' | 'complete' | 'error';

interface AppState {
  // Scenario state
  scenarioState: ScenarioState;
  setScenarioState: (state: ScenarioState) => void;

  // Error handling
  error: string | null;
  setError: (error: string | null) => void;

  // UI state
  isSidebarOpen: boolean;
  isResultsPanelOpen: boolean;
  toggleSidebar: () => void;
  toggleResultsPanel: () => void;
  setSidebarOpen: (open: boolean) => void;
  setResultsPanelOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Initial scenario state
  scenarioState: 'idle',
  setScenarioState: (state) => set({ scenarioState: state }),

  // Initial error state
  error: null,
  setError: (error) => set({ error }),

  // Initial UI state - sidebar open by default, results panel closed
  isSidebarOpen: true,
  isResultsPanelOpen: false,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  toggleResultsPanel: () => set((state) => ({ isResultsPanelOpen: !state.isResultsPanelOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  setResultsPanelOpen: (open) => set({ isResultsPanelOpen: open }),
}));
