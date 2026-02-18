/**
 * Multi-Agent Prompt Pipeline Orchestrator
 * 
 * Coordinates the multi-agent prompt construction pipeline:
 * 1. Context Parser - Structures raw inputs
 * 2. Locality Agent - Geographic research and terrain narratives (uses Maps grounding)
 * 
 * Future agents to be added:
 * 3. Fire Behavior Agent - Domain-driven fire behavior interpretation
 * 4. Vegetation Agent - Visual descriptor mapping
 * 5. Synthesis Agent - Combines enrichments into focused prompts
 * 6. Quality Validator - Clarity, safety, diversity checks
 */

import type { InvocationContext } from '@azure/functions';
import type { GenerationRequest } from '@fire-sim/shared';
import { ContextParserAgent, type ParsedContext } from './contextParserAgent.js';
import { LocalityAgent, type LocalityEnrichment } from './localityAgent.js';

/**
 * Multi-agent pipeline result.
 * Contains parsed context and enrichments from all agents.
 */
export interface MultiAgentResult {
  /** Structured context from Context Parser */
  parsedContext: ParsedContext;
  /** Locality enrichment from Locality Agent (if available) */
  localityEnrichment?: LocalityEnrichment;
  /** Pipeline metadata */
  metadata: {
    agentsUsed: string[];
    mapsGroundingUsed: boolean;
    processingTimeMs: number;
  };
}

/**
 * Multi-agent prompt pipeline orchestrator.
 * 
 * This orchestrates the flow of data through multiple specialized agents
 * to construct enhanced prompts with Maps-grounded geographic context.
 */
export class MultiAgentOrchestrator {
  private contextParser: ContextParserAgent;
  private localityAgent: LocalityAgent | null = null;

  constructor(localityAgent?: LocalityAgent | null) {
    this.contextParser = new ContextParserAgent();
    this.localityAgent = localityAgent || null;
  }

  /**
   * Initialize the orchestrator with all agents.
   */
  static async create(context?: InvocationContext): Promise<MultiAgentOrchestrator> {
    const localityAgent = await LocalityAgent.create(context);
    return new MultiAgentOrchestrator(localityAgent);
  }

  /**
   * Process a generation request through the multi-agent pipeline.
   * 
   * This is the main orchestration method that coordinates all agents
   * and produces an enriched result ready for prompt generation.
   * 
   * @param request - Raw generation request
   * @param context - Azure Functions invocation context for logging
   * @returns Multi-agent result with all enrichments
   */
  async process(
    request: GenerationRequest,
    context?: InvocationContext
  ): Promise<MultiAgentResult> {
    const startTime = Date.now();
    const agentsUsed: string[] = [];

    try {
      // Stage 1: Context Parser - Structure and validate inputs
      context?.log('[MultiAgent] Stage 1: Context Parser');
      agentsUsed.push('ContextParser');
      
      // Parse without enrichment first to get centroid
      let initialParsed;
      try {
        initialParsed = this.contextParser.parse(request);
      } catch (error) {
        // If validation fails, return error state
        context?.error('[MultiAgent] Context validation failed:', error);
        throw error;
      }

      // Stage 2: Locality Agent - Geographic enrichment with Maps grounding
      let localityEnrichment: LocalityEnrichment | undefined;
      
      if (this.localityAgent) {
        context?.log('[MultiAgent] Stage 2: Locality Agent');
        agentsUsed.push('LocalityAgent');
        
        localityEnrichment = await this.localityAgent.enrichLocality(
          request.geoContext,
          initialParsed.centroid,
          context
        );

        // Merge enrichment back into request
        if (localityEnrichment) {
          const enrichedRequest = this.contextParser.mergeEnrichment(
            request,
            localityEnrichment
          );
          // Re-parse with enriched data
          const finalParsed = this.contextParser.parse(enrichedRequest, localityEnrichment);
          
          const processingTime = Date.now() - startTime;
          context?.log('[MultiAgent] Pipeline complete:', {
            agentsUsed,
            mapsGroundingUsed: localityEnrichment.mapsGroundingUsed,
            processingTimeMs: processingTime,
          });

          return {
            parsedContext: finalParsed,
            localityEnrichment,
            metadata: {
              agentsUsed,
              mapsGroundingUsed: localityEnrichment.mapsGroundingUsed,
              processingTimeMs: processingTime,
            },
          };
        }
      }

      // No locality enrichment available
      const processingTime = Date.now() - startTime;
      context?.log('[MultiAgent] Pipeline complete (no locality enrichment):', {
        agentsUsed,
        processingTimeMs: processingTime,
      });

      return {
        parsedContext: initialParsed,
        metadata: {
          agentsUsed,
          mapsGroundingUsed: false,
          processingTimeMs: processingTime,
        },
      };
    } catch (error) {
      context?.error('[MultiAgent] Pipeline error:', error);
      
      // Return basic parsed context on error
      const basicParsed = this.contextParser.parse(request);
      return {
        parsedContext: basicParsed,
        metadata: {
          agentsUsed,
          mapsGroundingUsed: false,
          processingTimeMs: Date.now() - startTime,
        },
      };
    }
  }
}
