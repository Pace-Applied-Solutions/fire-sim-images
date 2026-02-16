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
  'Swamp Sclerophyll Forest':
    'wet sclerophyll forest on poorly drained soils with paperbark and swamp mahogany',
  'Coastal Sand Heath': 'wind-shaped coastal heath on sandy ridges with banksia and tea-tree',
  'Alpine Complex': 'alpine heath and grass mosaic with stunted shrubs and herbfields',
  'Plantation Forest': 'structured plantation rows with dense fuel between tree lines',
  'Cleared/Urban': 'cleared land or urban area with minimal vegetation and structures',
};

/**
 * NSW State Vegetation Type Map (SVTM) formation descriptors.
 * Maps the 17 SVTM vegetation formation categories to natural language descriptions
 * suitable for AI image generation prompts.
 *
 * Source: NSW DCCEEW via ArcGIS MapServer
 * https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Vegetation_IBCA/nswmap_2_3a_ext/MapServer
 */
export const SVTM_FORMATION_DESCRIPTORS: Record<string, string> = {
  'Alpine complex':
    'alpine heath and snow grass mosaic with stunted shrubs, herbfields, and exposed rocky outcrops above the treeline',
  'Arid shrublands (Acacia subformation)':
    'arid mulga and acacia shrubland with spinifex hummock grass and sparse canopy on red-brown soil',
  'Arid shrublands (Chenopod subformation)':
    'sparse saltbush and bluebush shrubland on flat clay plains with minimal ground fuel',
  Cleared:
    'cleared agricultural land, pasture, or urban area with minimal native vegetation and scattered structures',
  'Dry sclerophyll forests (Shrub/grass subformation)':
    'dry eucalyptus forest with grassy understorey and scattered low shrubs over leaf litter on well-drained ridges',
  'Dry sclerophyll forests (Shrubby subformation)':
    'dry eucalyptus forest with dense shrubby understorey of banksia, hakea, and pea-flowers over deep leaf litter and bark fuel',
  'Forested wetlands':
    'paperbark and swamp mahogany forest on waterlogged soils with sedge and reed understorey',
  'Freshwater wetlands':
    'open freshwater marsh with reeds, sedges, and rushes around shallow ephemeral water bodies',
  Grasslands:
    'open native grassland with tussock grasses and minimal tree canopy, often cured dry in summer',
  'Grassy woodlands':
    'open eucalypt woodland with scattered mature trees over a continuous native grass understorey',
  Heathlands:
    'low dense coastal or montane heath with banksia, tea-tree, and grevillea over sandy or rocky substrate',
  Rainforests:
    'dense subtropical or temperate rainforest with closed canopy, buttress roots, vines, and epiphytes',
  'Saline  wetlands':
    'coastal saltmarsh and mangrove communities on tidal flats with salt-tolerant grasses and succulents',
  'Semi-arid woodlands (Grassy subformation)':
    'open semi-arid eucalypt or cypress woodland with native grass understorey on flat to undulating terrain',
  'Semi-arid woodlands (Shrubby subformation)':
    'semi-arid woodland with mixed shrub understorey of cassia, hopbush, and native pine',
  'Wet sclerophyll forests (Grassy subformation)':
    'tall wet eucalyptus forest with grassy understorey and scattered ferns in sheltered gullies and south-facing slopes',
  'Wet sclerophyll forests (Shrubby subformation)':
    'tall wet eucalyptus forest with dense shrubby understorey of tree ferns, sassafras, and soft-leaved shrubs in high-rainfall areas',
};

/**
 * NSW SVTM WMS endpoint for vegetation formation overlay tiles.
 * CC-BY 4.0 licensed, publicly accessible, CORS enabled.
 */
export const SVTM_WMS_URL =
  'https://mapprod3.environment.nsw.gov.au/arcgis/services/Vegetation_IBCA/nswmap_2_3a_ext/MapServer/WmsServer';

/**
 * NSW SVTM ArcGIS REST endpoint for identify/query operations.
 */
export const SVTM_REST_URL =
  'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Vegetation_IBCA/nswmap_2_3a_ext/MapServer';
