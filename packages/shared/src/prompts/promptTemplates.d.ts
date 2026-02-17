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
export declare const INTENSITY_VISUALS: Record<ScenarioInputs['intensity'], IntensityVisuals>;
/**
 * Time-of-day lighting descriptions.
 * Maps time periods to natural lighting characteristics for AI generation.
 */
export declare const TIME_OF_DAY_LIGHTING: Record<ScenarioInputs['timeOfDay'], string>;
/**
 * Viewpoint perspective descriptions.
 * Defines camera position and angle for each viewpoint type.
 * Ground-level views now include directional narrative for improved context.
 */
export declare const VIEWPOINT_PERSPECTIVES: Record<ViewPoint, string>;
/**
 * Fire stage descriptions.
 * Maps fire stages to natural language for prompts.
 */
export declare const FIRE_STAGE_DESCRIPTIONS: Record<ScenarioInputs['fireStage'], string>;
/**
 * Default prompt template (v1.8.0).
 * Structured template with atomic sections for generating photorealistic bushfire scenario prompts.
 * Version 1.8.0: Added fire behaviour principles section as foundational reference for all image generation.
 */
export declare const DEFAULT_PROMPT_TEMPLATE: PromptTemplate;
//# sourceMappingURL=promptTemplates.d.ts.map