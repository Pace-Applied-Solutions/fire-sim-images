# Vegetation Layer Enhancements: Interactive Labels & National Coverage

## Summary

Enhance the vegetation overlay system to provide interactive labels and expand coverage from NSW-only to all Australian states and territories using national datasets.

## Problem Statement

### Current Limitations

1. **No Interactive Labels**: Users can see color-coded vegetation formations but cannot identify what vegetation type a specific area contains without referencing external documentation.

2. **NSW-Only Coverage**: The current implementation uses the NSW State Vegetation Type Map (SVTM), which only covers New South Wales. Fire scenarios in other states (QLD, VIC, SA, WA, TAS, NT, ACT) have no vegetation context.

3. **User Experience Gap**: Trainers need to understand vegetation types when planning scenarios, but the current color-coded overlay provides no in-app way to identify specific formations.

## Proposed Solution

### Part 1: Interactive Vegetation Labels

Implement interactive vegetation identification with two modes:

#### Option A: Click-to-Identify (Recommended)
- User clicks on any point on the map when vegetation overlay is visible
- System queries the vegetation service (identify endpoint) at that coordinate
- Display tooltip/popup showing:
  - Formation name (e.g., "Dry sclerophyll forests (Shrubby subformation)")
  - Vegetation class
  - Fire behavior characteristics (e.g., "Dense shrub layer, high intensity potential")
  
**UI Flow:**
```
1. User enables vegetation overlay (🌿 button)
2. Cursor changes to indicate clickable map
3. User clicks anywhere on map
4. Tooltip appears at click location with vegetation info
5. Tooltip stays until user clicks elsewhere or closes it
```

#### Option B: Toggle Labels On/Off
- Add a secondary control to show/hide text labels on the map
- Labels appear as text overlays at regular intervals across vegetation polygons
- Formation names displayed directly on the map
- Can be toggled independently of the vegetation color layer

**Trade-offs:**
- Click-to-Identify: Better for detailed inspection, cleaner map, works at any zoom level
- Toggle Labels: Better for scanning large areas, may clutter map at high zoom

**Recommendation**: Implement Option A (Click-to-Identify) first, add Option B if user feedback indicates need.

### Part 2: National Vegetation Coverage

Replace NSW-only SVTM with Australia-wide National Vegetation Information System (NVIS).

#### Data Source: NVIS (National Vegetation Information System)

**Publisher:** Australian Government Department of Climate Change, Energy, the Environment and Water (DCCEEW)  
**License:** Creative Commons Attribution 4.0 International  
**Coverage:** All Australian states and territories  
**Resolution:** National consistent classification  

#### Available WMS Endpoints

**Option 1: Major Vegetation Subgroups (MVS) - Recommended**
```
WMS URL: https://gis.environment.gov.au/gispubmap/ogc_services/NVIS_ext_mvs/MapServer/WMSServer
Coverage: Nationwide, detailed classification (~85 subgroups)
Data: Extant (current) vegetation
```

**Option 2: Major Vegetation Groups (MVG) - Simpler**
```
WMS URL: https://gis.environment.gov.au/gispubmap/ogc_services/NVIS_ext_mvg/MapServer/WMSServer
Coverage: Nationwide, coarse classification (~33 groups)
Data: Extant (current) vegetation
```

**Option 3: Pre-1750 Vegetation (Historical Reference)**
```
WMS URL: https://gis.environment.gov.au/gispubmap/ogc_services/NVIS_pre_mvs/MapServer/WMSServer
Purpose: Show pre-European settlement vegetation (useful for understanding natural fuel states)
```

#### Comparison: NVIS vs NSW SVTM

| Feature | NSW SVTM | NVIS MVS |
|---------|----------|----------|
| **Coverage** | NSW only | All Australia |
| **Classifications** | 17 formations | 85 subgroups |
| **Resolution** | 5m raster | Varies by state (typically 25-100m) |
| **Fire Specificity** | High (NSW-focused fire behavior) | Moderate (national vegetation types) |
| **API Availability** | ArcGIS REST + WMS | WMS only (standard OGC) |
| **Identify Support** | Yes (REST identify endpoint) | Via WMS GetFeatureInfo |
| **License** | CC-BY 4.0 (NSW) | CC-BY 4.0 (Commonwealth) |
| **Update Frequency** | Periodic (state agency) | Periodic (federal agency) |

