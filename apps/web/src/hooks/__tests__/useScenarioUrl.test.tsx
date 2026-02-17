/**
 * Tests for scenario URL synchronization hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useScenarioUrl } from '../useScenarioUrl';
import { useAppStore } from '../../store/appStore';
import * as generationApiModule from '../../services/generationApi';
import type { ScenarioMetadata } from '@fire-sim/shared';

// Mock the generation API
vi.mock('../../services/generationApi', () => ({
  generationApi: {
    getScenario: vi.fn(),
  },
}));

// Mock toast store
vi.mock('../../store/toastStore', () => ({
  useToastStore: () => ({
    addToast: vi.fn(),
  }),
}));

const mockScenario: ScenarioMetadata = {
  id: 'test-scenario-123',
  perimeter: {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [150.31, -33.72],
          [150.32, -33.72],
          [150.32, -33.71],
          [150.31, -33.71],
          [150.31, -33.72],
        ],
      ],
    },
    properties: {
      drawn: true,
      timestamp: '2026-02-15T06:00:00Z',
    },
  },
  inputs: {
    fireDangerRating: 'extreme',
    windSpeed: 50,
    windDirection: 'NW',
    temperature: 40,
    humidity: 10,
    timeOfDay: 'afternoon',
    intensity: 'veryHigh',
    fireStage: 'established',
  },
  geoContext: {
    vegetationType: 'Dry Sclerophyll Forest',
    elevation: { min: 200, max: 400, mean: 300 },
    slope: { min: 0, max: 20, mean: 10 },
    aspect: 'NW',
    dataSource: 'NVIS',
    confidence: 'high',
  },
  requestedViews: ['aerial', 'ground_north'],
  result: {
    id: 'test-scenario-123',
    status: 'completed',
    images: [],
    createdAt: '2026-02-15T06:00:00Z',
  },
};

describe('useScenarioUrl', () => {
  beforeEach(() => {
    // Reset store
    const store = useAppStore.getState();
    store.setScenarioState('idle');
    store.setPerimeter(null);
    store.setGeoContext(null);
    store.setScenarioInputs(null as any);
    store.setGenerationResult(null);
    store.setError(null);

    // Clear mocks
    vi.clearAllMocks();
  });

  it('should load scenario from URL parameter', async () => {
    // Mock API response
    vi.spyOn(generationApiModule.generationApi, 'getScenario').mockResolvedValue(mockScenario);

    // Render hook with URL parameter
    const { result } = renderHook(() => useScenarioUrl(), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={['/?scenario=test-scenario-123']}>
          {children}
        </MemoryRouter>
      ),
    });

    // Wait for async load to complete
    await waitFor(() => {
      const store = useAppStore.getState();
      expect(store.generationResult).not.toBeNull();
    });

    // Verify API was called
    expect(generationApiModule.generationApi.getScenario).toHaveBeenCalledWith(
      'test-scenario-123'
    );

    // Verify state was restored
    const store = useAppStore.getState();
    expect(store.perimeter).toEqual(mockScenario.perimeter);
    expect(store.geoContext).toEqual(mockScenario.geoContext);
    expect(store.scenarioInputs).toEqual(mockScenario.inputs);
    expect(store.generationResult).toEqual(mockScenario.result);
    expect(store.scenarioState).toBe('complete');
  });

  it('should handle failed scenario load', async () => {
    // Mock API error
    vi.spyOn(generationApiModule.generationApi, 'getScenario').mockRejectedValue(
      new Error('Scenario not found')
    );

    const { result } = renderHook(() => useScenarioUrl(), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={['/?scenario=invalid-id']}>{children}</MemoryRouter>
      ),
    });

    // Wait for error handling
    await waitFor(() => {
      const store = useAppStore.getState();
      expect(store.scenarioState).toBe('error');
    });

    const store = useAppStore.getState();
    expect(store.error).toContain('Scenario not found');
  });

  it('should not load scenario when no URL parameter', () => {
    const getScenarioSpy = vi.spyOn(generationApiModule.generationApi, 'getScenario');

    renderHook(() => useScenarioUrl(), {
      wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
    });

    expect(getScenarioSpy).not.toHaveBeenCalled();
  });
});
