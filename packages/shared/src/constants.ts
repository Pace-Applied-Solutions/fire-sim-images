/**
 * Constants and default values for the NSW RFS bushfire simulation inject tool.
 * Includes RFS terminology and standard configuration values.
 */

/**
 * Default scenario input values.
 */
export const DEFAULT_SCENARIO_INPUTS = {
  windSpeed: 15,
  windDirection: 0,
  temperature: 30,
  humidity: 30,
  timeOfDay: 'midday' as const,
  intensity: 'moderate' as const,
};

/**
 * RFS fire intensity classifications.
 */
export const FIRE_INTENSITY = {
  LOW: 'low',
  MODERATE: 'moderate',
  HIGH: 'high',
  EXTREME: 'extreme',
} as const;

/**
 * Time of day options for scenario generation.
 */
export const TIME_OF_DAY = {
  DAWN: 'dawn',
  MORNING: 'morning',
  MIDDAY: 'midday',
  AFTERNOON: 'afternoon',
  DUSK: 'dusk',
  NIGHT: 'night',
} as const;

/**
 * Available viewpoints for image generation.
 */
export const VIEWPOINTS = {
  AERIAL: 'aerial',
  GROUND_NORTH: 'ground_north',
  GROUND_SOUTH: 'ground_south',
  GROUND_EAST: 'ground_east',
  GROUND_WEST: 'ground_west',
  RIDGE: 'ridge',
} as const;

/**
 * Common NSW vegetation types from SVTM (Statewide Vegetation Type Map).
 */
export const NSW_VEGETATION_TYPES = [
  'Dry Sclerophyll Forest',
  'Wet Sclerophyll Forest',
  'Grassy Woodland',
  'Rainforest',
  'Grassland',
  'Heathland',
  'Wetland',
  'Alpine Complex',
  'Cleared/Urban',
] as const;

/**
 * Generation configuration defaults.
 */
export const GENERATION_CONFIG = {
  maxViewsPerRequest: 5,
  defaultImageWidth: 1024,
  defaultImageHeight: 1024,
  timeoutSeconds: 300,
} as const;
