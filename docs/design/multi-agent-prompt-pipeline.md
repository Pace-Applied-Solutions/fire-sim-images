# Multi-Agent Prompt Construction Pipeline Design

## Document Status
**Status:** Design Proposal
**Version:** 1.0
**Created:** 2026-02-17
**Purpose:** Design-only specification for a collaborative agent-driven prompt construction pipeline

## Executive Summary

This design proposes a multi-agent architecture for constructing AI prompts that generate diverse, accurate fire simulation imagery. The current monolithic prompt construction approach produces overly complex, unfocused prompts leading to repetitive outputs. By decomposing prompt construction into specialized agent roles, we can leverage structured inputs and domain knowledge more effectively while maintaining clarity for the image generation model.

### Key Objectives
1. Break down prompt construction into expert-informed, manageable stages
2. Ensure final prompts are concise, highly descriptive, and leverage all user input
3. Incorporate structured inputs and orchestrate knowledge-driven enrichments
4. Improve visual diversity while maintaining geographic and fire behavior accuracy

## Problem Statement

### Current State Analysis

The existing prompt generation system (located in `packages/shared/src/prompts/`) has several characteristics:

**Strengths:**
- Well-structured template system with versioning (currently v1.9.0)
- Clear section organization (style, locality, terrain, vegetation, fire behavior, etc.)
- Comprehensive integration with geospatial data
- Safety validation and blocked term checking

**Pain Points:**
- **Prompt bloat:** Prompts can exceed 1500+ characters, causing the AI model to focus on limited features
- **Flat structure:** All enrichment happens in a single pass with simple lookup tables
- **Limited variability:** Templates use fixed descriptors leading to repetitive outputs
- **Underutilized knowledge:** Rich fire behavior knowledge exists (fire-behaviour-guide-clean.md) but is not dynamically applied
- **Geographic context:** Locality descriptions are basic; locations like "north of Googong NSW" could be enriched with terrain narratives about "steep valleys and rolling hills"
- **Fire behavior:** Parameters are inserted via lookup tables rather than being interpreted through expert knowledge

### Desired State

A prompt construction pipeline where:
1. **Locality Agent** researches geographic context and generates rich terrain narratives
2. **Fire Behavior Agent** interprets scenario parameters through domain knowledge to produce accurate behavioral descriptions
3. **Vegetation Agent** translates vegetation data into visual descriptors that suit the scenario
4. **Synthesis Agent** combines enriched inputs into concise, focused prompts
5. **Quality Agent** validates outputs for clarity, accuracy, and diversity

## Agent Architecture

### Overview Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    GenerationRequest Input                       │
│  (perimeter, inputs, geoContext, requestedViews)                │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────────────┐
        │   Orchestrator (Coordinator)    │
        │  - Manages agent workflow       │
        │  - Handles agent communication  │
        │  - Aggregates results           │
        └────────────┬───────────────────┘
                     │
        ┌────────────┴────────────┬──────────────────┬──────────────┐
        ▼                         ▼                  ▼              ▼
┌──────────────┐      ┌──────────────────┐  ┌──────────────┐  ┌──────────────┐
│   Locality   │      │  Fire Behavior   │  │  Vegetation  │  │   Context    │
│    Agent     │      │      Agent       │  │    Agent     │  │   Parser     │
│              │      │                  │  │              │  │              │
│ - Location   │      │ - Scenario params│  │ - Veg types  │  │ - Structure  │
│   research   │      │ - Domain corpus  │  │ - Visual     │  │   extraction │
│ - Terrain    │      │ - Behavior desc  │  │   mapping    │  │ - Data prep  │
│   narrative  │      │                  │  │              │  │              │
└──────┬───────┘      └────────┬─────────┘  └──────┬───────┘  └──────┬───────┘
       │                       │                     │                 │
       └───────────────────────┼─────────────────────┼─────────────────┘
                               ▼
                  ┌────────────────────────────┐
                  │   Synthesis Agent          │
                  │  - Combines enrichments    │
                  │  - Constructs sections     │
                  │  - Maintains coherence     │
                  │  - Applies templates       │
                  └────────────┬───────────────┘
                               │
                               ▼
                  ┌────────────────────────────┐
                  │   Quality Validator        │
                  │  - Clarity check           │
                  │  - Length validation       │
                  │  - Terminology check       │
                  │  - Safety validation       │
                  │  - Diversity scoring       │
                  └────────────┬───────────────┘
                               │
                               ▼
                  ┌────────────────────────────┐
                  │   Final Prompt Output      │
                  │  (PromptSet for all views) │
                  └────────────────────────────┘
```

### Agent Roles and Responsibilities

#### 1. Context Parser Agent

**Purpose:** Extract and structure raw inputs into agent-consumable format

**Inputs:**
- Raw GenerationRequest (perimeter, inputs, geoContext)

**Outputs:**
```typescript
interface ParsedContext {
  location: {
    coordinates: [number, number];
    locality: string;
    elevation: number;
    slope: { mean: number; max: number };
  };
  fire: {
    areaHectares: number;
    extentNS: number;
    extentEW: number;
    shape: string;
    stage: string;
    intensity: string;
  };
  environment: {
    vegetation: string[];
    temperature: number;
    humidity: number;
    windSpeed: number;
    windDirection: string;
    timeOfDay: string;
  };
  parameters: {
    flameHeightM?: number;
    rateOfSpreadKmh?: number;
  };
}
```

**Key Functions:**
- Validate and normalize input data
- Calculate fire dimensions from perimeter
- Extract all relevant parameters
- Prepare data for downstream agents

**Example Logic:**
```typescript
function parseContext(request: GenerationRequest): ParsedContext {
  const { areaHectares, extentNorthSouthKm, extentEastWestKm, shape } =
    calculateFireDimensions(request.perimeter);

  return {
    location: {
      coordinates: getCentroid(request.perimeter),
      locality: request.geoContext.locality || 'Unknown',
      elevation: request.geoContext.elevation.mean,
      slope: request.geoContext.slope,
    },
    fire: {
      areaHectares,
      extentNS: extentNorthSouthKm,
      extentEW: extentEastWestKm,
      shape,
      stage: request.inputs.fireStage,
      intensity: request.inputs.intensity,
    },
    environment: {
      vegetation: request.geoContext.vegetationTypes || [],
      temperature: request.inputs.temperature,
      humidity: request.inputs.humidity,
      windSpeed: request.inputs.windSpeed,
      windDirection: request.inputs.windDirection,
      timeOfDay: request.inputs.timeOfDay,
    },
    parameters: {
      flameHeightM: request.inputs.flameHeightM,
      rateOfSpreadKmh: request.inputs.rateOfSpreadKmh,
    },
  };
}
```

#### 2. Locality Agent

**Purpose:** Enrich geographic context with narrative descriptions

**Inputs:**
- ParsedContext (location data)
- Optional: Access to geographic databases/APIs

**Outputs:**
```typescript
interface LocalityEnrichment {
  terrainNarrative: string;  // Rich description of landscape
  landformType: string;      // e.g., "steep valleys", "rolling hills", "flat plains"
  visualCharacter: string;   // e.g., "deeply dissected terrain with sharp ridgelines"
  contextualFeatures: string[]; // Notable geographic features
  confidence: 'low' | 'medium' | 'high';
}
```

**Knowledge Base:**
The agent can access:
- Slope analysis (already available from geoContext)
- Regional geographic patterns (could be a lookup table or knowledge base)
- Nearby features (from geoContext.nearbyFeatures)

**Example Logic:**
```typescript
function enrichLocality(context: ParsedContext): LocalityEnrichment {
  const slope = context.location.slope.mean;
  const locality = context.location.locality;

  // Determine landform type based on slope and location
  let landformType = '';
  let visualCharacter = '';

  if (slope < 5) {
    landformType = 'flat to gently undulating plains';
    visualCharacter = 'Open, expansive landscape with distant horizons';
  } else if (slope < 15) {
    landformType = 'rolling hills';
    visualCharacter = 'Undulating terrain with moderate relief and rounded crests';
  } else if (slope < 25) {
    landformType = 'hilly terrain with pronounced slopes';
    visualCharacter = 'Distinct ridges and valleys with clear topographic features';
  } else if (slope < 35) {
    landformType = 'steep, dissected terrain';
    visualCharacter = 'Sharp ridgelines, deep gullies, and steep-sided valleys';
  } else {
    landformType = 'very steep escarpment country';
    visualCharacter = 'Dramatic cliffs, gorges, and precipitous slopes';
  }

  // Location-specific enrichment (example - could be expanded)
  const terrainNarrative = generateTerrainNarrative(locality, landformType, slope);

  return {
    terrainNarrative,
    landformType,
    visualCharacter,
    contextualFeatures: extractContextualFeatures(context),
    confidence: determineConfidence(context),
  };
}

