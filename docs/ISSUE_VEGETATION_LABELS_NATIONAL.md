# National Vegetation System: WMS Overlay & Click-to-Identify

**Labels:** `enhancement`, `vegetation`, `mapping`, `user-experience`, `high-priority`  
**Milestone:** Phase 2 Enhancements

## Summary

Replace the current NSW-only State Vegetation Type Map (SVTM) with the national NVIS (National Vegetation Information System). The NVIS layer provides both a colour-coded WMS overlay on the map and point-click identification of vegetation types at any location in Australia.

The existing NSW SVTM code will be disabled/hidden — not deleted — so it can be re-enabled later if high-resolution state-level data is needed.

## Problem Statement

1. **NSW-Only Coverage**: The current SVTM implementation only covers New South Wales. Fire scenarios in other states (QLD, VIC, SA, WA, TAS, NT, ACT) have no vegetation context at all.

2. **No Interactive Identification**: Users see colour-coded vegetation formations but cannot click to identify what a specific area contains.

3. **User Experience Gap**: Trainers need to understand vegetation types when planning scenarios, but the current overlay provides no in-app way to identify specific formations.

## Data Source: NVIS

**Publisher:** Australian Government Department of Climate Change, Energy, the Environment and Water (DCCEEW)  
**License:** Creative Commons Attribution 4.0 International  
**Coverage:** All Australian states and territories  
**Resolution:** National consistent classification  

### WMS Endpoints

| Layer | URL | Detail |
|-------|-----|--------|
| **MVS (Recommended)** | `https://gis.environment.gov.au/gispubmap/ogc_services/NVIS_ext_mvs/MapServer/WMSServer` | ~85 subgroups, extant vegetation |
| MVG (Simpler) | `https://gis.environment.gov.au/gispubmap/ogc_services/NVIS_ext_mvg/MapServer/WMSServer` | ~33 groups, extant vegetation |
| Pre-1750 (Historical) | `https://gis.environment.gov.au/gispubmap/ogc_services/NVIS_pre_mvs/MapServer/WMSServer` | Pre-European settlement reference |

### NVIS vs NSW SVTM Comparison

| Feature | NSW SVTM (disabled) | NVIS MVS (new default) |
|---------|---------------------|------------------------|
| **Coverage** | NSW only | All Australia |
| **Classifications** | 17 formations | ~85 subgroups |
| **Resolution** | 5 m raster | 25–100 m (varies by state) |
| **Fire Specificity** | High (NSW-focused) | Moderate (national types) |
| **API** | ArcGIS REST + WMS | WMS (OGC standard) |
| **Identify** | REST identify endpoint | WMS GetFeatureInfo |
| **License** | CC-BY 4.0 (NSW) | CC-BY 4.0 (Commonwealth) |

## Scope

### In Scope

1. **WMS Overlay** — Add NVIS MVS as a raster tile source in Mapbox, replacing the SVTM overlay as the default vegetation layer.
2. **Click-to-Identify** — When the vegetation overlay is active, clicking the map queries NVIS via WMS GetFeatureInfo and displays a tooltip with vegetation type and fire behaviour characteristics.
3. **Disable NSW SVTM** — Hide the SVTM WMS layer and REST identify calls behind a feature flag or commented-out configuration so the code is preserved but inactive.
4. **Vegetation Context for AI Prompts** — Update the vegetation query in the generation pipeline to use NVIS GetFeatureInfo instead of the SVTM REST identify endpoint.
5. **Vegetation Screenshot** — Capture the NVIS overlay (instead of SVTM) for the overhead vegetation map screenshot sent to image generation.

### Out of Scope (Future)

- Persistent text labels on the map (toggle labels mode)
- Hybrid NVIS + SVTM layer switching UI
- State-specific high-resolution overlays (VIC, QLD, SA)
- Pre-1750 vegetation comparison
- Offline tile caching

## Implementation Plan

### Phase 1: NVIS WMS Overlay (2–3 days)

**Shared (`packages/shared`)**
1. Add NVIS WMS URL constants to `constants.ts`
2. Create NVIS MVS → fire behaviour descriptor mappings (similar to existing `SVTM_FORMATION_DESCRIPTORS`)
3. Add `VegetationSource` type (`'nvis' | 'svtm'`) to `types.ts`

**Frontend (`apps/web`)**
1. Replace the SVTM raster source/layer in `MapContainer.tsx` with NVIS MVS WMS tiles
2. Update `mapCapture.ts` to capture the NVIS layer for vegetation screenshots
3. Comment out / feature-flag the old SVTM tile URL (keep code, disable usage)

**Files to modify:**
- `packages/shared/src/constants.ts`
- `packages/shared/src/types.ts`
- `apps/web/src/components/Map/MapContainer.tsx`
- `apps/web/src/utils/mapCapture.ts`

### Phase 2: Click-to-Identify (2–3 days)

**Frontend (`apps/web`)**
1. Add click handler to map when vegetation overlay is visible
2. On click, send WMS GetFeatureInfo request to NVIS at the clicked coordinate
3. Parse GetFeatureInfo response (JSON format preferred)
4. Create `VegetationTooltip` component to display results:
   - MVS name / vegetation subgroup
   - Fire behaviour characteristics (mapped from descriptors)
   - Fuel type category
5. Tooltip positioned near click, dismissed on click-elsewhere or Esc

**UI Flow:**
```
1. User enables vegetation overlay (🌿 button)
2. Cursor changes to crosshair to indicate clickable
3. User clicks on map
4. GetFeatureInfo request sent to NVIS WMS
5. Tooltip appears at click location with vegetation info
6. Tooltip dismissed on next click or Esc
```

