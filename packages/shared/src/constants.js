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
    timeOfDay: 'midday',
    intensity: 'moderate',
};
/**
 * Fire intensity classifications.
 */
export const FIRE_INTENSITY = {
    LOW: 'low',
    MODERATE: 'moderate',
    HIGH: 'high',
    EXTREME: 'extreme',
};
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
};
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
};
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
];
/**
 * Default vegetation type used as fallback when no context is available.
 */
export const DEFAULT_VEGETATION_TYPE = 'Dry Sclerophyll Forest';
/**
 * Gets the effective vegetation type, respecting manual overrides.
 * Returns manual type if set, otherwise auto-detected type, otherwise default.
 */
export function getEffectiveVegetationType(geoContext) {
    if (!geoContext)
        return DEFAULT_VEGETATION_TYPE;
    return geoContext.manualVegetationType || geoContext.vegetationType || DEFAULT_VEGETATION_TYPE;
}
/**
 * Generation configuration defaults.
 */
export const GENERATION_CONFIG = {
    maxViewsPerRequest: 5,
    defaultImageWidth: 1024,
    defaultImageHeight: 1024,
    timeoutSeconds: 300,
};
/**
 * Vegetation descriptors mapped to natural language for prompts.
 * @deprecated Use VEGETATION_DETAILS for richer context instead.
 */
