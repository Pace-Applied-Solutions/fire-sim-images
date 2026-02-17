/**
 * Prompt generation engine for bushfire scenarios.
 * Converts structured scenario data into detailed, multi-perspective prompts for AI image generation.
 */

import area from '@turf/area';
import bbox from '@turf/bbox';
import type { GenerationRequest, ViewPoint } from '../types.js';
import { VEGETATION_DESCRIPTORS, VEGETATION_DETAILS } from '../constants.js';
import type { PromptData, PromptSet, GeneratedPrompt, PromptTemplate } from './promptTypes.js';
import {
  DEFAULT_PROMPT_TEMPLATE,
  INTENSITY_VISUALS,
  TIME_OF_DAY_LIGHTING,
  FIRE_STAGE_DESCRIPTIONS,
} from './promptTemplates.js';

/**
 * Blocked terms that should never appear in prompts.
 * These terms may trigger AI content filters or produce unsafe/inappropriate content.
 * Note: Terms like "people" and "animal" are allowed in negative prompts (e.g., "No people, no animals")
 */
const BLOCKED_TERMS = [
  'explosion',
  'casualties',
  'violence',
  'death',
  'injury',
  'victim',
  'destroy',
  'devastation',
];

/**
 * Validates that a prompt does not contain blocked terms in the descriptive sections.
 * The safety section is excluded from validation as it contains negative terms.
 */
function validatePromptSafety(
  promptText: string,
  safetySection: string
): { valid: boolean; blockedTerms: string[] } {
  // Remove the safety section from validation as it contains negative terms
  const descriptiveText = promptText.replace(safetySection, '');
  const lowerPrompt = descriptiveText.toLowerCase();
  const found = BLOCKED_TERMS.filter((term) => lowerPrompt.includes(term));
  return {
    valid: found.length === 0,
    blockedTerms: found,
  };
}

/**
 * Generates terrain description from geo context.
 */
function generateTerrainDescription(geoContext: GenerationRequest['geoContext']): string {
  const slope = geoContext.slope.mean;
  let descriptor = '';

  if (slope < 5) {
    descriptor = 'flat terrain';
  } else if (slope < 15) {
    descriptor = 'gently sloping terrain';
  } else if (slope < 25) {
    descriptor = 'moderate slopes';
  } else if (slope < 35) {
    descriptor = 'steep slopes';
  } else {
    descriptor = 'very steep escarpment';
  }

  return descriptor;
}

/**
 * Generates nearby features description from geo context.
 */
function generateNearbyFeatures(geoContext: GenerationRequest['geoContext']): string {
  if (!geoContext.nearbyFeatures || geoContext.nearbyFeatures.length === 0) {
    return 'Remote bushland area.';
  }

  const featureMap: Record<string, string> = {
    road: 'A road runs nearby',
    escarpment: 'A steep escarpment lies to one side',
    river: 'A river valley is visible in the landscape',
    residential_area: 'Residential areas are visible in the distance',
    rural_residential: 'Rural properties are scattered through the area',
  };

  // Map features to descriptions, falling back to the raw feature name if not mapped
  // Filter out any empty or whitespace-only strings
  const descriptions = geoContext.nearbyFeatures
    .map((feature) => featureMap[feature] || feature)
    .filter((desc) => desc.trim().length > 0);

  if (descriptions.length === 0) {
    return 'Remote bushland area.';
  }

  return descriptions.join('. ') + '.';
}

/**
 * Determines fire spread direction based on wind direction.
 */
function determineSpreadDirection(windDirection: string): string {
  const oppositeDirection: Record<string, string> = {
    N: 'south',
    NE: 'southwest',
    E: 'west',
    SE: 'northwest',
    S: 'north',
    SW: 'northeast',
    W: 'east',
    NW: 'southeast',
  };

  return `to the ${oppositeDirection[windDirection] || 'leeward direction'}`;
}

/**
 * Generates wind description from wind speed and direction.
 * Wind strength classifications based on fire behavior impact:
 * - Light: < 10 km/h - minimal fire spread influence
 * - Moderate: 10-29 km/h - steady fire spread
 * - Strong: 30-49 km/h - rapid fire spread and ember transport
 * - Very Strong: 50-69 km/h - dangerous conditions, long-range spotting
 * - Extreme: 70+ km/h - catastrophic fire behavior, extreme spotting
 */
