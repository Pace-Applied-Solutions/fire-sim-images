# Quick Reference: Vegetation Enhancements GitHub Issue

## 📋 Ready to Use

Copy the content from **`.github/ISSUE_TEMPLATE_VEGETATION.md`** and paste directly into a new GitHub issue.

---

## 🎯 What This Issue Addresses

### Current Problems
❌ Users can't identify what vegetation they're looking at (only colors)  
❌ Only works in NSW (not QLD, VIC, SA, WA, TAS, NT, ACT)  
❌ No interactive way to explore vegetation types

### Proposed Solutions
✅ Click anywhere on map to identify vegetation  
✅ Nationwide coverage using Australian Government NVIS data  
✅ Keep NSW high-resolution data as enhanced option

---

## 🗺️ National Coverage Solution

### NVIS (National Vegetation Information System)

**Provider:** Australian Government DCCEEW  
**License:** CC-BY 4.0 (free)  
**Coverage:** All of Australia

#### WMS Endpoints

**Option 1: Detailed (Recommended)**
```
https://gis.environment.gov.au/gispubmap/ogc_services/NVIS_ext_mvs/MapServer/WMSServer
```
- 85 vegetation subgroups (MVS)
- Best detail for fire behavior mapping

**Option 2: Simplified**
```
https://gis.environment.gov.au/gispubmap/ogc_services/NVIS_ext_mvg/MapServer/WMSServer
```
- 33 major vegetation groups (MVG)
- Simpler classification

---

## 🔄 Hybrid Approach (Best Solution)

```
┌─────────────────────────────────────────────┐
│  Fire Scenario Location                    │
├─────────────────────────────────────────────┤
│                                             │
│  📍 In NSW                                  │
│     → Primary: NSW SVTM (high-res)         │
│     → Fallback: NVIS (national)            │
│                                             │
│  📍 Outside NSW (QLD, VIC, SA, WA, etc)    │
│     → Primary: NVIS (national)             │
│     → Enhanced: None (unless state adds)   │
│                                             │
│  User can manually toggle between layers   │
└─────────────────────────────────────────────┘
```

---

## 💡 Feature: Click-to-Identify

### User Experience

```
1. User enables vegetation overlay (🌿)
   ↓
2. Map cursor changes (indicates clickable)
   ↓
3. User clicks anywhere on map
   ↓
4. System queries vegetation at coordinates
   ↓
5. Tooltip shows:
   ┌──────────────────────────────────┐
   │ 📍 Vegetation Info               │
   ├──────────────────────────────────┤
   │ Formation:                       │
   │ Dry sclerophyll forests          │
   │ (Shrubby subformation)           │
   │                                  │
   │ Fire Characteristics:            │
   │ • Dense shrub understorey        │
   │ • High intensity potential       │
   │ • Crown fire risk                │
   │                                  │
   │ Fuel Type: Forest                │
   └──────────────────────────────────┘
```

### Benefits
- ✅ No need to reference external docs
- ✅ Works at any zoom level
- ✅ Instant fire behavior context
- ✅ Clean map (no label clutter)

---

## 📊 Comparison: NSW SVTM vs NVIS

| Aspect | NSW SVTM | NVIS MVS |
|--------|----------|----------|
| **Coverage** | 🗺️ NSW only | 🗺️ All Australia |
| **Detail** | ⭐⭐⭐⭐⭐ 17 formations | ⭐⭐⭐⭐ 85 subgroups |
| **Resolution** | ⭐⭐⭐⭐⭐ 5m | ⭐⭐⭐ 25-100m |
| **Fire Focus** | ⭐⭐⭐⭐⭐ High | ⭐⭐⭐⭐ Moderate |
| **API** | REST + WMS | WMS only |
| **Cost** | Free (CC-BY 4.0) | Free (CC-BY 4.0) |
| **CORS** | ✅ Enabled | ✅ Enabled |

**Verdict:** Keep both! Use SVTM for NSW (better detail), NVIS for everywhere else.

---

## 🚀 Implementation Phases

### Phase 1: Click-to-Identify (Quick Win)
**Effort:** 1-2 days  
**Priority:** High

**Deliverables:**
- Click handler on map
- Tooltip component
- Query NSW SVTM identify endpoint
- Display vegetation info

**Value:** Immediate usability improvement for NSW scenarios

---

### Phase 2: NVIS National Coverage
**Effort:** 3-5 days  
**Priority:** High

**Deliverables:**
- Add NVIS WMS layer
- Layer toggle UI
- Query NVIS GetFeatureInfo
- Map NVIS types to fire behavior
- Auto-select layer based on location

**Value:** Enables scenarios across all Australia

---

### Phase 3: Persistent Labels (Optional)
**Effort:** 2-3 days  
**Priority:** Medium

**Deliverables:**
- Toggle for persistent labels
- Label density controls
- Zoom-based label visibility

**Value:** Scanning large areas for vegetation patterns

---

## 🎨 UI Changes

### New Vegetation Control Panel

**Before:**
```
┌─────────────────────┐
│  🌿 Vegetation      │
│  [Toggle: OFF]      │
└─────────────────────┘
```