export const VEGETATION_DESCRIPTORS = {
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
    'Cleared/Urban': 'cleared land or urban area with minimal vegetation and structures',
};
export const VEGETATION_DETAILS = {
    'Dry Sclerophyll Forest': {
        simpleName: 'Dry Sclerophyll Forest',
        canopyHeight: '15–30 metres',
        canopyType: 'eucalypts (stringybarks, hard-barked species) with open crown spacing',
        understorey: 'sparse shrubs and small trees (wattles, acacias, proteaceous shrubs)',
        groundFuel: 'heavy accumulation of leaf litter, bark, and fallen branches; sparse grass tufts',
        fuelLoad: 'high (10–20 tonnes/hectare); continuous fuel layer from ground to canopy',
        flammability: 'highly flammable; cured leaf litter ignites readily; crown fire potential high under drought conditions',
    },
    'Wet Sclerophyll Forest': {
        simpleName: 'Wet Sclerophyll Forest',
        canopyHeight: '30–60 metres',
        canopyType: 'tall eucalypts (mountain ash, alpine ash) with dense crowns',
        understorey: 'dense ferns (tree ferns and bracken), shrubs, and small trees',
        groundFuel: 'heavy moist leaf litter, ferns, logs, and moss; suppressed by moisture',
        fuelLoad: 'very high (15–25 tonnes/hectare) but often moist, reducing fire intensity',
        flammability: 'moderate to high risk during drought; crown fire likely under extreme conditions',
    },
    Grassland: {
        simpleName: 'Grassland',
        canopyHeight: 'herbaceous layer only (0.3–1 metre)',
        canopyType: 'native or introduced grasses (cured to straw-like consistency)',
        understorey: 'sparse forbs and low shrubs',
        groundFuel: 'continuous cured grass; minimal litter',
        fuelLoad: 'moderate (3–8 tonnes/hectare); low standing dead material',
        flammability: 'extremely flammable when cured; rapid fire spread; minimal vertical fuel continuity limits crown fire',
    },
    Heath: {
        simpleName: 'Heath',
        canopyHeight: '1–3 metres (low shrubland)',
        canopyType: 'dense ericaceous shrubs (heaths, banksias) with interlocking crowns',
        understorey: 'very dense understorey of low shrubs and ground-hugging species',
        groundFuel: 'accumulation of small twigs, seed capsules, and sparse litter; often moist near coast',
        fuelLoad: 'high (8–12 tonnes/hectare); continuous fine fuel',
        flammability: 'highly flammable; dense canopy carries fire; prolific seed set creates post-fire regeneration spike',
    },
    Rainforest: {
        simpleName: 'Rainforest',
        canopyHeight: '20–40 metres (emergents up to 50 metres)',
        canopyType: 'dense broadleaf canopy with multiple stories',
        understorey: 'dense undergrowth of small trees, climbing vines, and shrubs',
        groundFuel: 'moist litter, fallen logs, and decomposing debris',
        fuelLoad: 'very high (20–30 tonnes/hectare) but very moist',
        flammability: 'low fire risk under normal conditions due to high moisture; extreme weather events rare but catastrophic',
    },
    'Grassy Woodland': {
        simpleName: 'Grassy Woodland',
        canopyHeight: '10–20 metres (overstorey); grass layer 0.3–1 metre',
        canopyType: 'scattered eucalypts with open crowns; 20–40% canopy cover',
        understorey: 'native grasses (tussock-forming) and low shrubs',
        groundFuel: 'moderate accumulation of grass, litter, and fine fallen branches',
        fuelLoad: 'moderate to high (5–12 tonnes/hectare); discontinuous fuel layers',
        flammability: 'high; rapid spread through grass layer; tree-to-tree fire possible under hot conditions',
    },
    'Cumberland Plain Woodland': {
        simpleName: 'Cumberland Plain Woodland',
        canopyHeight: '10–18 metres',
        canopyType: 'eucalypts and acacias with sparse, irregular crowns on shale-derived soils',
        understorey: 'scattered low shrubs (acacias, native cypress) and grasses',
        groundFuel: 'sparse grass layer; limited litter due to shallow soils',
        fuelLoad: 'moderate (4–8 tonnes/hectare); fragmented fuel mosaic',
        flammability: 'moderate; ground fire spreads through grass; crown fire less likely due to fuel gaps',
    },
    'Riverine Forest': {
        simpleName: 'Riverine Forest',
        canopyHeight: '15–30 metres',
        canopyType: 'eucalypts (river reds, swamp mahogany) with dense crowns along watercourses',
        understorey: 'dense shrubs and small trees; moisture-dependent density',
        groundFuel: 'moist litter and decomposing timber; flood-scoured clean areas',
        fuelLoad: 'moderate to high (6–15 tonnes/hectare); mosaic of wet and dry patches',
        flammability: 'moderate; moisture suppresses fire intensity; prone to spotting across water',
    },
    'Swamp Sclerophyll Forest': {
        simpleName: 'Swamp Sclerophyll Forest',
        canopyHeight: '20–40 metres',
        canopyType: 'eucalypts (paperbark, swamp mahogany) with moderately dense crowns on wet soils',
        understorey: 'dense shrubs and small trees adapted to waterlogging',
        groundFuel: 'dense moss, saturated peat, and moist litter; often waterlogged',
        fuelLoad: 'high (10–18 tonnes/hectare) but moisture-dependent; peat risks',
        flammability: 'moderate under normal conditions; extreme risk during drought when peat dries out; peat fire hazard',
    },
    'Coastal Sand Heath': {
        simpleName: 'Coastal Sand Heath',
        canopyHeight: '2–6 metres (wind-limited)',
        canopyType: 'dense, wind-pruned shrubs (banksia, tea-tree, she-oak); contorted growth forms',
        understorey: 'very dense low shrubs and prostrate groundcover',
        groundFuel: 'fine twigs, leaf litter, and sand inter-mix; often salt-laden and aerially pruned',
        fuelLoad: 'high (8–15 tonnes/hectare) but brittle and loose',
        flammability: 'extremely flammable; rapid surface fire; minimal vertical fuel but high flame length',
    },
    'Alpine Complex': {
        simpleName: 'Alpine Complex',
        canopyHeight: 'herb layer 0.5–2 metres; shrubs 1–3 metres',
        canopyType: 'mosaic of alpine grassland, low shrubs, and herbfields; stunted trees above treeline',
        understorey: 'dense grasses and forbs; low ericaceous and cushion plants',
        groundFuel: 'dense tussock grass litter; peat accumulation in depression areas',
        fuelLoad: 'moderate (5–10 tonnes/hectare) but highly variable by microhabitat',
        flammability: 'moderate; winds accelerate spread; rare fires but extreme when they occur (peat burning)',
    },
    'Plantation Forest': {
        simpleName: 'Plantation Forest',
        canopyHeight: '20–35 metres (even-aged structure)',
        canopyType: 'uniform conifer or eucalypt plantations (e.g., radiata pine, slash pine) with dense crowns',
        understorey: 'minimal natural understorey; shade-suppressed or sprayed; uniform stocking densities',
        groundFuel: 'uniform, deep layer of needles or small branches; often bone-dry in plantations',
        fuelLoad: 'very high and uniform (15–25 tonnes/hectare); continuous vertical fuel ladder',
        flammability: 'extremely dangerous; rapid fire spread in all directions; intense crown fire; high spotting potential',
    },
    'Cleared/Urban': {
        simpleName: 'Cleared/Urban Area',
        canopyHeight: 'sparse (0–5 metres in urban areas)',
        canopyType: 'scattered planted trees or regenerating regrowth; buildings and structures present',
        understorey: 'sparse or absent; maintained gardens, grass, or concrete',
        groundFuel: 'minimal natural fuel; human structures, vehicles, debris',
        fuelLoad: 'low natural (2–5 tonnes/hectare); hazard depends on structure density and maintenance',
        flammability: 'low for natural vegetation; high risk from structure ignition and accumulated yard debris',
    },
};
/**
 * NSW State Vegetation Type Map (SVTM) formation descriptors.
 * Maps the 17 SVTM vegetation formation categories to natural language descriptions
 * suitable for AI image generation prompts.
 *
 * Source: NSW DCCEEW via ArcGIS MapServer
 * https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Vegetation_IBCA/nswmap_2_3a_ext/MapServer
 */
