/**
 * Unit tests for fire danger calculations and validation.
 */

import { describe, it, expect } from 'vitest';
import {
  getWeatherProfileForRating,
  getFireBehaviour,
  formatRating,
  getRatingColor,
  getRatingDescription,
  validateWeatherParameters,
  FIRE_BEHAVIOUR_BY_VEGETATION,
} from '../fireDangerCalculations.js';
import type { FireDangerRating } from '../types.js';

describe('Fire Danger Calculations', () => {
  describe('getWeatherProfileForRating', () => {
    it('should return weather profiles for all rating levels', () => {
      const ratings: FireDangerRating[] = ['noRating', 'moderate', 'high', 'extreme', 'catastrophic'];

      ratings.forEach((rating) => {
        const profile = getWeatherProfileForRating(rating);
        expect(profile).toBeDefined();
        expect(profile.temperature).toBeGreaterThan(0);
        expect(profile.humidity).toBeGreaterThan(0);
        expect(profile.windSpeed).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have increasing severity with higher ratings', () => {
      const noRating = getWeatherProfileForRating('noRating');
      const moderate = getWeatherProfileForRating('moderate');
      const high = getWeatherProfileForRating('high');
      const extreme = getWeatherProfileForRating('extreme');

      // Temperature should generally increase
      expect(moderate.temperature).toBeGreaterThan(noRating.temperature);
      expect(high.temperature).toBeGreaterThan(moderate.temperature);
      expect(extreme.temperature).toBeGreaterThan(high.temperature);

      // Humidity should generally decrease
      expect(moderate.humidity).toBeLessThan(noRating.humidity);
      expect(high.humidity).toBeLessThan(moderate.humidity);
      expect(extreme.humidity).toBeLessThan(high.humidity);
    });

    it('should return a copy of the profile', () => {
      const profile1 = getWeatherProfileForRating('high');
      const profile2 = getWeatherProfileForRating('high');

      expect(profile1).toEqual(profile2);
      expect(profile1).not.toBe(profile2); // Different object references
    });
  });

  describe('getFireBehaviour', () => {
    it('should return fire behaviour for known vegetation types', () => {
      const behaviour = getFireBehaviour('high', 'Dry Sclerophyll Forest');

      expect(behaviour).toBeDefined();
      expect(behaviour.flameHeight).toBeDefined();
      expect(behaviour.rateOfSpread).toBeDefined();
      expect(behaviour.spottingDistance).toBeDefined();
      expect(behaviour.intensity).toBeDefined();
      expect(behaviour.descriptor).toBeDefined();
    });

    it('should handle all fire danger ratings', () => {
      const ratings: FireDangerRating[] = ['noRating', 'moderate', 'high', 'extreme', 'catastrophic'];

      ratings.forEach((rating) => {
        const behaviour = getFireBehaviour(rating, 'Dry Sclerophyll Forest');
        expect(behaviour).toBeDefined();
        expect(behaviour.intensity).toBeDefined();
      });
    });

    it('should handle different vegetation types', () => {
      const grassland = getFireBehaviour('high', 'Grassland');
      const forest = getFireBehaviour('high', 'Dry Sclerophyll Forest');
      const heath = getFireBehaviour('high', 'Heath');

      expect(grassland).toBeDefined();
      expect(forest).toBeDefined();
      expect(heath).toBeDefined();

      // Grassland fires spread faster but have lower flames
      expect(grassland.rateOfSpread.min).toBeGreaterThan(forest.rateOfSpread.min);
      expect(grassland.flameHeight.max).toBeLessThan(forest.flameHeight.max);
    });

    it('should fall back to similar vegetation types', () => {
      const unknownForest = getFireBehaviour('high', 'Some Unknown Forest Type');
      const dryForest = getFireBehaviour('high', 'Dry Sclerophyll Forest');

      expect(unknownForest).toEqual(dryForest);
    });

    it('should fall back to grassland for grass-related types', () => {
      const unknownGrass = getFireBehaviour('high', 'Grassland Meadow');
      const grassland = getFireBehaviour('high', 'Grassland');

      expect(unknownGrass).toEqual(grassland);
    });

    it('should have default fallback', () => {
      const unknown = getFireBehaviour('high', 'Completely Unknown Type');
      expect(unknown).toBeDefined();
    });
  });

  describe('formatRating', () => {
    it('should format all rating levels', () => {
      expect(formatRating('noRating')).toBe('No Rating');
      expect(formatRating('moderate')).toBe('Moderate');
      expect(formatRating('high')).toBe('High');
      expect(formatRating('extreme')).toBe('Extreme');
      expect(formatRating('catastrophic')).toBe('Catastrophic');
    });
  });

  describe('getRatingColor', () => {
    it('should return hex colors for all ratings', () => {
      const ratings: FireDangerRating[] = ['noRating', 'moderate', 'high', 'extreme', 'catastrophic'];

      ratings.forEach((rating) => {
        const color = getRatingColor(rating);
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });

    it('should return correct AFDRS colors', () => {
      expect(getRatingColor('noRating')).toBe('#ffffff'); // White
      expect(getRatingColor('moderate')).toBe('#22c55e'); // Green
      expect(getRatingColor('high')).toBe('#eab308'); // Yellow
      expect(getRatingColor('extreme')).toBe('#f97316'); // Orange
      expect(getRatingColor('catastrophic')).toBe('#dc2626'); // Red
    });
  });

  describe('getRatingDescription', () => {
    it('should return descriptions for all ratings', () => {
      const ratings: FireDangerRating[] = ['noRating', 'moderate', 'high', 'extreme', 'catastrophic'];

      ratings.forEach((rating) => {
        const description = getRatingDescription(rating);
        expect(description).toBeDefined();
        expect(description.length).toBeGreaterThan(10);
      });
    });

    it('should include action-oriented messaging for higher ratings', () => {
      expect(getRatingDescription('moderate').toLowerCase()).toContain('plan');
      expect(getRatingDescription('high').toLowerCase()).toContain('ready');
      expect(getRatingDescription('extreme').toLowerCase()).toContain('action');
      expect(getRatingDescription('catastrophic').toLowerCase()).toContain('leave');
    });
  });

  describe('validateWeatherParameters', () => {
    it('should return no warnings for typical conditions', () => {
      const warnings = validateWeatherParameters({
        temperature: 30,
        humidity: 25,
        windSpeed: 40,
      });

      expect(warnings).toHaveLength(0);
    });

    it('should warn about unlikely low temp with very low humidity', () => {
      const warnings = validateWeatherParameters({
        temperature: 10,
        humidity: 15,
        windSpeed: 20,
      });

      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0].toLowerCase()).toContain('humidity');
    });

    it('should warn about high temp with high humidity', () => {
      const warnings = validateWeatherParameters({
        temperature: 42,
        humidity: 60,
        windSpeed: 20,
      });

      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0].toLowerCase()).toContain('humidity');
    });

    it('should warn about extreme wind speeds', () => {
      const warnings = validateWeatherParameters({
        temperature: 30,
        humidity: 30,
        windSpeed: 90,
      });

      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0].toLowerCase()).toContain('wind');
    });

    it('should return multiple warnings for multiple issues', () => {
      const warnings = validateWeatherParameters({
        temperature: 10,
        humidity: 10,
        windSpeed: 100,
      });

      expect(warnings.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Fire Behaviour Data Integrity', () => {
    it('should have fire behaviour for all vegetation types and ratings', () => {
      const vegTypes = Object.keys(FIRE_BEHAVIOUR_BY_VEGETATION);
      const ratings: FireDangerRating[] = ['noRating', 'moderate', 'high', 'extreme', 'catastrophic'];

      vegTypes.forEach((vegType) => {
        ratings.forEach((rating) => {
          const behaviour = FIRE_BEHAVIOUR_BY_VEGETATION[vegType][rating];
          expect(behaviour).toBeDefined();
          expect(behaviour.flameHeight.min).toBeLessThanOrEqual(behaviour.flameHeight.max);
          expect(behaviour.rateOfSpread.min).toBeLessThanOrEqual(behaviour.rateOfSpread.max);
        });
      });
    });

    it('should have increasing flame heights with severity', () => {
      const forest = FIRE_BEHAVIOUR_BY_VEGETATION['Dry Sclerophyll Forest'];

      expect(forest.moderate.flameHeight.min).toBeGreaterThan(forest.noRating.flameHeight.min);
      expect(forest.high.flameHeight.min).toBeGreaterThan(forest.moderate.flameHeight.min);
      expect(forest.extreme.flameHeight.min).toBeGreaterThan(forest.high.flameHeight.min);
      expect(forest.catastrophic.flameHeight.min).toBeGreaterThan(forest.extreme.flameHeight.min);
    });
  });
});