#### Recommended Approach: Hybrid System

1. **Primary Layer**: NVIS MVS for nationwide coverage
2. **Enhanced Layer**: Keep NSW SVTM as optional high-resolution overlay for NSW scenarios
3. **User Control**: Allow users to toggle between national and state-specific layers where available

**Benefits:**
- Immediate national coverage
- Preserve high-resolution NSW data for detailed scenarios
- Future-proof for adding other state-specific high-res layers (e.g., VIC, QLD)

## Implementation Plan

### Phase 1: Click-to-Identify for NSW SVTM (Quick Win)

**Frontend (apps/web)**
1. Add click handler to map when vegetation layer is visible
2. Query NSW SVTM identify endpoint at clicked coordinates
3. Display tooltip component with formation details
4. Add vegetation info panel to UI

**Files to modify:**
- `apps/web/src/components/Map/MapContainer.tsx` - Add click handler
- `apps/web/src/components/Map/VegetationTooltip.tsx` - New component
- `apps/web/src/styles` - Tooltip styling

**API (apps/api)**
- No changes needed (identify endpoint already exists in `vegetationService.ts`)

**Estimated Effort:** 1-2 days

### Phase 2: NVIS National Coverage

**Shared (packages/shared)**
1. Add NVIS WMS URLs to constants
2. Create NVIS vegetation type mappings (MVS → fire behavior descriptors)
3. Update types to support multiple vegetation sources

**Files to modify:**
- `packages/shared/src/constants.ts` - Add NVIS endpoints
- `packages/shared/src/types.ts` - Add NVIS types

**Frontend (apps/web)**
1. Add NVIS WMS source to Mapbox
2. Add layer toggle: "National (NVIS)" vs "NSW Detailed (SVTM)"
3. Update click-to-identify to query appropriate service based on active layer
4. Handle NVIS WMS GetFeatureInfo responses

**Files to modify:**
- `apps/web/src/components/Map/MapContainer.tsx` - Add NVIS layer
- `apps/web/src/config/mapbox.ts` - Layer configuration
- `apps/web/src/utils/mapCapture.ts` - Support NVIS screenshots

**API (apps/api)**
1. Create `nvisVegetationService.ts` for NVIS WMS GetFeatureInfo queries
2. Update `vegetationService.ts` to route queries based on location (NSW → SVTM, others → NVIS)
3. Create NVIS MVS → fire behavior descriptor mappings

**Files to create/modify:**
- `apps/api/src/services/nvisVegetationService.ts` - New service
- `apps/api/src/services/vegetationService.ts` - Update router logic

**Estimated Effort:** 3-5 days

### Phase 3: Enhanced Label Controls (Optional)

If user feedback indicates need for persistent labels:

1. Add "Show Labels" toggle in vegetation controls
2. Implement label rendering on map (either via WMS parameters or custom overlay)
3. Add label density controls (show more/fewer labels based on zoom)

**Estimated Effort:** 2-3 days

## UI Mockup

### Vegetation Controls Panel

```
┌─────────────────────────────────────┐
│  Vegetation Overlay                 │
├─────────────────────────────────────┤
│  🌿 Show Vegetation  [Toggle: ON]   │
│                                     │
│  Layer Source:                      │
│  ◉ National (NVIS)                  │
│  ○ NSW Detailed (SVTM)              │
│                                     │
│  ℹ️ Click on map to identify        │
│     vegetation types                │
│                                     │
│  □ Show Labels (future)             │
└─────────────────────────────────────┘
```

### Click-to-Identify Tooltip

```
┌─────────────────────────────────────────┐
│  📍 Vegetation Info                     │
├─────────────────────────────────────────┤
│  Formation:                             │
│  Dry sclerophyll forests                │
│  (Shrubby subformation)                 │
│                                         │
│  Fire Characteristics:                  │
│  • Dense shrub understorey              │
│  • High intensity potential             │
│  • Intermittent crown fire risk         │
│                                         │
│  Fuel Type: Forest                      │
│  [Close]                                │
└─────────────────────────────────────────┘
```

