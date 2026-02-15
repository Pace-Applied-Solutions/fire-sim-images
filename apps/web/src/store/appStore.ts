import { create } from 'zustand';
import type { FirePerimeter, ScenarioInputs, GenerationResult, GeoContext } from '@fire-sim/shared';

export type ScenarioState =
  | 'idle'
  | 'drawing'
  | 'configuring'
  | 'generating'
  | 'complete'
  | 'error';

interface AppState {
  // Scenario state
  scenarioState: ScenarioState;
  setScenarioState: (state: ScenarioState) => void;
  setState: (state: ScenarioState) => void; // Alias for setScenarioState

  // Fire perimeter
  perimeter: FirePerimeter | null;
  setPerimeter: (perimeter: FirePerimeter | null) => void;

  // Geographic context
  geoContext: GeoContext | null;
  setGeoContext: (context: GeoContext | null) => void;

  // Scenario inputs
  scenarioInputs: ScenarioInputs | null;
  setScenarioInputs: (inputs: ScenarioInputs) => void;

  // Generation state
  generationProgress: string | null;
  setGenerationProgress: (progress: string | null) => void;

  // Generation results
  generationResult: GenerationResult | null;
  setGenerationResult: (result: GenerationResult | null) => void;

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
  setState: (state) => set({ scenarioState: state }), // Alias

  // Initial perimeter state
  perimeter: null,
  setPerimeter: (perimeter) => set({ perimeter }),

  // Initial geo context
  geoContext: null,
  setGeoContext: (geoContext) => set({ geoContext }),

  // Initial scenario inputs state
  scenarioInputs: null,
  setScenarioInputs: (inputs) => set({ scenarioInputs: inputs }),

  // Initial generation progress
  generationProgress: null,
  setGenerationProgress: (generationProgress) => set({ generationProgress }),

  // Initial generation result
  generationResult: null,
  setGenerationResult: (generationResult) => set({ generationResult }),

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
