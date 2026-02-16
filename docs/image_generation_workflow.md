# Image Generation Workflow: Landscape Realism & Multi-View Approach

**Version:** 1.3.0  
**Last Updated:** 2026-02-16  
**Related Issue:** Revise prompt & workflow for landscape realism, directional perspective, and improved overlay controls

## Overview

This document describes the comprehensive workflow for generating photorealistic fire simulation images with strict adherence to actual landscapes, multi-perspective views, and enhanced vegetation context.

## Core Principles

### 1. Landscape Fidelity

**Objective:** Generated images must accurately reflect the actual landscape as shown in satellite imagery and map views.

**Implementation:**
- All terrain features (hills, valleys, ridgelines, gullies) must be preserved exactly
- Man-made structures (buildings, roads, fences, clearings) must appear in correct positions and scales
- Images must be recognizable as the specific location, not generic fire scenes
- Reference screenshots provide visual ground truth for the AI model

**Prompt Language (v1.3.0):**
```
"This is NOT an artistic interpretation — it must accurately depict the actual 
landscape as it exists. Any man-made structures (buildings, roads, fences, clearings) 
visible in satellite imagery must appear in the same position and scale. Match the 
reference landscape precisely — the generated image must be recognizable as this 
specific location."
```

### 2. Multi-Perspective Capture

**Objective:** Provide both strategic (top-down) and tactical (ground-level) views for comprehensive training scenarios.

**Captured Views:**

| View Type | Purpose | Camera Position | Use Case |
|-----------|---------|-----------------|----------|
| **Aerial (Top-Down)** | Strategic overview | 300m altitude, 0° pitch | Incident management, perimeter assessment |
| **Ground North** | Tactical perspective | Ground level, looking south | Crew approaching from north |
| **Ground East** | Tactical perspective | Ground level, looking west | Crew approaching from east |
| **Ground South** | Tactical perspective | Ground level, looking north | Crew in burned area |
| **Ground West** | Tactical perspective | Ground level, looking west | Crew approaching from west |

**Implementation:**
```typescript
const requestedViews: ViewPoint[] = [
  'ground_north',
  'ground_east', 
  'ground_south',
  'ground_west',
  'aerial',
];
```

### 3. Directional Narrative

**Objective:** Ground users in the perspective with clear directional context.

**Ground-Level Viewpoint Descriptions:**

**Ground North:**
```
"You're standing on the ground to the north of the fire, looking south towards 
the approaching flame front. Ground-level photograph taken at eye level, 
approximately 500 metres from the fire edge"
```

**Ground East:**
```
"You're standing on the ground to the east of the fire, looking west at the 
flank of the fire. Ground-level photograph taken at eye level, capturing the 
fire's flank and smoke movement"
```

**Ground South:**
```
"You're standing on the ground to the south of the fire, looking north across 
the burned area towards the active fire line. Ground-level photograph showing 
the burned area with fire visible in the distance"
```

**Ground West:**
```
"You're standing on the ground to the west of the fire, looking east at the 
flank of the fire. Ground-level photograph taken at eye level, capturing the 
fire's flank and smoke movement"
```

**Benefits:**
- Creates immersive perspective for training scenarios
- Clarifies observer position relative to fire
- Helps trainers explain tactical positioning
- Grounds the AI model in realistic observation context

## Workflow Steps

### Step 1: Perimeter Drawing

1. User draws fire perimeter polygon on 3D terrain map
2. System calculates:
   - Centroid (geographic center)
   - Bounding box (extent)
   - Area in hectares
   - Camera positions for each viewpoint

### Step 2: Scenario Configuration

User configures fire behavior parameters:
- Fire intensity (low to catastrophic)
- Fire stage (spot fire to major campaign)
- Wind speed and direction
- Temperature and humidity
- Time of day
- Optional: explicit flame height and rate of spread

### Step 3: Screenshot Capture

**3.1 Terrain Reference Screenshots**

For each requested viewpoint, the system:
1. Moves camera to calculated position
2. Sets appropriate pitch, bearing, and zoom
3. Waits for terrain tiles to load (6 seconds)
4. Captures canvas as JPEG (quality 0.8)

**Camera Parameters by View:**

| View | Pitch | Bearing | Distance Multiplier | Zoom Adjustment |
|------|-------|---------|---------------------|-----------------|
| Aerial | 0° | 0° | 0.8x bbox | baseZoom - 1 |
| Ground North | 85° | 180° | 0.35x bbox | baseZoom + 1.5 |
| Ground East | 85° | 270° | 0.35x bbox | baseZoom + 1.5 |
| Ground South | 85° | 0° | 0.35x bbox | baseZoom + 1.5 |
| Ground West | 85° | 90° | 0.35x bbox | baseZoom + 1.5 |

