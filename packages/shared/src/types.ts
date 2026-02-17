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
  | 'noRating' // Below moderate threshold (White)
  | 'moderate' // Plan and prepare (Green)
  | 'high' // Be ready to act (Yellow)
  | 'extreme' // Take action now to protect life and property (Orange)
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

  // Explicit fire behaviour parameters (override intensity-based defaults)
  flameHeightM?: number; // Flame height in metres (0.1-40)
  rateOfSpreadKmh?: number; // Rate of spread in km/h (0.1-60)
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
  /** Array of distinct vegetation types detected across the fire footprint (from NVIS sampling) */
  vegetationTypes?: string[];
  fuelLoad?: FuelLoadCategory;
  dominantSpecies?: string[];
  elevation: RangeStatistic;
  slope: RangeStatistic;
  aspect: CardinalAspect;
  nearbyFeatures?: string[];
  dataSource: string;
  confidence: 'low' | 'medium' | 'high';
  /** Locality description from reverse geocoding (e.g., "Bungendore, New South Wales") */
  locality?: string;
  /** Manually overridden vegetation type (takes precedence over auto-detected vegetationType) */
  manualVegetationType?: string;
  /** Flag indicating if vegetation type was manually set by user */
  isVegetationManuallySet?: boolean;
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
/**
 * Spatial vegetation context from NSW State Vegetation Type Map (SVTM).
 * Queried from ArcGIS identify endpoint at multiple points around the fire perimeter.
 */
export interface VegetationContext {
  /** Formation name at the fire perimeter centroid */
  centerFormation: string;
  /** Detailed class name at centroid (e.g. "Sydney Montane Dry Sclerophyll Forests") */
  centerClassName?: string;
  /** Formation names at compass points around the perimeter */
  surrounding: Partial<
    Record<
      'north' | 'south' | 'east' | 'west' | 'northeast' | 'southeast' | 'southwest' | 'northwest',
      string
    >
  >;
  /** Unique formation names found across all query points */
  uniqueFormations: string[];
  /** Data source identifier */
  dataSource: string;
}

/**
 * Active vegetation data source selector.
 * - 'nvis' — National Vegetation Information System (nationwide coverage)
 * - 'svtm' — NSW State Vegetation Type Map (high-res NSW only, currently disabled)
 */
export type VegetationSource = 'nvis' | 'svtm';

export interface GenerationRequest {
  perimeter: FirePerimeter;
  inputs: ScenarioInputs;
  geoContext: GeoContext;
  requestedViews: ViewPoint[];
  seed?: number; // Consistent seed for reproducibility across all viewpoints
  mapScreenshots?: Record<ViewPoint, string>; // Map view screenshots for terrain reference (base64 data URLs)
  aerialOverviewScreenshot?: string; // Top-down aerial view centered on fire perimeter (base64 data URL)
  vegetationMapScreenshot?: string; // Aerial vegetation overlay screenshot (base64 data URL)
  vegetationLegendItems?: Array<{ name: string; color: string }>; // Visible legend items with color swatches
}

/**
 * Result of a generation operation.
 */
export interface GenerationResult {
  id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  images: GeneratedImage[];
  anchorImage?: GeneratedImage; // Anchor view used as reference for other views
  seed?: number; // Consistent seed used across all viewpoints
  createdAt: string; // ISO 8601 timestamp
  completedAt?: string; // ISO 8601 timestamp
  error?: string;
  /** Model thinking/reasoning text from Gemini 3 Pro (interleaved output) */
  thinkingText?: string;
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
  isAnchor?: boolean; // True if this is the anchor/reference image
  usedReferenceImage?: boolean; // True if this image was generated using a reference
}

/**
 * User roles for RBAC.
 */
export type UserRole = 'trainer' | 'admin';

/**
 * User identity from CIAM authentication.
 */
export interface User {
  id: string; // User ID from Entra External ID
  email: string;
  name?: string;
  roles: UserRole[];
  authMethod: 'email' | 'sso'; // Authentication method used
}

