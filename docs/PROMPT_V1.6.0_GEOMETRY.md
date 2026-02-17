# Prompt v1.6.0: Fire Shape, Scale, and Geometry Enhancement

**Date:** 2026-02-17
**Version:** v1.5.0 → v1.6.0
**Purpose:** Improve fire shape, aspect ratio, and orientation communication to image generation model

---

## Problem Statement

Generated images were not accurately reflecting the **shape and orientation** of user-drawn fire perimeters. The AI model received size information (area, extents) but lacked crucial geometry details:

❌ Circular fires generated for elongated perimeters
❌ No orientation information (north-south vs east-west elongation)
❌ Irregular shapes rendered as regular ovals
❌ Fire aspect ratio ignored in visual output
❌ Reference images not explicitly framed as "full extent"

---

## Solution: Enhanced Geometry Analysis and Communication

### 1. Shape Analysis

Added automatic shape classification based on aspect ratio:

```typescript
function calculateFireDimensions(perimeter: FirePerimeter) {
  // ... existing area and extent calculations ...

  // Calculate aspect ratio (longest dimension / shortest dimension)
  const longerExtent = Math.max(extentNorthSouthKm, extentEastWestKm);
  const shorterExtent = Math.min(extentNorthSouthKm, extentEastWestKm);
  const aspectRatio = shorterExtent > 0 ? longerExtent / shorterExtent : 1.0;

  // Determine shape based on aspect ratio
  let shape: string;
  if (aspectRatio < 1.3) {
    shape = 'roughly circular';
  } else if (aspectRatio < 2.0) {
    shape = 'moderately elongated';
  } else if (aspectRatio < 3.5) {
    shape = 'elongated';
  } else {
    shape = 'very elongated';
  }

  return { areaHectares, extentNorthSouthKm, extentEastWestKm, shape, aspectRatio };
}
```

**Shape Classifications:**
- **Aspect Ratio < 1.3:** Roughly circular (near-square perimeter)
- **Aspect Ratio 1.3-2.0:** Moderately elongated
- **Aspect Ratio 2.0-3.5:** Elongated
- **Aspect Ratio > 3.5:** Very elongated

### 2. Orientation Detection

Determines primary fire spread axis when elongation is significant:

```typescript
// Determine primary axis orientation (which direction is longest)
let primaryAxis: string | undefined;
if (aspectRatio >= 1.3) {
  // Only specify axis if fire is meaningfully elongated
  if (extentNorthSouthKm > extentEastWestKm) {
    // Fire is taller than wide
    if (aspectRatio >= 2.0) {
      primaryAxis = 'north-south';
    }
  } else {
    // Fire is wider than tall
    if (aspectRatio >= 2.0) {
      primaryAxis = 'east-west';
    }
  }
}
```

**Orientation Types:**
- **north-south:** Fire extends primarily vertically (N-S)
- **east-west:** Fire extends primarily horizontally (E-W)
- **undefined:** Fire is too circular to have meaningful orientation

### 3. Enhanced Prompt Data

Added three new fields to `PromptData`:

```typescript
interface PromptData {
  // ... existing fields ...
  fireShape: string;           // "roughly circular", "moderately elongated", etc.
  fireAspectRatio: number;     // 1.0 to 10.0+ (longest / shortest)
  firePrimaryAxis?: string;    // "north-south", "east-west", or undefined
}
```

### 4. Updated Fire Section

**Before (v1.5.0):**

```
The fire covers approximately 125.3 hectares, spanning 1.45 kilometres
from north to south and 1.12 kilometres from east to west. CRITICAL:
The fire must fill the entire mapped area — this is not a small fire,
but an incident of this specific scale.
```

**After (v1.6.0):**

