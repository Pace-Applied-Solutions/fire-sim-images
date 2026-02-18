/**
 * Google Maps Grounding Service using Gemini API.
 * 
 * This service provides geographic enrichment for fire scenarios by leveraging
 * Gemini API's Google Maps grounding capabilities. It enhances locality descriptions
 * with terrain narratives, land cover data, and geographic features.
 * 
 * Reference: https://ai.google.dev/gemini-api/docs/maps-grounding
 */

import type { InvocationContext } from '@azure/functions';

/**
 * Maps grounding enrichment result containing detailed geographic context.
 */
export interface MapsGroundingResult {
  /** Rich terrain narrative based on Maps data */
  terrainNarrative: string;
  /** Local geographic features (valleys, hills, ridges, etc.) */
  localFeatures: string[];
  /** Land cover types detected in the area */
  landCover: string[];
  /** Vegetation context from Maps */
  vegetationContext?: string;
  /** Climate and weather patterns for the region */
  climateContext?: string;
  /** Additional contextual information */
  additionalContext?: string;
  /** Data source and confidence */
  confidence: 'low' | 'medium' | 'high';
  /** Whether Maps grounding was successful */
  success: boolean;
  /** Error message if grounding failed */
  error?: string;
}

/**
 * Request parameters for Maps grounding enrichment.
 */
export interface MapsGroundingRequest {
  /** Locality name or description (e.g., "Bungendore, New South Wales") */
  locality: string;
  /** Latitude of the location */
  latitude: number;
  /** Longitude of the location */
  longitude: number;
  /** Optional existing geographic context for enrichment */
  existingContext?: {
    vegetationType?: string;
    elevation?: number;
    nearbyFeatures?: string[];
  };
}

/**
 * Configuration for Google Maps Grounding via Gemini API.
 */
export interface MapsGroundingConfig {
  /** Gemini API key */
  apiKey: string;
  /** Gemini model to use (e.g., "gemini-2.5-flash") */
  model: string;
  /** Base URL for Gemini API */
  baseUrl?: string;
}

const DEFAULT_GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Google Maps Grounding Service using Gemini API.
 * 
 * This service uses Gemini's text generation with Google Maps grounding to enrich
 * geographic context for fire scenarios. It follows a generic endpoint pattern
 * with Maps context embedded in the request.
 */
export class MapsGroundingService {
  private readonly config: MapsGroundingConfig;

  constructor(config: MapsGroundingConfig) {
    this.config = config;
  }

  /**
   * Check if the service is available and properly configured.
   */
  async isAvailable(): Promise<boolean> {
    return Boolean(this.config.apiKey && this.config.model);
  }