/**
 * Authentication state and token information.
 */
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  expiresAt: number | null; // Unix timestamp
}

/**
 * Usage quota configuration per role.
 */
export interface QuotaConfig {
  scenariosPerDay: number;
  imagesPerDay: number;
  videosPerDay: number;
}

/**
 * Current usage tracking for a user.
 */
export interface UsageTracking {
  userId: string;
  date: string; // YYYY-MM-DD in AEST
  scenariosGenerated: number;
  imagesGenerated: number;
  videosGenerated: number;
  estimatedCost: number; // USD
  lastUpdated: string; // ISO 8601 timestamp
}

/**
 * Quota status for a user.
 */
export interface QuotaStatus {
  limits: QuotaConfig;
  usage: UsageTracking;
  remaining: {
    scenarios: number;
    images: number;
    videos: number;
  };
  resetsAt: string; // ISO 8601 timestamp (midnight AEST)
}

/**
 * Content safety check result.
 */
export interface ContentSafetyResult {
  safe: boolean;
  categories: {
    violence: { detected: boolean; severity: number }; // 0-1
    hate: { detected: boolean; severity: number };
    selfHarm: { detected: boolean; severity: number };
    sexual: { detected: boolean; severity: number };
  };
  prompt?: string; // The prompt that was checked
  imageHash?: string; // Hash of the image that was checked
}

/**
 * Content safety configuration.
 */
export interface ContentSafetyConfig {
  enabled: boolean;
  strictnessLevel: 'low' | 'medium' | 'high';
  violenceThreshold: number; // 0-1 (tuned for fire scenarios)
  hateThreshold: number; // 0-1
  selfHarmThreshold: number; // 0-1
  sexualThreshold: number; // 0-1
}

/**
 * Audit log action types.
 */
export type AuditAction =
  | 'scenario.created'
  | 'scenario.deleted'
  | 'image.generated'
  | 'video.generated'
  | 'content_safety.triggered'
  | 'quota.exceeded'
  | 'settings.updated'
  | 'user.login'
  | 'user.logout';

/**
 * Audit log entry.
 */
export interface AuditLogEntry {
  id: string;
  timestamp: string; // ISO 8601
  userId: string;
  userEmail: string;
  authMethod: string;
  action: AuditAction;
  resourceId?: string; // e.g., scenarioId
  details?: Record<string, unknown>;
  result: 'success' | 'failure';
  errorMessage?: string;
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

/**
 * Trainer feedback on a generated image.
 * Collected after viewing generated images to assess quality and usefulness.
 */
export interface ImageFeedback {
  scenarioId: string;
  imageUrl: string;
  viewpoint: ViewPoint;
  trainerId: string;
  timestamp: string; // ISO 8601
  ratings: {
    realism: number; // 1-5: Does it look like a real photo?
    accuracy: number; // 1-5: Does it match the location and conditions?
    usefulness: number; // 1-5: Would you use this in training?
  };
  comments?: string;
  metadata?: {
    intensity?: ScenarioInputs['intensity'];
    timeOfDay?: ScenarioInputs['timeOfDay'];
    [key: string]: any;
  };
}

/**
 * Aggregated feedback summary for reporting.
 */
export interface FeedbackSummary {
  totalFeedback: number;
  averageRatings: {
    realism: number;
    accuracy: number;
    usefulness: number;
    overall: number;
  };
  ratingDistribution: {
    realism: Record<number, number>; // Star rating -> count
    accuracy: Record<number, number>;
    usefulness: Record<number, number>;
  };
  byViewpoint?: Record<
    string,
    {
      count: number;
      averageRatings: {
        realism: number;
        accuracy: number;
        usefulness: number;
      };
    }
  >;
  byIntensity?: Record<
    string,
    {
      count: number;
      averageRatings: {
        realism: number;
        accuracy: number;
        usefulness: number;
      };
    }
  >;
}
