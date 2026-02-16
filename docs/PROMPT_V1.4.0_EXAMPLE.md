# Example Prompt with Fire Size Information (v1.4.0)

## Scenario Details

**Fire Perimeter:**
- Location: NSW Blue Mountains (-33.7°, 150.3°)
- Area: 125 hectares
- Dimensions: 1.45 km (N-S) × 1.12 km (E-W)
- Shape: Irregular, wind-driven

**Conditions:**
- Time: Afternoon (15:00)
- Temperature: 35°C
- Humidity: 18%
- Wind: 35 km/h from NW
- Fire Stage: Established bushfire
- Intensity: Very High

---

## Generated Prompt (Ground North View)

### Full Prompt Text

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
terrain is moderate slopes, covered with dry eucalyptus forest with sparse 
understorey, at approximately 850 metres elevation in New South Wales, Australia. 
A road runs nearby. Preserve every topographic feature exactly where it appears in 
the reference — hills, gullies, flat paddocks, tree lines, bare earth patches, fence 
lines, and any built structures. If the reference shows a building, road, or 
clearing, it must appear in the generated image in the same location with the same 
scale and orientation.

Then, add the fire. A established bushfire is burning through the vegetation. Very 
high intensity — active crown fire. Flames are 10 to 20 metres high with massive 
dark smoke columns forming pyrocumulus cloud. The head fire is spreading to the 
southeast, driven by strong northwest winds. The fire covers approximately 125.3 
hectares, spanning 1.45 kilometres from north to south and 1.12 kilometres from 
east to west. CRITICAL: The fire must fill the entire mapped area — this is not a 
small fire, but an incident of this specific scale. The active fire edge, smoke, 
and burned areas should occupy the full extent of the landscape shown in the 
reference imagery. Do NOT show any red polygon outline or boundary markers — the 
fire itself replaces any drawn perimeter lines.

The conditions are 35°C with 18% relative humidity and a 35 km/h NW wind. Warm 
afternoon light from the west, golden-orange tones, lengthening shadows.

Finally, set the camera position: You're standing on the ground to the north of the 
fire, looking south towards the approaching flame front. Ground-level photograph 
taken at eye level, approximately 500 metres from the fire edge.

The landscape is uninhabited wilderness — only natural terrain, vegetation, fire, 
and smoke are present. The image contains only the natural scene with realistic 
textures, lighting, and atmospheric haze.
```

---

## Key Changes Highlighted

### 🔥 Fire Size Section (NEW in v1.4.0)

```
The fire covers approximately 125.3 hectares, spanning 1.45 kilometres from 
north to south and 1.12 kilometres from east to west.
```

**Purpose:** Gives AI exact dimensions to prevent undersized fire generation

---

### ⚠️ Scale Mandate (NEW in v1.4.0)

```
CRITICAL: The fire must fill the entire mapped area — this is not a small fire, 
but an incident of this specific scale. The active fire edge, smoke, and burned 
areas should occupy the full extent of the landscape shown in the reference imagery.
```

**Purpose:** Ensures fire fills the drawn area, not just a small portion

---

### 🚫 Polygon Removal (NEW in v1.4.0)

```
Do NOT show any red polygon outline or boundary markers — the fire itself replaces 
any drawn perimeter lines.
```

**Purpose:** Prevents technical artifacts (red lines) appearing in final images

---

## Comparison: Before vs After

### Before v1.4.0 (Missing Information)

```
Then, add the fire. A established bushfire is burning through the vegetation. 
Very high intensity — active crown fire. Flames are 10 to 20 metres high with 
massive dark smoke columns forming pyrocumulus cloud. The head fire is spreading 
to the southeast, driven by strong northwest winds.
```

**Problems:**
❌ No mention of fire size  
❌ No dimensions provided  
❌ No instruction about filling the area  
❌ No prohibition on red polygon  

**Result:** AI might generate small fire in large landscape

---

### After v1.4.0 (Complete Information)

```
Then, add the fire. A established bushfire is burning through the vegetation. 
Very high intensity — active crown fire. Flames are 10 to 20 metres high with 
massive dark smoke columns forming pyrocumulus cloud. The head fire is spreading 
to the southeast, driven by strong northwest winds. The fire covers approximately 
125.3 hectares, spanning 1.45 kilometres from north to south and 1.12 kilometres 
from east to west. CRITICAL: The fire must fill the entire mapped area — this is 
not a small fire, but an incident of this specific scale. The active fire edge, 
smoke, and burned areas should occupy the full extent of the landscape shown in 
the reference imagery. Do NOT show any red polygon outline or boundary markers — 
the fire itself replaces any drawn perimeter lines.
```

**Improvements:**
✅ Explicit area (125.3 ha)  
✅ Exact dimensions (1.45 × 1.12 km)  
✅ Critical fill-area mandate  
✅ Red polygon prohibition  

**Result:** AI generates appropriately scaled fire matching mapped incident

---

## Scale Visualization

```
Small Fire (5 ha)          Medium Fire (125 ha)         Large Fire (2500 ha)
┌──────┐                   ┌─────────────┐              ┌────────────────────────┐
│ 🔥  │                   │   🔥🔥🔥    │              │ 🔥🔥🔥🔥🔥🔥🔥🔥🔥 │
│      │                   │  🔥🔥🔥🔥   │              │ 🔥🔥🔥🔥🔥🔥🔥🔥🔥 │
└──────┘                   │   🔥🔥🔥    │              │ 🔥🔥🔥🔥🔥🔥🔥🔥🔥 │
0.35 × 0.28 km             └─────────────┘              │ 🔥🔥🔥🔥🔥🔥🔥🔥🔥 │
                           1.45 × 1.12 km               └────────────────────────┘
                                                        6.25 × 5.80 km

