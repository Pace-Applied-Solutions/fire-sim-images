/**
 * Unit tests for Multi-Agent Orchestrator.
 */

import { describe, it, expect, vi } from 'vitest';
import { MultiAgentOrchestrator } from '../services/multiAgentOrchestrator.js';
import { LocalityAgent } from '../services/localityAgent.js';
import type { GenerationRequest } from '@fire-sim/shared';

describe('MultiAgentOrchestrator', () => {
  const mockRequest: GenerationRequest = {
    perimeter: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [149.4, -35.2],
            [149.5, -35.2],
            [149.5, -35.3],
            [149.4, -35.3],
            [149.4, -35.2],
          ],
        ],
      },
      properties: {
        drawn: true,
        timestamp: '2026-02-18T00:00:00Z',
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
      elevation: { min: 600, max: 700, mean: 650 },
      slope: { min: 5, max: 25, mean: 15 },
      aspect: 'NW',
      nearbyFeatures: ['road', 'escarpment'],
      dataSource: 'NSW SEED',
      confidence: 'high',
      locality: 'Bungendore, New South Wales',
    },
    requestedViews: ['aerial', 'ground_north'],
  };

  describe('process', () => {
    it('should process request through context parser', async () => {
      const orchestrator = new MultiAgentOrchestrator(null);

      const result = await orchestrator.process(mockRequest);

      expect(result.parsedContext).toBeDefined();
      expect(result.parsedContext.centroid).toHaveLength(2);
      expect(result.parsedContext.request).toEqual(mockRequest);
      expect(result.metadata.agentsUsed).toContain('ContextParser');
      expect(result.metadata.mapsGroundingUsed).toBe(false);
    });

    it('should include locality enrichment when agent available', async () => {
      const mockLocalityAgent = {
        enrichLocality: vi.fn().mockResolvedValue({
          terrainNarrative: 'Test terrain narrative',
          localFeatures: ['Feature 1', 'Feature 2'],
          landCover: ['Forest'],
          dataSource: 'Google Maps Grounding',
          confidence: 'high' as const,
          mapsGroundingUsed: true,
        }),
      } as unknown as LocalityAgent;

      const orchestrator = new MultiAgentOrchestrator(mockLocalityAgent);

      const result = await orchestrator.process(mockRequest);

      expect(result.localityEnrichment).toBeDefined();
      expect(result.localityEnrichment?.terrainNarrative).toBe('Test terrain narrative');
      expect(result.localityEnrichment?.localFeatures).toHaveLength(2);
      expect(result.metadata.agentsUsed).toContain('ContextParser');
      expect(result.metadata.agentsUsed).toContain('LocalityAgent');
      expect(result.metadata.mapsGroundingUsed).toBe(true);
    });

    it('should handle enrichment errors gracefully', async () => {
      const mockLocalityAgent = {
        enrichLocality: vi.fn().mockRejectedValue(new Error('API error')),
      } as unknown as LocalityAgent;

      const orchestrator = new MultiAgentOrchestrator(mockLocalityAgent);

      const result = await orchestrator.process(mockRequest);

      expect(result.parsedContext).toBeDefined();
      expect(result.metadata.mapsGroundingUsed).toBe(false);
    });

    it('should merge enrichment into request', async () => {
      const mockLocalityAgent = {
        enrichLocality: vi.fn().mockResolvedValue({
          terrainNarrative: 'Enhanced terrain',
          localFeatures: ['New feature'],
          landCover: ['Forest'],
          dataSource: 'Google Maps Grounding',
          confidence: 'high' as const,
          mapsGroundingUsed: true,
        }),
      } as unknown as LocalityAgent;

      const orchestrator = new MultiAgentOrchestrator(mockLocalityAgent);

      const result = await orchestrator.process(mockRequest);

      expect(result.parsedContext.request.geoContext.nearbyFeatures).toContain('road');
      expect(result.parsedContext.request.geoContext.nearbyFeatures).toContain('New feature');
    });

    it('should track processing time', async () => {
      const orchestrator = new MultiAgentOrchestrator(null);

      const result = await orchestrator.process(mockRequest);

      expect(result.metadata.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should handle validation errors by throwing', async () => {
      const invalidRequest = {
        ...mockRequest,
        geoContext: {
          ...mockRequest.geoContext,
          vegetationType: '',
        },
      };

      const orchestrator = new MultiAgentOrchestrator(null);

      // Should throw validation error
      await expect(orchestrator.process(invalidRequest)).rejects.toThrow('vegetationType');
    });
  });

  describe('create', () => {
    it('should create orchestrator with locality agent', async () => {
      process.env.GEMINI_API_KEY = 'test-key';

      const orchestrator = await MultiAgentOrchestrator.create();

      expect(orchestrator).toBeInstanceOf(MultiAgentOrchestrator);

      delete process.env.GEMINI_API_KEY;
    });

    it('should create orchestrator without locality agent when not configured', async () => {
      const orchestrator = await MultiAgentOrchestrator.create();

      expect(orchestrator).toBeInstanceOf(MultiAgentOrchestrator);
    });
  });
});
