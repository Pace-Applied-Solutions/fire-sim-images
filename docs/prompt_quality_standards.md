# Prompt Quality Test Suite

This document defines the quality standards for AI-generated prompts in the fire simulation tool.

## Required Sections

All prompts MUST contain the following sections:

### 1. Style/Photography Type

- Must specify the type of photograph (aerial, helicopter, ground-level)
- Must indicate the medium (photograph, realistic image)

### 2. Scene Context

- Must describe the vegetation type
- Must include terrain characteristics (slope, elevation)
- Should mention nearby features when relevant

### 3. Fire Characteristics

- Must describe fire intensity
- Must specify flame height ranges
- Must describe smoke characteristics
- Should mention fire behavior (spotting, crown involvement)

### 4. Weather Conditions

- Must include wind direction and strength
- Should mention temperature and humidity context
- Must specify time of day and lighting conditions

### 5. Perspective Details

- Must describe the camera position and angle
- Must specify the distance from the fire
- Should indicate what should be visible in the frame

### 6. Safety/Negative Prompts

- Must include safety constraints (no people, no animals unless explicitly needed)
- Must exclude blocked terms

## RFS Terminology Requirements

Prompts must use appropriate Rural Fire Service (RFS) and Australian fire service terminology:

### Required Terms (use at least 3)

- bushfire
- eucalypt/eucalyptus
- sclerophyll
- crown fire
- spotting
- ember attack
- fire front
- fire perimeter
- smoke column/plume
- pyrocumulus

### Fire Behavior Terms (use when appropriate)

- torching
- crowning
- fire run
- fire whirl
- spot fire
- backburn
- fire break

### Vegetation Terms

- dry sclerophyll forest
- wet sclerophyll forest
- heathland
- grassland
- mallee
- brigalow

## Blocked Terms

The following terms MUST NOT appear in the descriptive sections of prompts:

- explosion
- casualties
- violence
- death
- injury
- victim
- destroy (use "burn" or "consume" instead)
- devastation (use "fire impact" or "burn area" instead)

Note: These terms may appear in negative prompts (e.g., "No casualties visible").

## Viewpoint Consistency

Prompts for different viewpoints of the same scenario must:

1. **Maintain consistent fire characteristics**
   - Same intensity level
   - Same smoke color and volume
   - Same fire stage

2. **Maintain consistent weather**
   - Same wind direction
   - Same lighting/time of day
   - Same atmospheric conditions

3. **Describe different perspectives**
   - Each viewpoint should have unique camera position
   - Different viewpoints should show different aspects of the fire
   - Prompts should be clearly distinguishable

## Prompt Completeness Score

Calculate the completeness score by checking for the presence of required elements:

```
Score = (sections_present / total_required_sections) * 100

Required sections:
- Style (20 points)
- Scene (20 points)
- Fire characteristics (20 points)
- Weather (20 points)
- Perspective (20 points)

Bonus points:
- RFS terminology (up to 10 points)
- Safety section (10 points)

Maximum score: 110 points (normalized to 100)
```

## Quality Gates

### Minimum Requirements (MVP)

- ✅ Prompt completeness score: **100%** (all required sections present)
- ✅ No blocked terms in descriptive sections: **0 violations**
- ✅ RFS terminology: **At least 3 terms** per prompt
- ✅ Viewpoint descriptions differ: **Each viewpoint unique**

### Target Requirements (Post-MVP)

- 🎯 Prompt completeness score: **100%** with bonus points
- 🎯 RFS terminology: **5+ terms** per prompt
- 🎯 Viewpoint consistency score: **≥80%** across all images
- 🎯 No content safety flags: **100%** of test scenarios

## Test Scenarios

The following standard scenarios are used for prompt quality validation:

| Scenario ID | Name                       | Location       | Type         | Intensity | Time      | Expected Keywords                           |
| ----------- | -------------------------- | -------------- | ------------ | --------- | --------- | ------------------------------------------- |
| TEST-001    | Blue Mountains forest fire | -33.72, 150.31 | Forest       | Very High | Afternoon | eucalypt, sclerophyll, crown fire, spotting |
| TEST-002    | Western Plains grassfire   | -32.5, 148.0   | Grassland    | Moderate  | Midday    | grassfire, ember, fast-moving               |
| TEST-003    | South Coast interface fire | -35.7, 150.2   | Forest/Urban | High      | Dusk      | interface, spotting, ember attack           |
| TEST-004    | Night operation            | -33.8, 150.1   | Forest       | Moderate  | Night     | night, glow, illuminated                    |

## Automated Checks

The following checks are performed automatically on all generated prompts:

1. **Section Presence Check**
   - Verify all required sections are present
   - Score: PASS/FAIL

2. **Terminology Check**
   - Count RFS-specific terms
   - Score: Number of terms found

3. **Blocked Terms Check**
   - Scan for any blocked terms
   - Score: PASS if 0 found, FAIL otherwise

4. **Viewpoint Uniqueness Check**
   - Compare prompts for different viewpoints
   - Score: Percentage difference

5. **Length Validation**
   - Minimum length: 100 characters
   - Maximum length: 2000 characters
   - Score: PASS/FAIL

## Example: High-Quality Prompt

```
Professional aerial photograph taken from a helicopter at 300 metres altitude,
looking straight down at an active bushfire. Scene shows Dry Sclerophyll Forest
with dense eucalypt canopy on moderate slopes. Very high intensity fire with
10 to 20 metre flames consuming the forest canopy. Active crown fire with
sustained crowning through the treetops. Massive dark smoke column forming
pyrocumulus cloud. Strong northwesterly winds pushing smoke to the southeast.
Fire spreading rapidly with medium-range spotting ahead of the head fire.
Warm afternoon light from the west, golden-orange tones. Temperature 40°C,
humidity 10%. Photorealistic detail with visible individual trees, ember showers,
and fire front. No people, no animals, no vehicles, no text, no watermarks.
```

**Completeness Score:** 100%

- ✅ Style: aerial photograph, helicopter, 300 metres
- ✅ Scene: Dry Sclerophyll Forest, eucalypt, moderate slopes
- ✅ Fire: very high intensity, 10-20m flames, crown fire, spotting
- ✅ Weather: NW winds, 40°C, 10% humidity, afternoon
- ✅ Perspective: straight down, 300m altitude
- ✅ RFS terms: bushfire (1), eucalypt (2), crown fire (3), spotting (4), ember (5)
- ✅ Safety: no people, no animals, etc.

## Validation Implementation

See `packages/shared/src/__tests__/promptGenerator.test.ts` for automated test implementation.

## Future Enhancements

Post-MVP improvements to consider:

1. **Image Analysis Integration**
   - Verify generated images match prompt descriptions
   - Automated smoke direction detection
   - Color palette consistency analysis

2. **Trainer Feedback Loop**
   - Incorporate trainer ratings into prompt scoring
   - Identify common issues and adjust templates
   - Build corpus of high-quality prompts

3. **Semantic Analysis**
   - Use NLP to verify prompt coherence
   - Check for contradictory descriptions
   - Validate technical accuracy of fire behavior terms

4. **Multi-language Support**
   - Support for non-English fire service terminology
   - Regional variations in fire behavior descriptions