export const SVTM_FORMATION_DESCRIPTORS = {
    'Alpine complex': 'alpine heath and snow grass mosaic with stunted shrubs, herbfields, and exposed rocky outcrops above the treeline',
    'Arid shrublands (Acacia subformation)': 'arid mulga and acacia shrubland with spinifex hummock grass and sparse canopy on red-brown soil',
    'Arid shrublands (Chenopod subformation)': 'sparse saltbush and bluebush shrubland on flat clay plains with minimal ground fuel',
    Cleared: 'cleared agricultural land, pasture, or urban area with minimal native vegetation and scattered structures',
    'Dry sclerophyll forests (Shrub/grass subformation)': 'dry eucalyptus forest with grassy understorey and scattered low shrubs over leaf litter on well-drained ridges',
    'Dry sclerophyll forests (Shrubby subformation)': 'dry eucalyptus forest with dense shrubby understorey of banksia, hakea, and pea-flowers over deep leaf litter and bark fuel',
    'Forested wetlands': 'paperbark and swamp mahogany forest on waterlogged soils with sedge and reed understorey',
    'Freshwater wetlands': 'open freshwater marsh with reeds, sedges, and rushes around shallow ephemeral water bodies',
    Grasslands: 'open native grassland with tussock grasses and minimal tree canopy, often cured dry in summer',
    'Grassy woodlands': 'open eucalypt woodland with scattered mature trees over a continuous native grass understorey',
    Heathlands: 'low dense coastal or montane heath with banksia, tea-tree, and grevillea over sandy or rocky substrate',
    Rainforests: 'dense subtropical or temperate rainforest with closed canopy, buttress roots, vines, and epiphytes',
    'Saline  wetlands': 'coastal saltmarsh and mangrove communities on tidal flats with salt-tolerant grasses and succulents',
    'Semi-arid woodlands (Grassy subformation)': 'open semi-arid eucalypt or cypress woodland with native grass understorey on flat to undulating terrain',
    'Semi-arid woodlands (Shrubby subformation)': 'semi-arid woodland with mixed shrub understorey of cassia, hopbush, and native pine',
    'Wet sclerophyll forests (Grassy subformation)': 'tall wet eucalyptus forest with grassy understorey and scattered ferns in sheltered gullies and south-facing slopes',
    'Wet sclerophyll forests (Shrubby subformation)': 'tall wet eucalyptus forest with dense shrubby understorey of tree ferns, sassafras, and soft-leaved shrubs in high-rainfall areas',
};
/**
 * NSW SVTM WMS endpoint for vegetation formation overlay tiles.
 * CC-BY 4.0 licensed, publicly accessible, CORS enabled.
 * @deprecated Disabled in favour of NVIS national coverage. Preserved for future re-enablement.
 */