## Acceptance Criteria

### Phase 1: Click-to-Identify
- [ ] User can click on map when vegetation overlay is active
- [ ] Tooltip displays formation name and fire characteristics
- [ ] Tooltip positioned near click location
- [ ] Works across all zoom levels within NSW
- [ ] Graceful error handling if identify query fails
- [ ] Tooltip closes when user clicks elsewhere or presses Esc

### Phase 2: National Coverage
- [ ] NVIS WMS layer loads for all Australian locations
- [ ] User can toggle between National (NVIS) and NSW Detailed (SVTM) layers
- [ ] Click-to-identify works for NVIS layer outside NSW
- [ ] NVIS vegetation types mapped to fire behavior descriptors
- [ ] Vegetation screenshots capture NVIS layer when active
- [ ] AI prompts include NVIS vegetation context
- [ ] Layer source auto-selects based on fire perimeter location (NSW → SVTM preferred, others → NVIS)

### Phase 3: Labels (If Implemented)
- [ ] User can toggle labels on/off independently of color overlay
- [ ] Labels visible at appropriate zoom levels
- [ ] Label density adjusts with zoom (more detail when zoomed in)
- [ ] Labels don't obscure important map features
- [ ] Performance remains acceptable with labels enabled

## Technical Considerations

### API Rate Limits
- **NSW SVTM**: No documented rate limits, publicly accessible
- **NVIS WMS**: Commonwealth government service, should have reasonable limits for web apps
- **Mitigation**: Implement client-side caching of identify results, debounce rapid clicks

### Cross-State Boundary Handling
- Fire perimeters may span state boundaries
- **Solution**: Query both NVIS and SVTM if perimeter overlaps NSW border, merge results

### Performance
- WMS tile loading may be slower for NVIS (federal server vs state server)
- **Mitigation**: Preload tiles when user navigates to area, show loading indicators

### CORS
- NVIS WMS endpoints support CORS (standard OGC services)
- NSW SVTM already confirmed CORS-enabled
- No proxy needed

## Future Enhancements

### State-Specific High-Resolution Layers
If other states provide detailed vegetation layers, add as optional overlays:
- **Victoria**: VicVeg (DELWP)
- **Queensland**: Regional Ecosystem mapping (DES)
- **South Australia**: Vegetation mapping (DEW)

### Vegetation Change Detection
Compare current (NVIS extant) with pre-1750 vegetation to show habitat changes

### 3D Vegetation Visualization
Integrate vegetation height data to enhance 3D terrain perspective

### Offline Support
Cache frequently accessed vegetation tiles for offline use

## References

- [NVIS Data Products (DCCEEW)](https://www.dcceew.gov.au/environment/environment-information-australia/national-vegetation-information-system/data-products)
- [NVIS WMS Services](https://gis.environment.gov.au/gispubmap/rest/services/ogc_services/)
- [NSW SVTM Documentation](https://www.environment.nsw.gov.au/topics/animals-and-plants/biodiversity/nsw-bionet/about-the-data/nsw-state-vegetation-type-map)
- [ADR-006: NSW Vegetation Overlay](../docs/adr/ADR-006-nsw-vegetation-overlay.md)
- [Image Generation Workflow](../docs/image_generation_workflow.md)

## Dependencies

- None (uses existing mapping infrastructure)

## Breaking Changes

- None (additive features only)
- Existing NSW SVTM functionality preserved
- Backwards compatible with existing scenarios

## Success Metrics

- Trainers can identify vegetation types in all Australian states
- Click-to-identify used regularly (track analytics)
- Positive trainer feedback on vegetation identification usability
- No performance degradation with NVIS layer active
- Reduction in support questions about vegetation types

---

**Priority:** High  
**Complexity:** Medium  
**Value:** High (enables nationwide scenario creation)  
**Estimated Total Effort:** 6-10 days across 3 phases