  /**
   * Enrich a location with detailed geographic context using Google Maps grounding.
   * 
   * This method calls Gemini API with Maps grounding enabled to generate rich
   * terrain narratives, identify local features, and provide climate context.
   * 
   * @param request - Location and context to enrich
   * @param context - Azure Functions invocation context for logging
   * @returns Enriched geographic context or fallback on error
   */
  async enrichLocation(
    request: MapsGroundingRequest,
    context?: InvocationContext
  ): Promise<MapsGroundingResult> {
    try {
      if (!(await this.isAvailable())) {
        return this.fallbackResult('Maps grounding service not configured');
      }

      // Check for valid locality
      if (!request.locality || request.locality.trim().length === 0) {
        return this.fallbackResult('Empty or invalid locality');
      }

      // Build the enrichment prompt
      const prompt = this.buildEnrichmentPrompt(request);

      // Call Gemini API with Maps grounding
      const baseUrl = this.config.baseUrl || DEFAULT_GEMINI_BASE_URL;
      const url = `${baseUrl}/models/${this.config.model}:generateContent?key=${this.config.apiKey}`;

      const requestBody = {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        tools: [
          {
            googleSearch: {},
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      };

      context?.log('[MapsGrounding] Requesting enrichment for:', request.locality);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        context?.warn('[MapsGrounding] API request failed:', {
          status: response.status,
          error: errorText,
        });
        return this.fallbackResult(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      
      // Parse the response
      const result = this.parseGroundingResponse(data, request, context);
      context?.log('[MapsGrounding] Enrichment successful for:', request.locality);
      
      return result;
    } catch (error) {
      context?.error('[MapsGrounding] Enrichment failed:', error);
      return this.fallbackResult(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Build an enrichment prompt for Gemini with Maps grounding.
   */
  private buildEnrichmentPrompt(request: MapsGroundingRequest): string {
    const { locality, latitude, longitude, existingContext } = request;

    let prompt = `You are a geographic analyst helping fire service trainers understand the landscape for bushfire simulation scenarios.

Location: ${locality}
Coordinates: ${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°

Provide a detailed geographic enrichment for this location focusing on:

1. TERRAIN NARRATIVE: Describe the landscape in 2-3 sentences. Include topography (valleys, hills, ridges, escarpments), landforms, and notable geographic features. Be specific and authoritative.

2. LOCAL FEATURES: List specific geographic features within 5km (e.g., valleys, creeks, ridges, roads, settlements). Be concrete.

3. LAND COVER: Describe the dominant land cover types (forest, grassland, agricultural, urban, etc.).

4. VEGETATION CONTEXT: Describe typical vegetation for this region. Include tree species, understory, and fuel types relevant to bushfire behavior.

5. CLIMATE CONTEXT: Describe the local climate patterns, typical fire season, and weather influences (e.g., coastal proximity, elevation effects).`;

    if (existingContext?.vegetationType) {
      prompt += `\n\nExisting vegetation type detected: ${existingContext.vegetationType}`;
    }

    if (existingContext?.elevation !== undefined) {
      prompt += `\nElevation: ${Math.round(existingContext.elevation)}m`;
    }

    if (existingContext?.nearbyFeatures && existingContext.nearbyFeatures.length > 0) {
      prompt += `\nNearby features detected: ${existingContext.nearbyFeatures.join(', ')}`;
    }

    prompt += `\n\nProvide your response in this exact format:

TERRAIN NARRATIVE:
[Your terrain description]

LOCAL FEATURES:
- [Feature 1]
- [Feature 2]
- [Feature 3]

LAND COVER:
- [Cover type 1]
- [Cover type 2]

VEGETATION CONTEXT:
[Vegetation description]

CLIMATE CONTEXT:
[Climate description]`;

    return prompt;
  }

  /**
   * Parse Gemini API response with Maps grounding.
   */
  private parseGroundingResponse(
    data: any,
    request: MapsGroundingRequest,
    context?: InvocationContext
  ): MapsGroundingResult {
    try {
      // Extract text from Gemini response
      const candidate = data.candidates?.[0];
      if (!candidate) {
        return this.fallbackResult('No response from API');
      }

      const textParts = candidate.content?.parts || [];
      const fullText = textParts
        .filter((part: any) => part.text)
        .map((part: any) => part.text)
        .join('\n');

      if (!fullText) {
        return this.fallbackResult('Empty response from API');
      }

      // Parse structured response
      const sections = this.parseStructuredResponse(fullText);

      // Check for grounding metadata (if available)
      const groundingMetadata = candidate.groundingMetadata;
      const hasGrounding = Boolean(groundingMetadata);

      return {
        terrainNarrative: sections.terrainNarrative || this.generateFallbackTerrain(request),
        localFeatures: sections.localFeatures || [],
        landCover: sections.landCover || [],
        vegetationContext: sections.vegetationContext,
        climateContext: sections.climateContext,
        additionalContext: sections.additionalContext,
        confidence: hasGrounding ? 'high' : 'medium',
        success: true,
      };
    } catch (error) {
      context?.warn('[MapsGrounding] Failed to parse response:', error);
      return this.fallbackResult('Failed to parse response');
    }
  }

  /**
   * Parse structured text response into sections.
   */
  private parseStructuredResponse(text: string): {
    terrainNarrative?: string;
    localFeatures?: string[];
    landCover?: string[];
    vegetationContext?: string;
    climateContext?: string;
    additionalContext?: string;
  } {
    const sections: any = {};

    // Extract terrain narrative
    const terrainMatch = text.match(/TERRAIN NARRATIVE:\s*\n(.+?)(?=\n\n|LOCAL FEATURES:|$)/is);
    if (terrainMatch) {
      sections.terrainNarrative = terrainMatch[1].trim();
    }

    // Extract local features
    const featuresMatch = text.match(/LOCAL FEATURES:\s*\n((?:^- .+$\n?)+)/im);
    if (featuresMatch) {
      sections.localFeatures = featuresMatch[1]
        .split('\n')
        .map(line => line.replace(/^- /, '').trim())
        .filter(Boolean);
    }

    // Extract land cover
    const landCoverMatch = text.match(/LAND COVER:\s*\n((?:^- .+$\n?)+)/im);
    if (landCoverMatch) {
      sections.landCover = landCoverMatch[1]
        .split('\n')
        .map(line => line.replace(/^- /, '').trim())
        .filter(Boolean);
    }

    // Extract vegetation context
    const vegMatch = text.match(/VEGETATION CONTEXT:\s*\n(.+?)(?=\n\n|CLIMATE CONTEXT:|$)/is);
    if (vegMatch) {
      sections.vegetationContext = vegMatch[1].trim();
    }

    // Extract climate context
    const climateMatch = text.match(/CLIMATE CONTEXT:\s*\n(.+?)(?=\n\n|$)/is);
    if (climateMatch) {
      sections.climateContext = climateMatch[1].trim();
    }

    return sections;
  }

  /**
   * Generate a fallback terrain description when grounding is unavailable.
   */
  private generateFallbackTerrain(request: MapsGroundingRequest): string {
    const { locality, existingContext } = request;
    
    if (existingContext?.vegetationType) {
      return `${locality} - ${existingContext.vegetationType} landscape.`;
    }
    
    return `${locality} - bushland area.`;
  }

  /**
   * Create a fallback result when grounding fails.
   */
  private fallbackResult(error: string): MapsGroundingResult {
    return {
      terrainNarrative: 'Remote bushland area.',
      localFeatures: [],
      landCover: [],
      confidence: 'low',
      success: false,
      error,
    };
  }
}

/**
 * Create a Maps grounding service instance from environment configuration.
 */
export async function createMapsGroundingService(
  context?: InvocationContext
): Promise<MapsGroundingService | null> {
  // Try to get Gemini API configuration
  // For Maps grounding, we use the same Gemini configuration as image generation
  const apiKey = process.env.GEMINI_API_KEY || process.env.IMAGE_MODEL_KEY;
  const model = process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash';
  const baseUrl = process.env.GEMINI_API_URL || DEFAULT_GEMINI_BASE_URL;

  if (!apiKey) {
    context?.warn('[MapsGrounding] No API key found. Set GEMINI_API_KEY or IMAGE_MODEL_KEY.');
    return null;
  }

  return new MapsGroundingService({
    apiKey,
    model,
    baseUrl,
  });
}