Prompt: "5.2 hectares"     Prompt: "125.3 hectares"    Prompt: "2,487.5 hectares"
```

---

## Expected Results

### For 125 ha Fire:

**Without v1.4.0:**
- Image might show 20-30 ha fire
- Lots of empty landscape
- Fire looks small/insignificant
- Doesn't match training scenario

**With v1.4.0:**
- Image shows full 125 ha extent
- Fire fills the visible area
- Smoke column proportional to size
- Burned areas visible at edges
- Matches training scenario exactly

---

## Other Viewpoints with Same Fire

### Aerial View
```
Finally, set the camera position: Aerial photograph taken from a helicopter or 
drone at 300 metres altitude, looking straight down at the fire.
```
**Expected:** Full fire perimeter visible, 125 ha extent clear, smoke plume from above

---

### Ground East View
```
Finally, set the camera position: You're standing on the ground to the east of 
the fire, looking west at the flank of the fire. Ground-level photograph taken 
at eye level, capturing the fire's flank and smoke movement.
```
**Expected:** 1.12 km wide fire visible, flank extending into distance

---

### Helicopter South View
```
Finally, set the camera position: Elevated wide-angle photograph from a helicopter 
south of the fire at 150 metres altitude, looking north across the burned area 
and active fire.
```
**Expected:** Burned area in foreground, active fire across 1.45 km N-S extent

---

## Technical Accuracy

### Calculation Breakdown for 125 ha Fire

**Perimeter Bounding Box:**
```
minLat: -33.712°
maxLat: -33.699°
minLng: 150.292°
maxLng: 150.305°
```

**Calculations:**
```
midLat = (-33.712 + -33.699) / 2 = -33.706°

latDiff = 0.013°
lngDiff = 0.013°

kmPerDegreeLat = 111.0
kmPerDegreeLng = 111.0 × cos(-33.706° × π/180) = 92.5

extentNS = 0.013 × 111.0 = 1.44 km
extentEW = 0.013 × 92.5 = 1.20 km

area = 125 ha (from turf/area polygon calculation)
```

**Prompt Output:**
```
"The fire covers approximately 125.3 hectares, spanning 1.45 kilometres from 
north to south and 1.12 kilometres from east to west."
```

---

## Summary

**What changed in v1.4.0:**
1. ✅ Fire area explicitly stated in hectares
2. ✅ North-South and East-West dimensions in kilometres
3. ✅ CRITICAL instruction to fill the mapped area
4. ✅ Prohibition on showing red polygon outlines
5. ✅ Emphasis that fire is "this specific scale"

**Why it matters:**
- Prevents undersized fire generation
- Ensures images match training scenarios
- Removes technical artifacts
- Provides clear scale context to AI model

**Result:**
- Professional, scale-accurate imagery
- Fire fills the drawn perimeter
- Realistic incident representation
- Ready for training exercises
