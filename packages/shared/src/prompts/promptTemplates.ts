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
 * Default prompt template (v1.8.0).
 * Structured template with atomic sections for generating photorealistic bushfire scenario prompts.
 * Version 1.8.0: Added fire behaviour principles section as foundational reference for all image generation.
 */
export const DEFAULT_PROMPT_TEMPLATE: PromptTemplate = {
  id: 'bushfire-photorealistic-v1',
  version: '1.8.0',
  sections: {
    // Section 1: Establish photorealistic style and purpose
    style:
      'Create a photorealistic photograph for a fire service training exercise. ' +
      'The image should look like it was captured on location by a firefighter with a Canon EOS R5 and a 24-70mm f/2.8 lens. ' +
      'It depicts a real, specific place in the Australian landscape during a bushfire — not a generic or stock fire image. ' +
      'This is NOT an artistic interpretation — it must accurately depict the actual landscape as it exists. ' +
      'Every landform, ridge line, valley contour, and visible road or clearing must be faithfully preserved. ' +
      'Any man-made structures visible in satellite imagery must appear in the same position and scale.',

    // Section 2: Fire behaviour principles (foundational reference for all scenarios)
    behaviorPrinciples:
      'FIRE BEHAVIOUR FUNDAMENTALS:\n\n' +
      'Wildfires exhibit distinct structural and visual characteristics based on wind, terrain, and fuel. ' +
      'Understand and depict these dynamics accurately in the generated image.\n\n' +
      'HEAD FIRE (active, intense front): Flames lean forward into unburned fuel, driven by wind or upslope. ' +
      'The tallest, fastest-spreading edge. Characterized by forward-angled flames and maximum heat release.\n\n' +
      'FLANKS (sides): Slower lateral spread. Lower flames, less continuous fire. Reduced intensity compared to head.\n\n' +
      'HEEL/TAIL (rear): Backing fire opposite the head. Often smoldering, low flames, slow progression or stagnant. ' +
      'May self-extinguish if moving against wind or steep downslope.\n\n' +
      'WIND EFFECTS:\n' +
      '- Winds below 10 km/h: fire spreads nearly evenly in all directions (circular growth)\n' +
      '- Winds 12-15 km/h: critical threshold where rate-of-spread (ROS) accelerates dramatically\n' +
      '- Strong winds (30+ km/h): elliptical fire shape with narrow, intense head and elongated flanks\n' +
      '- Flame behavior: flames angle forward and close to ground under high wind, driving rapid spread\n' +
      '- Spotting: embers lofted downwind, creating spot fires ahead (forest fires can spot 2+ km away; extreme conditions up to 30 km)\n\n' +
      'TERRAIN EFFECTS:\n' +
      '- Upslope fires: flames race uphill with towering height (every 10° slope roughly doubles ROS)\n' +
      '- Downslope fires: flames reduce intensity (50% slower than flat ground), shorter flame, more smoldering\n' +
      '- Ridge/valley effects: canyons can create chimney effects; valleys trap smoke\n\n' +
      'FUEL-DEPENDENT BEHAVIOR:\n' +
      '- Grassland: rapid transient fires, moderate flames (3-5m), lower heat release\n' +
      '- Forest (dry fuel): sustained intense flames (10-20m+), potential crown fire above 15m\n' +
      '- Fuel load determines flame height: higher load equals taller flames and greater intensity\n' +
      '- Moisture suppresses behavior; critically dry fuels enable extreme spread and intensity\n\n' +
      'SMOKE & INTENSITY INDICATORS:\n' +
      '- Low intensity: light wispy smoke, vertical flame orientation, minimal forward tilt\n' +
      '- High intensity: towering pyrocumulus clouds, horizontal flame angle, massive smoke columns, dark overhead\n' +
      '- Crown fire: flames engulf tree canopy (15m+), appear uniform and violent, extreme smoke production',

    // Section 3: Reference imagery and fire perimeter polygon
    referenceImagery: (data) => {
      const areaText = `${data.fireAreaHectares.toFixed(1)} hectares`;
      const extentNsText = `${data.fireExtentNorthSouthKm.toFixed(2)} km north–south`;
      const extentEwText = `${data.fireExtentEastWestKm.toFixed(2)} km east–west`;
      
      return (
        `Reference imagery context: You have access to a 3D interactive map (Google Maps style) displaying this specific location. ` +
        `The map shows both overhead (bird's-eye) and ground-level street view perspectives of the landscape. ` +
        `A **red polygon outline is overlaid on the 3D map**, marking the fire perimeter and extent. ` +
        `This red polygon indicates that the fire: ` +
        `(1) covers ${areaText}, ` +
        `(2) spans ${extentNsText} and ${extentEwText}, ` +
        `(3) forms an ${data.fireShape} pattern. ` +
        `The generated image must match EXACTLY the topography, vegetation, and man-made features visible in the reference map, ` +
        `with the fire occupying the complete area defined by the red polygon outline.`
      );
    },

    // Section 4: Establish locality and geographic context
    locality: (data) => {
      const localityText = data.locality 
        ? `This specific location is ${data.locality}, Australia.` 
        : 'This location is in New South Wales, Australia.';
      
      return (
        `Geographic context: ${localityText} ` +
        `The elevation is approximately ${data.elevation} metres above sea level. ` +
        `Preserve all topographic features exactly as they appear in the geographic reference — hills, gullies, ridgelines, flat plateaus, and valleys. ` +
        `The generated image must be recognizable as this specific location based on satellite imagery and the reference map provided.`
      );
    },

    // Section 5: Establish terrain characteristics
    terrain: (data) =>
      `Terrain: ${data.terrainDescription}. ` +
      `The landscape is characterized by this specific slope profile, with corresponding exposure and water drainage patterns. ` +
      `Match the slope visible in the reference 3D map exactly — every hill, valley, and ridge shown must be faithfully rendered. ` +
      `Show the natural undulation and slopes of the specific region.`,

    // Section 6: Establish nearby features and landmarks
    features: (data) =>
      `Nearby features: ${data.nearbyFeatures} ` +
      `These landmarks are a critical part of geographic recognition and are visible in the reference map. ` +
      `They must appear in the correct positions relative to the fire and the red polygon extent. ` +
      `Include any visible roads, water features, clearings, or distinctive landforms shown in the reference imagery.`,

    // Section 7: Establish vegetation structure and characteristics
    vegetation: (data) => {
      const details = data.vegetationDetails;
      return (
        `Vegetation type: ${data.vegetationType}. ` +
        `Canopy height: ${details.canopyHeight}. ` +
        `Canopy composition: ${details.canopyType}. ` +
        `Understorey structure: ${details.understorey}. ` +
        `Ground fuel layer: ${details.groundFuel}. ` +
        `Fuel load characteristics: ${details.fuelLoad}. ` +
        `Flammability profile: ${details.flammability}. ` +
        `Every vegetation component must match the specified type exactly as shown in the reference map — do not substitute or generalize.`
      );
    },

    // Section 8: Establish fire geometry and scale
    fireGeometry: (data) => {
      const areaDesc = `The fire covers approximately ${data.fireAreaHectares.toFixed(1)} hectares.`;
      const extentDesc = `It spans ${data.fireExtentNorthSouthKm.toFixed(2)} km from north to south and ${data.fireExtentEastWestKm.toFixed(2)} km from east to west.`;
      const shapeDesc = `The fire perimeter forms an ${data.fireShape} shape.`;
      
      return (
        `Fire extent from reference map: ${areaDesc} ${extentDesc} ${shapeDesc} ` +
        `The **red polygon outline visible in the reference 3D map** defines the fire's extent boundaries. ` +
        `CRITICAL: The fire must occupy the ENTIRE mapped area shown by this red polygon. ` +
        `Do NOT show the polygon outline itself in the generated image — the fire (flames, smoke, burned areas) must replace and fill the polygon boundaries. ` +
        `All active fire edge, burned areas, and smoke must extend across the complete north–south and east–west extent as marked by the polygon.`
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
