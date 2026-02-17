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
        coordinates: number[][][];
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
export type FireDangerRating = 'noRating' | 'moderate' | 'high' | 'extreme' | 'catastrophic';
/**
 * Scenario inputs provided by the trainer.
 */
export interface ScenarioInputs {
    fireDangerRating: FireDangerRating;
    windSpeed: number;
    windDirection: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
    temperature: number;
    humidity: number;
    timeOfDay: 'dawn' | 'morning' | 'midday' | 'afternoon' | 'dusk' | 'night';
    intensity: 'low' | 'moderate' | 'high' | 'extreme' | 'catastrophic' | 'veryHigh';
    fireStage: 'spotFire' | 'developing' | 'established' | 'major';
    flameHeightM?: number;
    rateOfSpreadKmh?: number;
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
export type ViewPoint = 'aerial' | 'helicopter_north' | 'helicopter_south' | 'helicopter_east' | 'helicopter_west' | 'helicopter_above' | 'ground_north' | 'ground_south' | 'ground_east' | 'ground_west' | 'ground_above' | 'ridge';
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
    surrounding: Partial<Record<'north' | 'south' | 'east' | 'west' | 'northeast' | 'southeast' | 'southwest' | 'northwest', string>>;
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
    seed?: number;
    mapScreenshots?: Record<ViewPoint, string>;
    vegetationMapScreenshot?: string;
    vegetationLegendItems?: Array<{
        name: string;
        color: string;
    }>;
}
/**
 * Result of a generation operation.
 */
export interface GenerationResult {
    id: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    images: GeneratedImage[];
    anchorImage?: GeneratedImage;
    seed?: number;
    createdAt: string;
    completedAt?: string;
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
    generatedAt: string;
    isAnchor?: boolean;
    usedReferenceImage?: boolean;
}
/**
 * User roles for RBAC.
 */
export type UserRole = 'trainer' | 'admin';
/**
 * User identity from CIAM authentication.
 */
export interface User {
    id: string;
    email: string;
    name?: string;
    roles: UserRole[];
    authMethod: 'email' | 'sso';
}
/**
 * Authentication state and token information.
 */
export interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    token: string | null;
    expiresAt: number | null;
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
    date: string;
    scenariosGenerated: number;
    imagesGenerated: number;
    videosGenerated: number;
    estimatedCost: number;
    lastUpdated: string;
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
    resetsAt: string;
}
/**
 * Content safety check result.
 */
export interface ContentSafetyResult {
    safe: boolean;
    categories: {
        violence: {
            detected: boolean;
            severity: number;
        };
        hate: {
            detected: boolean;
            severity: number;
        };
        selfHarm: {
            detected: boolean;
            severity: number;
        };
        sexual: {
            detected: boolean;
            severity: number;
        };
    };
    prompt?: string;
    imageHash?: string;
}
/**
 * Content safety configuration.
 */
export interface ContentSafetyConfig {
    enabled: boolean;
    strictnessLevel: 'low' | 'medium' | 'high';
    violenceThreshold: number;
    hateThreshold: number;
    selfHarmThreshold: number;
    sexualThreshold: number;
}
/**
 * Audit log action types.
 */
export type AuditAction = 'scenario.created' | 'scenario.deleted' | 'image.generated' | 'video.generated' | 'content_safety.triggered' | 'quota.exceeded' | 'settings.updated' | 'user.login' | 'user.logout';
/**
 * Audit log entry.
 */
export interface AuditLogEntry {
    id: string;
    timestamp: string;
    userId: string;
    userEmail: string;
    authMethod: string;
    action: AuditAction;
    resourceId?: string;
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
    promptVersion?: string;
}
/**
 * Summary of a scenario for gallery display.
 * Lightweight version with essential display information.
 */
export interface ScenarioSummary {
    id: string;
    timestamp: string;
    location: {
        centroid: [number, number];
        placeName?: string;
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
    thumbnailUrl: string;
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
    timestamp: string;
    ratings: {
        realism: number;
        accuracy: number;
        usefulness: number;
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
        realism: Record<number, number>;
        accuracy: Record<number, number>;
        usefulness: Record<number, number>;
    };
    byViewpoint?: Record<string, {
        count: number;
        averageRatings: {
            realism: number;
            accuracy: number;
            usefulness: number;
        };
    }>;
    byIntensity?: Record<string, {
        count: number;
        averageRatings: {
            realism: number;
            accuracy: number;
            usefulness: number;
        };
    }>;
}
//# sourceMappingURL=types.d.ts.map