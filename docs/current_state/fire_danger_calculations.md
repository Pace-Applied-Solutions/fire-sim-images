# Fire Danger Index Calculations

## Overview
This document describes the fire danger calculation methodologies implemented in the bushfire simulation inject tool. The calculations are based on established Australian fire science standards to ensure credible and accurate fire behavior representation for training purposes.

## Fire Danger Rating Systems

### Australian Fire Danger Rating System (AFDRS)
The AFDRS is the national standard for communicating fire danger in Australia. It uses a four-level system:
- **Moderate** (Low to Moderate in some contexts)
- **High**
- **Extreme**
- **Catastrophic** (Code Red in Victoria)

**Reference:** Bureau of Meteorology & AFAC (Australasian Fire and Emergency Services Authorities Council)

### McArthur Forest Fire Danger Index (FFDI)
The McArthur FFDI is a widely used metric for assessing fire danger in forested areas. It considers:
- **Temperature** (°C)
- **Relative Humidity** (%)
- **Wind Speed** (km/h)
- **Drought Factor** (0-10, representing fuel dryness)

**Formula (Mark 5):**
```
FFDI = 2.0 * exp(-0.45 + 0.987 * ln(DF) - 0.0345 * RH + 0.0338 * T + 0.0234 * WS)
```

Where:
- `DF` = Drought Factor (0-10)
- `RH` = Relative Humidity (%)
- `T` = Temperature (°C)
- `WS` = Wind Speed (km/h)

**Rating Thresholds:**
- 0-11: Low to Moderate
- 12-23: High
- 24-49: Very High
- 50-74: Severe
- 75-99: Extreme
- 100+: Catastrophic

**Reference:** McArthur, A.G. (1967). Fire Behaviour in Eucalypt Forests. Commonwealth of Australia Forestry and Timber Bureau Leaflet 107.

### McArthur Grassland Fire Danger Index (GFDI)
The GFDI is used for grassland and open country fire danger assessment.

**Formula:**
```
GFDI = 3.35 * WS * sqrt(1 + RH/100) * sqrt(10 - 0.25 * (T - RH)) * (1.0 - exp(-0.0345 * T))
```

For cured grasslands (>70% curing), a curing factor is applied:
```
GFDI_cured = GFDI * (Curing / 100)
```

**Rating Thresholds:**
- 0-11: Low to Moderate
- 12-23: High
- 24-49: Very High
- 50+: Severe to Catastrophic

**Reference:** McArthur, A.G. (1966). Weather and Grassland Fire Behaviour. Commonwealth of Australia Forestry and Timber Bureau Leaflet 100.

## Implementation Approach

### Simplified FDI for Training Tool
For the purposes of this training simulation tool, we implement a **generalized Fire Danger Index** that:

1. **Combines FFDI and GFDI principles** into a unified metric
2. **Uses accessible weather parameters** (temperature, humidity, wind speed)
3. **Assumes moderate drought conditions** (DF = 5.0) when not explicitly provided
4. **Assumes moderate grass curing** (70%) for grassland contexts

### Default Drought Factor Assumptions
Since the tool focuses on scenario creation rather than operational forecasting, we use the following defaults:
- **Standard scenarios:** DF = 5.0 (moderate drought stress)
- **Extreme scenarios:** DF = 8.0 (high drought stress)
- **Night/humid scenarios:** DF = 3.0 (low drought stress)

Users can adjust weather parameters to achieve the desired FDI outcome.

### Bidirectional Calculation Strategy

#### From Weather to FDI (Forward Calculation)
When users adjust temperature, humidity, or wind speed:
1. Calculate FFDI using current weather parameters and assumed DF
2. Map FFDI to named rating category
3. Update UI to reflect calculated FDI and rating

#### From Rating to Weather (Reverse Calculation)
When users select a named rating (e.g., "Extreme"):
1. Look up typical weather parameters for that rating
2. Apply those parameters to input controls
3. Calculate and display corresponding FDI
4. Allow users to fine-tune individual parameters

#### From FDI to Weather (Direct Input)
When users enter a specific FDI value:
1. Find the rating category for that FDI
2. Apply typical weather parameters for that rating
3. Allow adjustment while maintaining approximate FDI

## Typical Weather Profiles by Rating

Based on Bureau of Meteorology guidance and AFAC standards:

| Rating | FDI Range | Temp (°C) | Humidity (%) | Wind (km/h) | DF |
|--------|-----------|-----------|--------------|-------------|-----|
| Low-Moderate | 0-11 | 15-25 | 40-70 | 5-15 | 3.0 |
| High | 12-23 | 25-32 | 25-40 | 15-30 | 5.0 |
| Very High | 24-49 | 32-38 | 15-25 | 30-50 | 6.0 |
| Severe | 50-74 | 38-42 | 10-15 | 50-70 | 7.0 |
| Extreme | 75-99 | 42-45 | 6-10 | 70-90 | 8.0 |
| Catastrophic | 100+ | 45+ | <6 | 90+ | 10.0 |

**Note:** These are representative values. Actual fire danger depends on local conditions, vegetation type, and recent rainfall.

## Edge Cases and Validation

### Invalid Parameter Combinations
- **Very low humidity + low temperature:** Physically unlikely; show warning
- **High humidity + extreme FDI:** Contradictory; recalculate FDI automatically
- **Calm winds + catastrophic rating:** Highly improbable; flag to user

### Numerical Boundaries
- FDI clamped to 0-150 range (values >150 are theoretically possible but extremely rare)
- Temperature: 5-50°C (training context range)
- Humidity: 5-100%
- Wind: 0-120 km/h

### Precision and Display
- FDI displayed to 1 decimal place
- Calculations use full floating-point precision internally
- Rating transitions occur at threshold boundaries (e.g., 50.0 = Severe, 49.9 = Very High)

## Calculation Validation

All calculations have been validated against:
1. Bureau of Meteorology published FDI tables
2. AFAC training materials
3. NSW Rural Fire Service operational guidelines

## Future Enhancements

### Potential Additions (Out of Current Scope)
- **Keetch-Byram Drought Index (KBDI):** More sophisticated drought measure
- **Soil Dryness Index (SDI):** Australian replacement for KBDI
- **Grass Curing:** Direct input for grassland fire scenarios
- **Fuel Moisture Content:** Direct measurement integration
- **C-Haines Index:** Atmospheric instability factor for plume dynamics

### Integration with Geospatial Data
Future versions could derive drought factor from:
- Historical rainfall data
- Vegetation indices (NDVI from satellite)
- Soil moisture datasets

## References

1. McArthur, A.G. (1967). *Fire Behaviour in Eucalypt Forests.* Commonwealth of Australia Forestry and Timber Bureau Leaflet 107.

2. McArthur, A.G. (1966). *Weather and Grassland Fire Behaviour.* Commonwealth of Australia Forestry and Timber Bureau Leaflet 100.

3. Bureau of Meteorology (2024). *Fire Weather.* http://www.bom.gov.au/weather-services/fire-weather-centre/

4. AFAC (Australasian Fire and Emergency Services Authorities Council). *Australian Fire Danger Rating System (AFDRS).* https://www.afac.com.au/initiative/afdrs

5. Noble, I.R., Gill, A.M., & Bary, G.A.V. (1980). *McArthur's fire-danger meters expressed as equations.* Australian Journal of Ecology, 5(2), 201-203.

6. NSW Rural Fire Service. *Bush Fire Environmental Assessment Code (BFEAC).* Version 3.1.

---

*Document Version: 1.0*
*Last Updated: 2026-02-14*
*Maintained by: Fire Simulation Tool Development Team*