function generateTerrainNarrative(
  locality: string,
  landformType: string,
  slope: number
): string {
  // Example: "North of Googong NSW" -> rich description
  if (locality.toLowerCase().includes('googong')) {
    return `Characteristic terrain north of Googong, featuring ${landformType} ` +
           `with an average slope of ${slope.toFixed(1)}°. The landscape is ` +
           `dominated by steep, rocky ridges separated by narrow valleys, typical ` +
           `of the Southern Tablelands region.`;
  }

  if (locality.toLowerCase().includes('parkes')) {
    return `Agricultural landscape near Parkes, featuring ${landformType}. ` +
           `The area consists of largely flat to gently rolling farmland with ` +
           `extensive crop fields and scattered remnant vegetation patches, ` +
           `typical of the Central West plains.`;
  }

  // Default narrative
  return `The locality features ${landformType} with an average slope of ` +
         `${slope.toFixed(1)}°, characteristic of this region of New South Wales.`;
}
```

**Benefits:**
- Transforms basic location data into vivid, accurate descriptions
- Provides geographic authenticity
- Helps AI model understand landscape context
- Can be expanded with regional databases for richer descriptions

#### 3. Fire Behavior Agent

**Purpose:** Interpret scenario parameters through fire science knowledge to generate accurate behavioral descriptions

**Inputs:**
- ParsedContext (fire, environment, location data)
- Fire behavior reference corpus (fire-behaviour-guide-clean.md)

**Outputs:**
```typescript
interface FireBehaviorEnrichment {
  overallBehavior: string;           // 200-400 word synthesis
  headFireCharacteristics: string;   // Description of head fire
  flankBehavior: string;              // Flank characteristics
  heelBehavior: string;               // Heel/backing fire
  windEffects: string;                // Wind-specific visual cues
  terrainEffects: string;             // Slope impact on fire behavior
  spottingRisk: string;               // Spotting likelihood and distance
  smokeCharacteristics: string;       // Pyrocumulus, column description
  flameAngleDescription: string;      // Visual flame orientation
  spreadPattern: string;              // Fire shape and spread
  confidence: 'low' | 'medium' | 'high';
}
```

**Knowledge Application:**

The agent applies fire science principles from the corpus:

1. **Wind Analysis:**
   - < 10 km/h: Nearly circular spread, vertical flames
   - 12-15 km/h: Critical threshold, rapid acceleration
   - 30+ km/h: Elliptical shape, narrow intense head, forward-angled flames

2. **Slope Effects:**
   - Every 10° upslope ~ doubles ROS
   - Downslope reduces spread by ~50%
   - Flames race uphill, creep downhill

3. **Fuel-Dependent Behavior:**
   - Grassland: 3-5m flames, rapid transient fire
   - Forest (dry): 10-20m+ flames, potential crown fire
   - Fuel moisture suppresses behavior

4. **Fire Structure:**
   - Head fire: Fast, intense, forward-leaning flames
   - Flanks: Slower, lower intensity
   - Heel: Backing, smoldering, low flames

**Example Logic:**
```typescript
function analyzeFireBehavior(
  context: ParsedContext,
  corpus: FireBehaviorKnowledge
): FireBehaviorEnrichment {
  const { windSpeed, windDirection, vegetation, temperature, humidity } = context.environment;
  const { slope } = context.location;
  const { intensity, stage } = context.fire;

  // Determine head fire behavior
  const headBehavior = determineHeadFireBehavior(
    windSpeed,
    slope.mean,
    intensity,
    vegetation
  );

  // Calculate spotting risk
  const spottingRisk = calculateSpottingRisk(
    vegetation[0],  // Primary vegetation type
    windSpeed,
    intensity
  );

  // Determine flame characteristics
  const flameAngle = calculateFlameAngle(windSpeed, slope.mean);

  // Synthesize overall behavior narrative
  const overallBehavior = synthesizeBehaviorNarrative({
    headBehavior,
    windSpeed,
    windDirection,
    slope: slope.mean,
    vegetation,
    intensity,
    temperature,
    humidity,
    stage,
  });

  return {
    overallBehavior,
    headFireCharacteristics: headBehavior.description,
    flankBehavior: determineFlankBehavior(windSpeed, intensity),
    heelBehavior: determineHeelBehavior(windSpeed, slope.mean),
    windEffects: describeWindEffects(windSpeed, windDirection),
    terrainEffects: describeSlopeEffects(slope.mean, slope.max),
    spottingRisk,
    smokeCharacteristics: describeSmokeCharacteristics(intensity, windSpeed),
    flameAngleDescription: flameAngle.description,
    spreadPattern: determineSpreadPattern(windSpeed, slope.mean),
    confidence: 'high',  // Based on established fire science
  };
}

function determineHeadFireBehavior(
  windSpeed: number,
  slope: number,
  intensity: string,
  vegetation: string[]
): { description: string; visualCues: string[] } {
  let description = '';
  const visualCues: string[] = [];

  // Wind analysis
  if (windSpeed < 10) {
    description = 'Head fire burns with relatively vertical flame orientation, ' +
                  'spreading evenly in all directions with moderate forward progress.';
    visualCues.push('vertical flames', 'circular growth pattern');
  } else if (windSpeed < 30) {
    description = 'Head fire flames angle forward at 30-45°, making direct contact ' +
                  'with unburned fuel. The fire exhibits a well-defined head with ' +
                  'rapid forward spread.';
    visualCues.push('forward-angled flames', 'distinct head fire', 'rapid spread');
  } else {
    description = 'Head fire flames are nearly horizontal, driven by strong winds. ' +
                  'Flames bend low to the ground, creating extreme heat transfer to ' +
                  'unburned fuel ahead. The fire races forward with intense energy.';
    visualCues.push('horizontal flames', 'extreme forward lean', 'explosive spread');
  }

  // Combine with slope if significant
  if (slope > 15 && windSpeed >= 30) {
    description += ' Combined with upslope terrain, the head fire exhibits ' +
                   'catastrophic behavior with flames racing uphill at extreme rates.';
    visualCues.push('upslope acceleration', 'towering flame heights');
  } else if (slope > 15) {
    description += ' Upslope terrain causes flames to rise directly into fuel above, ' +
                   'significantly increasing flame height and spread rate.';
    visualCues.push('upslope spread', 'increased flame height');
  }

  return { description, visualCues };
}

