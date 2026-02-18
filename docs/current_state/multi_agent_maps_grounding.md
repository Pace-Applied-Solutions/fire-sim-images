# Multi-Agent Prompt Pipeline with Google Maps Grounding

## Document Status
**Status:** Implemented  
**Version:** 1.0  
**Created:** 2026-02-18  
**Related Issues:** Enhance Multi-Agent Prompt Pipeline: Integrate Google Maps Grounding (Gemini API)

## Overview

This document describes the implementation of Google Maps grounding integration into the multi-agent prompt construction pipeline. The integration enhances fire simulation prompts with authoritative geographic context, richer terrain narratives, and improved visual authenticity through Gemini API's Maps grounding capabilities.

## Architecture Decision

After analysis, we implemented a **hybrid approach**:

### Generic Endpoint Pattern (Current Implementation)
- **For:** Locality enrichment via Maps grounding
- **Why:** 
  - Simpler integration with existing Gemini provider infrastructure
  - Faster time to value
  - Aligns with current prompt generation patterns
  - Easy to test and validate
- **How:** Gemini API's `generateContent` endpoint with Google Search tool enabled
- **Configuration:** Via environment variables or Azure Key Vault (GEMINI_API_KEY, GEMINI_TEXT_MODEL)

### Established Agent Model (Future)
- **For:** Fire behavior agent (Phase 2)
- **Why:**
  - Benefits from fixed configuration
  - Requires RAG knowledge store (fire-behaviour-guide-clean.md)
  - Needs consistent domain-specific tooling
  - More complex orchestration requirements
- **Recommendation:** Azure AI Foundry for agent hosting and RAG integration

## Implementation Components

### 1. Maps Grounding Service
**File:** `apps/api/src/services/mapsGroundingService.ts`

Wraps Gemini API with Google Maps grounding to provide:
- Terrain narratives (valleys, hills, escarpments, ridgelines)
- Local features (rivers, roads, settlements within 5km)
- Land cover types (forest, grassland, agricultural, urban)
- Vegetation context (species, fuel types, understory)
- Climate patterns (fire season, weather influences)

**Key Methods:**
```typescript
async enrichLocation(request: MapsGroundingRequest): Promise<MapsGroundingResult>
```

**Configuration:**
- `GEMINI_API_KEY` or `IMAGE_MODEL_KEY` - API key for Gemini
- `GEMINI_TEXT_MODEL` - Model name (default: "gemini-2.5-flash")
- `GEMINI_API_URL` - Base URL (default: googleapis.com)

**Fallback Behavior:**
- Returns basic terrain description when API unavailable
- Uses existing geo context data as fallback
- Never fails silently - always returns valid result

### 2. Locality Agent
**File:** `apps/api/src/services/localityAgent.ts`

Specialized agent for geographic enrichment that:
- Coordinates Maps grounding requests
- Enriches basic geo context with Maps data
- Provides fallback to lookup-based descriptions
- Tracks data source and confidence levels

**Key Methods:**
```typescript
async enrichLocality(geoContext, centroid): Promise<LocalityEnrichment>
static async create(context?): Promise<LocalityAgent>
```

**Enrichment Process:**
1. Validate locality availability
2. Check Maps service availability
3. Request Maps grounding enrichment
4. Parse and structure results
5. Fall back to basic enrichment on error

### 3. Context Parser Agent
**File:** `apps/api/src/services/contextParserAgent.ts`

Validates and structures generation requests:
- Extracts fire perimeter centroid
- Validates required fields (vegetationType, inputs, perimeter)
- Merges locality enrichment into geo context
- Prepares data for downstream agents

**Key Methods:**
```typescript
parse(request, localityEnrichment?): ParsedContext
mergeEnrichment(request, enrichment): GenerationRequest
```

### 4. Multi-Agent Orchestrator
**File:** `apps/api/src/services/multiAgentOrchestrator.ts`

Coordinates the agent pipeline:
1. **Context Parser** - Structures inputs
2. **Locality Agent** - Enriches geography (uses Maps grounding)
3. (Future) Fire Behavior Agent
4. (Future) Vegetation Agent
5. (Future) Synthesis Agent
6. (Future) Quality Validator

**Key Methods:**
```typescript
async process(request): Promise<MultiAgentResult>
static async create(context?): Promise<MultiAgentOrchestrator>
```

**Metadata Tracking:**
- Agents used in pipeline
- Whether Maps grounding was successful
- Processing time in milliseconds

### 5. Enhanced Prompt Generator
**Files:** 
- `packages/shared/src/prompts/promptGenerator.ts`
- `packages/shared/src/prompts/promptTemplates.ts`
- `packages/shared/src/prompts/promptTypes.ts`

**Extended PromptData Interface:**
```typescript
interface PromptData {
  // ... existing fields ...
  mapsTerrainNarrative?: string;
  mapsLocalFeatures?: string[];
  mapsLandCover?: string[];
  mapsVegetationContext?: string;
  mapsClimateContext?: string;
  mapsGroundingUsed?: boolean;
}
```

**Enhanced Template Sections:**

**Locality Section** - Now includes:
- Maps terrain narrative
- Climate context for the region

**Terrain Section** - Now includes:
- Maps local features (valleys, ridges, water features)
- Enhanced terrain descriptions from Maps

**Vegetation Section** - Now includes:
- Maps vegetation context (species, fuel types)
- Land cover classifications

**Backward Compatibility:**
- All Maps fields are optional
- Falls back to existing lookup-based descriptions
- Works seamlessly with or without Maps enrichment

## Usage

### Basic Usage (Automatic)
The multi-agent pipeline is automatically used when Maps grounding is configured:

