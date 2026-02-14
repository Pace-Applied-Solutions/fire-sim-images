/**
 * Prompt generation engine for bushfire scenarios.
 * Converts structured scenario data into detailed, multi-perspective prompts for AI image generation.
 */

import crypto from 'node:crypto';
import type { GenerationRequest, ViewPoint } from '../types.js';
import { VEGETATION_DESCRIPTORS } from '../constants.js';
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
 */
const BLOCKED_TERMS = [
  'explosion',
  'destruction',
  'casualties',
  'violence',
  'death',
  'people',
  'human',
  'person',
  'animal',
  'wildlife',
  'injury',
  'victim',
  'destroy',
  'devastation',
];

/**
 * Validates that a prompt does not contain blocked terms.
 */
function validatePromptSafety(promptText: string): { valid: boolean; blockedTerms: string[] } {
  const lowerPrompt = promptText.toLowerCase();
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

  const descriptions = geoContext.nearbyFeatures
    .map((feature) => featureMap[feature] || feature)
    .filter(Boolean);

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
 * Prepares all data needed for prompt template filling.
 */
function preparePromptData(request: GenerationRequest): PromptData {
  const { inputs, geoContext } = request;

  const vegetationDescriptor =
    VEGETATION_DESCRIPTORS[geoContext.vegetationType] || geoContext.vegetationType.toLowerCase();

  const terrainDescription = generateTerrainDescription(geoContext);
  const nearbyFeatures = generateNearbyFeatures(geoContext);
  const intensityDescription = INTENSITY_VISUALS[inputs.intensity];
  const fireStage = FIRE_STAGE_DESCRIPTIONS[inputs.fireStage];
  const spreadDirection = determineSpreadDirection(inputs.windDirection);
  const windDescription = generateWindDescription(inputs.windSpeed, inputs.windDirection);
  const timeOfDayLighting = TIME_OF_DAY_LIGHTING[inputs.timeOfDay];

  return {
    vegetationDescriptor,
    terrainDescription,
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
  };
}

/**
 * Composes a complete prompt from template sections and data.
 */
function composePrompt(
  template: PromptTemplate,
  data: PromptData,
  viewpoint: ViewPoint
): string {
  const sections = [
    template.sections.style,
    template.sections.scene(data),
    template.sections.fire(data),
    template.sections.weather(data),
    template.sections.perspective(viewpoint),
    template.sections.safety,
  ];

  return sections.join(' ').replace(/\s+/g, ' ').trim();
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
  const promptSetId = crypto.randomUUID();
  const data = preparePromptData(request);
  const prompts: GeneratedPrompt[] = [];

  for (const viewpoint of request.requestedViews) {
    const promptText = composePrompt(template, data, viewpoint);

    // Validate prompt safety
    const validation = validatePromptSafety(promptText);
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
