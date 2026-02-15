/**
 * Unit tests for prompt generator.
 * Tests prompt generation, intensity mapping, time-of-day lighting, and safety validation.
 */

import { describe, it, expect } from 'vitest';
import { generatePrompts } from '../prompts/promptGenerator.js';
import { INTENSITY_VISUALS, TIME_OF_DAY_LIGHTING, FIRE_STAGE_DESCRIPTIONS } from '../prompts/promptTemplates.js';
import type { GenerationRequest } from '../types.js';

describe('Prompt Generator', () => {
  const mockRequest: GenerationRequest = {
    perimeter: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[150.31, -33.72], [150.32, -33.72], [150.32, -33.71], [150.31, -33.71], [150.31, -33.72]]],
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
      slope: { min: 5, max: 25, mean: 15 },
      aspect: 'NW',
      nearbyFeatures: ['road', 'escarpment'],
      dataSource: 'NSW SEED',
      confidence: 'high',
    },
    requestedViews: ['aerial', 'helicopter_north', 'ground_south'],
  };

  describe('generatePrompts', () => {
    it('should generate prompts for all requested viewpoints', () => {
      const result = generatePrompts(mockRequest);

      expect(result.prompts).toHaveLength(3);
      expect(result.prompts[0].viewpoint).toBe('aerial');
      expect(result.prompts[1].viewpoint).toBe('helicopter_north');
      expect(result.prompts[2].viewpoint).toBe('ground_south');
    });

    it('should include vegetation descriptor in prompts', () => {
      const result = generatePrompts(mockRequest);

      result.prompts.forEach((prompt) => {
        expect(prompt.promptText.toLowerCase()).toContain('eucalypt');
      });
    });

    it('should include fire intensity descriptor', () => {
      const result = generatePrompts(mockRequest);

      result.prompts.forEach((prompt) => {
        expect(prompt.promptText).toContain(INTENSITY_VISUALS['veryHigh'].descriptor);
      });
    });

    it('should include flame height in prompts', () => {
      const result = generatePrompts(mockRequest);

      result.prompts.forEach((prompt) => {
        expect(prompt.promptText).toContain('10 to 20 metres');
      });
    });

    it('should include smoke description', () => {
      const result = generatePrompts(mockRequest);

      result.prompts.forEach((prompt) => {
        expect(prompt.promptText).toContain('pyrocumulus');
      });
    });

    it('should include time of day lighting', () => {
      const result = generatePrompts(mockRequest);

      result.prompts.forEach((prompt) => {
        expect(prompt.promptText).toContain('afternoon');
      });
    });

    it('should include wind description', () => {
      const result = generatePrompts(mockRequest);

      result.prompts.forEach((prompt) => {
        expect(prompt.promptText.toLowerCase()).toContain('wind');
      });
    });

    it('should include RFS terminology', () => {
      const result = generatePrompts(mockRequest);

      result.prompts.forEach((prompt) => {
        const text = prompt.promptText.toLowerCase();
        // Should contain at least some RFS/fire service terminology
        const hasTerminology = 
          text.includes('bushfire') ||
          text.includes('eucalypt') ||
          text.includes('crown fire') ||
          text.includes('spotting');
        expect(hasTerminology).toBe(true);
      });
    });

    it('should have different perspectives for different viewpoints', () => {
      const result = generatePrompts(mockRequest);

      const aerialPrompt = result.prompts[0].promptText;
      const helicopterPrompt = result.prompts[1].promptText;
      const groundPrompt = result.prompts[2].promptText;

      // Each should be different
      expect(aerialPrompt).not.toBe(helicopterPrompt);
      expect(aerialPrompt).not.toBe(groundPrompt);
      expect(helicopterPrompt).not.toBe(groundPrompt);

      // Each should mention its perspective
      expect(aerialPrompt.toLowerCase()).toContain('aerial');
      expect(helicopterPrompt.toLowerCase()).toContain('helicopter');
      expect(groundPrompt.toLowerCase()).toContain('ground');
    });

    it('should include prompt set ID and template version', () => {
      const result = generatePrompts(mockRequest);

      expect(result.id).toBeDefined();
      expect(result.templateVersion).toBeDefined();
      expect(result.prompts[0].promptSetId).toBe(result.id);
    });

    it('should throw error if prompt contains blocked terms', () => {
      const badRequest = {
        ...mockRequest,
        geoContext: {
          ...mockRequest.geoContext,
          nearbyFeatures: ['casualties', 'destruction'], // These should be blocked
        },
      };

      // The prompt generator should throw an error when blocked terms appear
      expect(() => generatePrompts(badRequest)).toThrow('blocked terms');
    });
  });

  describe('Intensity Mapping', () => {
    it('should map all 5 intensity levels correctly', () => {
      const intensities: Array<'low' | 'moderate' | 'high' | 'veryHigh' | 'extreme'> = [
        'low', 'moderate', 'high', 'veryHigh', 'extreme'
      ];

      intensities.forEach((intensity) => {
        const mapping = INTENSITY_VISUALS[intensity];
        expect(mapping).toBeDefined();
        expect(mapping.flameHeight).toBeDefined();
        expect(mapping.smoke).toBeDefined();
        expect(mapping.descriptor).toBeDefined();
      });
    });

    it('should have increasing flame heights with intensity', () => {
      expect(INTENSITY_VISUALS.low.flameHeight).toContain('0.5 to 1.5');
      expect(INTENSITY_VISUALS.moderate.flameHeight).toContain('1.5 to 3');
      expect(INTENSITY_VISUALS.high.flameHeight).toContain('3 to 10');
      expect(INTENSITY_VISUALS.veryHigh.flameHeight).toContain('10 to 20');
      expect(INTENSITY_VISUALS.extreme.flameHeight).toContain('20+');
    });

    it('should have appropriate smoke descriptions for each level', () => {
      expect(INTENSITY_VISUALS.low.smoke).toContain('light');
      expect(INTENSITY_VISUALS.moderate.smoke).toContain('grey-white');
      expect(INTENSITY_VISUALS.high.smoke).toContain('dense');
      expect(INTENSITY_VISUALS.veryHigh.smoke).toContain('pyrocumulus');
      expect(INTENSITY_VISUALS.extreme.smoke).toContain('pyrocumulonimbus');
    });

    it('should have crown involvement descriptions', () => {
      expect(INTENSITY_VISUALS.low.crownInvolvement).toContain('surface');
      expect(INTENSITY_VISUALS.high.crownInvolvement).toContain('crown fire');
      expect(INTENSITY_VISUALS.extreme.crownInvolvement).toContain('full crown fire');
    });
  });

  describe('Time of Day Lighting', () => {
    it('should map all 6 time periods correctly', () => {
      const times: Array<'dawn' | 'morning' | 'midday' | 'afternoon' | 'dusk' | 'night'> = [
        'dawn', 'morning', 'midday', 'afternoon', 'dusk', 'night'
      ];

      times.forEach((time) => {
        const description = TIME_OF_DAY_LIGHTING[time];
        expect(description).toBeDefined();
        expect(description.length).toBeGreaterThan(10);
      });
    });

    it('should have appropriate lighting descriptions', () => {
      expect(TIME_OF_DAY_LIGHTING.dawn.toLowerCase()).toContain('golden');
      expect(TIME_OF_DAY_LIGHTING.morning.toLowerCase()).toContain('bright');
      expect(TIME_OF_DAY_LIGHTING.midday.toLowerCase()).toContain('overhead');
      expect(TIME_OF_DAY_LIGHTING.afternoon.toLowerCase()).toContain('warm');
      expect(TIME_OF_DAY_LIGHTING.dusk.toLowerCase()).toContain('sunset');
      expect(TIME_OF_DAY_LIGHTING.night.toLowerCase()).toContain('dark');
    });
  });

  describe('Fire Stage Descriptions', () => {
    it('should map all fire stages', () => {
      const stages: Array<'spotFire' | 'developing' | 'established' | 'major'> = [
        'spotFire', 'developing', 'established', 'major'
      ];

      stages.forEach((stage) => {
        const description = FIRE_STAGE_DESCRIPTIONS[stage];
        expect(description).toBeDefined();
      });
    });
  });

  describe('Terrain Description', () => {
    it('should describe flat terrain', () => {
      const flatRequest = {
        ...mockRequest,
        geoContext: {
          ...mockRequest.geoContext,
          slope: { min: 0, max: 4, mean: 2 },
        },
      };

      const result = generatePrompts(flatRequest);
      expect(result.prompts[0].promptText.toLowerCase()).toContain('flat');
    });

    it('should describe steep terrain', () => {
      const steepRequest = {
        ...mockRequest,
        geoContext: {
          ...mockRequest.geoContext,
          slope: { min: 20, max: 35, mean: 28 },
        },
      };

      const result = generatePrompts(steepRequest);
      expect(result.prompts[0].promptText.toLowerCase()).toContain('steep');
    });
  });

  describe('Wind and Spread Direction', () => {
    it('should include wind direction', () => {
      const result = generatePrompts(mockRequest);

      result.prompts.forEach((prompt) => {
        expect(prompt.promptText.toLowerCase()).toContain('nw');
      });
    });

    it('should determine correct spread direction from wind', () => {
      // NW wind should push fire to SE
      const result = generatePrompts(mockRequest);

      result.prompts.forEach((prompt) => {
        expect(prompt.promptText.toLowerCase()).toContain('southeast');
      });
    });
  });

  describe('Prompt Completeness', () => {
    it('should include all required sections', () => {
      const result = generatePrompts(mockRequest);

      result.prompts.forEach((prompt) => {
        const text = prompt.promptText;
        
        // Check for key sections
        expect(text).toBeTruthy();
        expect(text.length).toBeGreaterThan(100); // Should be substantial
        
        // Should contain scene, fire, weather, perspective elements
        const hasScene = text.toLowerCase().includes('photograph') || text.toLowerCase().includes('scene');
        const hasFire = text.toLowerCase().includes('fire') || text.toLowerCase().includes('flame');
        const hasWeather = text.toLowerCase().includes('wind') || text.toLowerCase().includes('temperature');
        const hasPerspective = text.toLowerCase().includes('aerial') || 
                               text.toLowerCase().includes('helicopter') || 
                               text.toLowerCase().includes('ground');
        
        expect(hasScene || hasPerspective).toBe(true);
        expect(hasFire).toBe(true);
        expect(hasWeather).toBe(true);
      });
    });

    it('should not contain excessive whitespace', () => {
      const result = generatePrompts(mockRequest);

      result.prompts.forEach((prompt) => {
        // Should not have multiple consecutive spaces
        expect(prompt.promptText).not.toMatch(/\s{2,}/);
      });
    });
  });
});