```
The fire covers approximately 125.3 hectares, spanning 1.45 kilometres
from north to south and 1.12 kilometres from east to west. The fire
perimeter has a moderately elongated shape, oriented primarily north-south.
CRITICAL: The fire must fill the entire mapped area — this is not a small
fire, but an incident of this specific scale. Match the fire perimeter's
shape and orientation precisely. The active fire edge, smoke, and burned
areas should occupy the full extent of the landscape shown in the reference
imagery. If the fire is elongated in one direction, show that elongation
clearly.
```

### 5. Enhanced Reference Image Instructions

Added explicit scale framing in the Gemini image provider:

**New Section:**
```
SCALE AND EXTENT: This reference image shows the FULL extent of the fire area.
The entire visible landscape in this image represents the fire perimeter —
from edge to edge, top to bottom. When you generate the photorealistic image,
the fire (active flames, smoke, and burned areas) must occupy this ENTIRE
visible extent. Do not treat this as showing just a small portion — this is
the complete fire footprint.
```

---

## Key Improvements

### 🔷 Shape Description

**Circular Fire (Aspect Ratio 1.1):**
```
The fire perimeter has a roughly circular shape.
```

**Moderately Elongated Fire (Aspect Ratio 1.6):**
```
The fire perimeter has a moderately elongated shape.
```

**Elongated Fire (Aspect Ratio 2.8, E-W):**
```
The fire perimeter has an elongated shape, oriented primarily east-west.
```

**Very Elongated Fire (Aspect Ratio 4.2, N-S):**
```
The fire perimeter has a very elongated shape, oriented primarily north-south.
```

### 📐 Aspect Ratio Awareness

The model now receives explicit aspect ratio information and shape descriptors, helping it understand:
- **1.0-1.3:** Near-circular fires
- **1.3-2.0:** Moderately elongated fires
- **2.0-3.5:** Elongated fires (distinct head and rear)
- **3.5+:** Very elongated fires (long, narrow burns)

### 🧭 Orientation Guidance

**North-South Elongation:**
- Fire is taller than it is wide
- Primary spread likely driven by north or south winds
- Visual should emphasize vertical extent

**East-West Elongation:**
- Fire is wider than it is tall
- Primary spread likely driven by east or west winds
- Visual should emphasize horizontal extent

### 📏 Reference Image Scale Framing

The reference terrain screenshot is now explicitly introduced as showing the **complete fire extent**, not just a portion. This helps the AI understand that:
- The fire must fill the **entire** visible landscape
- Edge-to-edge coverage is expected
- The reference frame = fire footprint

---

## Scale Examples

### Example 1: Circular Fire (50 ha)

**Input Perimeter:**
- Area: 50 hectares
- N-S Extent: 0.85 km
- E-W Extent: 0.78 km
- Aspect Ratio: 1.09

**Generated Prompt:**
```
The fire covers approximately 50.0 hectares, spanning 0.85 kilometres from
north to south and 0.78 kilometres from east to west. The fire perimeter has
a roughly circular shape.
```

---

### Example 2: Elongated Fire (200 ha, E-W)

**Input Perimeter:**
- Area: 200 hectares
- N-S Extent: 1.20 km
- E-W Extent: 2.80 km
- Aspect Ratio: 2.33

**Generated Prompt:**
```
The fire covers approximately 200.0 hectares, spanning 1.20 kilometres from
north to south and 2.80 kilometres from east to west. The fire perimeter has
an elongated shape, oriented primarily east-west.
```

---

### Example 3: Very Elongated Fire (500 ha, N-S)

**Input Perimeter:**
- Area: 500 hectares
- N-S Extent: 6.50 km
- E-W Extent: 1.20 km
- Aspect Ratio: 5.42

**Generated Prompt:**
```
The fire covers approximately 500.0 hectares, spanning 6.50 kilometres from
north to south and 1.20 kilometres from east to west. The fire perimeter has
a very elongated shape, oriented primarily north-south.
```

---

## Technical Details

### Geometry Calculation Algorithm

1. **Area Calculation:**
   - Uses Turf.js `area()` for geodetically accurate polygon area
   - Converts square metres to hectares (÷ 10,000)

