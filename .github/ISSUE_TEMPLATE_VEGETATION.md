# GitHub Issue: Vegetation Layer Enhancements

**Copy this content to create a new GitHub issue**

---

**Title:** Vegetation Layer Enhancements: Interactive Labels & National Coverage

**Labels:** `enhancement`, `vegetation`, `mapping`, `user-experience`, `high-priority`

**Milestone:** Phase 2 Enhancements

---

## Summary

Enhance the vegetation overlay system to provide interactive labels and expand coverage from NSW-only to all Australian states and territories using national datasets.

## Problem Statement

### Current Limitations

1. **No Interactive Labels**: Users can see color-coded vegetation formations but cannot identify what vegetation type a specific area contains without referencing external documentation.

2. **NSW-Only Coverage**: The current implementation uses the NSW State Vegetation Type Map (SVTM), which only covers New South Wales. Fire scenarios in other states (QLD, VIC, SA, WA, TAS, NT, ACT) have no vegetation context.

3. **User Experience Gap**: Trainers need to understand vegetation types when planning scenarios, but the current color-coded overlay provides no in-app way to identify specific formations.

## Proposed Solution

### Part 1: Interactive Vegetation Labels

Implement click-to-identify functionality:
- User clicks on any point on the map when vegetation overlay is visible
- System queries the vegetation service at that coordinate
- Display tooltip showing formation name, fire characteristics, and fuel type

### Part 2: National Vegetation Coverage

Replace NSW-only SVTM with Australia-wide NVIS (National Vegetation Information System):

**Data Source:** Australian Government DCCEEW  
**WMS Endpoint:** `https://gis.environment.gov.au/gispubmap/ogc_services/NVIS_ext_mvs/MapServer/WMSServer`  
**License:** CC-BY 4.0  
**Coverage:** All Australian states and territories

### Hybrid Approach (Recommended)

1. **Primary Layer**: NVIS MVS for nationwide coverage (85 vegetation subgroups)
2. **Enhanced Layer**: Keep NSW SVTM as optional high-resolution overlay
3. **User Control**: Toggle between national and state-specific layers

## Implementation Phases

**Phase 1: Click-to-Identify (1-2 days)**
- Add click handler to map when vegetation layer active
- Query vegetation service at clicked coordinates
- Display tooltip with vegetation information

**Phase 2: NVIS National Coverage (3-5 days)**
- Add NVIS WMS layer to Mapbox
- Create layer toggle UI (National vs NSW Detailed)
- Update identify queries to support NVIS GetFeatureInfo
- Map NVIS vegetation types to fire behavior descriptors

**Phase 3: Enhanced Labels (2-3 days, optional)**
- Persistent text labels on map
- Label density controls based on zoom level

## Acceptance Criteria

### Phase 1
- [ ] User can click on map when vegetation overlay is active
- [ ] Tooltip displays formation name and fire characteristics
- [ ] Works across all zoom levels within NSW
- [ ] Graceful error handling

### Phase 2
- [ ] NVIS WMS layer loads for all Australian locations
- [ ] User can toggle between National (NVIS) and NSW Detailed (SVTM)
- [ ] Click-to-identify works for NVIS layer
- [ ] Layer auto-selects based on fire perimeter location
- [ ] Vegetation screenshots capture active layer
- [ ] AI prompts include correct vegetation context

## UI Mockup

### Vegetation Controls
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
└─────────────────────────────────────────┘
```

## Benefits

**For Trainers:**
- Identify vegetation types across all Australian states
- Interactive exploration instead of static reference
- Understand fire behavior implications immediately

**For System:**
- Nationwide scenario creation capability
- Authoritative government data sources
- No additional licensing costs (CC-BY 4.0)

**For Users:**
- Better understanding of fuel types
- Context for fire behavior predictions
- More engaging interaction with map

## Technical Details

**NVIS WMS Endpoints:**
- MVS (Detailed): `https://gis.environment.gov.au/gispubmap/ogc_services/NVIS_ext_mvs/MapServer/WMSServer`
- MVG (Simplified): `https://gis.environment.gov.au/gispubmap/ogc_services/NVIS_ext_mvg/MapServer/WMSServer`

**Files to Modify:**
- `apps/web/src/components/Map/MapContainer.tsx`
- `apps/web/src/components/Map/VegetationTooltip.tsx` (new)
- `apps/api/src/services/nvisVegetationService.ts` (new)
- `packages/shared/src/constants.ts`

**No Breaking Changes:**
- Additive features only
- Existing NSW SVTM preserved
- Backwards compatible

## References

- [NVIS Data Products](https://www.dcceew.gov.au/environment/environment-information-australia/national-vegetation-information-system/data-products)
- [NSW SVTM Documentation](https://www.environment.nsw.gov.au/topics/animals-and-plants/biodiversity/nsw-bionet/about-the-data/nsw-state-vegetation-type-map)
- [ADR-006: NSW Vegetation Overlay](../docs/adr/ADR-006-nsw-vegetation-overlay.md)

## Success Metrics

- Trainers can create scenarios in all Australian states
- Click-to-identify actively used (track usage)
- Positive user feedback on vegetation identification
- No performance degradation

---

**Priority:** High  
**Complexity:** Medium  
**Estimated Effort:** 6-10 days  
**Value:** High (enables nationwide use)

**Related Issues:** Previous vegetation work (#[issue number])  
**Blocked By:** None  
**Blocks:** Future state-specific enhancements
