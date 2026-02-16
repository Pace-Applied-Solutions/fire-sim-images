# ADR-006: NSW State Vegetation Type Map Integration

**Status:** Proposed  
**Date:** 2026-02-16  
**Context:** Improving vegetation accuracy in generated fire scenario images

## Summary

Integrate the NSW State Vegetation Type Map (SVTM) dataset as an additional data layer during image generation to provide spatially accurate vegetation information to the AI model.

## Problem

Currently, vegetation type is a single value selected by the user from a dropdown (13 options in `VEGETATION_TYPES`). This means:

1. The entire fire scene uses one uniform vegetation descriptor ("dry eucalyptus forest with sparse understorey")
2. Real landscapes contain **mixed** vegetation — a fire on a ridgeline might have dry sclerophyll on the upper slope, wet sclerophyll in the gully, and cleared farmland to the east
3. The AI has no spatial vegetation reference — only the terrain screenshot (satellite imagery draped on 3D) and a text description

The SVTM provides authoritative, spatially resolved vegetation formation data across all of NSW.

## Data Source

**NSW State Vegetation Type Map (SVTM)**  
- Publisher: NSW Department of Climate Change, Energy, the Environment and Water  
- License: CC-BY 4.0  
- Coverage: All of NSW  
- Resolution: 5m GeoTIFF raster, mapped at 1:5,000–1:25,000 scale  
- Current release: C2.0.M2.2 (December 2025)  
- Catalog: [SEED](https://datasets.seed.nsw.gov.au/dataset/nsw-state-vegetation-type-map1e498)

### Confirmed Endpoints

| Endpoint | URL | Notes |
|----------|-----|-------|
| **ArcGIS MapServer** | `https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Vegetation_IBCA/nswmap_2_3a_ext/MapServer` | Raster layer, WKID 4283 (GDA94) |
| **WMS 1.3.0** | `https://mapprod3.environment.nsw.gov.au/arcgis/services/Vegetation_IBCA/nswmap_2_3a_ext/MapServer/WmsServer` | GetMap (PNG/JPEG), GetFeatureInfo, MaxSize 4096×4096 |
| **Export (REST)** | `.../MapServer/export?bbox=...&format=png&transparent=true&f=image` | Direct image export, **CORS enabled** (`access-control-allow-origin: *`) |
| **Identify (REST)** | `.../MapServer/identify?geometry=lng,lat&geometryType=esriGeometryPoint&sr=4283&f=json` | Returns Formation name, Class name, VIS_ID per pixel |

No API key required. All endpoints are publicly accessible.

### Vegetation Formations (17 categories)

The SVTM classifies vegetation into 17 formation categories, each rendered as a distinct color on the map:

| Formation | Fire Relevance |
|-----------|---------------|
| Alpine complex | Low fuel loads, stunted shrubs |
| Arid shrublands (Acacia subformation) | Spinifex/mulga fuels |
| Arid shrublands (Chenopod subformation) | Sparse fuel, low intensity |
| **Cleared** | Minimal vegetation, structures |
| **Dry sclerophyll forests (Shrub/grass subformation)** | High fire risk, dominant in eastern NSW |
| **Dry sclerophyll forests (Shrubby subformation)** | Dense shrub layer, high intensity |
| Forested wetlands | Moist, lower fire risk |
| Freshwater wetlands | Water-adjacent, seasonal drying |
| **Grasslands** | Rapid spread, low intensity |
| **Grassy woodlands** | Mixed fuel, moderate spread |
| **Heathlands** | Dense, volatile fuels |
| Rainforests | Typically fire-resistant, high moisture |
| Saline wetlands | Coastal, salt-tolerant |
| Semi-arid woodlands (Grassy subformation) | Sparse, grass-driven fires |
| Semi-arid woodlands (Shrubby subformation) | Mixed fuel model |
| **Wet sclerophyll forests (Grassy subformation)** | Tall forest, heavy fuel |
| **Wet sclerophyll forests (Shrubby subformation)** | Dense understorey, extreme fire |

Bold = most common in fire scenarios for eastern NSW.

### Mapping to Existing VEGETATION_TYPES

| SVTM Formation | Current VEGETATION_TYPE | Descriptor Match |
|---|---|---|
| Dry sclerophyll forests (Shrub/grass) | Dry Sclerophyll Forest | ✅ Good |
| Dry sclerophyll forests (Shrubby) | Dry Sclerophyll Forest | ✅ Good (could differentiate) |
| Wet sclerophyll forests (Grassy) | Wet Sclerophyll Forest | ✅ Good |
| Wet sclerophyll forests (Shrubby) | Wet Sclerophyll Forest | ✅ Good (could differentiate) |
| Grasslands | Grassland | ✅ Exact |
| Grassy woodlands | Grassy Woodland | ✅ Exact |
| Heathlands | Heath | ✅ Exact |
| Rainforests | Rainforest | ✅ Exact |
| Alpine complex | Alpine Complex | ✅ Exact |
| Cleared | Cleared/Urban | ✅ Close |
| Forested wetlands | Riverine Forest / Swamp Sclerophyll | ⚠️ Approximate |
| Freshwater wetlands | *(not in current list)* | ❌ New |
| Saline wetlands | *(not in current list)* | ❌ New |
| Arid shrublands (Acacia) | *(not in current list)* | ❌ New |
| Arid shrublands (Chenopod) | *(not in current list)* | ❌ New |
| Semi-arid woodlands (Grassy) | *(not in current list)* | ❌ New |
| Semi-arid woodlands (Shrubby) | *(not in current list)* | ❌ New |

**Result:** 10/17 formations map well to existing types. 7 would need new descriptors (mostly arid/semi-arid and wetland types less common in fire training scenarios).

## Design Options

### Option A: Client-Side WMS Overlay (Recommended)

Add the SVTM WMS as a Mapbox raster source. During screenshot capture, toggle the layer on and capture an additional aerial "vegetation map" screenshot. Send this as an extra reference image to the AI alongside the terrain screenshots.

```
User draws perimeter → Map captures terrain screenshots (aerial, ground_north, ground_east)
                      → Map toggles vegetation overlay ON
                      → Map captures vegetation screenshot (aerial only, 2D top-down)
                      → Map toggles vegetation overlay OFF
                      → All 4 images + prompt sent to API
                      → API augments prompt with vegetation legend context
                      → AI sees: terrain + vegetation map + prompt describing both
```

**Frontend changes:**
1. Add WMS raster source to `MapContainer.tsx`:
   ```typescript
   map.addSource('nsw-vegetation', {
     type: 'raster',
     tiles: [
       'https://mapprod3.environment.nsw.gov.au/arcgis/services/Vegetation_IBCA/nswmap_2_3a_ext/MapServer/WmsServer?service=WMS&request=GetMap&layers=0&styles=&format=image/png&transparent=true&version=1.3.0&crs=EPSG:4326&width=256&height=256&bbox={bbox-epsg-4326}'
     ],
     tileSize: 256,
   });
   ```
2. Add a toggle-able raster layer (hidden by default):
   ```typescript
   map.addLayer({
     id: 'nsw-vegetation-layer',
     type: 'raster',
     source: 'nsw-vegetation',
     paint: { 'raster-opacity': 0.7 },
     layout: { visibility: 'none' },
   });
   ```
3. In `mapCapture.ts`, after capturing normal viewpoints:
   - Toggle vegetation layer ON (`visibility: 'visible'`)
   - Jump to aerial view (pitch 0, zoom to show full perimeter + buffer)
   - Wait for tiles to load
   - Capture screenshot
   - Toggle vegetation layer OFF
   - Include as `vegetationMapScreenshot` in the request

**API changes:**
4. In `geminiImageProvider.ts`, include the vegetation screenshot as a second image in the `contents.parts` array with instructions:
   ```
   "The following image is a vegetation formation map from the NSW State Vegetation Type Map.
   Color-coded areas show different vegetation formations. Use this to ensure each part of the
   landscape has the correct vegetation type — the terrain near ridgelines may be dry sclerophyll,
   gullies may contain wet sclerophyll or rainforest, and flat areas may be grassland or cleared."
   ```

**Pros:** Visual spatial context — the AI sees *where* each vegetation type is relative to terrain features. User can also see and verify the vegetation data. Follows the user's stated design ("turns the layer on as part of the screenshots").

**Cons:** Extra ~100KB per request. WMS tiles may load slowly. 3D perspective views of a flat color layer aren't useful (aerial-only is fine). Depends on external government server availability.

### Option B: Server-Side Spatial Query (Text Only)

The API queries the ArcGIS identify endpoint at multiple points around the fire perimeter and constructs a spatial vegetation description in the prompt text.

```
User draws perimeter → Frontend captures terrain screenshots only
                      → API receives request
                      → API queries ArcGIS identify at 9 points (center + 8 compass directions)
                      → API builds text: "Vegetation context: The fire perimeter center is in
                        Dry sclerophyll forests (Shrubby subformation). To the north: Grassy
                        woodland. To the east: Cleared land..."
                      → Augmented prompt + terrain screenshots sent to Gemini
```

**API changes:**
1. New service `vegetationService.ts`:
   ```typescript
   async function queryVegetationAtPoints(
     centroid: [number, number],
     bbox: [number, number, number, number]
   ): Promise<VegetationContext> {
     // Query 9 points: center + N/NE/E/SE/S/SW/W/NW at 500m offsets
     // Returns: { center: "Dry sclerophyll forests (Shrubby)", north: "Grassy woodlands", ... }
   }
   ```
2. Augment prompt generator with spatial vegetation section

**Pros:** No frontend changes. Low bandwidth. Structured, precise data. Works regardless of map UI state. Fast (9 small JSON queries).

**Cons:** Point-based — misses spatial patterns between query points. No visual reference for the AI.

### Option C: Hybrid (A + B)

Combine both: visual overlay screenshot AND spatial text query. Maximum context for the AI.

**Pros:** Best accuracy — AI has both visual spatial context and precise formation names. Belt-and-suspenders.

**Cons:** Most complex. Highest token cost. May over-constrain the AI.

## Recommendation

**Option A (Client-Side WMS Overlay)** for Phase 1, with the ability to add Option B later.

Rationale:
- Aligns with user's stated design intent
- The AI models are strong at interpreting visual data (this is their strength)
- A color-coded map overlay is exactly the kind of structured visual that image models understand well
- Keeps the text prompt cleaner — spatial vegetation context is conveyed visually
- The user can see and verify the vegetation data before generating
- The legend context in the prompt provides the vocabulary bridge

The server-side spatial query (Option B) can be added as a quick enhancement later since the identify endpoint is already confirmed working.

## Critical Bug to Fix First

**`imageGenerator.ts` drops `mapScreenshot`, `referenceImage`, and `referenceStrength` from options.**

The `mergedOptions` object (line ~68) explicitly lists only `size`, `quality`, `style`, `seed`, and `onThinkingUpdate`. The map screenshot and reference image fields are silently dropped before reaching the Gemini provider.

**This means map screenshots are NOT currently being sent to the AI model.** The terrain grounding feature is broken.

Fix:
```typescript
const mergedOptions: ImageGenOptions = {
  size: options?.size || this.config.defaultSize,
  quality: options?.quality || this.config.defaultQuality,
  style: options?.style || this.config.defaultStyle,
  seed: options?.seed,
  onThinkingUpdate: options?.onThinkingUpdate,
  mapScreenshot: options?.mapScreenshot,           // ← ADD
  referenceImage: options?.referenceImage,         // ← ADD
  referenceStrength: options?.referenceStrength,    // ← ADD
};
```

## Implementation Plan

### Phase 1: Foundation (fix + WMS layer)

1. **Fix `imageGenerator.ts`** — forward all `ImageGenOptions` fields (~5 min)
2. **Add WMS source + layer to `MapContainer.tsx`** — raster source from SVTM, hidden by default (~30 min)
3. **Add UI toggle** — optional button/checkbox in map controls to show/hide vegetation overlay (~30 min)
4. **Modify `mapCapture.ts`** — after normal captures, toggle vegetation ON, capture aerial vegetation screenshot, toggle OFF (~1 hr)
5. **Add `vegetationMapScreenshot` field to `GenerationRequest` type** (~10 min)
6. **Update `geminiImageProvider.ts`** — include vegetation screenshot as second image with legend context instructions (~1 hr)

### Phase 2: Enhancement (spatial queries)

7. **Create `vegetationService.ts`** — ArcGIS identify queries at perimeter points
8. **Augment prompt text** — spatial vegetation descriptions from query results
9. **Add SVTM formation descriptors** — map all 17 formations to natural language fire-relevant descriptions

### Phase 3: Polish

10. **Vegetation legend component** — show formation colors + names in the UI
11. **Cache WMS tiles** — service worker or local tile cache for offline/faster access
12. **Fallback handling** — graceful degradation if the NSW government server is unavailable
13. **Add remaining SVTM formations** to `VEGETATION_TYPES` and `VEGETATION_DESCRIPTORS`

## Technical Notes

- **CRS:** SVTM uses WKID 4283 (GDA94), which is functionally equivalent to WGS84 (EPSG:4326) at the precision we need. Mapbox uses EPSG:3857 (Web Mercator) for tiles but accepts `{bbox-epsg-4326}` template for WMS sources.
- **CORS:** The ArcGIS server returns `access-control-allow-origin: *` — no proxy needed.
- **Max image size:** WMS supports up to 4096×4096 pixels per request.
- **Rate limiting:** No rate limits observed on public endpoints, but we should be respectful (cache tiles, don't spam identify).
- **Availability:** Government services may have maintenance windows. Always have a fallback.

## Example: Vegetation Overlay Prompt Augmentation

When a vegetation map screenshot is included, prepend to the standard prompt:

```
You are also provided with a vegetation formation map from the NSW State Vegetation Type Map.
This color-coded overlay shows the authoritative vegetation classifications for this area:
- Dark green = Wet sclerophyll forests (tall eucalypts with dense fern understorey)
- Medium green = Dry sclerophyll forests (eucalypt woodland with sparse understorey and leaf litter)
- Light green = Grassy woodlands (scattered eucalypts over native grasses)
- Yellow-green = Grasslands (open grass with no tree canopy)
- Orange = Heathlands (low dense shrubland)
- Brown = Cleared land (farmland, urban, minimal vegetation)

Match the vegetation in each part of your generated image to what this map shows.
Where the map shows dark green on ridgelines, render tall wet sclerophyll forest.
Where it shows lighter green in valleys, render dry sclerophyll.
Where it shows yellow, render open grassland. And so on.
```

## References

- [NSW SVTM Dataset (SEED)](https://datasets.seed.nsw.gov.au/dataset/nsw-state-vegetation-type-map1e498)
- [SVTM Description (environment.nsw.gov.au)](https://www.environment.nsw.gov.au/topics/animals-and-plants/biodiversity/nsw-bionet/about-the-data/nsw-state-vegetation-type-map)
- [ArcGIS MapServer](https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Vegetation_IBCA/nswmap_2_3a_ext/MapServer)
- [Master Plan](../master_plan.md) — Phase 3: Data Layer Enhancements
