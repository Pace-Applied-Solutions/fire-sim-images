/**
 * Types for the prompt generation engine.
 */

import type { ViewPoint } from '../types.js';

/**
 * A single prompt for a specific viewpoint.
 */
export interface GeneratedPrompt {
  viewpoint: ViewPoint;
  promptText: string;
  promptSetId: string;
  templateVersion: string;
}

/**
 * Complete set of prompts generated for a scenario.
 */
export interface PromptSet {
  id: string; // UUID
  templateVersion: string;
  prompts: GeneratedPrompt[];
  createdAt: string; // ISO 8601
}

/**
 * Structured template for prompt generation.
 */
export interface PromptTemplate {
  id: string;
  version: string;
  sections: {
    style: string;
    scene: (data: PromptData) => string;
    fire: (data: PromptData) => string;
    weather: (data: PromptData) => string;
    perspective: (viewpoint: ViewPoint) => string;
    safety: string;
  };
}

/**
 * Data used to fill prompt templates.
 */
export interface PromptData {
  vegetationDescriptor: string;
  terrainDescription: string;
  elevation: number;
  nearbyFeatures: string;
  fireStage: string;
  intensityDescription: IntensityVisuals;
  flameHeight: string;
  smokeDescription: string;
  spreadDirection: string;
  windDescription: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  timeOfDayLighting: string;
  /** Explicit flame height in metres (from trainer input) */
  explicitFlameHeightM?: number;
  /** Explicit rate of spread in km/h (from trainer input) */
  explicitRateOfSpreadKmh?: number;
}

/**
 * Visual characteristics for a given fire intensity level.
 */
export interface IntensityVisuals {
  flameHeight: string;
  smoke: string;
  crownInvolvement: string;
  spotting: string;
  descriptor: string;
}