function calculateSpottingRisk(
  vegetationType: string,
  windSpeed: number,
  intensity: string
): string {
  const veg = vegetationType.toLowerCase();

  if (veg.includes('grass') || veg.includes('pasture')) {
    if (windSpeed > 20) {
      return 'Short-range spotting occurring 50-200 metres ahead of the head fire. ' +
             'Burning grass clumps and light debris being carried by wind.';
    }
    return 'Minimal spotting expected due to low fuel loft capacity.';
  }

  if (veg.includes('eucalypt') || veg.includes('forest')) {
    if (windSpeed > 40 && (intensity === 'extreme' || intensity === 'catastrophic')) {
      return 'Significant long-range spotting occurring 2-5 kilometres ahead. ' +
             'Eucalypt bark strips and burning debris lofted by extreme winds and ' +
             'fire intensity, creating multiple spot fire ignitions.';
    } else if (windSpeed > 30 && (intensity === 'high' || intensity === 'veryHigh')) {
      return 'Active spotting occurring 500 metres to 2 kilometres ahead of the main ' +
             'fire front. Burning bark and embers creating spot fires in receptive fuel.';
    } else if (windSpeed > 20) {
      return 'Limited spotting activity 100-500 metres ahead of the head fire. ' +
             'Occasional burning debris landing in surrounding vegetation.';
    }
    return 'Minimal spotting expected under current conditions.';
  }

  return 'Spotting risk assessed based on fuel type and conditions.';
}

function synthesizeBehaviorNarrative(params: {
  headBehavior: any;
  windSpeed: number;
  windDirection: string;
  slope: number;
  vegetation: string[];
  intensity: string;
  temperature: number;
  humidity: number;
  stage: string;
}): string {
  const { windSpeed, windDirection, slope, vegetation, intensity, temperature, humidity } = params;

  // Example narrative synthesis
  let narrative = `This ${params.stage} exhibits ${intensity.toLowerCase()} intensity behavior. `;

  // Wind effects
  if (windSpeed >= 30) {
    narrative += `Strong ${windDirection.toLowerCase()} winds at ${windSpeed} km/h are driving ` +
                 `rapid forward spread, with flames angled nearly horizontal and embers being ` +
                 `lofted significant distances ahead of the main front. `;
  } else if (windSpeed >= 15) {
    narrative += `Moderate ${windDirection.toLowerCase()} winds at ${windSpeed} km/h are ` +
                 `directing fire spread with flames angled forward. `;
  } else {
    narrative += `Light winds allow the fire to spread more evenly in all directions, ` +
                 `with flames burning relatively vertically. `;
  }

  // Terrain effects
  if (slope > 20) {
    narrative += `The steep terrain (${slope.toFixed(1)}° average slope) significantly ` +
                 `accelerates upslope fire spread, with flames racing up hillsides and ` +
                 `preheating fuel above. `;
  } else if (slope > 10) {
    narrative += `Moderate slopes enhance upslope fire spread, with flames rising into ` +
                 `fuel on higher ground. `;
  }

  // Vegetation and fuel
  const primaryVeg = vegetation[0] || 'vegetation';
  narrative += `Burning through ${primaryVeg.toLowerCase()}, the fire `;

  if (primaryVeg.toLowerCase().includes('forest') && (intensity === 'high' || intensity === 'veryHigh')) {
    narrative += `has developed into active crown fire with flames reaching well above ` +
                 `the canopy (15-20+ metres). A towering pyrocumulus cloud forms above ` +
                 `the fire, indicating extreme heat release. `;
  } else if (primaryVeg.toLowerCase().includes('grass')) {
    narrative += `moves rapidly through cured fuel with flame heights of 3-5 metres. ` +
                 `The fire front is fast-moving but relatively narrow. `;
  }

  // Weather context
  if (temperature > 35 && humidity < 20) {
    narrative += `Extreme weather conditions (${temperature}°C, ${humidity}% RH) create ` +
                 `critically dry fuel and erratic fire behavior.`;
  }

  return narrative.trim();
}
```

**Benefits:**
- Scientifically grounded descriptions based on established fire behavior principles
- Scenario-specific rather than generic lookup values
- Transparent reasoning (trainers understand why fire behaves certain ways)
- Extensible with additional fire science knowledge
- Improves AI model clarity through specific, contextual language

#### 4. Vegetation Agent

**Purpose:** Translate vegetation data into visual, scenario-appropriate descriptors

**Inputs:**
- ParsedContext (vegetation types, fire intensity, time of day)
- Vegetation characteristics database (VEGETATION_DETAILS)

**Outputs:**
```typescript
interface VegetationEnrichment {
  visualDescription: string;       // How vegetation appears in this scenario
  structuralCharacteristics: string; // Canopy, understorey, ground layer
  fireInteraction: string;          // How fire interacts with this vegetation
  diversityNarrative: string;       // Description of vegetation transitions
  seasonalContext: string;          // Time-appropriate vegetation state
  confidence: 'low' | 'medium' | 'high';
}
```

**Example Logic:**
```typescript
function enrichVegetation(context: ParsedContext): VegetationEnrichment {
  const vegTypes = context.environment.vegetation;
  const primaryVeg = vegTypes[0];
  const intensity = context.fire.intensity;
  const timeOfDay = context.environment.timeOfDay;

  // Get base characteristics
  const details = VEGETATION_DETAILS[primaryVeg] || getDefaultDetails();

  // Generate visual description considering scenario
  const visualDescription = generateVisualDescription(
    primaryVeg,
    details,
    intensity,
    timeOfDay
  );

  // Describe how fire interacts with vegetation
  const fireInteraction = describeFireVegetationInteraction(
    primaryVeg,
    details,
    intensity
  );

  // If multiple vegetation types, describe transitions
  const diversityNarrative = vegTypes.length > 1
    ? describeVegetationDiversity(vegTypes)
    : '';

  return {
    visualDescription,
    structuralCharacteristics: formatStructure(details),
    fireInteraction,
    diversityNarrative,
    seasonalContext: inferSeasonalState(context),
    confidence: 'high',
  };
}

function generateVisualDescription(
  vegType: string,
  details: VegetationDetails,
  intensity: string,
  timeOfDay: string
): string {
  let desc = `${vegType} vegetation `;

  // Add structural details
  if (details.canopyHeight !== 'unknown') {
    desc += `with ${details.canopyHeight} canopy, `;
  }

  // Adjust for time of day (lighting affects appearance)
  if (timeOfDay === 'night') {
    desc += 'silhouetted against fire glow, tree forms visible in shadow';
  } else if (timeOfDay === 'dusk' || timeOfDay === 'dawn') {
    desc += 'visible in warm, angled light casting long shadows across the landscape';
  } else {
    desc += 'clearly visible with natural color and texture';
  }

  return desc + '.';
}

