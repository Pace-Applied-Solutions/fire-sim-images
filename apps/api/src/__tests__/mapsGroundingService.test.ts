/**
 * Unit tests for Maps Grounding Service.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  MapsGroundingService,
  createMapsGroundingService,
  type MapsGroundingConfig,
  type MapsGroundingRequest,
} from '../services/mapsGroundingService.js';

describe('MapsGroundingService', () => {
  const mockConfig: MapsGroundingConfig = {
    apiKey: 'test-api-key',
    model: 'gemini-2.5-flash',
    baseUrl: 'https://test.googleapis.com/v1beta',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isAvailable', () => {
    it('should return true when properly configured', async () => {
      const service = new MapsGroundingService(mockConfig);
      expect(await service.isAvailable()).toBe(true);
    });

    it('should return false when missing API key', async () => {
      const service = new MapsGroundingService({
        ...mockConfig,
        apiKey: '',
      });
      expect(await service.isAvailable()).toBe(false);
    });

    it('should return false when missing model', async () => {
      const service = new MapsGroundingService({
        ...mockConfig,
        model: '',
      });
      expect(await service.isAvailable()).toBe(false);
    });
  });

  describe('enrichLocation', () => {
    const mockRequest: MapsGroundingRequest = {
      locality: 'Bungendore, New South Wales',
      latitude: -35.25,
      longitude: 149.45,
      existingContext: {
        vegetationType: 'Dry Sclerophyll Forest',
        elevation: 650,
        nearbyFeatures: ['road', 'escarpment'],
      },
    };

    it('should return fallback when service not configured', async () => {
      const service = new MapsGroundingService({
        apiKey: '',
        model: '',
      });

      const result = await service.enrichLocation(mockRequest);

      expect(result.success).toBe(false);
      expect(result.confidence).toBe('low');
      expect(result.error).toContain('not configured');
    });

    it('should return fallback on API error', async () => {
      const service = new MapsGroundingService(mockConfig);

      // Mock fetch to fail
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      const result = await service.enrichLocation(mockRequest);

      expect(result.success).toBe(false);
      expect(result.confidence).toBe('low');
      expect(result.error).toContain('API request failed');
    });

    it('should parse successful API response', async () => {
      const service = new MapsGroundingService(mockConfig);

      // Mock successful API response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: `TERRAIN NARRATIVE:
Steep valleys and rolling hills characterize the landscape around Bungendore, with prominent escarpments defining the eastern edge.

LOCAL FEATURES:
- Queanbeyan River valley to the north
- Lake George basin to the east
- Steep escarpments along major ridgelines

LAND COVER:
- Dry sclerophyll forest
- Grassy woodland
- Agricultural clearings

VEGETATION CONTEXT:
Dominated by eucalypt woodland with mixed species including Yellow Box and Red Stringybark. Dense understory of native grasses and shrubs.

CLIMATE CONTEXT:
Cool temperate climate with hot dry summers. Fire season typically October to March. Influenced by proximity to the Great Dividing Range.`,
                  },
                ],
              },
              groundingMetadata: {
                // Indicates Maps grounding was used
                searchEntryPoint: {},
              },
            },
          ],
        }),
      });

      const result = await service.enrichLocation(mockRequest);

      expect(result.success).toBe(true);
      expect(result.confidence).toBe('high');
      expect(result.terrainNarrative).toContain('Steep valleys');
      expect(result.terrainNarrative).toContain('rolling hills');
      expect(result.localFeatures).toHaveLength(3);
      expect(result.localFeatures).toContain('Queanbeyan River valley to the north');
      expect(result.landCover).toHaveLength(3);
      expect(result.landCover).toContain('Dry sclerophyll forest');
      expect(result.vegetationContext).toContain('eucalypt woodland');
      expect(result.climateContext).toContain('Cool temperate climate');
    });

    it('should handle response without grounding metadata', async () => {
      const service = new MapsGroundingService(mockConfig);

      // Mock response without grounding metadata
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: 'TERRAIN NARRATIVE:\nGeneric terrain description.',
                  },
                ],
              },
              // No groundingMetadata
            },
          ],
        }),
      });

      const result = await service.enrichLocation(mockRequest);

      expect(result.success).toBe(true);
      expect(result.confidence).toBe('medium'); // Lower confidence without grounding
      expect(result.terrainNarrative).toContain('Generic terrain');
    });

    it('should return fallback for empty locality', async () => {
      const service = new MapsGroundingService(mockConfig);

      const invalidRequest: MapsGroundingRequest = {
        locality: '',
        latitude: 0,
        longitude: 0,
      };

      const result = await service.enrichLocation(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.terrainNarrative).toContain('bushland area');
    });
  });

  describe('createMapsGroundingService', () => {
    beforeEach(() => {
      // Clear environment variables
      delete process.env.GEMINI_API_KEY;
      delete process.env.IMAGE_MODEL_KEY;
      delete process.env.GEMINI_TEXT_MODEL;
    });

    it('should create service with GEMINI_API_KEY', async () => {
      process.env.GEMINI_API_KEY = 'test-key';

      const service = await createMapsGroundingService();

      expect(service).not.toBeNull();
      expect(await service!.isAvailable()).toBe(true);
    });

    it('should create service with IMAGE_MODEL_KEY fallback', async () => {
      process.env.IMAGE_MODEL_KEY = 'test-key';

      const service = await createMapsGroundingService();

      expect(service).not.toBeNull();
      expect(await service!.isAvailable()).toBe(true);
    });

    it('should return null when no API key configured', async () => {
      const service = await createMapsGroundingService();

      expect(service).toBeNull();
    });

    it('should use custom model from environment', async () => {
      process.env.GEMINI_API_KEY = 'test-key';
      process.env.GEMINI_TEXT_MODEL = 'gemini-pro';

      const service = await createMapsGroundingService();

      expect(service).not.toBeNull();
    });
  });
});
