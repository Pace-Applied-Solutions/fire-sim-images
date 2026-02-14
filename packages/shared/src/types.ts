/**
 * Core domain types for the bushfire simulation inject tool.
 * These types define the structure of fire scenarios, generation requests, and results.
 */

/**
 * GeoJSON Feature representing a fire perimeter polygon.
 * Follows GeoJSON specification with additional properties for tracking.
 */
export interface FirePerimeter {
  type: 'Feature';
  geometry: {
    type: 'Polygon';
    coordinates: number[][][]; // [[[lng, lat], [lng, lat], ...]]
  };
  properties: {
    drawn: boolean;
    timestamp: string;
  };
}

/**
 * Fire Danger Rating categories based on Australian Fire Danger Rating System (AFDRS).
 * Represents the named risk levels communicated to the public and emergency services.
 */
export type FireDangerRating =
  | 'moderate'
  | 'high'
  | 'veryHigh'
  | 'severe'
  | 'extreme'
  | 'catastrophic';

/**
 * Input mode for fire danger configuration.
 * - 'weather': User specifies individual weather parameters, FDI is calculated
 * - 'rating': User selects a named rating, weather parameters are set to typical values
 * - 'fdi': User enters a specific FDI value, weather parameters are set to match
 */
export type FireDangerInputMode = 'weather' | 'rating' | 'fdi';

/**
 * Scenario inputs provided by the trainer.
 */
export interface ScenarioInputs {
  // Weather parameters
  windSpeed: number; // km/h (0-120)
  windDirection: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW'; // Cardinal direction
  temperature: number; // degrees Celsius (5-50)
  humidity: number; // percentage (5-100)
  timeOfDay: 'dawn' | 'morning' | 'midday' | 'afternoon' | 'dusk' | 'night';

  // Fire danger (calculated from weather or set explicitly)
  fireDangerRating: FireDangerRating; // Named rating category
  fireDangerIndex: number; // Calculated FDI value (0-150)
  droughtFactor?: number; // Optional drought factor (0-10), defaults based on rating

  // Fire characteristics
  intensity: 'low' | 'moderate' | 'high' | 'veryHigh' | 'extreme';
  fireStage: 'spotFire' | 'developing' | 'established' | 'major';

  // UI state (not persisted to generation request)
  inputMode?: FireDangerInputMode; // How the user is configuring fire danger
}

export type FuelLoadCategory = 'low' | 'moderate' | 'high' | 'veryHigh';

export type CardinalAspect = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

export interface RangeStatistic {
  min: number;
  max: number;
  mean: number;
}

/**
 * Geographic context derived from geospatial datasets.
 */
export interface GeoContext {
  vegetationType: string;
  vegetationSubtype?: string;
  fuelLoad?: FuelLoadCategory;
  dominantSpecies?: string[];
  elevation: RangeStatistic;
  slope: RangeStatistic;
  aspect: CardinalAspect;
  nearbyFeatures?: string[];
  dataSource: string;
  confidence: 'low' | 'medium' | 'high';
}

/**
 * Perspective for image generation.
 */
export type ViewPoint =
  | 'aerial'
  | 'ground_north'
  | 'ground_south'
  | 'ground_east'
  | 'ground_west'
  | 'ridge';

/**
 * Request payload for generating a fire scenario.
 */
export interface GenerationRequest {
  perimeter: FirePerimeter;
  inputs: ScenarioInputs;
  geoContext: GeoContext;
  requestedViews: ViewPoint[];
}

/**
 * Result of a generation operation.
 */
export interface GenerationResult {
  id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  images: GeneratedImage[];
  createdAt: string; // ISO 8601 timestamp
  completedAt?: string; // ISO 8601 timestamp
  error?: string;
}

/**
 * A single generated image from a specific viewpoint.
 */
export interface GeneratedImage {
  viewPoint: ViewPoint;
  url: string;
  thumbnailUrl?: string;
  metadata: ImageMetadata;
}

/**
 * Metadata for a generated image.
 */
export interface ImageMetadata {
  width: number;
  height: number;
  prompt: string;
  model: string;
  seed?: number;
  generatedAt: string; // ISO 8601 timestamp
}
