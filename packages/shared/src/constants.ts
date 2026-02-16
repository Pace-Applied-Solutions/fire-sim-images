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
 * @deprecated Disabled in favour of NVIS national coverage. Preserved for future re-enablement.
 */
export const SVTM_WMS_URL =
  'https://mapprod3.environment.nsw.gov.au/arcgis/services/Vegetation_IBCA/nswmap_2_3a_ext/MapServer/WmsServer';

/**
 * NSW SVTM ArcGIS REST endpoint for identify/query operations.
 * @deprecated Disabled in favour of NVIS national coverage. Preserved for future re-enablement.
 */
export const SVTM_REST_URL =
  'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Vegetation_IBCA/nswmap_2_3a_ext/MapServer';

/**
 * Active vegetation data source.
 * Set to 'nvis' for national coverage or 'svtm' to re-enable NSW-only high-res layer.
 */
export const VEGETATION_SOURCE: 'nvis' | 'svtm' = 'nvis';

/**
 * NVIS (National Vegetation Information System) WMS endpoints.
 * Publisher: Australian Government DCCEEW — CC-BY 4.0 International.
 * Coverage: All Australian states and territories.
 */
export const NVIS_WMS_MVS_URL =
  'https://gis.environment.gov.au/gispubmap/services/ogc_services/NVIS_ext_mvs/MapServer/WMSServer';

export const NVIS_WMS_MVG_URL =
  'https://gis.environment.gov.au/gispubmap/services/ogc_services/NVIS_ext_mvg/MapServer/WMSServer';

/**
 * NVIS Major Vegetation Subgroup (MVS) descriptors.
 * Maps the ~85 NVIS MVS subgroup names to natural language descriptions
 * suitable for AI image generation prompts, including fire behaviour characteristics.
 *
 * Source: DCCEEW NVIS 6.0
 */
