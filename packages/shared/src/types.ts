/**
 * Core domain types for the NSW RFS bushfire simulation inject tool.
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
 * Scenario inputs provided by the trainer.
 */
export interface ScenarioInputs {
  windSpeed: number; // km/h
  windDirection: number; // degrees (0 = North, 90 = East, etc.)
  temperature: number; // degrees Celsius
  humidity: number; // percentage (0-100)
  timeOfDay: 'dawn' | 'morning' | 'midday' | 'afternoon' | 'dusk' | 'night';
  intensity: 'low' | 'moderate' | 'high' | 'extreme';
}

/**
 * Geographic context derived from geospatial datasets.
 */
export interface GeoContext {
  vegetationType: string; // e.g., "Dry Sclerophyll Forest", "Grassland"
  slope: number; // degrees
  elevation: number; // meters above sea level
  aspect: number; // degrees (0 = North, 90 = East, etc.)
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
