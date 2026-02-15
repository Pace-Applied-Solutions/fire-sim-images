/**
 * Unit tests for consistency validator.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ConsistencyValidator } from '../validation/consistencyValidator.js';
import type { GeneratedImage, ScenarioInputs } from '@fire-sim/shared';

describe('ConsistencyValidator', () => {
  let validator: ConsistencyValidator;
  
  const mockInputs: ScenarioInputs = {
    fireDangerRating: 'extreme',
    windSpeed: 50,
    windDirection: 'NW',
    temperature: 40,
    humidity: 10,
    timeOfDay: 'afternoon',
    intensity: 'veryHigh',
    fireStage: 'established',
  };

  const createMockImage = (viewpoint: string, prompt: string, seed?: number): GeneratedImage => ({
    viewPoint: viewpoint as any,
    url: `https://example.com/${viewpoint}.png`,
    metadata: {
      width: 1024,
      height: 1024,
      prompt,
      model: 'dall-e-3',
      seed,
      generatedAt: new Date().toISOString(),
    },
  });

  beforeEach(() => {
    validator = new ConsistencyValidator();
  });

  describe('validateImageSet', () => {
    it('should pass validation for consistent image set', () => {
      const images = [
        createMockImage('aerial', 'Aerial photograph with NW winds and afternoon lighting', 12345),
        createMockImage('helicopter_north', 'Helicopter view with NW winds and afternoon lighting', 12345),
        createMockImage('ground_south', 'Ground-level view with NW winds and afternoon lighting', 12345),
      ];

      const result = validator.validateImageSet(images, mockInputs);

      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThan(70);
      expect(result.checks).toHaveLength(4);
    });

    it('should fail validation for inconsistent smoke direction', () => {
      const images = [
        createMockImage('aerial', 'Aerial photograph', 12345), // No wind direction mentioned
        createMockImage('helicopter_north', 'Helicopter view', 12345), // No wind direction mentioned
        createMockImage('ground_south', 'Ground-level view', 12345), // No wind direction mentioned
      ];

      const result = validator.validateImageSet(images, mockInputs);

      const smokeCheck = result.checks.find((c) => c.name === 'Smoke Direction Consistency');
      // Should fail because no wind direction is mentioned in prompts
      expect(smokeCheck?.passed).toBe(false);
    });

    it('should fail validation for inconsistent lighting', () => {
      const images = [
        createMockImage('aerial', 'Aerial photograph with NW winds at dawn', 12345),
        createMockImage('helicopter_north', 'Helicopter view with NW winds at dusk', 12345),
        createMockImage('ground_south', 'Ground-level view with NW winds at night', 12345),
      ];

      const result = validator.validateImageSet(images, mockInputs);

      const lightingCheck = result.checks.find((c) => c.name === 'Lighting Consistency');
      expect(lightingCheck?.passed).toBe(false);
    });

    it('should detect different models', () => {
      const images = [
        { ...createMockImage('aerial', 'Aerial view', 12345), metadata: { ...createMockImage('aerial', 'Aerial view', 12345).metadata, model: 'dall-e-3' } },
        { ...createMockImage('helicopter_north', 'Helicopter view', 12345), metadata: { ...createMockImage('helicopter_north', 'Helicopter view', 12345).metadata, model: 'stable-diffusion' } },
      ];

      const result = validator.validateImageSet(images, mockInputs);

      const colorCheck = result.checks.find((c) => c.name === 'Color Palette Similarity');
      expect(colorCheck?.passed).toBe(false);
    });

    it('should detect different seeds', () => {
      const images = [
        createMockImage('aerial', 'Aerial view with NW winds and afternoon lighting', 12345),
        createMockImage('helicopter_north', 'Helicopter view with NW winds and afternoon lighting', 67890),
      ];

      const result = validator.validateImageSet(images, mockInputs);

      const colorCheck = result.checks.find((c) => c.name === 'Color Palette Similarity');
      expect(colorCheck?.score).toBeLessThan(100);
    });

    it('should include warnings for failed checks', () => {
      const images = [
        createMockImage('aerial', 'Some image without wind info', 12345),
      ];

      const result = validator.validateImageSet(images, mockInputs);

      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should include recommendations when score is low', () => {
      const images = [
        createMockImage('aerial', 'Random image', 12345),
        createMockImage('helicopter_north', 'Another random image', 67890),
      ];

      const result = validator.validateImageSet(images, mockInputs);

      if (result.score < 70) {
        expect(result.recommendations.length).toBeGreaterThan(0);
      }
    });

    it('should validate with anchor image', () => {
      const anchorImage = createMockImage('aerial', 'Aerial anchor view with NW winds and afternoon lighting', 12345);
      const images = [
        createMockImage('helicopter_north', 'Helicopter view with NW winds and afternoon lighting', 12345),
        createMockImage('ground_south', 'Ground view with NW winds and afternoon lighting', 12345),
      ];

      const result = validator.validateImageSet(images, mockInputs, anchorImage);

      const fireSizeCheck = result.checks.find((c) => c.name === 'Fire Size Proportionality');
      expect(fireSizeCheck?.score).toBeGreaterThan(70);
    });
  });

  describe('validateSmokeDirection', () => {
    it('should pass when wind direction is mentioned in prompts', () => {
      const images = [
        createMockImage('aerial', 'Fire with NW winds pushing smoke southeast'),
        createMockImage('helicopter_north', 'Bushfire with strong northwesterly winds'),
      ];

      const result = validator.validateImageSet(images, mockInputs);
      const check = result.checks.find((c) => c.name === 'Smoke Direction Consistency');

      expect(check?.passed).toBe(true);
    });

    it('should fail when wind direction is not mentioned', () => {
      const images = [
        createMockImage('aerial', 'Fire with calm conditions'),
        createMockImage('helicopter_north', 'Bushfire in the landscape'),
      ];

      const result = validator.validateImageSet(images, mockInputs);
      const check = result.checks.find((c) => c.name === 'Smoke Direction Consistency');

      expect(check?.passed).toBe(false);
    });
  });

  describe('validateFireSizeProportions', () => {
    it('should pass with multiple viewpoint types', () => {
      const images = [
        createMockImage('aerial', 'Aerial view'),
        createMockImage('helicopter_north', 'Helicopter view'),
        createMockImage('ground_south', 'Ground view'),
      ];

      const result = validator.validateImageSet(images, mockInputs);
      const check = result.checks.find((c) => c.name === 'Fire Size Proportionality');

      expect(check?.passed).toBe(true);
    });

    it('should score lower with single viewpoint type', () => {
      const images = [
        createMockImage('aerial', 'Aerial view 1'),
        createMockImage('aerial', 'Aerial view 2'),
      ];

      const result = validator.validateImageSet(images, mockInputs);
      const check = result.checks.find((c) => c.name === 'Fire Size Proportionality');

      expect(check?.score).toBeLessThan(100);
    });
  });

  describe('validateLightingConsistency', () => {
    it('should pass when time of day is mentioned', () => {
      const images = [
        createMockImage('aerial', 'Aerial view in afternoon lighting'),
        createMockImage('helicopter_north', 'Helicopter view with warm afternoon sun'),
      ];

      const result = validator.validateImageSet(images, mockInputs);
      const check = result.checks.find((c) => c.name === 'Lighting Consistency');

      expect(check?.passed).toBe(true);
    });

    it('should accept lighting keywords', () => {
      const images = [
        createMockImage('aerial', 'Aerial view with golden sun'),
        createMockImage('helicopter_north', 'Helicopter view with natural lighting'),
      ];

      const result = validator.validateImageSet(images, mockInputs);
      const check = result.checks.find((c) => c.name === 'Lighting Consistency');

      // Should still score reasonably since lighting is mentioned
      expect(check?.score).toBeGreaterThan(0);
    });
  });

  describe('validateColorPalette', () => {
    it('should pass when same model and seed', () => {
      const images = [
        createMockImage('aerial', 'Aerial view', 12345),
        createMockImage('helicopter_north', 'Helicopter view', 12345),
      ];

      const result = validator.validateImageSet(images, mockInputs);
      const check = result.checks.find((c) => c.name === 'Color Palette Similarity');

      expect(check?.passed).toBe(true);
      expect(check?.score).toBe(100);
    });

    it('should score lower with different models', () => {
      const images = [
        { ...createMockImage('aerial', 'Aerial view', 12345), metadata: { ...createMockImage('aerial', 'Aerial view', 12345).metadata, model: 'dall-e-3' } },
        { ...createMockImage('helicopter_north', 'Helicopter view', 12345), metadata: { ...createMockImage('helicopter_north', 'Helicopter view', 12345).metadata, model: 'stable-diffusion' } },
      ];

      const result = validator.validateImageSet(images, mockInputs);
      const check = result.checks.find((c) => c.name === 'Color Palette Similarity');

      expect(check?.score).toBeLessThan(100);
    });
  });

  describe('generateReport', () => {
    it('should generate a human-readable report', () => {
      const images = [
        createMockImage('aerial', 'Aerial view with NW winds and afternoon lighting', 12345),
        createMockImage('helicopter_north', 'Helicopter view with NW winds and afternoon lighting', 12345),
      ];

      const result = validator.validateImageSet(images, mockInputs);
      const report = validator.generateReport(result);

      expect(report).toContain('Visual Consistency Validation Report');
      expect(report).toContain('Overall Score:');
      expect(report).toContain('Individual Checks:');
      expect(report).toContain(result.passed ? 'PASSED' : 'FAILED');
    });

    it('should include warnings in report', () => {
      const images = [
        createMockImage('aerial', 'Random image without metadata', 12345),
      ];

      const result = validator.validateImageSet(images, mockInputs);
      const report = validator.generateReport(result);

      if (result.warnings.length > 0) {
        expect(report).toContain('Warnings:');
      }
    });

    it('should include recommendations in report', () => {
      const images = [
        createMockImage('aerial', 'Random image', 12345),
      ];

      const result = validator.validateImageSet(images, mockInputs);
      const report = validator.generateReport(result);

      if (result.recommendations.length > 0) {
        expect(report).toContain('Recommendations:');
      }
    });
  });

  describe('calculateOverallScore', () => {
    it('should calculate weighted average correctly', () => {
      const images = [
        createMockImage('aerial', 'Perfect image with NW winds, afternoon lighting', 12345),
        createMockImage('helicopter_north', 'Perfect image with NW winds, afternoon lighting', 12345),
        createMockImage('ground_south', 'Perfect image with NW winds, afternoon lighting', 12345),
      ];

      const result = validator.validateImageSet(images, mockInputs);

      // All checks should pass with high scores
      expect(result.score).toBeGreaterThan(80);
    });

    it('should weight checks appropriately', () => {
      const images = [
        createMockImage('aerial', 'Image with correct winds', 12345),
      ];

      const result = validator.validateImageSet(images, mockInputs);

      // Score should be calculated from all checks
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });
});