**3.2 Vegetation Overlay Screenshot**

After terrain captures:
1. Toggle NSW State Vegetation Type Map (SVTM) overlay ON
2. Move to top-down aerial view (pitch 0°, zoom slightly wider)
3. Wait for WMS tiles to load (8 seconds)
4. Capture vegetation map
5. Restore previous vegetation visibility state

**Vegetation Map Purpose:**
- Provides spatial vegetation context to AI model
- Shows where different vegetation formations exist
- Helps AI match vegetation to terrain features
- Color-coded formations (17 categories from SVTM)

### Step 4: Prompt Generation

System generates structured prompts for each viewpoint using template v1.3.0:

**Prompt Structure:**

1. **Style Section**
   - Photography specifications (Canon EOS R5, 24-70mm f/2.8)
   - Landscape fidelity requirements
   - Structural preservation mandates

2. **Scene Section**
   - Terrain description (slope, elevation)
   - Vegetation descriptor (from SVTM or user selection)
   - Nearby features context
   - Topographic feature preservation requirements

3. **Fire Behavior Section**
   - Fire stage and intensity
   - Flame height (qualitative or explicit)
   - Smoke characteristics
   - Spread direction and rate

4. **Weather Section**
   - Wind description (speed, direction)
   - Temperature and humidity
   - Time of day lighting

5. **Perspective Section**
   - Camera position and angle
   - Directional narrative (for ground views)
   - Distance from fire

6. **Safety Section**
   - Uninhabited wilderness constraints
   - Natural scene requirements

**Example Ground North Prompt:**
```
Create a photorealistic photograph for a fire service training exercise. The image 
should look like it was captured on location by a firefighter with a Canon EOS R5 
and a 24-70mm f/2.8 lens. It depicts a real, specific place in the Australian 
landscape during a bushfire — not a generic or stock fire image. This is NOT an 
artistic interpretation — it must accurately depict the actual landscape as it 
exists. Every landform, ridge line, valley contour, vegetation patch, and visible 
road or clearing in the reference terrain must be faithfully preserved. Any man-made 
structures (buildings, roads, fences, clearings) visible in satellite imagery must 
appear in the same position and scale. Match the reference landscape precisely — 
the generated image must be recognizable as this specific location.

First, establish the landscape with strict adherence to the reference imagery. The 
terrain is gently sloping terrain, covered with dry eucalyptus forest with sparse 
understorey, at approximately 350 metres elevation in New South Wales, Australia. 
A road runs nearby. Preserve every topographic feature exactly where it appears in 
the reference — hills, gullies, flat paddocks, tree lines, bare earth patches, fence 
lines, and any built structures. If the reference shows a building, road, or clearing, 
it must appear in the generated image in the same location with the same scale and 
orientation.

Then, add the fire. A established bushfire is burning through the vegetation. High 
intensity with intermittent crown fire. Flames are 3 to 10 metres high with dense 
grey-black smoke columns. The head fire is spreading to the south, driven by moderate 
north winds.

The conditions are 35°C with 15% relative humidity and a 25 km/h N wind. Warm 
afternoon light from the west, golden-orange tones, lengthening shadows.

Finally, set the camera position: You're standing on the ground to the north of the 
fire, looking south towards the approaching flame front. Ground-level photograph 
taken at eye level, approximately 500 metres from the fire edge.

The landscape is uninhabited wilderness — only natural terrain, vegetation, fire, 
and smoke are present. The image contains only the natural scene with realistic 
textures, lighting, and atmospheric haze.
```

### Step 5: Image Generation

System sends to AI model:
- Generated prompt (text)
- Terrain reference screenshot for that viewpoint
- Vegetation map screenshot (shared across all views)
- Seed (optional, for consistency across views)

**AI Model Processing:**
1. Interprets prompt requirements
2. References terrain screenshot for landscape structure
3. References vegetation map for spatial vegetation context
4. Generates photorealistic image matching all constraints
5. Returns image with metadata

### Step 6: Results Storage & Display

Generated images are:
- Stored in Azure Blob Storage
- Tagged with viewpoint, prompt version, and scenario ID
- Displayed in UI grouped by viewpoint
- Available for download (individual or ZIP)

## Vegetation Context Integration

### NSW State Vegetation Type Map (SVTM)