function generateWindDescription(windSpeed: number, windDirection: string): string {
  let strength = '';
  if (windSpeed < 10) {
    strength = 'light';
  } else if (windSpeed < 30) {
    strength = 'moderate';
  } else if (windSpeed < 50) {
    strength = 'strong';
  } else if (windSpeed < 70) {
    strength = 'very strong';
  } else {
    strength = 'extreme';
  }

  const directionName = windDirection.toLowerCase();
  return `${strength} ${directionName} winds`;
}

/**
 * Calculates fire dimensions from perimeter bounding box.
 * Returns area in hectares, extent in kilometres (N-S and E-W), and shape descriptor.
 */
function calculateFireDimensions(perimeter: GenerationRequest['perimeter']): {
  areaHectares: number;
  extentNorthSouthKm: number;
  extentEastWestKm: number;
  shape: string;
} {
  // Calculate area in square metres, convert to hectares
  const areaM2 = area(perimeter);
  const areaHectares = areaM2 / 10_000;

  // Get bounding box [minLng, minLat, maxLng, maxLat]
  const [minLng, minLat, maxLng, maxLat] = bbox(perimeter);

  // Calculate mid-latitude for more accurate longitude conversion
  const midLat = (minLat + maxLat) / 2;

  // Latitude degrees to km (approximately constant globally)
  const kmPerDegreeLat = 111.0;

  // Longitude degrees to km (varies with latitude)
  // At the equator it's ~111km, at NSW latitudes (~-33°) it's ~93km
  const kmPerDegreeLng = 111.0 * Math.cos((midLat * Math.PI) / 180);

  // Calculate extents
  const latDiff = maxLat - minLat;
  const lngDiff = maxLng - minLng;

  const extentNorthSouthKm = latDiff * kmPerDegreeLat;
  const extentEastWestKm = lngDiff * kmPerDegreeLng;

  // Determine fire shape based on aspect ratio
  const aspectRatio = extentNorthSouthKm / extentEastWestKm;
  let shape = 'roughly circular';
  if (aspectRatio > 2) {
    shape = 'elongated north–south';
  } else if (aspectRatio < 0.5) {
    shape = 'elongated east–west';
  } else if (aspectRatio > 1.3) {
    shape = 'extended north–south';
  } else if (aspectRatio < 0.77) {
    shape = 'extended east–west';
  }

  return {
    areaHectares,
    extentNorthSouthKm,
    extentEastWestKm,
    shape,
  };
}

/**
 * Prepares all data needed for prompt template filling.
 */
function preparePromptData(request: GenerationRequest): PromptData {
  const { inputs, geoContext, perimeter } = request;

  if (!geoContext.vegetationType) {
    throw new Error(
      `Invalid geoContext: vegetationType is required. Received: ${JSON.stringify(geoContext)}`
    );
  }

  if (!INTENSITY_VISUALS[inputs.intensity]) {
    throw new Error(
      `Invalid intensity: "${inputs.intensity}". Valid values are: ${Object.keys(INTENSITY_VISUALS).join(', ')}`
    );
  }

  if (!FIRE_STAGE_DESCRIPTIONS[inputs.fireStage]) {
    throw new Error(
      `Invalid fireStage: "${inputs.fireStage}". Valid values are: spotFire, developing, established, major`
    );
  }

  const vegetationDescriptor =
    VEGETATION_DESCRIPTORS[geoContext.vegetationType] || geoContext.vegetationType.toLowerCase();

  const terrainDescription = generateTerrainDescription(geoContext);
  const terrainConfidence = geoContext.confidence;
  const nearbyFeatures = generateNearbyFeatures(geoContext);
  const intensityDescription = INTENSITY_VISUALS[inputs.intensity];
  const fireStage = FIRE_STAGE_DESCRIPTIONS[inputs.fireStage];
  const spreadDirection = determineSpreadDirection(inputs.windDirection);
  const windDescription = generateWindDescription(inputs.windSpeed, inputs.windDirection);
  const timeOfDayLighting = TIME_OF_DAY_LIGHTING[inputs.timeOfDay];

  // Get vegetation type directly (already validated to exist)
  const effectiveVegType = geoContext.vegetationType;

  // Calculate fire dimensions from perimeter
  const { areaHectares, extentNorthSouthKm, extentEastWestKm, shape } = calculateFireDimensions(perimeter);

  // Get vegetation details or fall back to basic descriptor
  const vegetationDetails = VEGETATION_DETAILS[effectiveVegType] || {
    canopyHeight: 'unknown',
    canopyType: 'unknown',
    understorey: 'unknown',
    groundFuel: 'variable',
    fuelLoad: 'unknown',
    flammability: 'unknown',
  };

  return {
    vegetationType: effectiveVegType,
    vegetationDetails,
    vegetationDescriptor,
    terrainDescription,
    terrainConfidence,
    elevation: geoContext.elevation.mean,
    nearbyFeatures,
    fireStage,
    intensityDescription,
    flameHeight: intensityDescription.flameHeight,
    smokeDescription: intensityDescription.smoke,
    spreadDirection,
    windDescription,
    temperature: inputs.temperature,
    humidity: inputs.humidity,
    windSpeed: inputs.windSpeed,
    windDirection: inputs.windDirection,
    timeOfDayLighting,
    explicitFlameHeightM: inputs.flameHeightM,
    explicitRateOfSpreadKmh: inputs.rateOfSpreadKmh,
    fireAreaHectares: areaHectares,
    fireExtentNorthSouthKm: extentNorthSouthKm,
    fireExtentEastWestKm: extentEastWestKm,
    fireShape: shape,
    locality: geoContext.locality,
  };
}

