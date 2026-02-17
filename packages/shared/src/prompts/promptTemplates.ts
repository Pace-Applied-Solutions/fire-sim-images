/**
 * Prompt templates and mapping tables for fire scenario generation.
 * Converts structured scenario data into natural language prompts optimized for AI image generation.
 */

import type { ViewPoint, ScenarioInputs } from '../types.js';
import type { PromptTemplate, IntensityVisuals } from './promptTypes.js';

/**
 * Derives a realistic intensity qualifier from explicit flame height in metres.
 * This ensures the AI model gets an appropriate qualitative description that
 * matches the numeric flame height, preventing over-dramatic imagery.
 */
function getFlameHeightQualifier(flameHeightM: number): string {
  if (flameHeightM < 0.5) {
    return 'Very low intensity surface fire with minimal visible flames, mostly smouldering';
  }
  if (flameHeightM < 1.5) {
    return 'Low intensity surface fire with small flames close to the ground';
  }
  if (flameHeightM < 3) {
    return 'Moderate intensity surface fire, no crown involvement';
  }
  if (flameHeightM < 8) {
    return 'High intensity fire with intermittent crown involvement';
  }
  if (flameHeightM < 20) {
    return 'Very high intensity fire with active crown fire';
  }
  return 'Extreme intensity fire with full crown fire and explosive fire behaviour';
}

/**
 * Intensity-to-visual mapping table.
 * Maps qualitative intensity levels to visual fire characteristics.
 */
export const INTENSITY_VISUALS: Record<ScenarioInputs['intensity'], IntensityVisuals> = {
  low: {
    flameHeight: '0.2 to 0.5 metres',
    smoke: 'light wispy smoke drifting upward',
    crownInvolvement: 'surface fire only, no crown involvement whatsoever',
    spotting: 'no spotting activity',
    descriptor:
      'Very low intensity surface fire with small flames barely visible above the grass or leaf litter',
  },
  moderate: {
    flameHeight: '0.5 to 1.5 metres',
    smoke: 'light grey smoke drifting upward',
    crownInvolvement: 'surface fire only, no crown involvement',
    spotting: 'no spotting activity',
    descriptor:
      'Low to moderate intensity surface fire with flames below head height, no crown involvement',
  },
  high: {
    flameHeight: '3 to 10 metres',
    smoke: 'dense grey-black smoke columns',
    crownInvolvement: 'intermittent crown fire with active runs',
    spotting: 'short-range spotting occurring',
    descriptor: 'High intensity with intermittent crown fire',
  },
  veryHigh: {
    flameHeight: '10 to 20 metres',
    smoke: 'massive dark smoke columns forming pyrocumulus cloud',
    crownInvolvement: 'active crown fire with sustained crowning',
    spotting: 'medium-range spotting ahead of the head fire',
    descriptor: 'Very high intensity — active crown fire',
  },
  extreme: {
    flameHeight: '20+ metres',
    smoke: 'towering pyrocumulonimbus cloud with dense ember rain',
    crownInvolvement: 'full crown fire with complete canopy involvement',
    spotting: 'long-range spotting creating spot fires kilometers ahead',
    descriptor: 'Extreme intensity — full crown fire with ember attack',
  },
  catastrophic: {
    flameHeight: '30+ metres',
    smoke: 'massive pyrocumulonimbus system with severe turbulence and ember storms',
    crownInvolvement: 'total canopy consumption with explosive fire behavior',
    spotting: 'extensive long-range mass spotting overwhelming suppression capacity',
    descriptor: 'Catastrophic intensity — explosive fire behavior',
  },
};

/**
 * Time-of-day lighting descriptions.
 * Maps time periods to natural lighting characteristics for AI generation.
 */
export const TIME_OF_DAY_LIGHTING: Record<ScenarioInputs['timeOfDay'], string> = {
  dawn: 'Soft golden light from the east, long shadows across the landscape, cool blue sky transitioning to warm tones',
  morning: 'Bright morning sun from the east, clear visibility, crisp natural lighting',
  midday: 'Harsh overhead sun, short shadows, washed-out pale sky above the smoke',
  afternoon: 'Warm afternoon light from the west, golden-orange tones, lengthening shadows',
  dusk: 'Deep orange and red sunset sky, fire glow visible against fading light, dramatic contrast',
  night:
    'Dark scene lit primarily by the fire itself, intense orange glow reflecting off smoke, stars or dark sky above',
};

/**
 * Viewpoint perspective descriptions.
 * Defines camera position and angle for each viewpoint type.
 * Ground-level views now include directional narrative for improved context.
 */