export const SVTM_WMS_URL = 'https://mapprod3.environment.nsw.gov.au/arcgis/services/Vegetation_IBCA/nswmap_2_3a_ext/MapServer/WmsServer';
/**
 * NSW SVTM ArcGIS REST endpoint for identify/query operations.
 * @deprecated Disabled in favour of NVIS national coverage. Preserved for future re-enablement.
 */
export const SVTM_REST_URL = 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Vegetation_IBCA/nswmap_2_3a_ext/MapServer';
/**
 * Active vegetation data source.
 * Set to 'nvis' for national coverage or 'svtm' to re-enable NSW-only high-res layer.
 */
export const VEGETATION_SOURCE = 'nvis';
/**
 * NVIS (National Vegetation Information System) WMS endpoints.
 * Publisher: Australian Government DCCEEW — CC-BY 4.0 International.
 * Coverage: All Australian states and territories.
 */
export const NVIS_WMS_MVS_URL = 'https://gis.environment.gov.au/gispubmap/services/ogc_services/NVIS_ext_mvs/MapServer/WMSServer';
export const NVIS_WMS_MVG_URL = 'https://gis.environment.gov.au/gispubmap/services/ogc_services/NVIS_ext_mvg/MapServer/WMSServer';
/**
 * NVIS Major Vegetation Subgroup (MVS) descriptors.
 * Maps the ~85 NVIS MVS subgroup names to natural language descriptions
 * suitable for AI image generation prompts, including fire behaviour characteristics.
 *
 * Source: DCCEEW NVIS 6.0
 */
