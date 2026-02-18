/**
 * Unit tests for Locality Agent.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocalityAgent, type LocalityEnrichment } from '../services/localityAgent.js';
import {
  MapsGroundingService,
  type MapsGroundingResult,
} from '../services/mapsGroundingService.js';
import type { GeoContext } from '@fire-sim/shared';

describe('LocalityAgent', () => {
  const mockGeoContext: GeoContext = {
    vegetationType: 'Dry Sclerophyll Forest',
    elevation: { min: 600, max: 700, mean: 650 },
    slope: { min: 5, max: 25, mean: 15 },
    aspect: 'NW',
    nearbyFeatures: ['road', 'escarpment'],
    dataSource: 'NSW SEED',
    confidence: 'high',
    locality: 'Bungendore, New South Wales',
  };

  const mockCentroid: [number, number] = [149.45, -35.25];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('enrichLocality', () => {
    it('should return basic enrichment when no Maps service available', async () => {
      const agent = new LocalityAgent(null);

      const result = await agent.enrichLocality(mockGeoContext, mockCentroid);

      expect(result.mapsGroundingUsed).toBe(false);
      expect(result.confidence).toBe('low');
      expect(result.terrainNarrative).toContain('Dry Sclerophyll Forest');
      expect(result.dataSource).toBe('NSW SEED');
    });

    it('should return basic enrichment when Maps service unavailable', async () => {
      const mockMapsService = {
        isAvailable: vi.fn().mockResolvedValue(false),
        enrichLocation: vi.fn(),
      } as unknown as MapsGroundingService;

      const agent = new LocalityAgent(mockMapsService);

      const result = await agent.enrichLocality(mockGeoContext, mockCentroid);

      expect(result.mapsGroundingUsed).toBe(false);
      expect(result.confidence).toBe('low');
    });

    it('should use Maps grounding when available', async () => {
      const mockMapsResult: MapsGroundingResult = {
        terrainNarrative:
          'Steep valleys and rolling hills characterize the landscape around Bungendore.',
        localFeatures: ['Queanbeyan River valley', 'Lake George basin'],
        landCover: ['Dry sclerophyll forest', 'Grassy woodland'],
        vegetationContext: 'Dominated by eucalypt woodland',
        climateContext: 'Cool temperate climate with hot dry summers',
        confidence: 'high',
        success: true,
      };

      const mockMapsService = {
        isAvailable: vi.fn().mockResolvedValue(true),
        enrichLocation: vi.fn().mockResolvedValue(mockMapsResult),
      } as unknown as MapsGroundingService;

      const agent = new LocalityAgent(mockMapsService);

      const result = await agent.enrichLocality(mockGeoContext, mockCentroid);

      expect(result.mapsGroundingUsed).toBe(true);
      expect(result.confidence).toBe('high');
      expect(result.terrainNarrative).toContain('Steep valleys');
      expect(result.localFeatures).toHaveLength(2);
      expect(result.landCover).toHaveLength(2);
      expect(result.vegetationContext).toContain('eucalypt');
      expect(result.climateContext).toContain('Cool temperate');
      expect(result.dataSource).toContain('Google Maps Grounding');
    });

    it('should fall back to basic enrichment when Maps grounding fails', async () => {
      const mockMapsResult: MapsGroundingResult = {
        terrainNarrative: 'Remote bushland area.',
        localFeatures: [],
        landCover: [],
        confidence: 'low',
        success: false,
        error: 'API error',
      };

      const mockMapsService = {
        isAvailable: vi.fn().mockResolvedValue(true),
        enrichLocation: vi.fn().mockResolvedValue(mockMapsResult),
      } as unknown as MapsGroundingService;

      const agent = new LocalityAgent(mockMapsService);

      const result = await agent.enrichLocality(mockGeoContext, mockCentroid);

      expect(result.mapsGroundingUsed).toBe(false);
      expect(result.confidence).toBe('low');
    });

    it('should handle missing locality gracefully', async () => {
      const geoContextWithoutLocality: GeoContext = {
        ...mockGeoContext,
        locality: undefined,
      };

      const agent = new LocalityAgent(null);

      const result = await agent.enrichLocality(geoContextWithoutLocality, mockCentroid);

      expect(result.mapsGroundingUsed).toBe(false);
      expect(result.terrainNarrative).toBeTruthy();
    });

    it('should extract basic features from geo context', async () => {
      const agent = new LocalityAgent(null);

      const result = await agent.enrichLocality(mockGeoContext, mockCentroid);

      expect(result.localFeatures).toHaveLength(2);
      expect(result.localFeatures).toContain('Road nearby');
      expect(result.localFeatures).toContain('Steep escarpment');
    });

    it('should describe terrain based on slope', async () => {
      const agent = new LocalityAgent(null);

      // Test flat terrain
      const flatGeoContext = { ...mockGeoContext, slope: { min: 0, max: 3, mean: 2 } };
      const flatResult = await agent.enrichLocality(flatGeoContext, mockCentroid);
      expect(flatResult.terrainNarrative).toContain('flat terrain');

      // Test steep terrain
      const steepGeoContext = { ...mockGeoContext, slope: { min: 30, max: 40, mean: 35 } };
      const steepResult = await agent.enrichLocality(steepGeoContext, mockCentroid);
      expect(steepResult.terrainNarrative).toContain('very steep escarpment');
    });
  });

  describe('create', () => {
    it('should create agent with Maps service', async () => {
      // Mock environment with API key
      process.env.GEMINI_API_KEY = 'test-key';

      const agent = await LocalityAgent.create();

      expect(agent).toBeInstanceOf(LocalityAgent);

      // Clean up
      delete process.env.GEMINI_API_KEY;
    });

    it('should create agent without Maps service when not configured', async () => {
      const agent = await LocalityAgent.create();

      expect(agent).toBeInstanceOf(LocalityAgent);
    });
  });
});