**After:**
```
┌─────────────────────────────────────┐
│  Vegetation Overlay                 │
├─────────────────────────────────────┤
│  🌿 Show Vegetation  [Toggle: ON]   │
│                                     │
│  Layer Source:                      │
│  ◉ National (NVIS) - All states    │
│  ○ NSW Detailed (SVTM) - NSW only  │
│                                     │
│  ℹ️ Click on map to identify        │
│     vegetation types                │
│                                     │
│  □ Show Labels (Phase 3)            │
└─────────────────────────────────────┘
```

---

## 📂 Files to Create/Modify

### Frontend (apps/web)
```
src/components/Map/
  ├── MapContainer.tsx              [MODIFY] Add click handler, NVIS layer
  └── VegetationTooltip.tsx         [CREATE] New tooltip component

src/utils/
  └── mapCapture.ts                 [MODIFY] Support NVIS screenshots
```

### Backend (apps/api)
```
src/services/
  ├── vegetationService.ts          [MODIFY] Multi-source routing
  └── nvisVegetationService.ts      [CREATE] NVIS GetFeatureInfo queries
```

### Shared (packages/shared)
```
src/
  ├── constants.ts                  [MODIFY] Add NVIS endpoints
  └── types.ts                      [MODIFY] Add NVIS types
```

---

## ✅ Acceptance Criteria Summary

### Must Have (Phase 1 & 2)
- [ ] Click map to see vegetation info
- [ ] Tooltip shows formation name and fire characteristics
- [ ] Works in NSW with SVTM
- [ ] Works outside NSW with NVIS
- [ ] Toggle between National and NSW Detailed layers
- [ ] Layer auto-selects based on scenario location
- [ ] Vegetation context included in AI prompts

### Nice to Have (Phase 3)
- [ ] Persistent labels on map
- [ ] Label density adjusts with zoom
- [ ] Labels don't obscure important features

---

## 📈 Expected Impact

### User Benefits
- 🎯 Identify vegetation anywhere in Australia
- 🎯 No external reference documentation needed
- 🎯 Immediate fire behavior context
- 🎯 Better scenario planning

### Business Value
- 📊 Enables nationwide trainer adoption
- 📊 Reduces support questions about vegetation
- 📊 Improves training scenario realism
- 📊 Authoritative government data sources

### Technical Benefits
- 🔧 No breaking changes
- 🔧 Backwards compatible
- 🔧 CORS-enabled (no proxy)
- 🔧 Free license (CC-BY 4.0)

---

## 🔗 Key Resources

### NVIS Documentation
- [NVIS Data Products](https://www.dcceew.gov.au/environment/environment-information-australia/national-vegetation-information-system/data-products)
- [NVIS WMS Services](https://gis.environment.gov.au/gispubmap/rest/services/ogc_services/)

### NSW SVTM Documentation
- [SVTM Dataset](https://datasets.seed.nsw.gov.au/dataset/nsw-state-vegetation-type-map1e498)
- [SVTM Description](https://www.environment.nsw.gov.au/topics/animals-and-plants/biodiversity/nsw-bionet/about-the-data/nsw-state-vegetation-type-map)

### Project Documentation
- [ADR-006: NSW Vegetation Overlay](../docs/adr/ADR-006-nsw-vegetation-overlay.md)
- [Image Generation Workflow](../docs/image_generation_workflow.md)

---

## 🎬 How to Create the Issue

### Step 1: Open GitHub
Navigate to: `https://github.com/richardthorek/fire-sim-images/issues/new`

### Step 2: Copy Template
Open file: `.github/ISSUE_TEMPLATE_VEGETATION.md`
Copy all content

### Step 3: Paste & Configure
- **Title:** "Vegetation Layer Enhancements: Interactive Labels & National Coverage"
- **Labels:** `enhancement`, `vegetation`, `mapping`, `high-priority`
- **Milestone:** Phase 2 Enhancements
- **Assignees:** (as appropriate)

### Step 4: Submit
Click "Submit new issue"

---

## 💬 Discussion Points

### Questions for Stakeholders

1. **Priority**: Should we do Phase 1 (NSW only) first, or jump to Phase 2 (nationwide)?
2. **Labels**: Do users want persistent labels (Phase 3), or is click-to-identify sufficient?
3. **Resolution**: Is NVIS resolution (25-100m) acceptable for non-NSW states?
4. **Future**: Should we add other state-specific high-res layers (VIC, QLD)?

### Technical Decisions

1. **WMS Service**: Use NVIS MVS (85 subgroups) or MVG (33 groups)?
   - **Recommendation:** MVS for better fire behavior mapping
   
2. **Caching Strategy**: Client-side or server-side caching?
   - **Recommendation:** Client-side (Mapbox handles tile caching)

3. **Tooltip Position**: Follow cursor or fixed position?
   - **Recommendation:** Near click location (better UX)

---

## 📝 Summary

This issue provides everything needed to:
1. ✅ Add interactive vegetation identification (click-to-identify)
2. ✅ Expand from NSW-only to nationwide coverage (NVIS)
3. ✅ Maintain high-resolution NSW data (SVTM)
4. ✅ Enable fire scenarios across all Australian states

**Total Effort:** 6-10 days  
**Value:** High (enables nationwide trainer adoption)  
**Complexity:** Medium (well-defined integration)

Ready to implement! 🚀
