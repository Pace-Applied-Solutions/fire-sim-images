# Fire Behaviour Content Analysis: System Prompt vs. Fire Behaviour Agent

## Part 1: Content Suitable for Direct System Prompt Inclusion

The following fire behaviour principles are foundational enough to include directly in the prompt template as a reference section. They are concise, universally applicable, and help guide Gemini Image Pro's rendering decisions:

### Recommended System Prompt Addition

```
Fire Behaviour Context:

Wildfires exhibit distinct structural and visual characteristics based on wind, terrain, and fuel:

HEAD FIRE (active, intense front): Flames lean forward into unburned fuel, driven by wind or upslope. 
Tallest, fastest-spreading edge. Characterized by forward-angled flames and maximum heat release.

FLANKS (sides): Slower lateral spread. Lower flames, less continuous fire. Reduced intensity compared to head.

HEEL/TAIL (rear): Backing fire opposite the head. Often smoldering, low flames, slow progression or stagnant.
May self-extinguish if moving against wind or steep downslope.

WIND EFFECTS: 
- Winds below 10 km/h: fire spreads nearly evenly in all directions (circular growth)
- Winds 12-15 km/h: critical threshold where ROS accelerates dramatically into rapid wind-driven runs
- Strong winds (30+ km/h): elliptical fire shape with narrow, intense head and elongated flanks
- Flame behavior: flames angle forward and low to ground under high wind, driving rapid spread
- Spotting: embers lofted downwind, creating spot fires ahead. Forest fires can spot 2+ km away; extreme conditions 30 km

TERRAIN EFFECTS:
- Upslope fires: flames race uphill with towering height (every 10° slope roughly doubles ROS)
- Downslope fires: flames reduce intensity (50% slower than flat ground), shorter flame, more smoldering
- Ridge/valley effects: canyons can create chimney effects; valleys may trap smoke; ridgetops favor spread

FUEL-DEPENDENT BEHAVIOR:
- Grassland: rapid transient fires, moderate flames (3-5m), lower total heat release
- Forest (dry fuel): sustained intense flames (10-20m+), potential crown fire above 15m, ember storms
- Fuel load determines flame height: higher load = taller flames and greater intensity
- Moisture suppresses all behavior; critically dry fuels enable extreme spread and intensity

SMOKE & INTENSITY INDICATORS:
- Low intensity: light wispy smoke, vertical flame orientation, minimal forward tilt
- High intensity: towering pyrocumulus clouds, horizontal flame angle, massive smoke columns, dark overhead
- Crown fire: flames engulf tree canopy (15m+), appear uniform and violent, extreme smoke production
```

## Part 2: Content Requiring Fire Behaviour Agent

The following aspects are **scenario-specific** and require intelligent analysis of multiple input parameters. These should NOT be hard-coded into the prompt but generated dynamically by a fire behaviour agent:

1. **Perimeter shape interpretation** - How does this specific fire's area/extent/aspect ratio translate to visual form?
2. **Fire stage-specific behavior** - What does a "spot fire" vs. "established" vs. "major" fire look like visually?
3. **Wind + slope + fuel interaction** - The combined effect is non-linear and depends on specific values
4. **Specific head/flank/heel positioning** - Exactly where should flames be tallest/shortest given specific wind direction?
5. **Spotting probability** - Should spot fires be visible ahead? (depends on fuel type + wind speed)
6. **Pyrocumulus development** - Should clouds be present? (depends on intensity + atmospheric conditions)
7. **Flame angle and lean** - Specific calculation based on wind speed magnitude
8. **Rate of spread visual manifestation** - How "frantic" does the fire appear? (frozen moment context)

---

# Architectural Plan: Fire Behaviour Agent System

## Overview

Introduce an intermediate **Fire Behaviour Agent** step between scenario input and prompt generation. This agent:
- Reads fire behaviour reference material (fire-behaviour-guide-clean.md)
- Analyzes scenario parameters (terrain, wind, fuel, intensity, stage)
- Generates a contextual **fire behavior description** (200-400 words)
- This description is inserted into a new prompt section
- Image model receives both structured data AND behavioral narrative

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    GenerationRequest Input                       │
│  (perimeter, inputs, geoContext, requestedViews)               │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────────────┐
        │  Fire Behaviour Agent          │
        │  (NEW COMPONENT)               │
        │                                │
        │  1. Load fire behaviour ref    │
        │  2. Analyze scenario params    │
        │  3. Generate behavior desc     │
        │  4. Return FireBehaviorContext │
        └────────────┬───────────────────┘
                     │
                     ▼
        ┌────────────────────────────────┐
        │  Prompt Generation Pipeline    │
        │  (EXISTING - ENHANCED)         │
        │                                │
        │  - preparePromptData()         │
        │  - composePrompt()             │
        │  + INSERT behavior section     │
        └────────────┬───────────────────┘
                     │
                     ▼
        ┌────────────────────────────────┐
        │  API Response to Image Model   │
        │  PromptSet with v1.8.0 template│
        │  (includes fire behavior desc) │
        └────────────────────────────────┘
