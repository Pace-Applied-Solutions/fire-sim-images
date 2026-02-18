/**
 * Context Parser Agent - Structure and Validate Geographic Inputs
 * 
 * This agent is part of the multi-agent prompt pipeline. It structures raw inputs
 * from the generation request and validates geographic enrichments from other agents.
 * 
 * Responsibilities:
 * - Parse and validate generation request inputs
 * - Extract fire perimeter centroid and bounds
 * - Structure geographic context for downstream agents
 * - Validate and merge enrichments from locality agent
 * - Prepare prompt data with Maps-enhanced context
 */

import centroid from '@turf/centroid';
import type { GenerationRequest } from '@fire-sim/shared';
import type { LocalityEnrichment } from './localityAgent.js';

/**
 * Parsed context ready for prompt generation.
 * Combines structured inputs with geographic enrichments.
 */
export interface ParsedContext {
  /** Fire perimeter centroid [longitude, latitude] */
  centroid: [number, number];
  /** Original generation request */
  request: GenerationRequest;
  /** Locality enrichment (if available) */
  locality?: LocalityEnrichment;
  /** Additional metadata */
  metadata: {
    parsedAt: string;
    mapsGroundingAvailable: boolean;
  };
}

/**
 * Context Parser Agent for the multi-agent prompt pipeline.
 * 
 * This agent ensures all geographic inputs are properly structured and validated
 * before being used in prompt generation.
 */
export class ContextParserAgent {
  /**
   * Parse and structure a generation request with optional locality enrichment.
   * 
   * @param request - Raw generation request from the client
   * @param localityEnrichment - Optional locality enrichment from locality agent
   * @returns Structured context ready for prompt generation
   */
  parse(
    request: GenerationRequest,
    localityEnrichment?: LocalityEnrichment
  ): ParsedContext {
    // Validate required fields
    this.validateRequest(request);

    // Extract centroid from perimeter
    const centroidFeature = centroid(request.perimeter);
    const coords = centroidFeature.geometry.coordinates as [number, number];

    return {
      centroid: coords,
      request,
      locality: localityEnrichment,
      metadata: {
        parsedAt: new Date().toISOString(),
        mapsGroundingAvailable: Boolean(localityEnrichment?.mapsGroundingUsed),
      },
    };
  }

  /**
   * Validate generation request for required fields.
   */
  private validateRequest(request: GenerationRequest): void {
    if (!request.perimeter) {
      throw new Error('Generation request missing perimeter');
    }

    if (!request.inputs) {
      throw new Error('Generation request missing inputs');
    }

    if (!request.geoContext) {
      throw new Error('Generation request missing geoContext');
    }

    if (!request.geoContext.vegetationType) {
      throw new Error('GeoContext missing vegetationType');
    }

    if (!request.requestedViews || request.requestedViews.length === 0) {
      throw new Error('Generation request missing requestedViews');
    }
  }

  /**
   * Merge locality enrichment into geo context.
   * This preserves original geo context while adding Maps-enhanced data.
   */
  mergeEnrichment(
    request: GenerationRequest,
    enrichment: LocalityEnrichment
  ): GenerationRequest {
    return {
      ...request,
      geoContext: {
        ...request.geoContext,
        // Preserve existing nearby features and add new ones from Maps
        nearbyFeatures: [
          ...(request.geoContext.nearbyFeatures || []),
          ...enrichment.localFeatures,
        ].filter((v, i, a) => a.indexOf(v) === i), // Remove duplicates
      },
    };
  }
}