function describeFireVegetationInteraction(
  vegType: string,
  details: VegetationDetails,
  intensity: string
): string {
  if (vegType.toLowerCase().includes('forest')) {
    if (intensity === 'high' || intensity === 'veryHigh' || intensity === 'extreme') {
      return 'Fire has transitioned into the canopy, creating active crown fire ' +
             'with flames engulfing the tree tops. Bark is actively burning and ' +
             'shedding embers. Complete consumption of fine fuels in the canopy.';
    } else {
      return 'Fire burning primarily in surface fuels beneath the canopy. ' +
             'Intermittent scorching of lower branches but no sustained crown involvement.';
    }
  }

  if (vegType.toLowerCase().includes('grass')) {
    return 'Fire rapidly consuming cured grass fuel, moving as a fast-moving ' +
           'front with flames extending above grass height. Fuel consumption is ' +
           'near-complete, leaving blackened ground in the wake.';
  }

  return 'Fire consuming available fuel in alignment with vegetation structure.';
}

function describeVegetationDiversity(vegTypes: string[]): string {
  if (vegTypes.length === 1) return '';

  return `The fire burns through multiple vegetation zones including ` +
         `${vegTypes.slice(0, -1).join(', ')} and ${vegTypes[vegTypes.length - 1]}. ` +
         `Visual transitions between these vegetation types are evident across ` +
         `the landscape, with fire behavior adapting to each fuel type.`;
}
```

**Benefits:**
- Scenario-aware vegetation descriptions (not just static lookups)
- Considers fire intensity, time of day, and other contextual factors
- Describes vegetation-fire interaction dynamically
- Handles vegetation diversity/transitions

#### 5. Synthesis Agent

**Purpose:** Combine all enrichments into coherent, concise prompt sections

**Inputs:**
- ParsedContext
- LocalityEnrichment
- FireBehaviorEnrichment
- VegetationEnrichment
- ViewPoint (for perspective-specific synthesis)
- PromptTemplate

**Outputs:**
```typescript
interface SynthesizedPrompt {
  sections: {
    style: string;
    locality: string;
    terrain: string;
    vegetation: string;
    fireBehavior: string;
    fireGeometry: string;
    weather: string;
    perspective: string;
    safety: string;
  };
  fullPrompt: string;
  metadata: {
    totalLength: number;
    sectionLengths: Record<string, number>;
    keyTerms: string[];
  };
}
```

**Key Functions:**
- **Conciseness:** Synthesize enrichments into focused sections without redundancy
- **Coherence:** Ensure sections work together logically
- **Prioritization:** Emphasize most important details for each viewpoint
- **Template application:** Apply standard template structure

**Example Logic:**
```typescript
function synthesizePrompt(
  context: ParsedContext,
  locality: LocalityEnrichment,
  behavior: FireBehaviorEnrichment,
  vegetation: VegetationEnrichment,
  viewpoint: ViewPoint,
  template: PromptTemplate
): SynthesizedPrompt {
  // Apply template structure with enriched content
  const sections = {
    style: template.sections.style,

    // Combine locality and terrain enrichments
    locality: synthesizeLocalitySection(context, locality),

    terrain: synthesizeTerrainSection(context, locality),

    // Use enriched vegetation description
    vegetation: synthesizeVegetationSection(vegetation),

    // Use fire behavior agent output
    fireBehavior: synthesizeFireBehaviorSection(behavior, context),

    fireGeometry: template.sections.fireGeometry(preparePromptData(context)),

    weather: synthesizeWeatherSection(context),

    // Viewpoint-specific synthesis
    perspective: synthesizePerspectiveSection(viewpoint, behavior),

    safety: template.sections.safety,
  };

  // Combine into full prompt
  const fullPrompt = Object.values(sections).join('\n\n');

  return {
    sections,
    fullPrompt: fullPrompt.trim(),
    metadata: {
      totalLength: fullPrompt.length,
      sectionLengths: calculateSectionLengths(sections),
      keyTerms: extractKeyTerms(sections),
    },
  };
}

function synthesizeLocalitySection(
  context: ParsedContext,
  locality: LocalityEnrichment
): string {
  return `Geographic context: This specific location is ${context.location.locality}. ` +
         `${locality.terrainNarrative} ${locality.visualCharacter}`;
}

function synthesizeFireBehaviorSection(
  behavior: FireBehaviorEnrichment,
  context: ParsedContext
): string {
  // Start with overall behavior narrative
  let section = `Fire behavior: ${behavior.overallBehavior}\n\n`;

  // Add key behavioral characteristics
  section += `Head fire: ${behavior.headFireCharacteristics}\n`;
  section += `Flanks: ${behavior.flankBehavior}\n`;
  section += `Heel: ${behavior.heelBehavior}\n`;

  // Include spotting if significant
  if (behavior.spottingRisk.toLowerCase().includes('occurring')) {
    section += `Spotting: ${behavior.spottingRisk}\n`;
  }

  // Include smoke characteristics
  section += `Smoke: ${behavior.smokeCharacteristics}`;

  return section;
}

function synthesizePerspectiveSection(
  viewpoint: ViewPoint,
  behavior: FireBehaviorEnrichment
): string {
  let perspective = VIEWPOINT_PERSPECTIVES[viewpoint];

  // Enhance perspective with behavioral context
  if (viewpoint === 'aerial' || viewpoint === 'helicopter_above') {
    perspective += ` This elevated view shows the full fire perimeter with ` +
                   `${behavior.spreadPattern}. The head fire is clearly visible ` +
                   `with its characteristic intensity and spread pattern.`;
  } else if (viewpoint.startsWith('ground_')) {
    perspective += ` From this ground-level position, ${behavior.flameAngleDescription}. ` +
                   `${behavior.smokeCharacteristics}`;
  }

  return `Camera position: ${perspective}`;
}
```

**Benefits:**
- Reduces redundancy by intelligently combining enrichments
- Maintains template structure while incorporating dynamic content
- Viewpoint-aware synthesis (different perspectives emphasize different aspects)
- Manageable prompt length through prioritization

#### 6. Quality Validator Agent

**Purpose:** Ensure output meets quality standards for clarity, accuracy, and diversity

**Inputs:**
- SynthesizedPrompt
- Quality standards (from prompt_quality_standards.md)

**Outputs:**
```typescript
interface QualityReport {
  passed: boolean;
  score: number;  // 0-100
  checks: {
    lengthCheck: { passed: boolean; length: number; max: number };
    terminologyCheck: { passed: boolean; count: number; min: number; terms: string[] };
    blockedTermsCheck: { passed: boolean; violations: string[] };
    clarityCheck: { passed: boolean; issues: string[] };
    diversityScore: number;  // 0-100, measures uniqueness vs previous prompts
  };
  recommendations: string[];
  warnings: string[];
}
```

**Validation Rules:**

1. **Length Validation:**
   - Minimum: 100 characters
   - Maximum: 1500 characters (reduced from current bloat)
   - Target: 800-1200 characters

2. **Terminology Check:**
   - Must include at least 3 RFS-specific terms
   - Validate use of fire behavior vocabulary
   - Check for appropriate vegetation terminology

3. **Blocked Terms:**
   - Scan for prohibited terms (explosion, casualties, etc.)
   - Ensure safety section compliance

4. **Clarity Check:**
   - No contradictory descriptions
   - Coherent narrative flow
   - Technical accuracy

5. **Diversity Scoring:**
   - Compare against recent prompts for similar scenarios
   - Identify repetitive phrasing
   - Suggest variation opportunities

**Example Logic:**
```typescript
function validateQuality(
  prompt: SynthesizedPrompt,
  standards: QualityStandards,
  recentPrompts?: string[]
): QualityReport {
  const checks = {
    lengthCheck: validateLength(prompt.fullPrompt),
    terminologyCheck: validateTerminology(prompt.fullPrompt, standards),
    blockedTermsCheck: validateBlockedTerms(prompt.fullPrompt, standards),
    clarityCheck: validateClarity(prompt),
    diversityScore: calculateDiversityScore(prompt.fullPrompt, recentPrompts),
  };

  const passed = Object.values(checks).every(check =>
    typeof check === 'object' ? check.passed : check > 50
  );

  const score = calculateOverallScore(checks);

  const recommendations = generateRecommendations(checks);
  const warnings = generateWarnings(checks);

  return {
    passed,
    score,
    checks,
    recommendations,
    warnings,
  };
}