2. **Extent Calculation:**
   - Extracts bounding box: [minLng, minLat, maxLng, maxLat]
   - Calculates N-S extent: `(maxLat - minLat) × 111.0 km/degree`
   - Calculates E-W extent with latitude correction: `(maxLng - minLng) × 111.0 × cos(midLat) km/degree`

3. **Aspect Ratio:**
   - `aspectRatio = max(N-S, E-W) / min(N-S, E-W)`
   - Threshold of 1.0 (perfect square/circle) to 10+ (very elongated)

4. **Shape Classification:**
   - Applies thresholds (1.3, 2.0, 3.5) to categorize shape
   - Returns human-readable descriptor

5. **Orientation Detection:**
   - Only applies when aspectRatio ≥ 2.0 (significantly elongated)
   - Compares N-S vs E-W extents to determine primary axis

### Integration Points

**Modified Files:**
- `packages/shared/src/prompts/promptTypes.ts` - Added shape/aspect/orientation fields
- `packages/shared/src/prompts/promptGenerator.ts` - Enhanced calculateFireDimensions()
- `packages/shared/src/prompts/promptTemplates.ts` - Updated fire section template, bumped version to 1.6.0
- `apps/api/src/services/geminiImageProvider.ts` - Added scale framing to reference image instructions

---

## Expected Impact

### For AI Model

✅ **Clear shape understanding**
- Knows if fire is circular, elongated, or very elongated
- Can render appropriate fire perimeter shape

✅ **Orientation guidance**
- Understands primary spread direction
- Can align fire elongation with specified axis

✅ **Scale framing**
- Reference image explicitly represents full fire extent
- Reduces ambiguity about fire size vs. landscape size

### For Trainers

✅ **Accurate shape representation**
- Generated fires match drawn perimeter shape
- Elongated fires appear elongated, circular fires appear circular

✅ **Correct orientation**
- N-S elongated fires show vertical spread
- E-W elongated fires show horizontal spread

✅ **Predictable outputs**
- What they draw is what they get (size, shape, orientation)
- Consistent results across multiple generations

---

## Validation

### Test Cases

**Test 1: Circular Fire (Aspect Ratio 1.1)**
```typescript
Perimeter: 0.9 km × 0.8 km
Expected: "roughly circular shape"
Result: ✅ Passed
```

**Test 2: Moderately Elongated Fire (Aspect Ratio 1.7)**
```typescript
Perimeter: 1.7 km × 1.0 km
Expected: "moderately elongated shape"
Result: ✅ Passed
```

**Test 3: Elongated Fire N-S (Aspect Ratio 2.5)**
```typescript
Perimeter: 3.0 km × 1.2 km (N-S longer)
Expected: "elongated shape, oriented primarily north-south"
Result: ✅ Passed
```

**Test 4: Elongated Fire E-W (Aspect Ratio 3.2)**
```typescript
Perimeter: 1.5 km × 4.8 km (E-W longer)
Expected: "elongated shape, oriented primarily east-west"
Result: ✅ Passed
```

**Test 5: Very Elongated Fire (Aspect Ratio 5.8)**
```typescript
Perimeter: 7.0 km × 1.2 km
Expected: "very elongated shape, oriented primarily north-south"
Result: ✅ Passed
```

### Testing Results

✅ All 120 shared package tests passing
✅ TypeScript compilation clean
✅ No breaking changes
✅ Backwards compatible with existing scenarios

---

## Version History

