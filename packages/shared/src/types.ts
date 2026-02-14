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
  | 'noRating'   // Below moderate threshold (White)
  | 'moderate'   // Plan and prepare (Green)
  | 'high'       // Be ready to act (Yellow)
  | 'extreme'    // Take action now to protect life and property (Orange)
  | 'catastrophic'; // For your survival, leave bushfire risk areas (Red)

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
  intensity: 'low' | 'moderate' | 'high' | 'extreme' | 'catastrophic' | 'veryHigh';
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
 * 
 * Helicopter views: Elevated wide-area perspective with ~60° pitch, suitable for situational awareness
 * Ground views: Flat ground-level perspective looking horizontally, simulating truck/vehicle perspective (<2km zoom)
 */
export type ViewPoint =
  | 'aerial'
  | 'helicopter_north'
  | 'helicopter_south'
  | 'helicopter_east'
  | 'helicopter_west'
  | 'helicopter_above'
  | 'ground_north'
  | 'ground_south'
  | 'ground_east'
  | 'ground_west'
  | 'ground_above'
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

/**
 * Complete scenario metadata stored with each generation.
 * Used for gallery display and scenario history.
 */
export interface ScenarioMetadata {
  id: string;
  perimeter: FirePerimeter;
  inputs: ScenarioInputs;
  geoContext: GeoContext;
  requestedViews: ViewPoint[];
  result: GenerationResult;
  promptVersion?: string; // Template version used for prompts
}

/**
 * Summary of a scenario for gallery display.
 * Lightweight version with essential display information.
 */
export interface ScenarioSummary {
  id: string;
  timestamp: string; // ISO 8601 timestamp
  location: {
    centroid: [number, number]; // [lng, lat]
    placeName?: string; // Reverse-geocoded place name if available
  };
  conditions: {
    temperature: number;
    windSpeed: number;
    windDirection: string;
    humidity: number;
    intensity: string;
    fireDangerRating: string;
  };
  vegetation: string;
  imageCount: number;
  thumbnailUrl: string; // URL to representative thumbnail (e.g., aerial view)
  promptVersion?: string;
}