function validateLength(prompt: string): { passed: boolean; length: number; max: number } {
  const length = prompt.length;
  const max = 1500;
  const min = 100;

  return {
    passed: length >= min && length <= max,
    length,
    max,
  };
}

function validateTerminology(prompt: string, standards: QualityStandards): {
  passed: boolean;
  count: number;
  min: number;
  terms: string[];
} {
  const lowerPrompt = prompt.toLowerCase();
  const requiredTerms = standards.requiredTerms || [
    'bushfire', 'eucalypt', 'sclerophyll', 'crown fire', 'spotting',
    'ember', 'fire front', 'smoke column', 'pyrocumulus'
  ];

  const foundTerms = requiredTerms.filter(term =>
    lowerPrompt.includes(term.toLowerCase())
  );

  return {
    passed: foundTerms.length >= 3,
    count: foundTerms.length,
    min: 3,
    terms: foundTerms,
  };
}

function calculateDiversityScore(
  prompt: string,
  recentPrompts?: string[]
): number {
  if (!recentPrompts || recentPrompts.length === 0) {
    return 100;  // No comparison available
  }

  // Calculate similarity with recent prompts
  const similarities = recentPrompts.map(recentPrompt =>
    calculateTextSimilarity(prompt, recentPrompt)
  );

  const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;

  // Convert similarity to diversity score (inverse)
  return Math.round((1 - avgSimilarity) * 100);
}

function calculateTextSimilarity(text1: string, text2: string): number {
  // Simple word-based similarity (could use more sophisticated algorithms)
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));

  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;  // Jaccard similarity
}

function generateRecommendations(checks: any): string[] {
  const recommendations: string[] = [];

  if (checks.lengthCheck.length > 1200) {
    recommendations.push('Consider reducing prompt length for better model focus');
  }

  if (checks.terminologyCheck.count < 5) {
    recommendations.push('Add more RFS-specific terminology for authenticity');
  }

  if (checks.diversityScore < 70) {
    recommendations.push('Prompt is similar to recent outputs; consider varying descriptors');
  }

  return recommendations;
}
```

**Benefits:**
- Automated quality assurance
- Prevents prompt bloat
- Ensures terminology compliance
- Monitors diversity to prevent repetitive outputs
- Provides actionable feedback for improvement

### Agent Communication and Orchestration

#### Orchestrator Design

**Purpose:** Coordinate agent execution, manage data flow, and handle errors

```typescript
interface AgentOrchestrator {
  // Execute the full pipeline
  execute(request: GenerationRequest): Promise<PromptSet>;

  // Individual agent execution
  executeAgent<T>(agent: Agent<T>, input: any): Promise<T>;

  // Error handling and recovery
  handleAgentError(agentName: string, error: Error): void;

  // Performance monitoring
  trackAgentPerformance(agentName: string, duration: number): void;
}

class PromptOrchestrator implements AgentOrchestrator {
  private agents: Map<string, Agent<any>>;
  private cache: Map<string, any>;
  private performanceMetrics: Map<string, number[]>;

  async execute(request: GenerationRequest): Promise<PromptSet> {
    const startTime = Date.now();

    try {
      // Step 1: Parse context (foundation for all other agents)
      const context = await this.executeAgent(
        this.agents.get('context-parser'),
        request
      );

      // Step 2: Execute enrichment agents in parallel
      // These agents can run independently
      const [locality, behavior, vegetation] = await Promise.all([
        this.executeAgent(this.agents.get('locality'), context),
        this.executeAgent(this.agents.get('fire-behavior'), context),
        this.executeAgent(this.agents.get('vegetation'), context),
      ]);

      // Step 3: Synthesize prompts for each viewpoint
      const prompts: GeneratedPrompt[] = [];

      for (const viewpoint of request.requestedViews) {
        const synthesized = await this.executeAgent(
          this.agents.get('synthesis'),
          { context, locality, behavior, vegetation, viewpoint }
        );

        // Step 4: Validate quality
        const qualityReport = await this.executeAgent(
          this.agents.get('quality'),
          { prompt: synthesized, recentPrompts: this.getRecentPrompts() }
        );

        if (!qualityReport.passed) {
          console.warn(`Quality check failed for ${viewpoint}:`, qualityReport.warnings);
          // Could retry with adjusted parameters or accept with warnings
        }

        prompts.push({
          viewpoint,
          promptText: synthesized.fullPrompt,
          promptSetId: crypto.randomUUID(),
          templateVersion: '2.0.0-multi-agent',
        });
      }

      const duration = Date.now() - startTime;
      this.trackAgentPerformance('full-pipeline', duration);

      return {
        id: crypto.randomUUID(),
        templateVersion: '2.0.0-multi-agent',
        prompts,
        createdAt: new Date().toISOString(),
      };

    } catch (error) {
      this.handleAgentError('orchestrator', error as Error);
      throw error;
    }
  }

  async executeAgent<T>(agent: Agent<T>, input: any): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await agent.execute(input);

      const duration = Date.now() - startTime;
      this.trackAgentPerformance(agent.name, duration);

