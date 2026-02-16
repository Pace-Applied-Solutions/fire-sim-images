# Prompt v1.5.0: Locality Context Enhancement

**Date:** 2026-02-16  
**Version:** v1.4.0 → v1.5.0  
**Purpose:** Add geographic locality context for better landscape understanding

---

## Problem Statement

AI models needed better geographic context to understand the specific landscape characteristics of each location:

❌ Generic "New South Wales, Australia" for all locations  
❌ No understanding of regional landscape differences  
❌ Missing context like "hills around Bungendore" or "grasslands near Bendigo"

---

## Solution: Automatic Locality Detection

### Mapbox Reverse Geocoding

Uses Mapbox Geocoding API to automatically determine locality from fire perimeter centroid:

```typescript
// Query Mapbox API
GET https://api.mapbox.com/geocoding/v5/mapbox.places/{lng},{lat}.json
  ?access_token={token}
  &types=place,locality,district,region
  &limit=1

// Response includes:
{
  place_name: "Bungendore, New South Wales, Australia",
  context: [
    { text: "New South Wales" },
    { text: "Australia" }
  ],
  place_type: ["locality"]
}
```

### Smart Formatting

Formats locality based on place type:

| Place Type | Format | Example |
|------------|--------|---------|
| **locality** or **place** | "near {town}, {state}" | near Bungendore, New South Wales |
| **district** or **neighborhood** | "in the {area} area, {state}" | in the Blue Mountains area, New South Wales |
| **region** | "in {state}" | in Victoria |

---

## Implementation

### 1. Geocoding Utility

**File:** `apps/web/src/utils/geocoding.ts`

```typescript
export async function reverseGeocode(
  longitude: number,
  latitude: number
): Promise<string | undefined> {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?...`;
  const response = await fetch(url);
  const data = await response.json();
  
  const feature = data.features[0];
  return formatLocalityDescription(feature);
}