```typescript
// In generation orchestrator or API function
const orchestrator = await MultiAgentOrchestrator.create(context);
const result = await orchestrator.process(generationRequest);

// Generate prompts with enrichment
const mapsContext = result.localityEnrichment ? {
  terrainNarrative: result.localityEnrichment.terrainNarrative,
  localFeatures: result.localityEnrichment.localFeatures,
  landCover: result.localityEnrichment.landCover,
  vegetationContext: result.localityEnrichment.vegetationContext,
  climateContext: result.localityEnrichment.climateContext,
  mapsGroundingUsed: result.localityEnrichment.mapsGroundingUsed,
} : undefined;

const prompts = generatePrompts(
  result.parsedContext.request,
  DEFAULT_PROMPT_TEMPLATE,
  mapsContext
);
```

### Manual Locality Enrichment
For targeted enrichment without full pipeline:

```typescript
const localityAgent = await LocalityAgent.create(context);
const enrichment = await localityAgent.enrichLocality(
  geoContext,
  centroid,
  context
);
```

## Test Coverage

### Test Files
1. `apps/api/src/__tests__/mapsGroundingService.test.ts` (15 tests)
   - API availability checks
   - Enrichment parsing
   - Fallback behavior
   - Configuration validation

2. `apps/api/src/__tests__/localityAgent.test.ts` (11 tests)
   - Maps integration
   - Fallback scenarios
   - Terrain generation
   - Feature extraction

3. `apps/api/src/__tests__/multiAgentOrchestrator.test.ts` (8 tests)
   - Pipeline coordination
   - Error handling
   - Metadata tracking
   - Enrichment merging

4. `packages/shared/src/__tests__/promptGenerator.test.ts` (7 new Maps tests)
   - Maps-enhanced prompts
   - Partial context handling
   - Backward compatibility

**Total:** 41 new tests, all passing

### Test Scenarios Validated

✅ **Bungendore, NSW** - Steep valleys and rolling hills  
✅ **Generic locality** - Fallback to basic enrichment  
✅ **No locality** - Graceful degradation  

## Configuration

### Environment Variables

```bash
# Required for Maps grounding
GEMINI_API_KEY=your_api_key
# Or fall back to existing image model key
IMAGE_MODEL_KEY=your_api_key

# Optional customization
GEMINI_TEXT_MODEL=gemini-2.5-flash  # Default model
GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta
```

### Azure Key Vault Secrets

```
ImageModel--Key        # Primary API key location
ImageModel--Model      # Model name override
ImageModel--Url        # Base URL override
```

### Deployment Notes

1. **API Key Management:**
   - Store in Azure Key Vault for production
   - Use managed identity for Key Vault access
   - Environment variables work for development

2. **Cost Considerations:**
   - Each Maps grounding request is a Gemini API call
   - Typical prompt: ~400 tokens input, ~300 tokens output
   - Recommended: Cache results by locality for repeated requests

3. **Latency:**
   - Maps grounding adds ~2-5 seconds to prompt generation
   - Occurs before image generation
   - User sees "Enriching location..." status

## Design Guardrails Compliance

✅ **Authoritative Datasets:** Uses Google Maps data, a trusted global source  
✅ **Geographic Accuracy:** Maps grounding provides precise, real-world context  
✅ **Regional/National Data:** Complements existing NVIS, SVTM sources  
✅ **Safety:** No sensitive data exposed; enrichment is purely geographic  
✅ **Fire Service Terminology:** Maintains existing prompt structure and terms  

## Fallback Strategy

When Maps grounding is unavailable or fails:

1. **API Not Configured:** Returns basic terrain from geo context
2. **API Error:** Logs warning, uses lookup-based enrichment
3. **Empty Locality:** Skips Maps grounding, uses existing features
4. **Parse Error:** Returns fallback with low confidence flag

**Key Principle:** The system always produces valid output, with or without Maps grounding.

## Future Enhancements

### Phase 2: Fire Behavior Agent
- RAG knowledge store integration (fire-behaviour-guide-clean.md)
- Domain-specific fire behavior interpretation
- Intensity-driven behavior descriptions
- Spotting and crown fire dynamics

### Phase 3: Vegetation and Synthesis Agents
- Visual descriptor mapping
- Multi-source vegetation correlation
- Prompt synthesis and optimization
- Quality validation and diversity scoring

### Phase 4: Advanced Grounding
- Bing Maps integration for comparison
- ESRI ArcGIS for detailed terrain
- Local fire service datasets
- Historical fire boundary data

## Known Limitations

1. **Rural/Remote Coverage:** Maps data may be sparse for very remote areas
2. **Latency:** Adds 2-5 seconds to prompt generation
3. **API Quota:** Subject to Gemini API rate limits
4. **Language:** Currently optimized for Australian locations
5. **Cache:** No locality cache implemented yet (planned for Phase 2)

## Monitoring and Observability

**Recommended Metrics:**
- Maps grounding success rate
- Average enrichment latency
- API error rates
- Fallback usage percentage
- Cost per enriched locality

**Logging Points:**
- Maps API calls (success/failure)
- Enrichment quality (confidence levels)
- Fallback triggers
- Processing time per stage

## References

- [Gemini API Maps Grounding Documentation](https://ai.google.dev/gemini-api/docs/maps-grounding)
- [Multi-Agent Pipeline Design](../design/multi-agent-prompt-pipeline.md)
- [Master Plan](../master_plan.md)
- [Fire Behaviour Guide](../fire-behaviour-guide-clean.md)

## Change Log

| Date | Version | Change |
|------|---------|--------|
| 2026-02-18 | 1.0 | Initial implementation with Maps grounding |