      return result;
    } catch (error) {
      this.handleAgentError(agent.name, error as Error);
      throw error;
    }
  }

  handleAgentError(agentName: string, error: Error): void {
    console.error(`Agent ${agentName} failed:`, error);
    // Could implement fallback strategies, retries, or alerts
  }

  trackAgentPerformance(agentName: string, duration: number): void {
    if (!this.performanceMetrics.has(agentName)) {
      this.performanceMetrics.set(agentName, []);
    }
    this.performanceMetrics.get(agentName)!.push(duration);
  }

  private getRecentPrompts(): string[] {
    // Retrieve recent prompts from cache or storage for diversity checking
    return Array.from(this.cache.values())
      .filter(item => item.type === 'prompt')
      .map(item => item.text)
      .slice(-10);  // Last 10 prompts
  }
}
```

#### Communication Patterns

1. **Sequential Dependencies:**
   ```
   Context Parser → Enrichment Agents → Synthesis → Quality
   ```
   - Context parser must complete before enrichment agents can run
   - Synthesis requires all enrichments
   - Quality validation is the final step

2. **Parallel Execution:**
   ```
   Context Parser → [Locality, Fire Behavior, Vegetation] (parallel)
   ```
   - Enrichment agents can run concurrently (no interdependencies)
   - Reduces total pipeline latency

3. **Data Sharing:**
   - All agents receive `ParsedContext` as foundation
   - Agents produce typed outputs that subsequent agents consume
   - Orchestrator manages data flow and caching

4. **Error Handling:**
   - Each agent can fail independently
   - Orchestrator decides on fallback strategies:
     - Retry with adjusted parameters
     - Use cached/default values
     - Graceful degradation (skip enrichment)
   - Critical agents (Context Parser) fail the entire pipeline

## Implementation Considerations

### Phase 1: Foundation (Iteration 1)

**Goal:** Implement core agent structure without AI/LLM dependencies

**Scope:**
1. Define agent interfaces and types
2. Implement Context Parser agent (rule-based)
3. Implement basic Locality agent (lookup-based enrichment)
4. Implement Fire Behavior agent (rule-based logic from corpus)
5. Implement Vegetation agent (enhanced lookup)
6. Implement Synthesis agent (template application)
7. Implement Quality Validator (rule-based checks)
8. Build Orchestrator framework
9. Unit tests for each agent
10. Integration tests for pipeline

**Technologies:**
- Pure TypeScript (no external AI services initially)
- Rule-based logic and lookup tables
- Knowledge encoded from fire-behaviour-guide-clean.md

**File Structure:**
```
packages/shared/src/
  agents/
    types.ts                    # Agent interfaces
    context-parser.ts           # Context Parser agent
    locality.ts                 # Locality enrichment agent
    fire-behavior.ts            # Fire Behavior agent
    vegetation.ts               # Vegetation agent
    synthesis.ts                # Synthesis agent
    quality.ts                  # Quality Validator
    orchestrator.ts             # Orchestration logic
    index.ts                    # Public exports
  prompts/
    promptGenerator.ts          # Updated to use agents (or new file)
    promptTemplates.ts          # May need updates for agent integration
    ...
  __tests__/
    agents/
      context-parser.test.ts
      locality.test.ts
      fire-behavior.test.ts
      vegetation.test.ts
      synthesis.test.ts
      quality.test.ts
      orchestrator.test.ts
