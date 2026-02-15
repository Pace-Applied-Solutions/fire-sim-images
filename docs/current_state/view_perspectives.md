# View Perspectives Reference

## Overview

The bushfire simulation inject tool provides two distinct sets of viewpoints for generating imagery: **helicopter views** and **ground-level views**. Each perspective serves a different training purpose and simulates different observer positions on the fireground.

## Perspective Types

### Helicopter Views (Wide-Area Situational Awareness)

**Purpose:** Wide-area situational awareness from elevated positions, suitable for incident management and strategic planning exercises.

**Characteristics:**

- Elevated camera position (helicopter altitude)
- Wide-angle view showing terrain context
- Moderate pitch angle (~60°) for good terrain visibility
- Camera positioned further from fire perimeter (0.8x bounding box distance)
- Suitable for understanding fire spread patterns, terrain relationships, and strategic positioning

**Available Views:**

- `helicopter_north` - View from north looking south
- `helicopter_south` - View from south looking north
- `helicopter_east` - View from east looking west
- `helicopter_west` - View from west looking east
- `helicopter_above` - Elevated overhead view (30° pitch)

**Use Cases:**

- Incident management team briefings
- Strategic fire behavior assessment
- Terrain and fuel distribution visualization
- Multi-division fire operations

### Ground-Level Views (Truck/Vehicle Perspective)

**Purpose:** Realistic ground-level perspective simulating what fire crews and ground vehicles (trucks, tankers) would observe on scene.

**Characteristics:**

- Camera at ground level (minimal elevation)
- Nearly horizontal viewing angle (85° pitch)
- Tight zoom (camera positioned closer, ~0.35x bounding box distance)
- Simulates a realistic view from no more than 2km from the nearest terrain edge
- Suitable for tactical decision-making and crew safety training

**Available Views:**

- `ground_north` - Ground view from north looking south
- `ground_south` - Ground view from south looking north
- `ground_east` - Ground view from east looking west
- `ground_west` - Ground view from west looking east
- `ground_above` - Low-altitude overhead view (directly above, zoomed in)

**Use Cases:**

- Crew safety and situational awareness training
- Vehicle positioning exercises
- Tactical fire attack scenarios
- Escape route identification
- Structure protection operations

## View Selection Guidance

### When to Use Helicopter Views

- Training incident management teams (IMT)
- Teaching fire behavior over large areas
- Demonstrating fire spread and terrain interaction
- Planning division boundaries and resource allocation
- Understanding fire perimeter development over time

### When to Use Ground-Level Views

- Training crew leaders and sector commanders
- Demonstrating direct attack tactics
- Teaching situational awareness for ground crews
- Simulating structure protection scenarios
- Escape route and safety zone identification
- Vehicle approach and staging exercises

## Technical Implementation

### Camera Parameters Comparison

| Parameter           | Helicopter Views    | Ground-Level Views      |
| ------------------- | ------------------- | ----------------------- |
| Pitch Angle         | 60° (elevated)      | 85° (nearly horizontal) |
| Distance Multiplier | 0.8x bbox           | 0.35x bbox              |
| Zoom Adjustment     | baseZoom - 1        | baseZoom + 1.5          |
| Perspective         | Wide-area awareness | Realistic ground view   |
| Above View Pitch    | 30° (angled down)   | 0° (top-down, close)    |

### ViewPoint Type Definition

Both perspective types are defined in `packages/shared/src/types.ts`:

```typescript
export type ViewPoint =
  | 'aerial' // Legacy wide view
  | 'helicopter_north' // Elevated NSEW views
  | 'helicopter_south'
  | 'helicopter_east'
  | 'helicopter_west'
  | 'helicopter_above'
  | 'ground_north' // Ground-level NSEW views
  | 'ground_south'
  | 'ground_east'
  | 'ground_west'
  | 'ground_above'
  | 'ridge'; // Terrain-specific view
```

## Prompt Generation Considerations

When generating AI prompts for images, the perspective type should influence:

1. **Camera Angle Description:**
   - Helicopter: "elevated helicopter view", "wide-angle perspective", "aerial observation"
   - Ground: "ground-level view", "horizontal perspective", "as seen from a fire truck"

2. **Distance and Scale:**
   - Helicopter: "wide view showing terrain and fire extent"
   - Ground: "close-up perspective within 2km of the fire edge"

3. **Context Elements:**
   - Helicopter: Include terrain features, overall fire shape, multiple flanks
   - Ground: Include immediate surroundings, vegetation detail, flame height relative to viewer

4. **Realism Factors:**
   - Helicopter: Emphasize terrain interaction, smoke column from above
   - Ground: Emphasize radiant heat effects, ember showers, immediate hazards

## Example Scenarios

### Scenario 1: Grass Fire Training

- **Helicopter views:** Show full fire perimeter, rate of spread, wind-driven head fire
- **Ground views:** Show flame height at ground level, visibility through smoke, escape routes

### Scenario 2: Forest Fire Structure Protection

- **Helicopter views:** Show fire approaching structures, defensive space, access routes
- **Ground views:** Show immediate threat to structures, ember attack, crew positioning

### Scenario 3: Night Operations

- **Helicopter views:** Show fire glow, spot fire distribution, perimeter lighting
- **Ground views:** Show working lights, immediate fire front, limited visibility

## Future Enhancements

Potential improvements to view perspectives:

- Dynamic pitch adjustment based on terrain slope
- Automatic view selection based on scenario type
- View interpolation for continuous perspective shifts
- VR/AR delivery of ground-level views
- Time-of-day lighting adjustments per view

---

_Document Version: 1.0_  
_Created: 2026-02-14_  
_Related Issue: Add ground-level NSEW and Above views for realistic 'truck' perspective_