export const NVIS_MVS_DESCRIPTORS: Record<string, string> = {
  // Eucalypt forests
  'Eucalyptus tall open forests with a dense broad-leaved understorey (wet sclerophyll)':
    'tall wet eucalyptus forest with dense fern and broad-leaved shrub understorey in high-rainfall gullies; high bark and canopy fuel loads',
  'Eucalyptus tall open forests with a dense shrubby understorey (wet sclerophyll)':
    'tall wet eucalyptus forest with dense shrubby understorey of tea-tree and sassafras; extremely high fuel loads and crown fire potential',
  'Eucalyptus open forests with a shrubby understorey':
    'dry eucalyptus open forest with banksia, hakea, and pea-flower shrub understorey over deep leaf litter; moderate–high fire intensity',
  'Eucalyptus open forests with a grassy understorey':
    'dry eucalyptus open forest with native grass understorey over well-drained ridges; surface fire dominant with moderate intensity',
  'Eucalyptus low open forests with a shrubby understorey':
    'low eucalyptus open forest with dense shrub understorey on sandstone or poor soils; moderate–high surface fuel loads',
  'Eucalyptus woodlands with a shrubby understorey':
    'open eucalypt woodland with scattered shrubs over dry leaf litter; moderate fire intensity with intermittent crown involvement',
  'Eucalyptus woodlands with a grassy understorey':
    'open eucalypt woodland with continuous native grass understorey; fast-running grass fires with moderate intensity',
  'Eucalyptus woodlands with a tussock grass understorey':
    'eucalypt woodland over tussock grass; surface fire dominant with rapid spread in cured conditions',
  'Eucalyptus woodlands with a hummock grass understorey':
    'eucalypt woodland over spinifex hummock grass in arid/semi-arid areas; ring-fire behaviour in spinifex',
  'Eucalyptus open woodlands with a shrubby understorey':
    'sparse eucalypt open woodland with scattered shrubs on infertile soils; low–moderate fire intensity',
  'Eucalyptus open woodlands with a grassy understorey':
    'sparse eucalypt open woodland over native grasses; fast grass fire spread with low–moderate intensity',
  'Eucalyptus open woodlands with a hummock grass understorey':
    'sparse eucalypt over spinifex in arid zones; spotty fire behaviour dependent on hummock connectivity',
  // Tropical eucalypts
  'Tropical Eucalyptus forests and woodlands with a tall annual grassy understorey':
    'tropical eucalypt woodland with tall annual sorghum grass; extreme fire spread rate when cured in dry season',
  // Callitris
  'Callitris forests and woodlands':
    'cypress pine forest with sparse grassy understorey; dense canopy fuel, high crown fire risk once ignited',
  // Casuarina
  'Casuarina and Allocasuarina forests and woodlands':
    'she-oak woodland with needle-like litter over grassy or sparse ground cover; moderate surface fuel',
  // Rainforests
  'Cool temperate rainforests':
    'cool temperate rainforest with myrtle beech and tree ferns; dense moist canopy, rarely burns except in extreme drought',
  'Warm temperate rainforests':
    'warm temperate rainforest with coachwood and sassafras; moist closed canopy, low fire risk under normal conditions',
  'Tropical/subtropical rainforests - coastal/lowland':
    'lowland tropical rainforest with buttressed trees and vines; very low fire risk, dense humid canopy',
  'Tropical/subtropical rainforests - upland':
    'upland tropical cloud forest with epiphytes and mosses; extremely low fire risk',
  'Dry rainforests/vine thickets - monsoon':
    'deciduous vine thicket in monsoon tropics; seasonally flammable after leaf-drop',
  // Acacia
  'Brigalow (Acacia harpophylla) forests and woodlands':
    'brigalow acacia scrub with dark-barked trees and grassy patches; high fine fuel accumulation',
  'Mulga (Acacia aneura) woodlands and shrublands':
    'mulga woodland with spinifex and annual grasses in arid zones; low fire frequency but intense when fuels align',
  'Other Acacia forests and woodlands':
    'acacia woodland or shrubland with mixed native understorey; moderate fine fuel loads',
  'Acacia shrublands and low open forests':
    'arid acacia scrub with sparse ground cover on red soils; low–moderate fire intensity',
  // Melaleuca
  'Melaleuca forests and woodlands':
    'paperbark forest on waterlogged soils with sedge and reed understorey; paperbark is highly flammable when dry',
  // Heathlands
  Heathlands:
    'low dense heath with banksia, tea-tree, and grevillea over sandy or rocky substrate; very high surface fuel loads and fire intensity',
  // Grasslands
  'Tussock grasslands':
    'open native tussock grassland with no tree canopy; rapid fire spread when cured, moderate intensity',
  'Hummock grasslands':
    'spinifex hummock grassland in arid/semi-arid regions; ring-fire behaviour with spotting potential',
  'Mitchell grass (Astrebla) tussock grasslands':
    'open Mitchell grass plains in semi-arid Australia; moderate spread rate when cured',
  'Tropical and subtropical grasslands':
    'tropical grassland with tall annual grasses in northern Australia; extreme spread rates in dry season',
  // Alpine
  'Alpine heathlands and herbfields':
    'alpine and subalpine herbfield and shrub mosaic above treeline; low fuel loads, burns in extreme fire weather',
  // Chenopod
  'Chenopod shrublands, samphire shrublands and forblands':
    'saltbush and bluebush shrubland on flat clay plains; minimal fine fuel, very low fire risk',
  // Mangroves / wetlands
  'Mangrove forests and woodlands':
    'tidal mangrove forest with pneumatophores and mud substrate; not fire-prone',
  'Saline and freshwater wetlands':
    'coastal saltmarsh, freshwater sedge swamp, or reed bed; low fire risk unless dried out',
  // Mallee
  'Eucalyptus mallee woodlands and shrublands':
    'multi-stemmed mallee eucalypt with dense shrub understorey over sandy soil; very high fuel loads and crown fire potential',
  'Eucalyptus mallee open woodlands and sparse mallee shrublands':
    'open mallee with spinifex or chenopod understorey; moderate fire risk dependent on understorey connectivity',
  // Cleared / urban
  Cleared:
    'cleared agricultural land, pasture, or urban area with minimal native vegetation and scattered structures',
  'Naturally bare': 'naturally bare rock, sand, or water body with no vegetation fuel',
  Unclassified: 'vegetation type not classified or insufficient survey data',
};

/**
 * Simplified fallback descriptor lookup.
 * When a full MVS name is not matched, try partial keyword matching.
 */
export function getNvisDescriptor(mvsName: string): string {
  // Direct match first
  if (NVIS_MVS_DESCRIPTORS[mvsName]) return NVIS_MVS_DESCRIPTORS[mvsName];

  // Partial keyword match
  const lower = mvsName.toLowerCase();
  for (const [key, descriptor] of Object.entries(NVIS_MVS_DESCRIPTORS)) {
    if (lower.includes(key.toLowerCase().split(' ')[0])) return descriptor;
  }

  return `${mvsName} (vegetation type with uncharacterised fire behaviour)`;
}

/**
 * Get the effective vegetation type from GeoContext.
 * Returns manual override if set, otherwise returns auto-detected type.
 */
export function getEffectiveVegetationType(
  geoContext: { vegetationType: string; manualVegetationType?: string } | null | undefined
): string {
  if (!geoContext) return 'Dry Sclerophyll Forest'; // Default fallback
  return geoContext.manualVegetationType || geoContext.vegetationType;
}
