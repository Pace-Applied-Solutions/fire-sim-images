/**
 * Unit tests for type definitions and serialization.
 */

import { describe, it, expect } from 'vitest';
import type { ScenarioInputs, FirePerimeter, GeoContext } from '../types.js';

describe('Type Definitions', () => {
  describe('ScenarioInputs', () => {
    it('should have all required fields', () => {
      const inputs: ScenarioInputs = {
        fireDangerRating: 'high',
        windSpeed: 30,
        windDirection: 'NW',
        temperature: 35,
        humidity: 15,
        timeOfDay: 'afternoon',
        intensity: 'high',
        fireStage: 'established',
      };

      expect(inputs.fireDangerRating).toBeDefined();
      expect(inputs.windSpeed).toBeDefined();
      expect(inputs.windDirection).toBeDefined();
      expect(inputs.temperature).toBeDefined();
      expect(inputs.humidity).toBeDefined();
      expect(inputs.timeOfDay).toBeDefined();
      expect(inputs.intensity).toBeDefined();
      expect(inputs.fireStage).toBeDefined();
    });

    it('should serialize to JSON and back', () => {
      const inputs: ScenarioInputs = {
        fireDangerRating: 'extreme',
        windSpeed: 50,
        windDirection: 'NW',
        temperature: 40,
        humidity: 10,
        timeOfDay: 'afternoon',
        intensity: 'veryHigh',
        fireStage: 'major',
      };

      const json = JSON.stringify(inputs);
      const restored = JSON.parse(json) as ScenarioInputs;

      expect(restored).toEqual(inputs);
    });

    it('should accept all valid fire danger ratings', () => {
      const ratings: ScenarioInputs['fireDangerRating'][] = [
        'noRating',
        'moderate',
        'high',
        'extreme',
        'catastrophic',
      ];

      ratings.forEach((rating) => {
        const inputs: ScenarioInputs = {
          fireDangerRating: rating,
          windSpeed: 30,
          windDirection: 'N',
          temperature: 30,
          humidity: 30,
          timeOfDay: 'afternoon',
          intensity: 'moderate',
          fireStage: 'established',
        };

        expect(inputs.fireDangerRating).toBe(rating);
      });
    });

    it('should accept all valid wind directions', () => {
      const directions: ScenarioInputs['windDirection'][] = [
        'N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW',
      ];

      directions.forEach((direction) => {
        const inputs: ScenarioInputs = {
          fireDangerRating: 'high',
          windSpeed: 30,
          windDirection: direction,
          temperature: 30,
          humidity: 30,
          timeOfDay: 'afternoon',
          intensity: 'moderate',
          fireStage: 'established',
        };

        expect(inputs.windDirection).toBe(direction);
      });
    });

    it('should accept all valid times of day', () => {
      const times: ScenarioInputs['timeOfDay'][] = [
        'dawn', 'morning', 'midday', 'afternoon', 'dusk', 'night',
      ];

      times.forEach((time) => {
        const inputs: ScenarioInputs = {
          fireDangerRating: 'high',
          windSpeed: 30,
          windDirection: 'N',
          temperature: 30,
          humidity: 30,
          timeOfDay: time,
          intensity: 'moderate',
          fireStage: 'established',
        };

        expect(inputs.timeOfDay).toBe(time);
      });
    });

    it('should accept all valid intensities', () => {
      const intensities: ScenarioInputs['intensity'][] = [
        'low', 'moderate', 'high', 'veryHigh', 'extreme', 'catastrophic',
      ];

      intensities.forEach((intensity) => {
        const inputs: ScenarioInputs = {
          fireDangerRating: 'high',
          windSpeed: 30,
          windDirection: 'N',
          temperature: 30,
          humidity: 30,
          timeOfDay: 'afternoon',
          intensity: intensity,
          fireStage: 'established',
        };

        expect(inputs.intensity).toBe(intensity);
      });
    });

    it('should accept all valid fire stages', () => {
      const stages: ScenarioInputs['fireStage'][] = [
        'spotFire', 'developing', 'established', 'major',
      ];

      stages.forEach((stage) => {
        const inputs: ScenarioInputs = {
          fireDangerRating: 'high',
          windSpeed: 30,
          windDirection: 'N',
          temperature: 30,
          humidity: 30,
          timeOfDay: 'afternoon',
          intensity: 'moderate',
          fireStage: stage,
        };

        expect(inputs.fireStage).toBe(stage);
      });
    });
  });

  describe('FirePerimeter', () => {
    it('should follow GeoJSON Feature structure', () => {
      const perimeter: FirePerimeter = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [150.31, -33.72],
              [150.32, -33.72],
              [150.32, -33.71],
              [150.31, -33.71],
              [150.31, -33.72], // Closed polygon
            ],
          ],
        },
        properties: {
          drawn: true,
          timestamp: '2026-02-15T06:00:00Z',
        },
      };

      expect(perimeter.type).toBe('Feature');
      expect(perimeter.geometry.type).toBe('Polygon');
      expect(perimeter.geometry.coordinates).toHaveLength(1);
      expect(perimeter.properties.drawn).toBe(true);
    });

    it('should have closed polygon coordinates', () => {
      const perimeter: FirePerimeter = {
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
      };

      const ring = perimeter.geometry.coordinates[0];
      const firstPoint = ring[0];
      const lastPoint = ring[ring.length - 1];

      expect(firstPoint).toEqual(lastPoint);
    });

    it('should serialize to JSON and back', () => {
      const perimeter: FirePerimeter = {
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
      };

      const json = JSON.stringify(perimeter);
      const restored = JSON.parse(json) as FirePerimeter;

      expect(restored).toEqual(perimeter);
    });
  });

  describe('GeoContext', () => {
    it('should have all required fields', () => {
      const geoContext: GeoContext = {
        vegetationType: 'Dry Sclerophyll Forest',
        elevation: { min: 200, max: 400, mean: 300 },
        slope: { min: 5, max: 25, mean: 15 },
        aspect: 'NW',
        dataSource: 'NSW SEED',
        confidence: 'high',
      };

      expect(geoContext.vegetationType).toBeDefined();
      expect(geoContext.elevation).toBeDefined();
      expect(geoContext.slope).toBeDefined();
      expect(geoContext.aspect).toBeDefined();
      expect(geoContext.dataSource).toBeDefined();
      expect(geoContext.confidence).toBeDefined();
    });

    it('should support optional fields', () => {
      const geoContext: GeoContext = {
        vegetationType: 'Dry Sclerophyll Forest',
        vegetationSubtype: 'Sydney Coastal Dry Sclerophyll',
        fuelLoad: 'high',
        dominantSpecies: ['Eucalyptus piperita', 'Eucalyptus gummifera'],
        elevation: { min: 200, max: 400, mean: 300 },
        slope: { min: 5, max: 25, mean: 15 },
        aspect: 'NW',
        nearbyFeatures: ['road', 'escarpment'],
        dataSource: 'NSW SEED',
        confidence: 'high',
      };

      expect(geoContext.vegetationSubtype).toBeDefined();
      expect(geoContext.fuelLoad).toBeDefined();
      expect(geoContext.dominantSpecies).toHaveLength(2);
      expect(geoContext.nearbyFeatures).toHaveLength(2);
    });

    it('should serialize to JSON and back', () => {
      const geoContext: GeoContext = {
        vegetationType: 'Dry Sclerophyll Forest',
        elevation: { min: 200, max: 400, mean: 300 },
        slope: { min: 5, max: 25, mean: 15 },
        aspect: 'NW',
        nearbyFeatures: ['road'],
        dataSource: 'NSW SEED',
        confidence: 'high',
      };

      const json = JSON.stringify(geoContext);
      const restored = JSON.parse(json) as GeoContext;

      expect(restored).toEqual(geoContext);
    });

    it('should have valid range statistics', () => {
      const geoContext: GeoContext = {
        vegetationType: 'Dry Sclerophyll Forest',
        elevation: { min: 200, max: 400, mean: 300 },
        slope: { min: 5, max: 25, mean: 15 },
        aspect: 'NW',
        dataSource: 'NSW SEED',
        confidence: 'high',
      };

      // Mean should be between min and max
      expect(geoContext.elevation.mean).toBeGreaterThanOrEqual(geoContext.elevation.min);
      expect(geoContext.elevation.mean).toBeLessThanOrEqual(geoContext.elevation.max);
      expect(geoContext.slope.mean).toBeGreaterThanOrEqual(geoContext.slope.min);
      expect(geoContext.slope.mean).toBeLessThanOrEqual(geoContext.slope.max);
    });

    it('should accept all valid confidence levels', () => {
      const confidenceLevels: GeoContext['confidence'][] = ['low', 'medium', 'high'];

      confidenceLevels.forEach((confidence) => {
        const geoContext: GeoContext = {
          vegetationType: 'Dry Sclerophyll Forest',
          elevation: { min: 200, max: 400, mean: 300 },
          slope: { min: 5, max: 25, mean: 15 },
          aspect: 'NW',
          dataSource: 'NSW SEED',
          confidence: confidence,
        };

        expect(geoContext.confidence).toBe(confidence);
      });
    });
  });
});