```

### Phase 2: Refinement (Iteration 2)

**Goal:** Enhance agent logic, gather feedback, improve outputs

**Scope:**
1. Expand fire behavior decision trees with more nuance
2. Add location-specific knowledge to Locality agent
3. Improve synthesis algorithms for conciseness
4. Tune quality validation thresholds
5. Gather trainer feedback on outputs
6. A/B test against current prompt system
7. Refine based on image generation results

### Phase 3: AI-Powered Enhancement (Future, Optional)

**Goal:** Replace rule-based agents with AI-powered analysis

**Approach:**
- Use Claude 3.5 Sonnet or similar LLM for complex agents
- Locality Agent: Generate rich terrain narratives from geographic data
- Fire Behavior Agent: Interpret scenarios through loaded corpus
- Quality Agent: Semantic analysis of prompt coherence

**Benefits:**
- More natural, varied language
- Better handling of edge cases
- Reduced maintenance of rule trees

**Considerations:**
- API costs (can be mitigated with caching)
- Latency (agents could be cached for similar scenarios)
- Reproducibility (use temperature=0 for consistency)

## Benefits and Expected Outcomes

### Improved Prompt Quality

1. **Reduced Length:**
   - Target: 800-1200 characters (down from 1500+)
   - More focused, less bloat
   - AI model can process key features better

2. **Increased Diversity:**
   - Fire Behavior agent provides scenario-specific descriptions
   - Locality agent varies geographic narratives
   - Synthesis agent can emphasize different aspects per viewpoint
   - Quality agent monitors and prevents repetition

3. **Enhanced Accuracy:**
   - Fire behavior grounded in scientific principles
   - Geographic descriptions match actual terrain
   - Vegetation-fire interaction more realistic

### Better Image Generation Results

1. **Visual Variety:**
   - More diverse fire depictions from better prompts
   - Reduced repetitive imagery
   - Better alignment with scenario parameters

2. **Geographic Authenticity:**
   - Locality-specific terrain features
   - Appropriate vegetation for region
   - Realistic landscape context

3. **Fire Behavior Fidelity:**
   - Accurate flame orientation, height, spread patterns
   - Appropriate smoke characteristics
   - Spotting activity matches conditions

### Maintainability and Extensibility

1. **Modular Design:**
   - Each agent is independently testable
   - Easy to update one agent without affecting others
   - Clear separation of concerns

2. **Knowledge Management:**
   - Fire science knowledge centralized in Fire Behavior agent
   - Easy to update corpus or add new principles
   - Geographic knowledge can be expanded in Locality agent

3. **Quality Assurance:**
   - Automated validation built into pipeline
   - Consistent quality standards
   - Early detection of issues

4. **Future Enhancements:**
   - Easy to add new agents (e.g., Weather Forecasting agent)
   - Can upgrade agents to AI-powered versions incrementally
   - Pipeline structure supports A/B testing

## Testing Strategy

### Unit Tests

Each agent should have comprehensive unit tests:

```typescript
describe('FireBehaviorAgent', () => {
  it('should generate correct head fire behavior for strong wind', () => {
    const context = createMockContext({ windSpeed: 40, slope: 5 });
    const result = fireBehaviorAgent.execute(context);

    expect(result.headFireCharacteristics).toContain('horizontal');
    expect(result.headFireCharacteristics).toContain('strong wind');
  });

  it('should calculate spotting risk for eucalypt forest with high wind', () => {
    const context = createMockContext({
      vegetation: ['Dry Sclerophyll Forest'],
      windSpeed: 35,
      intensity: 'high'
    });
    const result = fireBehaviorAgent.execute(context);

    expect(result.spottingRisk).toContain('500 metres to 2 kilometres');
  });

  it('should handle upslope terrain effects', () => {
    const context = createMockContext({ slope: 25, windSpeed: 20 });
    const result = fireBehaviorAgent.execute(context);

    expect(result.terrainEffects).toContain('upslope');
    expect(result.terrainEffects).toContain('accelerat');
  });
});
```

### Integration Tests

Test the full pipeline:

```typescript
describe('AgentOrchestrator', () => {
  it('should generate complete prompt set for multi-view request', async () => {
    const request = createTestRequest({
      views: ['aerial', 'ground_north', 'helicopter_east'],
      intensity: 'high',
      windSpeed: 30,
    });

    const result = await orchestrator.execute(request);

    expect(result.prompts).toHaveLength(3);
    expect(result.prompts[0].promptText).toContain('aerial');
    expect(result.prompts[1].promptText).toContain('ground');
  });

  it('should ensure viewpoint consistency across prompts', async () => {
    const request = createTestRequest({
      views: ['aerial', 'ground_north'],
    });

    const result = await orchestrator.execute(request);

    // Extract fire characteristics from both prompts
    const aerialFireDesc = extractFireDescription(result.prompts[0].promptText);
    const groundFireDesc = extractFireDescription(result.prompts[1].promptText);

    // Should describe same fire with same intensity, wind, etc.
    expect(aerialFireDesc.intensity).toBe(groundFireDesc.intensity);
    expect(aerialFireDesc.windDirection).toBe(groundFireDesc.windDirection);
  });
});
```

### Quality Validation Tests

```typescript
describe('QualityValidator', () => {
  it('should pass well-formed prompts', () => {
    const prompt = createValidPrompt();
    const report = qualityValidator.execute({ prompt });

    expect(report.passed).toBe(true);
    expect(report.score).toBeGreaterThan(80);
  });

  it('should reject prompts with blocked terms', () => {
    const prompt = createPromptWithBlockedTerms();
    const report = qualityValidator.execute({ prompt });

    expect(report.passed).toBe(false);
    expect(report.checks.blockedTermsCheck.violations).toContain('explosion');
  });

  it('should warn about low diversity', () => {
    const prompt = createPrompt();
    const recentPrompts = [prompt, prompt, prompt];  // Very similar
    const report = qualityValidator.execute({ prompt, recentPrompts });

    expect(report.checks.diversityScore).toBeLessThan(30);
    expect(report.warnings).toContain(expect.stringContaining('diversity'));
  });
});
```

### Comparison Tests

Test against current system:

```typescript
describe('Multi-Agent vs Current System', () => {
  it('should produce shorter prompts with multi-agent system', async () => {
    const request = createTestRequest();

    const currentPrompt = generatePromptsOldWay(request);
    const multiAgentPrompt = await orchestrator.execute(request);

    const currentLength = currentPrompt.prompts[0].promptText.length;
    const multiAgentLength = multiAgentPrompt.prompts[0].promptText.length;

    expect(multiAgentLength).toBeLessThan(currentLength);
    expect(multiAgentLength).toBeLessThan(1500);
  });

  it('should include more RFS terminology', async () => {
    const request = createTestRequest();

    const currentPrompt = generatePromptsOldWay(request);
    const multiAgentPrompt = await orchestrator.execute(request);

    const currentTerms = countRFSTerms(currentPrompt.prompts[0].promptText);
    const multiAgentTerms = countRFSTerms(multiAgentPrompt.prompts[0].promptText);

    expect(multiAgentTerms).toBeGreaterThanOrEqual(currentTerms);
  });
});
```

## Example Outputs

### Scenario: Googong Forest Fire

**Input Parameters:**
```json
{
  "locality": "north of Googong, NSW",
  "vegetation": ["Dry Sclerophyll Forest"],
  "slope": 22,
  "windSpeed": 35,
  "windDirection": "NW",
  "temperature": 38,
  "humidity": 15,
  "intensity": "veryHigh",
  "fireStage": "established",
  "timeOfDay": "afternoon"
}
```

**Current System Output (simplified):**
```
Professional aerial photograph taken from a helicopter at 300 metres altitude,
looking straight down at an active bushfire. Scene shows Dry Sclerophyll Forest
with dense eucalypt canopy on moderate slopes. The landscape features steep slopes.
The landscape is characterized by this specific slope profile... [continues with
much more detail, ~1600 characters]
```

**Multi-Agent System Output:**

_Context Parser → Locality Agent:_
```
Characteristic terrain north of Googong, featuring steep, dissected terrain with
an average slope of 22.0°. The landscape is dominated by steep, rocky ridges
separated by narrow valleys, typical of the Southern Tablelands region. Sharp
ridgelines, deep gullies, and steep-sided valleys create dramatic topographic
relief.
```

_Fire Behavior Agent:_
```
This established bushfire exhibits very high intensity behavior. Strong NW winds
at 35 km/h are driving rapid forward spread, with flames angled nearly horizontal
and embers being lofted 800m-1.5km ahead of the main front. The steep terrain
(22° average slope) significantly accelerates upslope fire spread, with flames
racing up hillsides and preheating fuel above. Burning through dry sclerophyll
forest, the fire has developed into active crown fire with flames reaching 15-20m
above the canopy. A towering pyrocumulus cloud forms above, indicating extreme
heat release. Extreme weather (38°C, 15% RH) creates critically dry fuel and
erratic fire behavior.

Head fire: Flames nearly horizontal, driven by strong winds. Combined with upslope
terrain, the fire exhibits severe behavior with flames racing uphill.
Spotting: Active spotting occurring 800m-1.5km ahead. Eucalypt bark and embers
creating spot fires in receptive fuel.
```

_Synthesis Agent (Aerial View):_
```
Professional aerial photograph from helicopter at 300m altitude, looking straight
down at the fire.

Geographic context: North of Googong, NSW. Steep, dissected terrain (22° average
slope) with rocky ridges separated by narrow valleys, typical of Southern Tablelands.

Vegetation: Dry Sclerophyll Forest with 15-20m canopy. Fire has transitioned into
the canopy, creating active crown fire with flames engulfing the tree tops.

Fire behavior: Established bushfire with very high intensity. Strong NW winds (35 km/h)
drive rapid forward spread with flames angled horizontal. Steep terrain accelerates
upslope spread dramatically. Active crown fire with 15-20m flames above canopy.
Pyrocumulus cloud overhead indicates extreme heat release. Active spotting 800m-1.5km
ahead creating multiple spot fires.

Weather: 38°C, 15% RH, strong NW winds. Warm afternoon light from west, golden tones.

Camera: Aerial view shows full fire perimeter with elliptical shape, narrow intense
head, elongated flanks. Head fire clearly visible with characteristic high intensity.

Safety: No people, no animals, no vehicles. Natural terrain, vegetation, fire, smoke only.
```

**Comparison:**
- **Length:** Multi-agent ~1,150 characters vs Current ~1,600 characters
- **Specificity:** Multi-agent includes Googong-specific terrain description
- **Fire Behavior:** Multi-agent has synthesized behavior narrative vs template lookup
- **Clarity:** Multi-agent more focused, less repetitive
- **RFS Terms:** Both include appropriate terminology

### Scenario: Parkes Grassfire

**Input Parameters:**
```json
{
  "locality": "outside Parkes, NSW",
  "vegetation": ["Grassland"],
  "slope": 3,
  "windSpeed": 25,
  "windDirection": "W",
  "temperature": 35,
  "humidity": 25,
  "intensity": "moderate",
  "fireStage": "developing",
  "timeOfDay": "midday"
}
```

**Multi-Agent System Output:**

_Locality Agent:_
```
Agricultural landscape near Parkes, featuring flat to gently undulating plains.
The area consists of largely flat to gently rolling farmland with extensive crop
fields and scattered remnant vegetation patches, typical of the Central West plains.
Open, expansive landscape with distant horizons.
```

_Fire Behavior Agent:_
```
This developing bushfire exhibits moderate intensity behavior. Moderate W winds
at 25 km/h are directing fire spread with flames angled forward. Minimal terrain
impact on flat ground (3° slope). Burning through grassland, the fire moves rapidly
with flame heights of 3-5m. The fire front is fast-moving but relatively narrow.
Weather conditions (35°C, 25% RH) create dry fuel allowing sustained spread.

