# Viewpoint Controls - UI Layout

This document shows the updated viewpoint controls that appear when a fire perimeter is drawn.

## Control Layout

The viewpoint controls now display TWO separate sets of views:

### 1. Helicopter Views (Wide Area)

```
┌─────────────────────────────────────────┐
│  Helicopter Views (Wide Area)           │
├─────────────────────────────────────────┤
│  [ N ]  [ S ]  [ E ]  [ W ]  [ ⬆ ]     │
└─────────────────────────────────────────┘
```

**Button Titles:**

- N = "Helicopter View from North"
- S = "Helicopter View from South"
- E = "Helicopter View from East"
- W = "Helicopter View from West"
- ⬆ = "Helicopter View Above"

**Characteristics:**

- Elevated position (helicopter altitude)
- 60° pitch angle for elevated perspective
- Wide-angle view showing terrain context
- Camera positioned far from fire (0.8x bounding box distance)

---

### 2. Ground Views (Truck Perspective)

```
┌─────────────────────────────────────────┐
│  Ground Views (Truck Perspective)       │
├─────────────────────────────────────────┤
│  [ N ]  [ S ]  [ E ]  [ W ]  [ ⬆ ]     │
└─────────────────────────────────────────┘
```

**Button Titles:**

- N = "Ground-Level View from North"
- S = "Ground-Level View from South"
- E = "Ground-Level View from East"
- W = "Ground-Level View from West"
- ⬆ = "Ground-Level View Above (Low Altitude)"

**Characteristics:**

- Ground-level position (truck/vehicle height)
- 85° pitch angle for nearly horizontal perspective
- Zoomed-in view (<2km from terrain edge)
- Camera positioned close to fire (0.35x bounding box distance)

---

## Complete Control Panel

When a fire perimeter is drawn on the map, the complete viewpoint control panel appears as:

```
┌──────────────────────────────────────────┐
│  Helicopter Views (Wide Area)            │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐              │
│  │N │ │S │ │E │ │W │ │⬆│              │
│  └──┘ └──┘ └──┘ └──┘ └──┘              │
│                                          │
│  Ground Views (Truck Perspective)        │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐              │
│  │N │ │S │ │E │ │W │ │⬆│              │
│  └──┘ └──┘ └──┘ └──┘ └──┘              │
│                                          │
│  ┌────────────────────────┐              │
│  │  📷 Capture View       │              │
│  └────────────────────────┘              │
└──────────────────────────────────────────┘
```

## Usage Flow

1. **Draw Fire Perimeter**: Use the polygon tool to draw the fire perimeter on the map
2. **Select Perspective Type**: Choose between helicopter (wide-area) or ground-level views
3. **Choose Direction**: Click N, S, E, W, or ⬆ button for the desired viewpoint
4. **Camera Flies**: Map camera smoothly transitions to the selected viewpoint
5. **Capture**: Optional - use "📷 Capture View" to save the current map view

## View Comparison

| Aspect           | Helicopter Views      | Ground Views          |
| ---------------- | --------------------- | --------------------- |
| **Altitude**     | High (helicopter)     | Low (ground level)    |
| **Pitch**        | 60° (elevated)        | 85° (horizontal)      |
| **Zoom**         | Wide angle            | Tight/zoomed in       |
| **Distance**     | Far from fire (0.8x)  | Close to fire (0.35x) |
| **Purpose**      | Situational awareness | Tactical realism      |
| **Training Use** | IMT, strategy         | Crew, vehicle ops     |

## Benefits

✅ **Dual Perspective**: Both strategic (helicopter) and tactical (ground) views available  
✅ **Clear Distinction**: Separate labeled sections prevent confusion  
✅ **Complete Coverage**: 5 views per perspective type (N, S, E, W, Above)  
✅ **Intuitive Layout**: Stacked vertically with descriptive headers  
✅ **Realistic Training**: Ground views simulate actual fire truck perspective (<2km)

---

_Last Updated: 2026-02-14_  
_Related Files: `apps/web/src/components/Map/MapContainer.tsx`_
