/**
 * Locality Agent - Geographic Research and Terrain Narrative Generation
 * 
 * This agent is part of the multi-agent prompt pipeline. It researches geographic
 * context for fire scenarios and generates rich terrain narratives using Google Maps
 * grounding via Gemini API.
 * 
 * Responsibilities:
 * - Enrich locality descriptions with authoritative map data
 * - Generate detailed terrain narratives (valleys, hills, ridges, etc.)
 * - Extract local features and land cover information
 * - Provide vegetation and climate context specific to the region
 * - Improve geographic accuracy beyond basic lookup tables
 */

import type { InvocationContext } from '@azure/functions';
import type { GeoContext } from '@fire-sim/shared';
import {
  MapsGroundingService,
  createMapsGroundingService,
  type MapsGroundingResult,
} from './mapsGroundingService.js';

/**
 * Locality agent enrichment result.
 * Extends the basic GeoContext with Maps-grounded enhancements.
 */
export interface LocalityEnrichment {
  /** Enhanced terrain narrative using Maps data */
  terrainNarrative: string;
  /** Local geographic features identified */
  localFeatures: string[];
  /** Land cover types in the area */
  landCover: string[];
  /** Vegetation context for the region */
  vegetationContext?: string;
  /** Climate patterns and fire season context */
  climateContext?: string;
  /** Data source and confidence level */
  dataSource: string;
  confidence: 'low' | 'medium' | 'high';
  /** Whether Maps grounding was used successfully */
  mapsGroundingUsed: boolean;
}

/**
 * Locality Agent for geographic enrichment in the prompt pipeline.
 * 
 * This agent uses Google Maps grounding to provide rich, authoritative geographic
 * context that enhances the realism and accuracy of generated fire scenario prompts.
 */
export class LocalityAgent {
  private mapsService: MapsGroundingService | null = null;

  constructor(mapsService?: MapsGroundingService | null) {
    this.mapsService = mapsService || null;
  }

  /**
   * Initialize the locality agent with Maps grounding service.
   */
  static async create(context?: InvocationContext): Promise<LocalityAgent> {
    const mapsService = await createMapsGroundingService(context);
    return new LocalityAgent(mapsService);
  }

  /**
   * Enrich geographic context with detailed locality information.
   * 
   * This is the main agent method that coordinates Maps grounding enrichment
   * with fallback to basic lookups when Maps grounding is unavailable.
   * 
   * @param geoContext - Basic geographic context from geospatial lookups
   * @param centroid - Fire perimeter centroid [longitude, latitude]
   * @param context - Azure Functions invocation context for logging
   * @returns Enhanced locality information
   */
  async enrichLocality(
    geoContext: GeoContext,
    centroid: [number, number],
    context?: InvocationContext
  ): Promise<LocalityEnrichment> {
    // If no locality or Maps service unavailable, return basic enrichment
    if (!geoContext.locality || !this.mapsService) {
      return this.basicEnrichment(geoContext);
    }

    try {
      // Check if Maps service is available
      const available = await this.mapsService.isAvailable();
      if (!available) {
        context?.log('[LocalityAgent] Maps grounding not available, using basic enrichment');
        return this.basicEnrichment(geoContext);
      }

      // Request Maps grounding enrichment
      const [longitude, latitude] = centroid;
      const mapsResult = await this.mapsService.enrichLocation(
        {
          locality: geoContext.locality,
          latitude,
          longitude,
          existingContext: {
            vegetationType: geoContext.vegetationType,
            elevation: geoContext.elevation.mean,
            nearbyFeatures: geoContext.nearbyFeatures,
          },
        },
        context
      );

      // Return enriched result if successful
      if (mapsResult.success) {
        return this.fromMapsGrounding(mapsResult, geoContext);
      }

      // Fall back to basic enrichment on error
      context?.warn('[LocalityAgent] Maps grounding failed, using basic enrichment:', mapsResult.error);
      return this.basicEnrichment(geoContext);
    } catch (error) {
      context?.error('[LocalityAgent] Enrichment error:', error);
      return this.basicEnrichment(geoContext);
    }
  }

  /**
   * Convert Maps grounding result to locality enrichment.
   */
  private fromMapsGrounding(
    mapsResult: MapsGroundingResult,
    geoContext: GeoContext
  ): LocalityEnrichment {
    return {
      terrainNarrative: mapsResult.terrainNarrative,
      localFeatures: mapsResult.localFeatures,
      landCover: mapsResult.landCover,
      vegetationContext: mapsResult.vegetationContext,
      climateContext: mapsResult.climateContext,
      dataSource: `Google Maps Grounding (${geoContext.dataSource})`,
      confidence: mapsResult.confidence,
      mapsGroundingUsed: true,
    };
  }

  /**
   * Generate basic locality enrichment as fallback.
   * Uses simple lookup-based descriptions when Maps grounding is unavailable.
   */
  private basicEnrichment(geoContext: GeoContext): LocalityEnrichment {
    const terrainNarrative = this.generateBasicTerrain(geoContext);
    const localFeatures = this.extractBasicFeatures(geoContext);

    return {
      terrainNarrative,
      localFeatures,
      landCover: [],
      dataSource: geoContext.dataSource,
      confidence: 'low',
      mapsGroundingUsed: false,
    };
  }

  /**
   * Generate basic terrain description from geo context.
   * This is the fallback when Maps grounding is not available.
   */
  private generateBasicTerrain(geoContext: GeoContext): string {
    const locality = geoContext.locality || 'the area';
    const vegetation = geoContext.vegetationType || 'bushland';
    const slope = geoContext.slope.mean;

    let terrainType = 'flat terrain';
    if (slope >= 35) {
      terrainType = 'very steep escarpment';
    } else if (slope >= 25) {
      terrainType = 'steep slopes';
    } else if (slope >= 15) {
      terrainType = 'moderate slopes';
    } else if (slope >= 5) {
      terrainType = 'gently sloping terrain';
    }

    return `${locality} - ${vegetation} on ${terrainType}.`;
  }

  /**
   * Extract basic features from geo context.
   */
  private extractBasicFeatures(geoContext: GeoContext): string[] {
    if (!geoContext.nearbyFeatures || geoContext.nearbyFeatures.length === 0) {
      return [];
    }

    const featureMap: Record<string, string> = {
      road: 'Road nearby',
      escarpment: 'Steep escarpment',
      river: 'River valley',
      residential_area: 'Residential areas in distance',
      rural_residential: 'Rural properties',
    };

    return geoContext.nearbyFeatures
      .map((feature) => featureMap[feature] || feature)
      .filter(Boolean);
  }
}
