import { create } from 'zustand';
import type {
  FirePerimeter,
  ScenarioInputs,
  GenerationResult,
  GeoContext,
  ViewPoint,
} from '@fire-sim/shared';

export type ScenarioState =
  | 'idle'
  | 'drawing'
  | 'configuring'
  | 'generating'
  | 'complete'
  | 'error';

/** Function type for capturing map screenshots from specific viewpoints */
export type CaptureMapScreenshotsFn = (viewpoints: ViewPoint[]) => Promise<Record<string, string>>;

/** Function type for capturing the vegetation overlay screenshot */
export type CaptureVegetationScreenshotFn = () => Promise<string | null>;

/** Function type for handling location selection from address search */
export type HandleLocationSelectFn = (longitude: number, latitude: number, placeName: string) => void;

/** Function type for handling geolocation requests */
export type HandleGeolocationRequestFn = () => void;

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

  // Map screenshots captured during generation (viewpoint -> data URL)
  mapScreenshots: Record<string, string> | null;
  setMapScreenshots: (screenshots: Record<string, string> | null) => void;

  // Error handling
  error: string | null;
  setError: (error: string | null) => void;

  // Map screenshot capture (registered by MapContainer)
  captureMapScreenshots: CaptureMapScreenshotsFn | null;
  setCaptureMapScreenshots: (fn: CaptureMapScreenshotsFn | null) => void;

  // Vegetation overlay screenshot capture (registered by MapContainer)
  captureVegetationScreenshot: CaptureVegetationScreenshotFn | null;
  setCaptureVegetationScreenshot: (fn: CaptureVegetationScreenshotFn | null) => void;

  // Map location handlers (registered by MapContainer)
  handleLocationSelect: HandleLocationSelectFn | null;
  setHandleLocationSelect: (fn: HandleLocationSelectFn | null) => void;

  handleGeolocationRequest: HandleGeolocationRequestFn | null;
  setHandleGeolocationRequest: (fn: HandleGeolocationRequestFn | null) => void;

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

  // Map screenshots
  mapScreenshots: null,
  setMapScreenshots: (mapScreenshots) => set({ mapScreenshots }),

  // Initial error state
  error: null,
  setError: (error) => set({ error }),

  // Map screenshot capture
  captureMapScreenshots: null,
  setCaptureMapScreenshots: (fn) => set({ captureMapScreenshots: fn }),

  // Vegetation overlay screenshot capture
  captureVegetationScreenshot: null,
  setCaptureVegetationScreenshot: (fn) => set({ captureVegetationScreenshot: fn }),

  // Map location handlers
  handleLocationSelect: null,
  setHandleLocationSelect: (fn) => set({ handleLocationSelect: fn }),

  handleGeolocationRequest: null,
  setHandleGeolocationRequest: (fn) => set({ handleGeolocationRequest: fn }),

  // Initial UI state - sidebar open by default, results panel closed
  isSidebarOpen: true,
  isResultsPanelOpen: false,
  toggleSidebar: () => set((state: AppState) => ({ isSidebarOpen: !state.isSidebarOpen })),
  toggleResultsPanel: () => set((state: AppState) => ({ isResultsPanelOpen: !state.isResultsPanelOpen })),
  setSidebarOpen: (open: boolean) => set({ isSidebarOpen: open }),
  setResultsPanelOpen: (open: boolean) => set({ isResultsPanelOpen: open }),
}));
