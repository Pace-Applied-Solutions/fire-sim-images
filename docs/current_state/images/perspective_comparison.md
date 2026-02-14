# View Perspectives: Visual Comparison

## Helicopter View vs Ground-Level View

This diagram illustrates the key differences between helicopter and ground-level perspectives.

### Side View Comparison

```
HELICOPTER VIEW (Wide-Area Situational Awareness)
═══════════════════════════════════════════════════

                    🚁 (Camera)
                   ╱  
                  ╱ 60° pitch
                 ╱
                ╱
               ╱_______________
              ╱                 ╲
             ╱    Wide angle     ╲
            ╱       view          ╲
           ╱                       ╲
          ╱_________________________╲
         │                           │
         │      TERRAIN              │
         │    🔥 Fire Area 🔥        │
         │═══════════════════════════│
         
Distance: 0.8x bbox (far from fire)
Zoom: baseZoom - 1 (wide angle)
Purpose: Strategic planning, IMT briefings


GROUND-LEVEL VIEW (Truck Perspective)
═══════════════════════════════════════════════════

   🚒 (Camera at ground level)
    │85° pitch (nearly horizontal)
    │╱‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾╲
    │╱   Tight zoom    ╲
    ││   (<2km view)    │
    ││                  │
    │╲                  ╱
    │ ╲________________╱
    │         │
    │    🔥 Fire 🔥
    │═══════════════════════════
    │      TERRAIN
    
Distance: 0.35x bbox (close to fire)
Zoom: baseZoom + 1.5 (zoomed in)
Purpose: Crew training, tactical ops
```

### Top-Down View Comparison

```
HELICOPTER ABOVE VIEW
═══════════════════════════════════════════════════
                🚁
                │ 30° angle
                │
        ┌───────▼───────┐
        │               │
        │   🔥🔥🔥🔥    │ ◄── Wide view
        │   🔥🔥🔥🔥    │     showing large
        │   🔥🔥🔥🔥    │     area context
        │               │
        └───────────────┘

Altitude: High
Coverage: Wide area
Best for: Fire perimeter, spread patterns


GROUND ABOVE VIEW  
═══════════════════════════════════════════════════
         🚁 (lower altitude)
          │ 0° (straight down)
          │
      ┌───▼───┐
      │🔥🔥🔥🔥│ ◄── Zoomed in
      │🔥🔥🔥🔥│     showing detail
      └───────┘

Altitude: Low
Coverage: Tight zoom
Best for: Immediate area, detail work
```

### Camera Position Comparison (Plan View)

```
                    FIRE PERIMETER
           ┌─────────────────────────┐
           │                         │
           │         🔥🔥🔥          │
           │       🔥🔥🔥🔥🔥        │
           │         🔥🔥🔥          │
           │                         │
           └─────────────────────────┘

HELICOPTER VIEWS (0.8x distance - FAR)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

           🚁 North (far)
            ↓ 
    ┌─────────────────────┐
    │                     │
🚁  │      🔥🔥🔥         │  🚁
← W │    🔥🔥🔥🔥🔥       │ E →
    │      🔥🔥🔥         │
    │                     │
    └─────────────────────┘
            ↑
           🚁 South (far)


GROUND VIEWS (0.35x distance - CLOSE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        🚒 North (close)
         ↓ 
    ┌─────────────────┐
    │     🔥🔥🔥      │
🚒 ← │   🔥🔥🔥🔥🔥    │ → 🚒
  W  │     🔥🔥🔥      │  E
    └─────────────────┘
         ↑
        🚒 South (close)
```

## Use Case Examples

### Training Scenario: Grass Fire - Moderate Conditions

**Helicopter Views Provide:**
- Overall fire shape and extent
- Rate of spread across terrain
- Wind-driven head fire progression
- Flank positioning relative to landmarks
- Strategic deployment zones

**Ground Views Provide:**
- Flame height as seen by crews (safety assessment)
- Visibility through smoke at ground level
- Escape route identification
- Vehicle approach angles
- Immediate hazard recognition

### Training Scenario: Forest Fire - Structure Protection

**Helicopter Views Provide:**
- Fire approaching structures (big picture)
- Defensive space adequacy
- Access routes for resources
- Division boundaries
- Staging area locations

**Ground Views Provide:**
- Immediate threat to structures (what crews see)
- Ember attack visualization
- Crew positioning around structures
- Hose deployment and reach
- Radiant heat exposure zones

## Key Takeaways

| Question | Helicopter Views | Ground Views |
|----------|------------------|--------------|
| What do I see? | Wide terrain context | Immediate surroundings |
| How far away? | 0.8x bbox (far) | 0.35x bbox (close, <2km) |
| Camera angle? | 60° elevated | 85° horizontal |
| Best for? | Strategy, IMT | Tactics, crews |
| Training focus? | Planning, assessment | Safety, operations |

---

*Visual reference for trainers and developers*  
*Last Updated: 2026-02-14*