```

## Component Details

### 1. Fire Behaviour Agent (`fireBehaviorAnalyzer.ts`)

**Location:** `packages/shared/src/prompts/fireBehaviorAnalyzer.ts`

**Inputs:**
- `GenerationRequest` (full scenario data)
- Fire behaviour reference content (embedded as string constant or loaded)

**Outputs:**
```typescript
interface FireBehaviorContext {
  headFireDescription: string;      // How the head fire appears
  flankFireDescription: string;     // Flank characteristics
  heelFireDescription: string;      // Heel/backing behavior
  windEffects: string;              // Wind-specific visual cues
  terrainEffects: string;           // Slope/topography manifestations
  spotfireRisk: string;             // Whether/where spotting occurs
  smokeCharacteristics: string;     // Pyrocumulus, intensity of column
  overallBehaviorNarrative: string; // 200-400 word synthesis
}
```

**Logic Flow:**

```typescript
function analyzeFireBehavior(request: GenerationRequest): FireBehaviorContext {
  const { inputs, geoContext, perimeter } = request;
  
  // 1. Extract key parameters
  const windSpeed = inputs.windSpeed;
  const windDirection = inputs.windDirection;
  const slope = geoContext.slope.mean;
  const vegType = geoContext.vegetationType;
  const intensity = inputs.intensity;
  const fireStage = inputs.fireStage;
  
  // 2. Determine structural behavior
  const headBehavior = determineHeadFireBehavior(windSpeed, slope, intensity);
  const flankBehavior = determinFlankBehavior(windSpeed, slope, intensity);
  const heelBehavior = determineHeelBehavior(windSpeed, slope);
  
  // 3. Calculate spotting likelihood
  const spotfireLikelihood = calculateSpottingRisk(
    vegType, 
    windSpeed, 
    intensity
  );
  
  // 4. Determine atmospheric effects
  const pyroCumulusLikely = intensity >= 'high' && 
                            !inputs.timeOfDay.includes('night');
  
  // 5. Synthesize into narrative
  const narrative = synthesizeNarrative({
    headBehavior,
    flankBehavior,
    heelBehavior,
    spotfireLikelihood,
    terrainProfile: geoContext.slope,
    windProfile: windSpeed,
    pyroCumulusLikely,
    vegetationType: vegType,
  });
  
  return {
    headFireDescription,
    flankFireDescription,
    heelFireDescription,
    windEffects,
    terrainEffects,
    spotfireRisk,
    smokeCharacteristics,
    overallBehaviorNarrative: narrative,
  };
}
```

### 2. Helper Functions (Decision Logic)

Each function encodes fire behaviour principles from the reference document:

#### `determineHeadFireBehavior(windSpeed, slope, intensity)`
Returns a description like:
- **Light (wind <10 km/h):** "Head flames burn relatively vertically with even spread"
- **Moderate (10-30 km/h):** "Head flames angle forward at 30-45°, making direct contact with unburned fuel"
- **Strong (>30 km/h) + upslope:** "Head flames are nearly horizontal, racing upslope with catastrophic intensity"
- **Strong + downslope:** "Head fire loses momentum on descent; flames become less defined"

#### `determineFlankBehavior(windSpeed, slope, intensity)`
Returns descriptions of:
- Flame height relative to head (typically 20-50% of head height)
- Colour intensity (orange vs. bright yellow vs. deep red)
- Coherence (continuous line vs. intermittent patches)

#### `calculateSpottingRisk(vegType, windSpeed, intensity)`
- **Grassland + wind >20 km/h:** "Short-range spotting (50-200m ahead)"
- **Eucalypt forest + wind >30 km/h + high intensity:** "Significant spotting 500m-2km ahead"
- **Eucalypt + extreme (>40 km/h, catastrophic):** "Potential long-range spotting visible 2-5km ahead"
- Returns: visibility, distance, frequency, fire size

#### `synthesizeNarrative(context)`
Combines all elements into a 200-400 word description that reads like a fire behaviour expert wrote it, e.g.:

> "The head fire is racing northeast at approximately 15 km/h, with flames angled forward and nearly touching unburned eucalyptus forest. Heads flames reach 18-20 metres, well above the 15-metre canopy, indicating active crown fire with full canopy involvement. Wind-driven embers are being lofted 500-800 metres ahead, creating spot fires in the pre-heated fuel ahead of the main front. The eastern flank burns with considerably lower intensity (approximately 8m flames), creeping laterally at 3-4 km/h. The western heel is backing against the wind and terrain; flames are predominantly orange and yellow, sparse, with significant smoldering and heat-induced colour in the ash. A towering pyrocumulus cloud has formed above the head fire, darker at the base transitioning to white anvil top at 5000+ metres elevation, indicating extreme heat release and atmospheric instability. Ground-level visibility in the fire zone is severely reduced by thick smoke."

### 3. Prompt Template Update

**New Section:** Add `fireBehavior` section to `PromptTemplate` interface

```typescript
export interface PromptTemplate {
  id: string;
  version: string;
  sections: {
    // ... existing sections ...
    fireBehavior: (data: PromptData, behaviorContext: FireBehaviorContext) => string;
    // ... rest of sections ...
  };
}
```

### 4. Integration Points

#### In `promptGenerator.ts`:

```typescript
export function generatePrompts(
  request: GenerationRequest,
  template: PromptTemplate = DEFAULT_PROMPT_TEMPLATE
): PromptSet {
  const promptSetId = crypto.randomUUID();
  const data = preparePromptData(request);
  
  // NEW: Call fire behaviour agent
  const behaviorContext = analyzeFireBehavior(request);
  
  const prompts: GeneratedPrompt[] = [];

  for (const viewpoint of request.requestedViews) {
    // UPDATED: Pass behaviorContext to composePrompt
    const promptText = composePrompt(template, data, viewpoint, behaviorContext);
    // ... validation ...
    prompts.push({ /* ... */ });
  }
  
  return { /* ... */ };
}
```

#### In template section generation:

```typescript
fireBehavior: (data, behaviorContext) => {
  return (
    `Fire behavior expected: ${behaviorContext.overallBehaviorNarrative}\n\n` +
    `Head fire characteristics: ${behaviorContext.headFireDescription}\n` +
    `Flank behavior: ${behaviorContext.flankFireDescription}\n` +
    `Heel/backing fire: ${behaviorContext.heelFireDescription}\n` +
    `Wind-driven spotting: ${behaviorContext.spotfireRisk}\n` +
    `Smoke and atmospheric effects: ${behaviorContext.smokeCharacteristics}`
  );
}
```

## Implementation Phases

### Phase 1: Core Agent (Iteration 1)
- [ ] Create `fireBehaviorAnalyzer.ts` with basic logic
- [ ] Implement helper functions with if/else rules
- [ ] Test against 5-10 manual scenarios
- [ ] Integrate into prompt pipeline
- [ ] Update template to v1.8.0

### Phase 2: Refinement (Iteration 2)
- [ ] Expand behavioural descriptions (more nuance)
- [ ] Add edge cases (extreme wind, complex terrain)
- [ ] Validate against reference document principles
- [ ] Gather trainer feedback on descriptions
- [ ] Adjust narrative synthesis logic

### Phase 3: AI-Powered Enhancement (Optional Future)
- [ ] Replace hard-coded rules with fine-tuned LLM
- [ ] Pass reference doc + scenario to Claude 3.5 Sonnet
- [ ] Extract structured fire behaviour output
- [ ] Cache reference doc for cost efficiency

---

## Benefits

✅ **Scientifically grounded** – Descriptions follow established fire behaviour principles
✅ **Scenario-aware** – Each prompt contextually specific to inputs
✅ **Transparent** – Trainers see rationale (head at X angle because wind=Y, slope=Z)
✅ **Extensible** – Can add new behavioural rules without touching prompt template
✅ **Image model clarity** – Specific language reduces ambiguity for Gemini Image Pro
✅ **Testable** – Each agent output can be unit-tested independently

## Testing Strategy

```
Test Case: Established fire, dry eucalypt forest, NW wind 50 km/h, 15° upslope
Expected: Head fire tall (18-20m), flames angle forward, significant spotting,
          pyrocumulus cloud, flank slow and low intensity
Assertion: behaviorContext.headFireDescription contains "18-20m" or "nearly horizontal flames"
           behaviorContext.spotfireRisk contains "500m" or "significant"
```

---

## Next Steps

1. **Review this plan** – Does it align with your vision?
2. **Validate reference document encoding** – Are the principles in fire-behaviour-guide-clean.md complete?
3. **Create stub component** – Start with simple if/else logic; can evolve to LLM if needed
4. **Test with current prompts** – Ensure v1.7.0 system still works during transition to v1.8.0
5. **Gather trainer feedback** – Do the generated descriptions help trainers understand fire behavior?