**Data Source:**
- Publisher: NSW Department of Climate Change, Energy, the Environment and Water
- License: CC-BY 4.0
- Coverage: All of NSW
- Resolution: 5m raster, 1:5,000–1:25,000 scale
- Formations: 17 vegetation categories

**Common Formations:**
- Dry sclerophyll forests (shrub/grass and shrubby subformations)
- Wet sclerophyll forests (grassy and shrubby subformations)
- Grasslands
- Grassy woodlands
- Heathlands
- Cleared land
- Rainforests

**Integration Method:**

The vegetation overlay is captured as a separate reference image showing:
- Color-coded vegetation formations
- Spatial distribution across fire perimeter
- Context for mixed vegetation landscapes

**AI Model Instructions (included with vegetation screenshot):**
```
"You are also provided with a vegetation formation map from the NSW State Vegetation 
Type Map. This color-coded overlay shows authoritative vegetation classifications. 
Match the vegetation in each part of your generated image to what this map shows. 
Where the map shows different colors, render the corresponding vegetation formations 
in those locations."
```

## Quality Assurance

### Landscape Adherence Checklist

Before finalizing images, verify:
- [ ] Terrain features match reference screenshots
- [ ] Man-made structures preserved in correct positions
- [ ] Vegetation distribution matches spatial context
- [ ] Image is recognizable as the specific location
- [ ] Not a generic or stock fire image

### Multi-View Consistency Checklist

Across all generated views, verify:
- [ ] Fire intensity consistent
- [ ] Smoke characteristics consistent
- [ ] Weather conditions consistent (wind, lighting)
- [ ] Terrain features consistent from different angles
- [ ] Vegetation matches spatial distribution

### Directional Narrative Checklist

For ground-level views, verify:
- [ ] Perspective matches stated position
- [ ] Fire direction aligns with narrative
- [ ] Tactical context is clear
- [ ] Immersive observation point established

## Future Enhancements

### Vegetation Label Layer

**Current State:**
- Vegetation overlay shows colored polygons
- No labels visible on map overlay

**Proposed Enhancement:**
- Add separate label layer from SVTM WMS
- Toggle to show/hide formation labels
- Enable labels by default for example screenshots
- Include formation names in captured vegetation screenshots

**Implementation Options:**
1. WMS layer with labels enabled
2. Vector layer with formation labels
3. Custom labels from ArcGIS identify queries

### Enhanced Spatial Vegetation Context

**Current:** Single top-down vegetation map  
**Proposed:** Spatial vegetation query at multiple points

Query vegetation formations at:
- Fire perimeter center
- 8 compass points around perimeter (N, NE, E, SE, S, SW, W, NW)

Include in prompt:
```
"Vegetation context: The fire perimeter center is in Dry sclerophyll forests 
(Shrubby subformation). To the north: Grassy woodland. To the east: Cleared land. 
To the south: Wet sclerophyll forests (Grassy subformation). To the west: 
Dry sclerophyll forests (Shrubby subformation)."
```

Benefits:
- More precise spatial context
- Handles transitions between formations
- Complements visual vegetation map

## Troubleshooting

### Issue: Generated images don't match landscape

**Solutions:**
1. Verify reference screenshots captured correctly
2. Check vegetation overlay data loaded
3. Increase reference image weight in AI model
4. Review prompt for landscape adherence language
5. Check that terrain features are visible in reference at appropriate zoom

### Issue: Ground views don't show expected perspective

**Solutions:**
1. Verify camera pitch is 85° (near-horizontal)
2. Check distance multiplier (0.35x bbox)
3. Ensure terrain 3D is enabled
4. Review directional narrative in prompt
5. Validate bearing matches viewing direction

### Issue: Vegetation doesn't match expected types

**Solutions:**
1. Verify NSW SVTM WMS loading correctly
2. Check vegetation screenshot captured with layer visible
3. Ensure vegetation map included in AI request
4. Review vegetation context instructions in prompt
5. Consider adding text-based spatial vegetation description

## References

- [Prompt Quality Standards](./prompt_quality_standards.md)
- [View Perspectives Reference](./current_state/view_perspectives.md)
- [ADR-006: NSW Vegetation Overlay](./adr/ADR-006-nsw-vegetation-overlay.md)
- [Master Plan](./master_plan.md)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.3.0 | 2026-02-16 | Added directional narrative, enhanced landscape adherence, documented multi-view workflow |
| 1.2.0 | 2026-02-14 | Added ground-level perspectives, improved viewpoint descriptions |
| 1.0.0 | 2026-01-15 | Initial workflow documentation |
