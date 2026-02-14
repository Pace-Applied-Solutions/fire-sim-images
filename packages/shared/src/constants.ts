/**
 * Constants and default values for the bushfire simulation inject tool.
 * Includes fire service terminology and standard configuration values.
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
 * Fire intensity classifications.
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
 * Common vegetation types (example list).
 */
export const VEGETATION_TYPES = [
  'Dry Sclerophyll Forest',
  'Wet Sclerophyll Forest',
  'Grassy Woodland',
  'Grassland',
  'Heath',
  'Rainforest',
  'Cumberland Plain Woodland',
  'Riverine Forest',
  'Grassland',
  'Swamp Sclerophyll Forest',
  'Coastal Sand Heath',
  'Alpine Complex',
  'Plantation Forest',
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

/**
 * Vegetation descriptors mapped to natural language for prompts.
 */
export const VEGETATION_DESCRIPTORS: Record<string, string> = {
  'Dry Sclerophyll Forest': 'dry eucalyptus forest with sparse understorey and leaf litter',
  'Wet Sclerophyll Forest': 'tall wet eucalyptus forest with dense fern understorey',
  Grassland: 'open grassland with cured dry grass',
  Heath: 'low dense coastal heath and scrubland',
  Rainforest: 'subtropical rainforest with dense canopy',
  'Grassy Woodland': 'open woodland with scattered eucalypts over native grasses',
  'Cumberland Plain Woodland': 'dry woodland on shale with sparse canopy and grassy groundlayer',
  'Riverine Forest': 'eucalypt forest along waterways with moist understorey',
  'Swamp Sclerophyll Forest': 'wet sclerophyll forest on poorly drained soils with paperbark and swamp mahogany',
  'Coastal Sand Heath': 'wind-shaped coastal heath on sandy ridges with banksia and tea-tree',
  'Alpine Complex': 'alpine heath and grass mosaic with stunted shrubs and herbfields',
  'Plantation Forest': 'structured plantation rows with dense fuel between tree lines',
};