export const NVIS_MVS_DESCRIPTORS = {
    // Eucalypt forests
    'Eucalyptus tall open forests with a dense broad-leaved understorey (wet sclerophyll)': 'tall wet eucalyptus forest with dense fern and broad-leaved shrub understorey in high-rainfall gullies; high bark and canopy fuel loads',
    'Eucalyptus tall open forests with a dense shrubby understorey (wet sclerophyll)': 'tall wet eucalyptus forest with dense shrubby understorey of tea-tree and sassafras; extremely high fuel loads and crown fire potential',
    'Eucalyptus open forests with a shrubby understorey': 'dry eucalyptus open forest with banksia, hakea, and pea-flower shrub understorey over deep leaf litter; moderate–high fire intensity',
    'Eucalyptus open forests with a grassy understorey': 'dry eucalyptus open forest with native grass understorey over well-drained ridges; surface fire dominant with moderate intensity',
    'Eucalyptus low open forests with a shrubby understorey': 'low eucalyptus open forest with dense shrub understorey on sandstone or poor soils; moderate–high surface fuel loads',
    'Eucalyptus woodlands with a shrubby understorey': 'open eucalypt woodland with scattered shrubs over dry leaf litter; moderate fire intensity with intermittent crown involvement',
    'Eucalyptus woodlands with a grassy understorey': 'open eucalypt woodland with continuous native grass understorey; fast-running grass fires with moderate intensity',
    'Eucalyptus woodlands with a tussock grass understorey': 'eucalypt woodland over tussock grass; surface fire dominant with rapid spread in cured conditions',
    'Eucalyptus woodlands with a hummock grass understorey': 'eucalypt woodland over spinifex hummock grass in arid/semi-arid areas; ring-fire behaviour in spinifex',
    'Eucalyptus open woodlands with a shrubby understorey': 'sparse eucalypt open woodland with scattered shrubs on infertile soils; low–moderate fire intensity',
    'Eucalyptus open woodlands with a grassy understorey': 'sparse eucalypt open woodland over native grasses; fast grass fire spread with low–moderate intensity',
    'Eucalyptus open woodlands with a hummock grass understorey': 'sparse eucalypt over spinifex in arid zones; spotty fire behaviour dependent on hummock connectivity',
    // Tropical eucalypts
    'Tropical Eucalyptus forests and woodlands with a tall annual grassy understorey': 'tropical eucalypt woodland with tall annual sorghum grass; extreme fire spread rate when cured in dry season',
    // Callitris
    'Callitris forests and woodlands': 'cypress pine forest with sparse grassy understorey; dense canopy fuel, high crown fire risk once ignited',
    // Casuarina
    'Casuarina and Allocasuarina forests and woodlands': 'she-oak woodland with needle-like litter over grassy or sparse ground cover; moderate surface fuel',
    // Rainforests
    'Cool temperate rainforests': 'cool temperate rainforest with myrtle beech and tree ferns; dense moist canopy, rarely burns except in extreme drought',
    'Warm temperate rainforests': 'warm temperate rainforest with coachwood and sassafras; moist closed canopy, low fire risk under normal conditions',
    'Tropical/subtropical rainforests - coastal/lowland': 'lowland tropical rainforest with buttressed trees and vines; very low fire risk, dense humid canopy',
    'Tropical/subtropical rainforests - upland': 'upland tropical cloud forest with epiphytes and mosses; extremely low fire risk',
    'Dry rainforests/vine thickets - monsoon': 'deciduous vine thicket in monsoon tropics; seasonally flammable after leaf-drop',
    // Acacia
    'Brigalow (Acacia harpophylla) forests and woodlands': 'brigalow acacia scrub with dark-barked trees and grassy patches; high fine fuel accumulation',
    'Mulga (Acacia aneura) woodlands and shrublands': 'mulga woodland with spinifex and annual grasses in arid zones; low fire frequency but intense when fuels align',
    'Other Acacia forests and woodlands': 'acacia woodland or shrubland with mixed native understorey; moderate fine fuel loads',
    'Acacia shrublands and low open forests': 'arid acacia scrub with sparse ground cover on red soils; low–moderate fire intensity',
    // Melaleuca
    'Melaleuca forests and woodlands': 'paperbark forest on waterlogged soils with sedge and reed understorey; paperbark is highly flammable when dry',
    // Heathlands
    'Heathlands': 'low dense heath with banksia, tea-tree, and grevillea over sandy or rocky substrate; very high surface fuel loads and fire intensity',
    // Grasslands
    'Tussock grasslands': 'open native tussock grassland with no tree canopy; rapid fire spread when cured, moderate intensity',
    'Hummock grasslands': 'spinifex hummock grassland in arid/semi-arid regions; ring-fire behaviour with spotting potential',
    'Mitchell grass (Astrebla) tussock grasslands': 'open Mitchell grass plains in semi-arid Australia; moderate spread rate when cured',
    'Tropical and subtropical grasslands': 'tropical grassland with tall annual grasses in northern Australia; extreme spread rates in dry season',
    // Alpine
    'Alpine heathlands and herbfields': 'alpine and subalpine herbfield and shrub mosaic above treeline; low fuel loads, burns in extreme fire weather',
    // Chenopod
    'Chenopod shrublands, samphire shrublands and forblands': 'saltbush and bluebush shrubland on flat clay plains; minimal fine fuel, very low fire risk',
    // Mangroves / wetlands
    'Mangrove forests and woodlands': 'tidal mangrove forest with pneumatophores and mud substrate; not fire-prone',
    'Saline and freshwater wetlands': 'coastal saltmarsh, freshwater sedge swamp, or reed bed; low fire risk unless dried out',
    // Mallee
    'Eucalyptus mallee woodlands and shrublands': 'multi-stemmed mallee eucalypt with dense shrub understorey over sandy soil; very high fuel loads and crown fire potential',
    'Eucalyptus mallee open woodlands and sparse mallee shrublands': 'open mallee with spinifex or chenopod understorey; moderate fire risk dependent on understorey connectivity',
    // Cleared / urban
    Cleared: 'cleared agricultural land, pasture, or urban area with minimal native vegetation and scattered structures',
    'Naturally bare': 'naturally bare rock, sand, or water body with no vegetation fuel',
    Unclassified: 'vegetation type not classified or insufficient survey data',
};
/**
 * Simplified fallback descriptor lookup.
 * When a full MVS name is not matched, try partial keyword matching.
 */
export function getNvisDescriptor(mvsName) {
    // Direct match first
    if (NVIS_MVS_DESCRIPTORS[mvsName])
        return NVIS_MVS_DESCRIPTORS[mvsName];
    // Partial keyword match
    const lower = mvsName.toLowerCase();
    for (const [key, descriptor] of Object.entries(NVIS_MVS_DESCRIPTORS)) {
        if (lower.includes(key.toLowerCase().split(' ')[0]))
            return descriptor;
    }
    return `${mvsName} (vegetation type with uncharacterised fire behaviour)`;
}
//# sourceMappingURL=constants.js.map