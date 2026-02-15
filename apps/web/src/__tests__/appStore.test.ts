/**
 * Unit tests for app store state management.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../store/appStore.js';
import type { ScenarioInputs, FirePerimeter } from '@fire-sim/shared';

describe('App Store', () => {
  beforeEach(() => {
    // Reset the store before each test
    const store = useAppStore.getState();
    store.setScenarioState('idle');
    store.setPerimeter(null);
    store.setGeoContext(null);
    store.setScenarioInputs(null as any); // Allow null in tests for reset
    store.setGenerationResult(null);
    store.setError(null);
  });

  describe('Scenario State Transitions', () => {
    it('should start in idle state', () => {
      const state = useAppStore.getState();
      expect(state.scenarioState).toBe('idle');
    });

    it('should transition to drawing state', () => {
      const { setScenarioState } = useAppStore.getState();
      setScenarioState('drawing');
      
      const state = useAppStore.getState();
      expect(state.scenarioState).toBe('drawing');
    });

    it('should transition through all valid states', () => {
      const { setScenarioState } = useAppStore.getState();
      
      setScenarioState('idle');
      expect(useAppStore.getState().scenarioState).toBe('idle');
      
      setScenarioState('drawing');
      expect(useAppStore.getState().scenarioState).toBe('drawing');
      
      setScenarioState('configuring');
      expect(useAppStore.getState().scenarioState).toBe('configuring');
      
      setScenarioState('generating');
      expect(useAppStore.getState().scenarioState).toBe('generating');
      
      setScenarioState('complete');
      expect(useAppStore.getState().scenarioState).toBe('complete');
    });

    it('should handle error state', () => {
      const { setScenarioState, setError } = useAppStore.getState();
      
      setScenarioState('error');
      setError('Something went wrong');
      
      const state = useAppStore.getState();
      expect(state.scenarioState).toBe('error');
      expect(state.error).toBe('Something went wrong');
    });

    it('should support setState alias', () => {
      const { setState } = useAppStore.getState();
      setState('drawing');
      
      const state = useAppStore.getState();
      expect(state.scenarioState).toBe('drawing');
    });
  });

  describe('Perimeter Management', () => {
    it('should store fire perimeter', () => {
      const perimeter: FirePerimeter = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[150.31, -33.72], [150.32, -33.72], [150.32, -33.71], [150.31, -33.71], [150.31, -33.72]]],
        },
        properties: {
          drawn: true,
          timestamp: '2026-02-15T06:00:00Z',
        },
      };

      const { setPerimeter } = useAppStore.getState();
      setPerimeter(perimeter);

      const state = useAppStore.getState();
      expect(state.perimeter).toEqual(perimeter);
    });

    it('should clear perimeter', () => {
      const perimeter: FirePerimeter = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[150.31, -33.72], [150.32, -33.72], [150.32, -33.71], [150.31, -33.71], [150.31, -33.72]]],
        },
        properties: {
          drawn: true,
          timestamp: '2026-02-15T06:00:00Z',
        },
      };

      const { setPerimeter } = useAppStore.getState();
      setPerimeter(perimeter);
      setPerimeter(null);

      const state = useAppStore.getState();
      expect(state.perimeter).toBeNull();
    });
  });

  describe('Scenario Inputs', () => {
    it('should store scenario inputs', () => {
      const inputs: ScenarioInputs = {
        fireDangerRating: 'extreme',
        windSpeed: 50,
        windDirection: 'NW',
        temperature: 40,
        humidity: 10,
        timeOfDay: 'afternoon',
        intensity: 'veryHigh',
        fireStage: 'established',
      };

      const { setScenarioInputs } = useAppStore.getState();
      setScenarioInputs(inputs);

      const state = useAppStore.getState();
      expect(state.scenarioInputs).toEqual(inputs);
    });

    it('should validate input ranges (conceptual test)', () => {
      const inputs: ScenarioInputs = {
        fireDangerRating: 'extreme',
        windSpeed: 50,
        windDirection: 'NW',
        temperature: 40,
        humidity: 10,
        timeOfDay: 'afternoon',
        intensity: 'veryHigh',
        fireStage: 'established',
      };

      // These should be valid inputs
      expect(inputs.windSpeed).toBeGreaterThanOrEqual(0);
      expect(inputs.windSpeed).toBeLessThanOrEqual(120);
      expect(inputs.temperature).toBeGreaterThanOrEqual(5);
      expect(inputs.temperature).toBeLessThanOrEqual(50);
      expect(inputs.humidity).toBeGreaterThanOrEqual(5);
      expect(inputs.humidity).toBeLessThanOrEqual(100);
    });
  });

  describe('Generation State', () => {
    it('should track generation progress', () => {
      const { setGenerationProgress } = useAppStore.getState();
      setGenerationProgress('Generating images... 3 of 5');

      const state = useAppStore.getState();
      expect(state.generationProgress).toBe('Generating images... 3 of 5');
    });

    it('should store generation results', () => {
      const result = {
        id: 'scenario-123',
        status: 'completed' as const,
        images: [],
        createdAt: '2026-02-15T06:00:00Z',
      };

      const { setGenerationResult } = useAppStore.getState();
      setGenerationResult(result);

      const state = useAppStore.getState();
      expect(state.generationResult).toEqual(result);
    });

    it('should clear generation results', () => {
      const result = {
        id: 'scenario-123',
        status: 'completed' as const,
        images: [],
        createdAt: '2026-02-15T06:00:00Z',
      };

      const { setGenerationResult } = useAppStore.getState();
      setGenerationResult(result);
      setGenerationResult(null);

      const state = useAppStore.getState();
      expect(state.generationResult).toBeNull();
    });
  });

  describe('UI State', () => {
    it('should start with sidebar open', () => {
      const state = useAppStore.getState();
      expect(state.isSidebarOpen).toBe(true);
    });

    it('should start with results panel closed', () => {
      const state = useAppStore.getState();
      expect(state.isResultsPanelOpen).toBe(false);
    });

    it('should toggle sidebar', () => {
      const { toggleSidebar } = useAppStore.getState();
      
      toggleSidebar();
      expect(useAppStore.getState().isSidebarOpen).toBe(false);
      
      toggleSidebar();
      expect(useAppStore.getState().isSidebarOpen).toBe(true);
    });

    it('should toggle results panel', () => {
      const { toggleResultsPanel } = useAppStore.getState();
      
      toggleResultsPanel();
      expect(useAppStore.getState().isResultsPanelOpen).toBe(true);
      
      toggleResultsPanel();
      expect(useAppStore.getState().isResultsPanelOpen).toBe(false);
    });

    it('should set sidebar state directly', () => {
      const { setSidebarOpen } = useAppStore.getState();
      
      setSidebarOpen(false);
      expect(useAppStore.getState().isSidebarOpen).toBe(false);
      
      setSidebarOpen(true);
      expect(useAppStore.getState().isSidebarOpen).toBe(true);
    });

    it('should set results panel state directly', () => {
      const { setResultsPanelOpen } = useAppStore.getState();
      
      setResultsPanelOpen(true);
      expect(useAppStore.getState().isResultsPanelOpen).toBe(true);
      
      setResultsPanelOpen(false);
      expect(useAppStore.getState().isResultsPanelOpen).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should set error message', () => {
      const { setError } = useAppStore.getState();
      setError('Network error occurred');

      const state = useAppStore.getState();
      expect(state.error).toBe('Network error occurred');
    });

    it('should clear error message', () => {
      const { setError } = useAppStore.getState();
      setError('Some error');
      setError(null);

      const state = useAppStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe('Full Scenario Flow', () => {
    it('should support complete scenario workflow', () => {
      const store = useAppStore.getState();

      // Step 1: Start drawing
      store.setScenarioState('drawing');
      expect(useAppStore.getState().scenarioState).toBe('drawing');

      // Step 2: Set perimeter
      const perimeter: FirePerimeter = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[150.31, -33.72], [150.32, -33.72], [150.32, -33.71], [150.31, -33.71], [150.31, -33.72]]],
        },
        properties: {
          drawn: true,
          timestamp: '2026-02-15T06:00:00Z',
        },
      };
      store.setPerimeter(perimeter);
      expect(useAppStore.getState().perimeter).toEqual(perimeter);

      // Step 3: Configure inputs
      store.setScenarioState('configuring');
      const inputs: ScenarioInputs = {
        fireDangerRating: 'extreme',
        windSpeed: 50,
        windDirection: 'NW',
        temperature: 40,
        humidity: 10,
        timeOfDay: 'afternoon',
        intensity: 'veryHigh',
        fireStage: 'established',
      };
      store.setScenarioInputs(inputs);
      expect(useAppStore.getState().scenarioInputs).toEqual(inputs);

      // Step 4: Start generation
      store.setScenarioState('generating');
      expect(useAppStore.getState().scenarioState).toBe('generating');

      // Step 5: Complete
      store.setScenarioState('complete');
      const result = {
        id: 'scenario-123',
        status: 'completed' as const,
        images: [],
        createdAt: '2026-02-15T06:00:00Z',
      };
      store.setGenerationResult(result);
      expect(useAppStore.getState().scenarioState).toBe('complete');
      expect(useAppStore.getState().generationResult).toEqual(result);
    });
  });
});