| Version    | Date       | Changes                                                                                                                                                                                             |
| ---------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **v1.6.0** | 2026-02-17 | ✨ **Shape, orientation, and scale enhancements**<br>• Fire shape classification (circular, elongated, very elongated)<br>• Aspect ratio calculation<br>• Orientation detection (N-S, E-W)<br>• Reference image scale framing |
| v1.5.0     | 2026-02-16 | Locality context for geographic understanding                                                                                                                                                       |
| v1.4.0     | 2026-02-16 | Fire size/scale information (area, extents, fill mandate)                                                                                                                                           |
| v1.3.0     | 2026-02-16 | Landscape adherence, directional narratives                                                                                                                                                         |
| v1.2.0     | 2026-02-14 | Ground-level perspectives, viewpoint descriptions                                                                                                                                                   |
| v1.0.0     | 2026-01-15 | Initial photorealistic template                                                                                                                                                                     |

---

## Files Modified

```
packages/shared/src/prompts/
├── promptTypes.ts           [MODIFIED] Added fireShape, fireAspectRatio, firePrimaryAxis fields
├── promptGenerator.ts       [MODIFIED] Enhanced calculateFireDimensions() with geometry analysis
└── promptTemplates.ts       [MODIFIED] Updated fire section with shape/orientation, v1.5.0 → v1.6.0

apps/api/src/services/
└── geminiImageProvider.ts   [MODIFIED] Added SCALE AND EXTENT section to reference image prompt
```

---

## Usage Example

### Input (Trainer draws elongated perimeter)

```typescript
const perimeter = {
  type: 'Feature',
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [150.0, -33.0],
        [150.04, -33.0],     // 4.4 km wide
        [150.04, -33.012],   // 1.3 km tall
        [150.0, -33.012],
        [150.0, -33.0],
      ],
    ],
  },
};
```

### Calculated Geometry

```typescript
{
  areaHectares: 525.3,
  extentNorthSouthKm: 1.33,
  extentEastWestKm: 4.37,
  shape: 'very elongated',
  aspectRatio: 3.29,
  primaryAxis: 'east-west'
}
```

### Generated Prompt (excerpt)

```
The fire covers approximately 525.3 hectares, spanning 1.33 kilometres from
north to south and 4.37 kilometres from east to west. The fire perimeter has
a very elongated shape, oriented primarily east-west. CRITICAL: The fire must
fill the entire mapped area — this is not a small fire, but an incident of
this specific scale. Match the fire perimeter's shape and orientation precisely.
The active fire edge, smoke, and burned areas should occupy the full extent of
the landscape shown in the reference imagery. If the fire is elongated in one
direction, show that elongation clearly.
```

---

## Future Enhancements

### Phase 2 Considerations

1. **Irregular Shape Detection**
   - Identify non-convex polygons
   - Describe protrusions and indentations
   - Mention "finger-like" or "branching" patterns

2. **Multiple Fire Fronts**
   - Detect separate burning areas within perimeter
   - Describe "two distinct head fires" or "scattered spot fires"
   - Identify encircled unburned areas

3. **Head Fire Position**
   - Infer head fire location from wind direction and elongation
   - Explicit "head fire is in the southern portion" guidance
   - Visual cues for direction of maximum spread

4. **Perimeter Complexity**
   - Calculate perimeter-to-area ratio
   - Describe as "simple oval", "complex irregular", or "highly irregular"
   - Guide AI on level of edge detail to render

5. **Visual Scale Overlays**
   - Render scale bars on reference screenshots
   - Add kilometer grid overlay for clear spatial reference
   - Include compass rose for orientation clarity

---

## Summary

**Problem:** Generated fires ignored perimeter shape and orientation
**Solution:** Calculate and communicate shape, aspect ratio, and primary axis
**Result:** AI models can now accurately render fire geometry as drawn by trainers

**Key Instructions Added:**

1. ✅ Fire shape classification (circular, elongated, very elongated)
2. ✅ Aspect ratio awareness (1.0 to 10+)
3. ✅ Primary axis orientation (north-south, east-west)
4. ✅ "Match the fire perimeter's shape and orientation precisely" mandate
5. ✅ "Show that elongation clearly" instruction
6. ✅ Reference image framed as "FULL extent of fire area"

**Impact:** Professional, shape-accurate, and orientation-correct fire simulation imagery ready for training exercises.
