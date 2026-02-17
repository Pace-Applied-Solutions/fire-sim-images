/**
 * Prompt generation engine for bushfire scenarios.
 * Converts structured scenario data into detailed, multi-perspective prompts for AI image generation.
 */
import type { GenerationRequest } from '../types.js';
import type { PromptSet, PromptTemplate } from './promptTypes.js';
/**
 * Generates prompts for all requested viewpoints.
 *
 * @param request - Generation request with perimeter, inputs, geo context, and requested views
 * @param template - Optional custom template (defaults to DEFAULT_PROMPT_TEMPLATE)
 * @returns PromptSet with all generated prompts and metadata
 * @throws Error if prompt contains blocked terms
 */
export declare function generatePrompts(request: GenerationRequest, template?: PromptTemplate): PromptSet;
//# sourceMappingURL=promptGenerator.d.ts.map