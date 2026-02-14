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
 *
 * The AFDRS uses 4 main rating levels plus a "No Rating" for days below the moderate threshold.
 * Introduced nationally on 1 September 2022.
 *
 * Reference: https://afdrs.com.au/
 */
export type FireDangerRating =
  | 'noRating'   // Below moderate threshold (no action required)
  | 'moderate'   // Plan and prepare (Green/Yellow)
  | 'high'       // Be ready to act (Yellow/Orange)
  | 'extreme'    // Take action now to protect life and property (Red)
  | 'catastrophic'; // For your survival, leave bushfire risk areas (Black)

/**
 * Scenario inputs provided by the trainer.
 */
export interface ScenarioInputs {
  // Fire danger rating (AFDRS - primary control)
  fireDangerRating: FireDangerRating; // AFDRS rating level

  // Weather parameters (provide context for the scenario)
  windSpeed: number; // km/h (0-120)
  windDirection: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW'; // Cardinal direction
  temperature: number; // degrees Celsius (5-50)
  humidity: number; // percentage (5-100)
  timeOfDay: 'dawn' | 'morning' | 'midday' | 'afternoon' | 'dusk' | 'night';

  // Fire characteristics
  intensity: 'low' | 'moderate' | 'high' | 'veryHigh' | 'extreme';
  fireStage: 'spotFire' | 'developing' | 'established' | 'major';
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
