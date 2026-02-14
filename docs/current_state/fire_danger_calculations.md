# Fire Danger Rating and Behaviour Reference

## Overview
This document describes the fire danger rating system and fire behaviour characteristics used in the bushfire simulation inject tool. The implementation follows the **Australian Fire Danger Rating System (AFDRS)**, which is the national standard for communicating fire danger across Australia.

## Australian Fire Danger Rating System (AFDRS)

The AFDRS provides a consistent national approach to fire danger ratings across Australia. Introduced nationally on 1 September 2022, it uses **four main rating levels** plus a "No Rating" for days below the moderate threshold:

| Rating | Color | Action Message | Description |
|--------|-------|----------------|-------------|
| **No Rating** | White | No action required | Minimal fire danger. Fires are still possible but not expected to pose a risk to community safety. |
| **Moderate** | Green | Plan and prepare | Most fires can be controlled. Stay updated and be ready to act if there is a fire. |
| **High** | Orange | Be ready to act | Fires can be dangerous. There's a heightened risk, so be alert for fires and decide what you will do if a fire starts. |
| **Extreme** | Red | Take action now to protect your life and property | The risk is high. If a fire starts, you and your property may be at serious risk. |
| **Catastrophic** | Black | For your survival, leave bushfire risk areas | These are the most dangerous conditions. For personal safety, leaving early is the only safe option. |

**Reference:** https://afdrs.com.au/ — Australian Fire Danger Rating System (Bureau of Meteorology & AFAC)

## Fire Behaviour Characteristics

Fire behaviour varies significantly based on both the **fire danger rating** and the **vegetation type**. The characteristics below represent typical expected behaviour for training scenarios.

### Fire Behaviour by Rating and Vegetation

#### Dry Sclerophyll Forest

| Rating | Flame Height | Rate of Spread | Spotting Distance | Intensity |
|--------|-------------|----------------|-------------------|-----------|
| No Rating | 0.5-1 m | 0.2-0.5 km/h | Minimal | Low |
| Moderate | 1-3 m | 0.5-1.5 km/h | <100 m | Low |
| High | 3-8 m | 1.5-4 km/h | 100-500 m | Moderate |
| Extreme | 8-20 m | 4-10 km/h | 500-2000 m | Very High |
| Catastrophic | 20+ m | 10+ km/h | 2+ km | Extreme |

#### Grassland

| Rating | Flame Height | Rate of Spread | Spotting Distance | Intensity |
|--------|-------------|----------------|-------------------|-----------|
| No Rating | 0.3-0.5 m | 1-2 km/h | Minimal | Low |
| Moderate | 0.5-1.5 m | 2-6 km/h | Minimal | Low |
| High | 1.5-3 m | 6-15 km/h | 50-100 m | Moderate |
| Extreme | 3-8 m | 15-35 km/h | 100-500 m | Very High |
| Catastrophic | 8+ m | 35+ km/h | 500+ m | Extreme |

#### Heath and Scrubland

| Rating | Flame Height | Rate of Spread | Spotting Distance | Intensity |
|--------|-------------|----------------|-------------------|-----------|
| No Rating | 0.5-1 m | 0.2-0.5 km/h | Minimal | Low |
| Moderate | 1-2 m | 0.5-1.2 km/h | Minimal | Low |
| High | 2-6 m | 1.2-3 km/h | 50-300 m | Moderate |
| Extreme | 6-15 m | 3-7 km/h | 300-1500 m | Very High |
| Catastrophic | 15+ m | 7+ km/h | 1500+ m | Extreme |

### Fire Behaviour Descriptors for AI Prompts

These qualitative descriptors help translate fire danger ratings and behaviour into natural language for AI image generation:

**No Rating:**
- "Very low intensity fire"
- "Minimal flames and smoke"
- "Slow, controlled spread"

**Moderate:**
- "Controlled fire with manageable flames"
- "Light smoke, minimal spotting"
- "Ground-level flames, slow to moderate spread"

**High:**
- "Active fire with consistent flame development"
- "Moderate to large smoke column"
- "Some to active ember activity"

**Extreme:**
- "Very intense fire with towering flames"
- "Dense black smoke, large convection column"
- "Heavy spotting, rapid spread"

**Catastrophic:**
- "Catastrophic fire behaviour"
- "Massive pyrocumulonimbus development"
- "Extreme spotting, fire whirls, ember storms, fire-generated weather"

## Weather Context

While AFDRS ratings are the primary control, weather parameters provide important scenario context:

- **Temperature**: Affects fuel moisture and atmospheric stability
- **Humidity**: Influences fuel availability and fire intensity
- **Wind Speed**: Primary driver of spread rate and spotting
- **Wind Direction**: Determines fire spread direction and flank positions

Typical weather conditions associated with each rating:

| Rating | Temperature | Humidity | Wind Speed |
|--------|-------------|----------|------------|
| No Rating | 15-22°C | 50-80% | 5-10 km/h |
| Moderate | 22-28°C | 35-50% | 10-20 km/h |
| High | 28-36°C | 20-35% | 20-40 km/h |
| Extreme | 36-43°C | 8-20% | 40-80 km/h |
| Catastrophic | 43+°C | <8% | 80+ km/h |

## Implementation Approach

### For Training Scenarios

1. **User selects AFDRS rating** (primary control)
2. **System retrieves vegetation type** from geospatial data
3. **Fire behaviour characteristics are determined** based on rating + vegetation
4. **Weather parameters** can be adjusted for scenario context
5. **AI prompts are generated** using behaviour descriptors and characteristics

### Example Scenario

```
Rating: Extreme
Vegetation: Dry Sclerophyll Forest
Weather: 40°C, 10% RH, 70 km/h NW winds

Expected Behaviour:
- Flame height: 8-20 meters
- Rate of spread: 4-10 km/h
- Spotting: 500-2000 meters ahead
- Intensity: Very High

Prompt Description:
"An extreme bushfire in dry eucalypt forest with 8-20 meter towering flames,
dense black smoke forming a large convection column, heavy spotting
500-2000 meters ahead of the fire front, driven by 70 km/h northwesterly
winds on a 40 degree day with 10% humidity"
```

## References

1. Bureau of Meteorology (2024). *Australian Fire Danger Rating System.* http://www.bom.gov.au/australia/fire-danger-rating/

2. AFAC (Australasian Fire and Emergency Services Authorities Council). *AFDRS Implementation Guide.*

3. Cheney, P., & Sullivan, A. (2008). *Grassfires: Fuel, Weather and Fire Behaviour.* CSIRO Publishing.

4. Cruz, M.G., & Alexander, M.E. (2013). *Uncertainty associated with model predictions of surface and crown fire rates of spread.* Environmental Modelling & Software, 47, 16-28.

5. NSW Rural Fire Service. *Bush Fire Coordinating Committee Operations Manual.*

---

*Document Version: 3.0*
*Last Updated: 2026-02-14*
*Updated to reflect correct AFDRS rating levels (5 levels including No Rating) and official color scheme*
