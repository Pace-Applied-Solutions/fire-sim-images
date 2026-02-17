/**
 * Constants and default values for the bushfire simulation inject tool.
 * Includes fire service terminology and standard configuration values.
 */
/**
 * Default scenario input values.
 */
export declare const DEFAULT_SCENARIO_INPUTS: {
    windSpeed: number;
    windDirection: number;
    temperature: number;
    humidity: number;
    timeOfDay: "midday";
    intensity: "moderate";
};
/**
 * Fire intensity classifications.
 */
export declare const FIRE_INTENSITY: {
    readonly LOW: "low";
    readonly MODERATE: "moderate";
    readonly HIGH: "high";
    readonly EXTREME: "extreme";
};
/**
 * Time of day options for scenario generation.
 */
export declare const TIME_OF_DAY: {
    readonly DAWN: "dawn";
    readonly MORNING: "morning";
    readonly MIDDAY: "midday";
    readonly AFTERNOON: "afternoon";
    readonly DUSK: "dusk";
    readonly NIGHT: "night";
};
/**
 * Available viewpoints for image generation.
 */
export declare const VIEWPOINTS: {
    readonly AERIAL: "aerial";
    readonly GROUND_NORTH: "ground_north";
    readonly GROUND_SOUTH: "ground_south";
    readonly GROUND_EAST: "ground_east";
    readonly GROUND_WEST: "ground_west";
    readonly RIDGE: "ridge";
};
/**
 * Common vegetation types (example list).
 */
export declare const VEGETATION_TYPES: readonly ["Dry Sclerophyll Forest", "Wet Sclerophyll Forest", "Grassy Woodland", "Grassland", "Heath", "Rainforest", "Cumberland Plain Woodland", "Riverine Forest", "Swamp Sclerophyll Forest", "Coastal Sand Heath", "Alpine Complex", "Plantation Forest", "Cleared/Urban"];
/**
 * Default vegetation type used as fallback when no context is available.
 */
export declare const DEFAULT_VEGETATION_TYPE = "Dry Sclerophyll Forest";
/**
 * Gets the effective vegetation type, respecting manual overrides.
 * Returns manual type if set, otherwise auto-detected type, otherwise default.
 */
export declare function getEffectiveVegetationType(geoContext: {
    vegetationType?: string;
    manualVegetationType?: string;
} | null | undefined): string;
/**
 * Generation configuration defaults.
 */
export declare const GENERATION_CONFIG: {
    readonly maxViewsPerRequest: 5;
    readonly defaultImageWidth: 1024;
    readonly defaultImageHeight: 1024;
    readonly timeoutSeconds: 300;
};
/**
 * Vegetation descriptors mapped to natural language for prompts.
 * @deprecated Use VEGETATION_DETAILS for richer context instead.
 */
export declare const VEGETATION_DESCRIPTORS: Record<string, string>;
/**
 * Detailed vegetation characteristics for prompt generation.
 * Provides structured information about canopy, understorey, fuel structure, and fire behavior.
 */
export interface VegetationDetails {
    simpleName: string;
    canopyHeight: string;
    canopyType: string;
    understorey: string;
    groundFuel: string;
    fuelLoad: string;
    flammability: string;
}
export declare const VEGETATION_DETAILS: Record<string, VegetationDetails>;
/**
 * NSW State Vegetation Type Map (SVTM) formation descriptors.
 * Maps the 17 SVTM vegetation formation categories to natural language descriptions
 * suitable for AI image generation prompts.
 *
 * Source: NSW DCCEEW via ArcGIS MapServer
 * https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Vegetation_IBCA/nswmap_2_3a_ext/MapServer
 */
export declare const SVTM_FORMATION_DESCRIPTORS: Record<string, string>;
/**
 * NSW SVTM WMS endpoint for vegetation formation overlay tiles.
 * CC-BY 4.0 licensed, publicly accessible, CORS enabled.
 * @deprecated Disabled in favour of NVIS national coverage. Preserved for future re-enablement.
 */
export declare const SVTM_WMS_URL = "https://mapprod3.environment.nsw.gov.au/arcgis/services/Vegetation_IBCA/nswmap_2_3a_ext/MapServer/WmsServer";
/**
 * NSW SVTM ArcGIS REST endpoint for identify/query operations.
 * @deprecated Disabled in favour of NVIS national coverage. Preserved for future re-enablement.
 */
export declare const SVTM_REST_URL = "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Vegetation_IBCA/nswmap_2_3a_ext/MapServer";
/**
 * Active vegetation data source.
 * Set to 'nvis' for national coverage or 'svtm' to re-enable NSW-only high-res layer.
 */
export declare const VEGETATION_SOURCE: 'nvis' | 'svtm';
/**
 * NVIS (National Vegetation Information System) WMS endpoints.
 * Publisher: Australian Government DCCEEW — CC-BY 4.0 International.
 * Coverage: All Australian states and territories.
 */
export declare const NVIS_WMS_MVS_URL = "https://gis.environment.gov.au/gispubmap/services/ogc_services/NVIS_ext_mvs/MapServer/WMSServer";
export declare const NVIS_WMS_MVG_URL = "https://gis.environment.gov.au/gispubmap/services/ogc_services/NVIS_ext_mvg/MapServer/WMSServer";
/**
 * NVIS Major Vegetation Subgroup (MVS) descriptors.
 * Maps the ~85 NVIS MVS subgroup names to natural language descriptions
 * suitable for AI image generation prompts, including fire behaviour characteristics.
 *
 * Source: DCCEEW NVIS 6.0
 */
export declare const NVIS_MVS_DESCRIPTORS: Record<string, string>;
/**
 * Simplified fallback descriptor lookup.
 * When a full MVS name is not matched, try partial keyword matching.
 */
export declare function getNvisDescriptor(mvsName: string): string;
//# sourceMappingURL=constants.d.ts.map