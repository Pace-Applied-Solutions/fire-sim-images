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
 * Default prompt template (v1.5.0).
 * Structured template for generating photorealistic bushfire scenario prompts.
 * Updated to include locality context for better geographic understanding.
 */
export const DEFAULT_PROMPT_TEMPLATE: PromptTemplate = {
  id: 'bushfire-photorealistic-v1',
  version: '1.5.0',
  sections: {
    // Step 1 — Establish the photographic style and intent (Gemini best practice:
    // provide context, use camera/lens language, describe purpose)
    style:
      'Create a photorealistic photograph for a fire service training exercise. ' +
      'The image should look like it was captured on location by a firefighter with a Canon EOS R5 and a 24-70mm f/2.8 lens. ' +
      'It depicts a real, specific place in the Australian landscape during a bushfire — not a generic or stock fire image. ' +
      'This is NOT an artistic interpretation — it must accurately depict the actual landscape as it exists. ' +
      'Every landform, ridge line, valley contour, vegetation patch, and visible road or clearing in the reference terrain must be faithfully preserved. ' +
      'Any man-made structures (buildings, roads, fences, clearings) visible in satellite imagery must appear in the same position and scale. ' +
      'Match the reference landscape precisely — the generated image must be recognizable as this specific location.',

    // Step 2 — Describe the scene narratively (Gemini best practice: hyper-specific,
    // narrative description over keyword lists)
    scene: (data) => {
      const localityContext = data.locality
        ? ` This location is ${data.locality}, Australia.`
        : ' This location is in New South Wales, Australia.';

      return (
        `First, establish the landscape with strict adherence to the reference imagery.${localityContext} ` +
        `The terrain is ${data.terrainDescription}, ` +
        `covered with ${data.vegetationDescriptor}, ` +
        `at approximately ${data.elevation} metres elevation. ` +
        `${data.nearbyFeatures} ` +
        `Preserve every topographic feature exactly where it appears in the reference — hills, gullies, flat paddocks, tree lines, bare earth patches, fence lines, and any built structures. ` +
        `If the reference shows a building, road, or clearing, it must appear in the generated image in the same location with the same scale and orientation.`
      );
    },

    // Step 3 — Layer the fire behaviour on top (Gemini best practice: step-by-step
    // instructions for complex multi-element scenes)
    fire: (data) => {
      // Use explicit flame height/ROS when provided (from trainer controls)
      const flameDesc =
        data.explicitFlameHeightM !== undefined
          ? `Flames are approximately ${data.explicitFlameHeightM} metres high`
          : `Flames are ${data.flameHeight} high`;
      const rosDesc =
        data.explicitRateOfSpreadKmh !== undefined
          ? ` The fire is advancing at ${data.explicitRateOfSpreadKmh} km/h.`
          : '';
      // Derive a realistic intensity qualifier from explicit flame height
      const qualifier =
        data.explicitFlameHeightM !== undefined
          ? getFlameHeightQualifier(data.explicitFlameHeightM)
          : data.intensityDescription.descriptor;

      // Format fire size information
      const areaDesc = `The fire covers approximately ${data.fireAreaHectares.toFixed(1)} hectares`;
      const extentDesc = `spanning ${data.fireExtentNorthSouthKm.toFixed(2)} kilometres from north to south and ${data.fireExtentEastWestKm.toFixed(2)} kilometres from east to west`;

      return (
        `Then, add the fire. A ${data.fireStage} is burning through the vegetation. ` +
        `${qualifier}. ` +
        `${flameDesc} with ${data.smokeDescription}.${rosDesc} ` +
        `The head fire is spreading ${data.spreadDirection}, driven by ${data.windDescription}. ` +
        `${areaDesc}, ${extentDesc}. ` +
        `CRITICAL: The fire must fill the entire mapped area — this is not a small fire, but an incident of this specific scale. ` +
        `The active fire edge, smoke, and burned areas should occupy the full extent of the landscape shown in the reference imagery. ` +
        `Do NOT show any red polygon outline or boundary markers — the fire itself replaces any drawn perimeter lines.`
      );
    },

    // Step 4 — Set the atmospheric conditions (Gemini best practice: lighting and
    // mood description integrated into the narrative)
    weather: (data) =>
      `The conditions are ${data.temperature}°C with ${data.humidity}% relative humidity ` +
      `and a ${data.windSpeed} km/h ${data.windDirection} wind. ` +
      `${data.timeOfDayLighting}.`,

    // Step 5 — Set the camera (Gemini best practice: control the camera with
    // photographic/cinematic language — shot type, angle, distance)
    perspective: (viewpoint) =>
      `Finally, set the camera position: ${VIEWPOINT_PERSPECTIVES[viewpoint]}.`,

    // Gemini best practice: use semantic positive constraints instead of negative
    // lists. Describe the desired scene positively.
    safety:
      'The landscape is uninhabited wilderness — only natural terrain, vegetation, fire, and smoke are present. ' +
      'The image contains only the natural scene with realistic textures, lighting, and atmospheric haze.',
  },
};
