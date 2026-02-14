/**
 * Prompt templates and mapping tables for fire scenario generation.
 * Converts structured scenario data into natural language prompts optimized for AI image generation.
 */

import type { ViewPoint, ScenarioInputs } from '../types.js';
import type { PromptTemplate, IntensityVisuals } from './promptTypes.js';

/**
 * Intensity-to-visual mapping table.
 * Maps qualitative intensity levels to visual fire characteristics.
 */
export const INTENSITY_VISUALS: Record<ScenarioInputs['intensity'], IntensityVisuals> = {
  low: {
    flameHeight: '0.5 to 1.5 metres',
    smoke: 'light grey smoke drifting upward',
    crownInvolvement: 'surface fire only, no crown involvement',
    spotting: 'no spotting activity',
    descriptor: 'Low intensity surface fire',
  },
  moderate: {
    flameHeight: '1.5 to 3 metres',
    smoke: 'grey-white smoke columns rising steadily',
    crownInvolvement: 'occasional torching of individual trees',
    spotting: 'minimal short-range spotting',
    descriptor: 'Moderate intensity with occasional tree torching',
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
  night: 'Dark scene lit primarily by the fire itself, intense orange glow reflecting off smoke, stars or dark sky above',
};

/**
 * Viewpoint perspective descriptions.
 * Defines camera position and angle for each viewpoint type.
 */
export const VIEWPOINT_PERSPECTIVES: Record<ViewPoint, string> = {
  aerial: 'Aerial photograph taken from a helicopter or drone at 300 metres altitude, looking straight down at the fire',
  helicopter_north: 'Elevated wide-angle photograph from a helicopter north of the fire at 150 metres altitude, looking south at the fire front from an oblique angle',
  helicopter_south: 'Elevated wide-angle photograph from a helicopter south of the fire at 150 metres altitude, looking north across the burned area and active fire',
  helicopter_east: 'Elevated wide-angle photograph from a helicopter east of the fire at 150 metres altitude, looking west at the flank of the fire',
  helicopter_west: 'Elevated wide-angle photograph from a helicopter west of the fire at 150 metres altitude, looking east at the flank of the fire',
  helicopter_above: 'Elevated aerial photograph from directly above the fire at 200 metres altitude, capturing the full extent of the fire perimeter and smoke plume',
  ground_north: 'Ground-level photograph taken from the north side of the fire, approximately 500 metres away, looking south towards the flame front at eye level',
  ground_south: 'Ground-level photograph taken from the south side looking north, showing the burned area with fire visible in the distance',
  ground_east: 'Ground-level photograph taken from the east looking west towards the fire, capturing the flank of the fire at eye level',
  ground_west: 'Ground-level photograph taken from the west looking east towards the fire, capturing the flank of the fire at eye level',
  ground_above: 'Ground-level photograph from slightly elevated terrain looking across the fire area, showing the full fire perimeter and smoke column',
  ridge: 'Wide-angle photograph from a ridgeline or elevated position overlooking the fire area, approximately 300 metres above the fire, capturing the broader landscape context',
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
 * Default prompt template (v1.0.0).
 * Structured template for generating photorealistic bushfire scenario prompts.
 */
export const DEFAULT_PROMPT_TEMPLATE: PromptTemplate = {
  id: 'bushfire-photorealistic-v1',
  version: '1.0.0',
  sections: {
    style: 'A photorealistic photograph of an Australian bushfire. DSLR quality, natural lighting.',

    scene: (data) =>
      `${data.vegetationDescriptor} on ${data.terrainDescription} in New South Wales, Australia. ` +
      `Elevation approximately ${data.elevation} metres. ${data.nearbyFeatures}`,

    fire: (data) =>
      `A ${data.fireStage} burning through the vegetation. ` +
      `${data.intensityDescription.descriptor}. ` +
      `Flames are ${data.flameHeight} high with ${data.smokeDescription}. ` +
      `The head fire is spreading ${data.spreadDirection} driven by ${data.windDescription}.`,

    weather: (data) =>
      `Temperature is ${data.temperature}°C with ${data.humidity}% relative humidity. ` +
      `${data.windSpeed} km/h ${data.windDirection} wind. ${data.timeOfDayLighting}.`,

    perspective: (viewpoint) => `${VIEWPOINT_PERSPECTIVES[viewpoint]}.`,

    safety: 'No people, no animals, no text, no watermarks. No fantasy elements.',
  },
};