**Files to create/modify:**
- `apps/web/src/components/Map/MapContainer.tsx` — click handler
- `apps/web/src/components/Map/VegetationTooltip.tsx` — new component

### Phase 3: Backend Vegetation Context (1–2 days)

**API (`apps/api`)**
1. Create `nvisVegetationService.ts` — queries NVIS WMS GetFeatureInfo for a lat/lng and returns structured vegetation context
2. Update `vegetationService.ts` — swap the default query from SVTM REST identify to NVIS GetFeatureInfo; keep SVTM code behind a flag
3. Map NVIS MVS subgroup IDs to fire behaviour descriptors for AI prompt context

**Files to create/modify:**
- `apps/api/src/services/nvisVegetationService.ts` — new service
- `apps/api/src/services/vegetationService.ts` — route to NVIS by default

## UI Mockup

### Vegetation Controls

```
┌─────────────────────────────────────┐
│  Vegetation Overlay                 │
├─────────────────────────────────────┤
│  🌿 Show Vegetation  [Toggle: ON]  │
│                                     │
│  Source: NVIS (National)            │
│                                     │
│  ℹ️ Click on map to identify        │
│     vegetation types                │
└─────────────────────────────────────┘
```

### Click-to-Identify Tooltip

```
┌─────────────────────────────────────────┐
│  📍 Vegetation Info                     │
├─────────────────────────────────────────┤
│  Subgroup:                              │
│  Eucalyptus open forests with a         │
│  shrubby understorey                    │
│                                         │
│  Fire Characteristics:                  │
│  • Shrub and bark fuel dominant         │
│  • Moderate–high intensity potential    │
│  • Surface and near-surface fire risk   │
│                                         │
│  Fuel Type: Forest                      │
│  [Close]                                │
└─────────────────────────────────────────┘
```

## Acceptance Criteria

### WMS Overlay
- [ ] NVIS MVS WMS layer loads for all Australian locations
- [ ] Layer toggle (🌿) enables/disables the overlay
- [ ] Vegetation screenshots capture the NVIS layer for image generation
- [ ] NSW SVTM layer code is preserved but disabled (not deleted)

### Click-to-Identify
- [ ] Clicking the map when vegetation overlay is active queries NVIS GetFeatureInfo
- [ ] Tooltip displays vegetation subgroup name and fire characteristics
- [ ] Tooltip positioned near click location, does not overflow viewport
- [ ] Tooltip closes on click-elsewhere or Esc
- [ ] Graceful handling when no data is returned (ocean, unmapped areas)
- [ ] Debounced to prevent rapid-fire requests

### AI Prompt Integration
- [ ] Vegetation context in generation pipeline uses NVIS data
- [ ] NVIS vegetation types mapped to fire behaviour descriptors
- [ ] Prompts include meaningful vegetation context for all Australian locations

## Technical Considerations

### WMS GetFeatureInfo Request Format

```
GET {NVIS_WMS_URL}?
  SERVICE=WMS&
  VERSION=1.3.0&
  REQUEST=GetFeatureInfo&
  LAYERS=0&
  QUERY_LAYERS=0&
  INFO_FORMAT=application/json&
  CRS=EPSG:4326&
  BBOX={south},{west},{north},{east}&
  WIDTH=101&
  HEIGHT=101&
  I=50&
  J=50
```

### CORS
- NVIS WMS endpoints are standard OGC services and support CORS
- No proxy needed for client-side GetFeatureInfo requests

### Performance
- WMS tile loading may be slightly slower than NSW SVTM (federal vs state server)
- **Mitigation:** show loading indicator on tiles, debounce identify clicks (300 ms)
- Cache identify results client-side for recently-queried coordinates

### Rate Limits
- Commonwealth government service; no documented rate limits for standard web usage
- Debounce rapid clicks to avoid unnecessary requests

### NSW SVTM Preservation Strategy
- Keep all SVTM constants, types, and service code in place
- Disable via:
  - Comment out SVTM WMS source/layer in `MapContainer.tsx`
  - Add `VEGETATION_SOURCE = 'nvis'` constant; SVTM code paths guarded by `if (source === 'svtm')`
  - Mark SVTM functions as `@deprecated` with note about re-enablement
- This allows a future hybrid toggle without re-implementing anything

## Future Enhancements

- **Hybrid Layer Toggle**: Re-enable NSW SVTM as optional high-resolution overlay for NSW scenarios alongside NVIS
- **State-Specific Layers**: Add VicVeg (VIC), Regional Ecosystem mapping (QLD), DEW mapping (SA)
- **Persistent Labels**: Toggle text labels on the overlay at configurable density
- **Pre-1750 Vegetation**: Compare current vs historical vegetation state
- **3D Vegetation Visualization**: Integrate canopy height data
- **Offline Support**: Cache frequently accessed tiles

## References

- [NVIS Data Products (DCCEEW)](https://www.dcceew.gov.au/environment/environment-information-australia/national-vegetation-information-system/data-products)
- [NVIS WMS Services](https://gis.environment.gov.au/gispubmap/rest/services/ogc_services/)
- [NSW SVTM Documentation](https://www.environment.nsw.gov.au/topics/animals-and-plants/biodiversity/nsw-bionet/about-the-data/nsw-state-vegetation-type-map)
- [ADR-006: NSW Vegetation Overlay](docs/adr/ADR-006-nsw-vegetation-overlay.md)

## Metadata

**Priority:** High  
**Complexity:** Medium  
**Value:** High (enables nationwide scenario creation)  
**Estimated Total Effort:** 5–8 days across 3 phases  
**Breaking Changes:** None — additive; existing SVTM code preserved  
**Dependencies:** None (uses existing mapping infrastructure)
