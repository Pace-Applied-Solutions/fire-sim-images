# Fire Danger Rating and Behaviour Reference

## Overview
This document describes the fire danger rating system and fire behaviour characteristics used in the bushfire simulation inject tool. The implementation follows the **Australian Fire Danger Rating System (AFDRS)**, which is the national standard for communicating fire danger across Australia.

## Australian Fire Danger Rating System (AFDRS)

The AFDRS provides a consistent national approach to fire danger ratings. It uses **six rating levels** that describe the potential consequences of a fire:

| Rating | Numerical Range | Description |
|--------|----------------|-------------|
| **Moderate** | 0-11 | Most fires can be controlled. |
| **High** | 12-23 | Fires can be dangerous. |
| **Very High** | 24-49 | Fires will be very dangerous and unpredictable. |
| **Severe** | 50-74 | Fires will be extremely dangerous and spread quickly. |
| **Extreme** | 75-99 | Fires will be uncontrollable, unpredictable and extremely dangerous. |
| **Catastrophic** | 100+ | If a fire starts and takes hold, lives are likely to be lost. |

**Reference:** Bureau of Meteorology & AFAC (Australasian Fire and Emergency Services Authorities Council)

## Fire Behaviour Characteristics

Fire behaviour varies significantly based on both the **fire danger rating** and the **vegetation type**. The characteristics below represent typical expected behaviour for training scenarios.

### Fire Behaviour by Rating and Vegetation

#### Dry Sclerophyll Forest

| Rating | Flame Height | Rate of Spread | Spotting Distance | Intensity |
|--------|-------------|----------------|-------------------|-----------|
| Moderate | 1-2 m | 0.5-1 km/h | <100 m | Low |
| High | 2-4 m | 1-2 km/h | 100-200 m | Moderate |
| Very High | 4-8 m | 2-4 km/h | 200-500 m | High |
| Severe | 8-15 m | 4-6 km/h | 500-1000 m | Very High |
| Extreme | 15-25 m | 6-10 km/h | 1-2 km | Extreme |
| Catastrophic | 25+ m | 10+ km/h | 2+ km | Extreme |

#### Grassland

| Rating | Flame Height | Rate of Spread | Spotting Distance | Intensity |
|--------|-------------|----------------|-------------------|-----------|
| Moderate | 0.5-1 m | 2-4 km/h | Minimal | Low |
| High | 1-2 m | 4-8 km/h | <50 m | Moderate |
| Very High | 2-3 m | 8-15 km/h | 50-100 m | High |
| Severe | 3-5 m | 15-25 km/h | 100-200 m | Very High |
| Extreme | 5-8 m | 25-40 km/h | 200-500 m | Extreme |
| Catastrophic | 8+ m | 40+ km/h | 500+ m | Extreme |

#### Heath and Scrubland

| Rating | Flame Height | Rate of Spread | Spotting Distance | Intensity |
|--------|-------------|----------------|-------------------|-----------|
| Moderate | 1-1.5 m | 0.3-0.8 km/h | Minimal | Low |
| High | 1.5-3 m | 0.8-1.5 km/h | 50-100 m | Moderate |
| Very High | 3-6 m | 1.5-3 km/h | 100-300 m | High |
| Severe | 6-10 m | 3-5 km/h | 300-700 m | Very High |
| Extreme | 10-18 m | 5-8 km/h | 700-1500 m | Extreme |
| Catastrophic | 18+ m | 8+ km/h | 1500+ m | Extreme |

### Fire Behaviour Descriptors for AI Prompts

These qualitative descriptors help translate fire danger ratings and behaviour into natural language for AI image generation:

**Moderate:**
- "Controlled fire with manageable flames"
- "Light smoke, minimal spotting"
- "Ground-level flames, slow spread"

**High:**
- "Active fire with consistent flame development"
- "Moderate smoke column"
- "Some ember activity"

**Very High:**
- "Intense fire with tall flames"
- "Large smoke plume"
- "Active spotting ahead of main fire"

**Severe:**
- "Very intense fire with towering flames"
- "Dense black smoke, towering convection column"
- "Heavy spotting, rapid spread"

**Extreme:**
- "Catastrophic fire behaviour"
- "Massive pyrocumulonimbus development"
- "Extreme spotting, fire whirls, ember storms"

**Catastrophic:**
- "Unprecedented fire intensity"
- "Fire-generated weather phenomena"
- "Massive fire front, complete fuel consumption"

## Weather Context

While AFDRS ratings are the primary control, weather parameters provide important scenario context:

- **Temperature**: Affects fuel moisture and atmospheric stability
- **Humidity**: Influences fuel availability and fire intensity
- **Wind Speed**: Primary driver of spread rate and spotting
- **Wind Direction**: Determines fire spread direction and flank positions

Typical weather conditions associated with each rating:

| Rating | Temperature | Humidity | Wind Speed |
|--------|-------------|----------|------------|
| Moderate | 15-25°C | 40-70% | 5-15 km/h |
| High | 25-32°C | 25-40% | 15-30 km/h |
| Very High | 32-38°C | 15-25% | 30-50 km/h |
| Severe | 38-42°C | 10-15% | 50-70 km/h |
| Extreme | 42-45°C | 6-10% | 70-90 km/h |
| Catastrophic | 45+°C | <6% | 90+ km/h |

## Implementation Approach

### For Training Scenarios

1. **User selects AFDRS rating** (primary control)
2. **System retrieves vegetation type** from geospatial data
3. **Fire behaviour characteristics are determined** based on rating + vegetation
4. **Weather parameters** can be adjusted for scenario context
5. **AI prompts are generated** using behaviour descriptors and characteristics

### Example Scenario

```
Rating: Severe
Vegetation: Dry Sclerophyll Forest
Weather: 40°C, 12% RH, 60 km/h NW winds

Expected Behaviour:
- Flame height: 8-15 meters
- Rate of spread: 4-6 km/h
- Spotting: 500-1000 meters ahead
- Intensity: Very High

Prompt Description:
"A severe bushfire in dry eucalypt forest with 8-15 meter flames,
dense black smoke forming a towering convection column, heavy spotting
500-1000 meters ahead of the fire front, driven by 60 km/h northwesterly
winds on a 40 degree day with 12% humidity"
```

## References

1. Bureau of Meteorology (2024). *Australian Fire Danger Rating System.* http://www.bom.gov.au/australia/fire-danger-rating/

2. AFAC (Australasian Fire and Emergency Services Authorities Council). *AFDRS Implementation Guide.*

3. Cheney, P., & Sullivan, A. (2008). *Grassfires: Fuel, Weather and Fire Behaviour.* CSIRO Publishing.

4. Cruz, M.G., & Alexander, M.E. (2013). *Uncertainty associated with model predictions of surface and crown fire rates of spread.* Environmental Modelling & Software, 47, 16-28.

5. NSW Rural Fire Service. *Bush Fire Coordinating Committee Operations Manual.*

---

*Document Version: 2.0*
*Last Updated: 2026-02-14*
*Updated to reflect AFDRS as primary system, removed legacy McArthur calculations*