Head fire: Flames angle forward at 30-45°, well-defined head with rapid forward
spread through cured grass.
Flanks: Lower intensity lateral spread, flame heights 1-2m.
Spotting: Short-range spotting 50-150m ahead. Burning grass clumps carried by wind.
```

_Synthesis (Ground North View):_
```
Ground-level photograph from north of the fire, looking south toward active fire line.

Geographic context: Agricultural landscape near Parkes, NSW. Flat to gently rolling
farmland with crop fields, typical of Central West plains. Open, expansive views.

Vegetation: Grassland. Fire rapidly consuming cured grass fuel, moving as fast front
with flames above grass height. Near-complete fuel consumption, blackened ground in wake.

Fire behavior: Developing grassfire with moderate intensity. W winds (25 km/h) direct
forward spread with forward-angled flames. Flame heights 3-5m. Fast-moving front.
Short-range spotting 50-150m ahead as burning grass clumps are lofted.

Weather: 35°C, 25% RH, moderate W winds. Harsh midday sun, short shadows, pale sky
above smoke.

Camera: Ground level from north, looking south at approaching fire line. Eye-level
perspective captures flames and smoke movement across open plains.

Safety: No people, no animals, no vehicles. Natural terrain, vegetation, fire, smoke only.
```

**Differences from Forest Scenario:**
- Locality: "Agricultural landscape" vs "steep, dissected terrain"
- Fire behavior: "fast-moving front" grassfire vs "crown fire" in forest
- Flame heights: "3-5m" vs "15-20m"
- Spotting: "50-150m" vs "800m-1.5km"
- Terrain effects: Minimal vs significant upslope acceleration

This demonstrates how the agent system adapts to completely different scenarios.

## Risks and Mitigation

### Risk 1: Agent Complexity

**Risk:** Multi-agent system more complex than current monolithic approach

**Mitigation:**
- Start with simple rule-based agents (Phase 1)
- Comprehensive unit tests for each agent
- Clear interfaces and type definitions
- Good documentation
- Gradual rollout with A/B testing

### Risk 2: Performance/Latency

**Risk:** Multiple agent calls could increase prompt generation time

**Mitigation:**
- Run enrichment agents in parallel
- Cache agent results for similar scenarios
- Monitor performance metrics
- Set timeout limits
- Optimize hot paths

### Risk 3: Prompt Inconsistency

**Risk:** Multiple agents could produce conflicting information

**Mitigation:**
- Quality Validator checks for contradictions
- Synthesis Agent ensures coherence
- Shared ParsedContext foundation
- Integration tests validate consistency
- Clear agent responsibilities (no overlap)

### Risk 4: Information Overload

**Risk:** Enrichments could still produce bloated prompts

**Mitigation:**
- Synthesis Agent prioritizes and condenses
- Length limits enforced by Quality Validator
- Template sections have character budgets
- Focus on most important details per viewpoint
- Continuous monitoring of output lengths

### Risk 5: Maintenance Burden

**Risk:** More code to maintain than current system

**Mitigation:**
- Modular design easier to update than monolith
- Each agent independently testable
- Clear separation of concerns
- Knowledge centralized (fire science in one agent, etc.)
- Can upgrade agents incrementally

## Future Enhancements

### 1. LLM-Powered Agents (Phase 3)

Replace rule-based agents with AI models:

```typescript
class LLMLocalityAgent implements LocalityAgent {
  async execute(context: ParsedContext): Promise<LocalityEnrichment> {
    const prompt = `
      Given this location: ${context.location.locality}
      Slope: ${context.location.slope.mean}°
      Elevation: ${context.location.elevation}m

      Generate a 2-3 sentence description of the terrain and landscape character
      that would be visible in this specific Australian location.
    `;

    const response = await callLLM(prompt, { temperature: 0.3 });

    return parseLocalityResponse(response);
  }
}
```

**Benefits:**
- More natural, varied language
- Better handling of edge cases
- Reduced rule maintenance

**Considerations:**
- API costs (mitigated by caching)
- Latency (parallel execution helps)
- Reproducibility (low temperature, caching)

### 2. Learning from Feedback

Incorporate trainer ratings and image quality metrics:

```typescript
interface FeedbackLoop {
  // Trainers rate generated images
  recordImageRating(promptId: string, imageId: string, rating: number): void;

  // Track which prompts produce best images
  getHighPerformingPrompts(): PromptPattern[];

  // Adjust agent parameters based on feedback
  tuneAgentWeights(agentName: string, feedback: Feedback): void;
}
```

### 3. Additional Agents

**Weather Forecasting Agent:**
- Interpret time of day and season
- Add atmospheric details
- Suggest lighting characteristics

**Asset Placement Agent:**
- Recommend viewpoint positions
- Suggest camera angles for best results
- Optimize for fire visibility

**Style Guidance Agent:**
- Ensure photorealistic style cues
- Adapt to image model characteristics
- Fine-tune technical photography details

### 4. Multi-Model Support

Different prompts for different image models:

```typescript
interface ModelAdapter {
  adaptPrompt(prompt: SynthesizedPrompt, model: 'gemini' | 'dalle' | 'sdxl'): string;
}
```

## Conclusion

This multi-agent prompt construction pipeline design addresses the core issues of prompt complexity, limited diversity, and underutilized domain knowledge. By decomposing prompt generation into specialized agent roles, we can:

1. **Reduce prompt bloat** through targeted enrichment and synthesis
2. **Improve output diversity** via scenario-specific analysis rather than template lookups
3. **Leverage domain knowledge** effectively through dedicated Fire Behavior and Locality agents
4. **Maintain quality** through automated validation
5. **Enable extensibility** via modular agent architecture

The design is **implementation-ready** with clear phases:
- **Phase 1:** Rule-based agents (TypeScript, no external AI)
- **Phase 2:** Refinement and feedback integration
- **Phase 3:** Optional LLM-powered enhancement

This approach balances immediate implementation feasibility with long-term architectural flexibility, allowing the system to evolve as AI capabilities and project needs develop.

## Next Steps

1. **Review and Feedback:**
   - Share with fire behavior experts
   - Review with development team
   - Solicit trainer input on prompt examples

2. **Prototype Development:**
   - Implement Phase 1 agents
   - Build orchestrator framework
   - Create comprehensive tests

3. **Validation:**
   - Compare outputs with current system
   - Measure prompt quality metrics
   - Test image generation results

4. **Iteration:**
   - Refine agent logic based on results
   - Tune synthesis algorithms
   - Optimize performance

5. **Documentation:**
   - Create implementation guide
   - Document agent APIs
   - Provide usage examples

---

**Document prepared by:** Claude Agent
**For issue:** #[current issue number]
**Related master plan section:** Phase 3 - Prompt and Image Output
**References:**
- `docs/fire-behaviour-guide-clean.md`
- `docs/fire-behaviour-agent-plan.md`
- `docs/prompt_quality_standards.md`
- `packages/shared/src/prompts/`