export const VIEWPOINT_PERSPECTIVES: Record<ViewPoint, string> = {
  aerial:
    'Aerial photograph taken from a helicopter or drone at 300 metres altitude, looking straight down at the fire',
  helicopter_north:
    'Elevated wide-angle photograph from a helicopter north of the fire at 150 metres altitude, looking south at the fire front from an oblique angle',
  helicopter_south:
    'Elevated wide-angle photograph from a helicopter south of the fire at 150 metres altitude, looking north across the burned area and active fire',
  helicopter_east:
    'Elevated wide-angle photograph from a helicopter east of the fire at 150 metres altitude, looking west at the flank of the fire',
  helicopter_west:
    'Elevated wide-angle photograph from a helicopter west of the fire at 150 metres altitude, looking east at the flank of the fire',
  helicopter_above:
    'Elevated aerial photograph from directly above the fire at 200 metres altitude, capturing the full extent of the fire perimeter and smoke plume',
  ground_north:
    "You're standing on the ground to the north of the fire, looking south towards the approaching flame front. Ground-level photograph taken at eye level, approximately 500 metres from the fire edge",
  ground_south:
    "You're standing on the ground to the south of the fire, looking north across the burned area towards the active fire line. Ground-level photograph showing the burned area with fire visible in the distance",
  ground_east:
    "You're standing on the ground to the east of the fire, looking west at the flank of the fire. Ground-level photograph taken at eye level, capturing the fire's flank and smoke movement",
  ground_west:
    "You're standing on the ground to the west of the fire, looking east at the flank of the fire. Ground-level photograph taken at eye level, capturing the fire's flank and smoke movement",
  ground_above:
    'Ground-level photograph from slightly elevated terrain looking across the fire area, showing the full fire perimeter and smoke column',
  ridge:
    'Wide-angle photograph from a ridgeline or elevated position overlooking the fire area, approximately 300 metres above the fire, capturing the broader landscape context',
};

/**
 * Fire stage descriptions.
 * Maps fire stages to natural language for prompts.
 */
export const FIRE_STAGE_DESCRIPTIONS: Record<ScenarioInputs['fireStage'], string> = {
  spotFire: 'spot fire',
  developing: 'developing bushfire',
  established: 'established bushfire',
  major: 'major bushfire campaign fire',
};

/**
 * Default prompt template (v1.9.0).
 * Structured template with atomic sections for generating photorealistic bushfire scenario prompts.
 * Version 1.9.0: Clarified polygon outline exclusion - removed all references to visual polygon markers,
 *                emphasized natural fire boundaries only (flames, smoke, burned areas).
 */