/**
 * Composes a complete prompt from template sections and data.
 */
function composePrompt(template: PromptTemplate, data: PromptData, viewpoint: ViewPoint): string {
  // Gemini best practice: structured, atomic sections separated by line breaks
  // for clarity and independent interpretation by the model
  const sections = [
    template.sections.style,
    template.sections.behaviorPrinciples,
    template.sections.referenceImagery(data),
    template.sections.locality(data),
    template.sections.terrain(data),
    template.sections.features(data),
    template.sections.vegetation(data),
    template.sections.fireGeometry(data),
    template.sections.fireBehavior(data),
    template.sections.weather(data),
    template.sections.perspective(viewpoint),
    template.sections.safety,
  ];

  return sections
    .join('\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * Generates prompts for all requested viewpoints.
 *
 * @param request - Generation request with perimeter, inputs, geo context, and requested views
 * @param template - Optional custom template (defaults to DEFAULT_PROMPT_TEMPLATE)
 * @returns PromptSet with all generated prompts and metadata
 * @throws Error if prompt contains blocked terms
 */
export function generatePrompts(
  request: GenerationRequest,
  template: PromptTemplate = DEFAULT_PROMPT_TEMPLATE
): PromptSet {
  const promptSetId = getRandomUuid();
  const data = preparePromptData(request);
  const prompts: GeneratedPrompt[] = [];

  for (const viewpoint of request.requestedViews) {
    const promptText = composePrompt(template, data, viewpoint);

    // Validate prompt safety (excluding the safety section which contains negative terms)
    const validation = validatePromptSafety(promptText, template.sections.safety);
    if (!validation.valid) {
      throw new Error(
        `Prompt contains blocked terms: ${validation.blockedTerms.join(', ')}. ` +
          `This indicates a problem with the prompt template or input data.`
      );
    }

    prompts.push({
      viewpoint,
      promptText,
      promptSetId,
      templateVersion: template.version,
    });
  }

  return {
    id: promptSetId,
    templateVersion: template.version,
    prompts,
    createdAt: new Date().toISOString(),
  };
}

export function generatePromptSections(
  request: GenerationRequest,
  viewpoint: ViewPoint,
  template: PromptTemplate = DEFAULT_PROMPT_TEMPLATE
): Record<
  | 'style'
  | 'behaviorPrinciples'
  | 'referenceImagery'
  | 'locality'
  | 'terrain'
  | 'features'
  | 'vegetation'
  | 'fireGeometry'
  | 'fireBehavior'
  | 'weather'
  | 'perspective'
  | 'safety',
  string
> {
  const data = preparePromptData(request);

  return {
    style: template.sections.style,
    behaviorPrinciples: template.sections.behaviorPrinciples,
    referenceImagery: template.sections.referenceImagery(data),
    locality: template.sections.locality(data),
    terrain: template.sections.terrain(data),
    features: template.sections.features(data),
    vegetation: template.sections.vegetation(data),
    fireGeometry: template.sections.fireGeometry(data),
    fireBehavior: template.sections.fireBehavior(data),
    weather: template.sections.weather(data),
    perspective: template.sections.perspective(viewpoint),
    safety: template.sections.safety,
  };
}

function getRandomUuid(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  const timePart = Date.now().toString(16);
  const randPart = Math.random().toString(16).slice(2, 10);
  const extraPart = Math.random().toString(16).slice(2, 10);
  return `${timePart}-${randPart}-${extraPart}`;
}