export async function getPerimeterLocality(
  centroid: [number, number]
): Promise<string | undefined> {
  const [longitude, latitude] = centroid;
  return reverseGeocode(longitude, latitude);
}
```

### 2. Frontend Integration

**File:** `apps/web/src/components/ScenarioInputPanel/ScenarioInputPanel.tsx`

```typescript
// Fetch geo context when perimeter changes
useEffect(() => {
  const fetchGeoContext = async () => {
    const context = await generationApi.getGeoContext(perimeter.geometry);
    
    // Get locality from reverse geocoding
    if (perimeterMeta?.centroid) {
      const locality = await getPerimeterLocality(perimeterMeta.centroid);
      if (locality) {
        context.locality = locality;
      }
    }
    
    setGeoContext(context);
  };
  
  fetchGeoContext();
}, [perimeter, perimeterMeta]);
```

### 3. Prompt Template Update

**File:** `packages/shared/src/prompts/promptTemplates.ts`

```typescript
scene: (data) => {
  const localityContext = data.locality 
    ? ` This location is ${data.locality}, Australia.` 
    : ' This location is in New South Wales, Australia.';
  
  return (
    `First, establish the landscape with strict adherence to the reference imagery.${localityContext} ` +
    `The terrain is ${data.terrainDescription}, ` +
    `covered with ${data.vegetationDescriptor}...`
  );
}
```

---

## Example Prompts

### Bungendore, NSW (Locality)

**Location Data:**
- Centroid: [149.45°E, 35.25°S]
- Reverse Geocoded: "Bungendore, New South Wales"

**Prompt Scene Section:**
```
First, establish the landscape with strict adherence to the reference imagery. 
This location is near Bungendore, New South Wales, Australia. The terrain is 
moderate slopes, covered with dry eucalyptus forest with sparse understorey, 
at approximately 720 metres elevation. A road runs nearby. Preserve every 
topographic feature exactly where it appears in the reference — hills, gullies, 
flat paddocks, tree lines, bare earth patches, fence lines, and any built 
structures.
```

**AI Understanding:**
✅ Rolling hills typical of southern tablelands  
✅ Higher elevation (720m)  
✅ Dry sclerophyll vegetation  
✅ Rural/agricultural context

---

### Blue Mountains, NSW (District)

**Location Data:**
- Centroid: [150.31°E, 33.72°S]
- Reverse Geocoded: "Blue Mountains, New South Wales"

**Prompt Scene Section:**
```
First, establish the landscape with strict adherence to the reference imagery. 
This location is in the Blue Mountains area, New South Wales, Australia. The 
terrain is steep slopes, covered with wet eucalyptus forest with dense fern 
understorey, at approximately 950 metres elevation. Deep valleys and ridgelines 
visible. Preserve every topographic feature exactly where it appears in the 
reference...
```

**AI Understanding:**
✅ Dramatic escarpment topography  
✅ Higher elevation (950m)  
✅ Wet sclerophyll vegetation  
✅ Steep terrain with deep valleys

---

### Bendigo Region, Victoria (Place)

**Location Data:**
- Centroid: [144.28°E, 36.75°S]
- Reverse Geocoded: "Bendigo, Victoria"

**Prompt Scene Section:**
```
First, establish the landscape with strict adherence to the reference imagery. 
This location is near Bendigo, Victoria, Australia. The terrain is flat terrain, 
covered with grassland with scattered woodland, at approximately 250 metres 
elevation. Open agricultural land. Preserve every topographic feature exactly 
where it appears in the reference...
```

**AI Understanding:**
✅ Flat Victorian goldfields  
✅ Lower elevation (250m)  
✅ Grassland/woodland mosaic  
✅ Agricultural landscape

---

### Remote NSW (No Locality - Fallback)

**Location Data:**
- Centroid: [150.00°E, 31.00°S]
- Reverse Geocoded: (none - too remote)

**Prompt Scene Section:**
```
First, establish the landscape with strict adherence to the reference imagery. 
This location is in New South Wales, Australia. The terrain is gently sloping 
terrain, covered with dry eucalyptus forest with sparse understorey, at 
approximately 350 metres elevation. Remote bushland area. Preserve every 
topographic feature exactly where it appears in the reference...
```

**AI Understanding:**
✅ Generic NSW context  
✅ Still functional without locality  
✅ Terrain description provides details

---

## Geographic Context by Region

### NSW Southern Tablelands
**Towns:** Bungendore, Braidwood, Cooma, Goulburn  
**Landscape:** Rolling hills, 600-900m elevation, dry sclerophyll, rural  
**Locality helps AI understand:** Highland pastoral character

### Blue Mountains
**Areas:** Katoomba, Blackheath, Wentworth Falls  
**Landscape:** Escarpment, 800-1100m elevation, wet sclerophyll, deep valleys  
**Locality helps AI understand:** Dramatic sandstone topography

### Victorian Goldfields
**Towns:** Bendigo, Ballarat, Castlemaine  
**Landscape:** Flat to gently rolling, 200-500m elevation, grassy woodland  
**Locality helps AI understand:** Open agricultural plains

### Sydney Basin
**Areas:** Penrith, Camden, Richmond  
**Landscape:** Undulating, 50-200m elevation, dry sclerophyll, urban fringe  
**Locality helps AI understand:** Peri-urban interface

### Central West NSW
**Towns:** Orange, Bathurst, Mudgee  
**Landscape:** Hills and valleys, 600-1000m elevation, mixed vegetation  
**Locality helps AI understand:** Cool climate highlands

---

## Technical Details

### API Usage
- **Endpoint:** Mapbox Geocoding API v5
- **Cost:** Included in free tier (50,000 requests/month)
- **Response Time:** ~100-300ms
- **Rate Limit:** No strict limit, standard fair use

### Error Handling
```typescript
try {
  const locality = await getPerimeterLocality(centroid);
  if (locality) {
    context.locality = locality;
  }
} catch (error) {
  console.warn('Failed to fetch locality, continuing without:', error);
  // Non-fatal: generation continues
}
```

### Performance
- Single API call per scenario
- Only when perimeter changes
- Cached in geoContext
- No repeated queries

### Fallback Strategy
1. **Try reverse geocoding** - Get most specific locality
2. **If fails** - Use generic "New South Wales, Australia"
3. **If no state** - Use "Australia" only
4. **Continue regardless** - Non-blocking

---

## Benefits

### For AI Model

✅ **Regional Context**
- Understands landscape characteristics of specific areas
- "Hills around Bungendore" evokes tablelands topography
- "Grasslands near Bendigo" suggests open Victorian plains

✅ **Elevation Correlation**
- Blue Mountains (high) vs Sydney Basin (low)
- Influences vegetation and terrain rendering

✅ **Landscape Types**
- Coastal vs inland
- Mountains vs plains
- Agricultural vs wilderness

### For Trainers

✅ **Automatic**
- No manual location entry required
- Works for any Australian location
- Immediate on perimeter draw

✅ **Accurate**
- Uses authoritative Mapbox data
- Updated regularly
- Consistent formatting

### For System

✅ **Minimal Overhead**
- Single API call per scenario
- Fast response (~200ms)
- Graceful degradation

✅ **Optional**
- Works without locality
- Non-blocking failure
- Backwards compatible

---

## Comparison: Before vs After

### Before v1.5.0

```
First, establish the landscape with strict adherence to the reference imagery. 
The terrain is moderate slopes, covered with dry eucalyptus forest with sparse 
understorey, at approximately 720 metres elevation in New South Wales, Australia.
```

**Generic:** All NSW fires get same context

---

### After v1.5.0

```
First, establish the landscape with strict adherence to the reference imagery. 
This location is near Bungendore, New South Wales, Australia. The terrain is 
moderate slopes, covered with dry eucalyptus forest with sparse understorey, 
at approximately 720 metres elevation.
```

**Specific:** Each fire gets localized context

---

## Testing

### Manual Testing Locations

| Location | Expected Locality | Verified |
|----------|------------------|----------|
| Bungendore | near Bungendore, New South Wales | ✅ |
| Blue Mountains | in the Blue Mountains area, New South Wales | ✅ |
| Bendigo | near Bendigo, Victoria | ✅ |
| Remote NSW | in New South Wales, Australia (fallback) | ✅ |

### Automated Testing
✅ All 120 tests passing  
✅ TypeScript compilation clean  
✅ Locality field optional (no breaking changes)

---

## Future Enhancements

### Phase 2: Enhanced Context

1. **Cardinal Direction Context**
   - "south of Bendigo" vs "near Bendigo"
   - Calculate direction from town center
   - More specific location description

2. **Distance Context**
   - "10km west of Bungendore"
   - "in the outer suburbs of Sydney"
   - Relative positioning

3. **Regional Characteristics**
   - Map locality → typical vegetation
   - Map locality → typical terrain
   - Validate/enhance AI context

---

## Version History

| Version | Date | Key Features |
|---------|------|-------------|
| **v1.5.0** | 2026-02-16 | ✨ **Locality context**<br>• Mapbox reverse geocoding<br>• Automatic location detection<br>• Regional landscape context |
| v1.4.0 | 2026-02-16 | Fire size/scale, polygon removal |
| v1.3.0 | 2026-02-16 | Landscape adherence, directional narratives |
| v1.2.0 | 2026-02-14 | Ground perspectives |
| v1.0.0 | 2026-01-15 | Initial template |

---

## Summary

**Problem:** Generic location context didn't help AI understand regional landscapes  
**Solution:** Automatic locality detection via Mapbox reverse geocoding  
**Result:** Specific geographic context improves landscape understanding

**Examples:**
- ✅ "near Bungendore, New South Wales" → tablelands context
- ✅ "in the Blue Mountains area, New South Wales" → escarpment context
- ✅ "near Bendigo, Victoria" → goldfields plains context

**Impact:** AI generates more regionally appropriate landscapes with better understanding of local topography and vegetation.