export const DEFAULT_PROMPT_TEMPLATE: PromptTemplate = {
  id: 'bushfire-photorealistic-v1',
  version: '1.9.0',
  sections: {
    // Section 1: Establish photorealistic style and purpose
    style:
      'Create a photorealistic photograph for a fire service training exercise. ' +
      'The image should look like it was captured on location by a firefighter with a Canon EOS R5 and a 24-70mm f/2.8 lens. ' +
      'It depicts a real, specific place in the Australian landscape during a bushfire — not a generic or stock fire image. ' +
      'This is NOT an artistic interpretation — it must accurately depict the actual landscape as it exists. ' +
      'Every landform, ridge line, valley contour, and visible road or clearing must be faithfully preserved. ' +
      'Any man-made structures visible in satellite imagery must appear in the same position and scale.',

    // Section 2: Fire behaviour principles (scenario-specific, intensity-driven)
    behaviorPrinciples: (data) => {
      const intensityLevel = data.intensityDescription.descriptor.toLowerCase();
      
      if (intensityLevel.includes('low')) {
        return `Fire Behavior (Low Intensity): This fire exhibits low intensity characteristics—flames are modest in height, ` +
          `spread is slow and controlled, and the fire structure is well-defined with distinct head, flanks, and heel. ` +
          `Flames maintain a vertical orientation with minimal forward lean. ` +
          `The fire front advances steadily but without aggressive spread. Smoke rises with less turbulence.`;
      } else if (intensityLevel.includes('moderate')) {
        return `Fire Behavior (Moderate Intensity): This fire exhibits moderate intensity—sustained flames with clear directional spread, ` +
          `visible but manageable crown involvement, and steady flame height. ` +
          `The head fire is defined with forward-leaning flames; flanks spread laterally at reduced intensity. ` +
          `Smoke plumes rise with lateral drift driven by wind.`;
      } else if (intensityLevel.includes('high')) {
        return `Fire Behavior (High Intensity): This fire exhibits high intensity—tall flames with strong forward angle, ` +
          `rapid spread along the fire front, extensive crown fire development, and dramatic smoke production. ` +
          `The head fire dominates visually with intense flame activity; flanks spread with elevated flames. ` +
          `Significant spotting activity and vigorous smoke columns darken the sky.`;
      } else {
        return `Fire Behavior (Extreme Intensity): This fire exhibits extreme, violent behavior—explosively tall flames, ` +
          `explosive spread with minimal obstacles, near-total crown consumption, and extreme spotting. ` +
          `The fire spreads with extreme speed in all directions relative to wind and slope. ` +
          `Smoke rises as a massive, dark column visible from great distances.`;
      }
    },

    // Section 3: Reference imagery and fire extent specification
    referenceImagery: (data) => {
      const areaText = `${data.fireAreaHectares.toFixed(1)} hectares`;
      const extentNsText = `${data.fireExtentNorthSouthKm.toFixed(2)} km north–south`;
      const extentEwText = `${data.fireExtentEastWestKm.toFixed(2)} km east–west`;

      return (
        `Reference imagery context: You have access to a 3D interactive map (Google Maps style) displaying this specific location. ` +
        `The map shows both overhead (bird's-eye) and ground-level street view perspectives of the landscape. ` +
        `A polygon overlay on the reference map shows the fire's exact perimeter and location—study this polygon carefully to understand the precise fire boundaries, including any irregular edges, indentations, or protrusions. ` +
        `The fire in the generated image must: ` +
        `(1) cover ${areaText}, ` +
        `(2) span ${extentNsText} and ${extentEwText}, ` +
        `(3) follow the exact perimeter shape shown by the polygon overlay—match the irregular boundaries precisely. ` +
        `The generated image must match EXACTLY the topography, vegetation, and man-made features visible in the reference map, ` +
        `with the fire (flames, smoke, and burned areas) occupying the complete specified extent and respecting the perimeter polygon boundaries. ` +
        `Render only the natural landscape with fire—omit all map overlays, UI elements, and reference markers from the output.`
      );
    },

    // Section 4: Establish locality and geographic context
    locality: (data) => {
      const localityText = data.locality 
        ? `This specific location is ${data.locality}, Australia.` 
        : 'This location is in New South Wales, Australia.';
      
      return (
        `Geographic context: ${localityText} ` +
        `The generated image must be recognizable as this specific location based on satellite imagery and the reference map provided.`
      );
    },

    // Section 5: Establish terrain characteristics
    terrain: (data) => {
      const mapInstruction =
        `Study the contour lines in the reference map carefully: closer lines indicate steeper terrain, wider spacing indicates flatter areas. ` +
        `Match the slope visible in the reference 3D map exactly — every hill, valley, and ridge shown must be faithfully rendered. ` +
        `Preserve all topographic features exactly as they appear in the geographic reference — hills, gullies, ridgelines, flat plateaus, and valleys.`;

      // Always include the core instruction as a base
      const baseInstruction = `Terrain: ${mapInstruction}`;

      // If we have a terrain description (from slope data), prepend it; otherwise just use base
      if (data.terrainDescription && data.terrainDescription.trim().length > 0) {
        return (
          `Terrain: The landscape features ${data.terrainDescription}. ` +
          `The landscape is characterized by this specific slope profile, with corresponding exposure and water drainage patterns. ` +
          `${mapInstruction} ` +
          `Show the natural undulation and slopes of the specific region.`
        );
      }

      // Fallback: just the base instruction when no specific terrain data is available
      return `${baseInstruction} Show the natural undulation and slopes as depicted in the map.`;
    },

    // Section 6: Establish nearby features and landmarks
    features: (data) =>
      `Nearby features: ${data.nearbyFeatures} ` +
      `These landmarks are a critical part of geographic recognition and are visible in the reference map. ` +
      `They must appear in the correct positions relative to the fire extent. ` +
      `Include any visible roads, water features, clearings, or distinctive landforms shown in the reference imagery.`,

    // Section 7: Establish vegetation structure and characteristics
    vegetation: (data) => {
      const details = data.vegetationDetails;
      const parts: string[] = [];

      // Add primary vegetation type
      parts.push(`Vegetation type: ${data.vegetationType}.`);

      // Add vegetation diversity if multiple types detected across perimeter
      if (data.vegetationTypes && data.vegetationTypes.length > 1) {
        parts.push(
          `The fire burns through multiple vegetation zones: ${data.vegetationTypes.join(', ')}. ` +
          `Depict the transition between these vegetation types as the fire spreads across the landscape.`
        );
      }

      // Only include known values, omit 'unknown' entries
      if (details.canopyHeight !== 'unknown') {
        parts.push(`Canopy height: ${details.canopyHeight}.`);
      }
      if (details.canopyType !== 'unknown') {
        parts.push(`Canopy composition: ${details.canopyType}.`);
      }
      if (details.understorey !== 'unknown') {
        parts.push(`Understorey structure: ${details.understorey}.`);
      }
      if (details.groundFuel !== 'unknown') {
        parts.push(`Ground fuel layer: ${details.groundFuel}.`);
      }
      if (details.fuelLoad !== 'unknown') {
        parts.push(`Fuel load characteristics: ${details.fuelLoad}.`);
      }
      if (details.flammability !== 'unknown') {
        parts.push(`Flammability profile: ${details.flammability}.`);
      }

      return (
        parts.join(' ') + ' ' +
        `Every vegetation component must match the specified type exactly as shown in the reference map — do not substitute or generalize.`
      );
    },

    // Section 8: Establish fire geometry and scale
    fireGeometry: (data) => {
      const areaDesc = `The fire covers approximately ${data.fireAreaHectares.toFixed(1)} hectares.`;
      const extentDesc = `It spans ${data.fireExtentNorthSouthKm.toFixed(2)} km from north to south and ${data.fireExtentEastWestKm.toFixed(2)} km from east to west.`;

      return (
        `Fire extent and boundaries: ${areaDesc} ${extentDesc} ` +
        `The fire perimeter must follow the exact shape and boundaries shown on the reference map polygon. ` +
        `Allow natural features (ridgelines, valleys, rivers, vegetation type changes) to guide irregular perimeter edges — the fire boundary is NOT a perfect geometric shape. ` +
        `CRITICAL: The fire must occupy the ENTIRE mapped area following the polygon boundaries precisely, including any indentations, protrusions, or irregular edges. ` +
        `The fire's extent must be conveyed ENTIRELY through natural features: ` +
        `active flames define the leading edge, burned and blackened vegetation marks consumed areas, ` +
        `and smoke plumes indicate the fire's full spatial extent. ` +
        `All active fire edge, burned areas, and smoke must extend to the complete north–south and east–west extent specified. ` +
        `ABSOLUTELY NO UI overlays, outlines, shapes, polygons, markers, lines, or reference indicators from the map may appear in the generated image. ` +
        `The output must be a pure photorealistic landscape photograph showing only natural terrain, vegetation, fire, and smoke — with zero artificial overlays or visual aids.`
      );
    },

    // Section 9: Specify fire intensity, behavior, and visual characteristics
    fireBehavior: (data) => {
      const flameDesc =
        data.explicitFlameHeightM !== undefined
          ? `Flame height: approximately ${data.explicitFlameHeightM} metres.`
          : `Flame height: ${data.flameHeight}.`;
      const rosDesc =
        data.explicitRateOfSpreadKmh !== undefined
          ? ` Rate of spread: ${data.explicitRateOfSpreadKmh} km/h.`
          : '';
      const qualifier =
        data.explicitFlameHeightM !== undefined
          ? getFlameHeightQualifier(data.explicitFlameHeightM)
          : data.intensityDescription.descriptor;
      
      return (
        `Fire behavior: A ${data.fireStage} is burning through the vegetation. ` +
        `${qualifier}. ` +
        `${flameDesc}${rosDesc} ` +
        `Smoke column: ${data.smokeDescription}. ` +
        `Crown involvement: ${data.intensityDescription.crownInvolvement}. ` +
        `Spotting activity: ${data.intensityDescription.spotting}. ` +
        `Fire front direction: spreading ${data.spreadDirection}, driven by weather patterns. ` +
        `The fire demonstrates behavior consistent with a ${data.intensityDescription.descriptor.toLowerCase()} fire in this fuel type and climate.`
      );
    },

    // Section 10: Set atmospheric and weather conditions
    weather: (data) =>
      `Weather conditions: Temperature ${data.temperature}°C, relative humidity ${data.humidity}%, ` +
      `${data.windDescription}. ` +
      `${data.timeOfDayLighting}.`,

    // Section 11: Set camera position and framing
    perspective: (viewpoint) =>
      `Camera position: ${VIEWPOINT_PERSPECTIVES[viewpoint]}.`,

    // Section 12: Safety constraints and scene composition
    safety:
      'Render the landscape as visible in the reference imagery: include all natural terrain, vegetation, fire, and smoke. ' +
      'Include any man-made structures, roads, buildings, fences, clearings, or infrastructure visible in the reference map — these are critical for geographic authenticity. ' +
      'The scene must NOT include people, animals, or vehicles. ' +
      'The image contains authentic outdoor photography with realistic textures, lighting, and atmospheric haze. ' +
      'Render true-to-nature colors and lighting appropriate to the described conditions.',
  },
};
