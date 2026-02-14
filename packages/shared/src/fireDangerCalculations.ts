/**
 * Fire Danger Index calculations based on McArthur FFDI and GFDI formulas.
 *
 * References:
 * - McArthur, A.G. (1967). Fire Behaviour in Eucalypt Forests. Leaflet 107.
 * - McArthur, A.G. (1966). Weather and Grassland Fire Behaviour. Leaflet 100.
 * - Noble, I.R., Gill, A.M., & Bary, G.A.V. (1980). McArthur's fire-danger meters
 *   expressed as equations. Australian Journal of Ecology, 5(2), 201-203.
 * - Bureau of Meteorology Fire Weather guidelines
 * - AFAC Australian Fire Danger Rating System (AFDRS)
 */

import type { FireDangerRating } from './types';

/**
 * Parameters for FDI calculation
 */
export interface FDICalculationParams {
  temperature: number; // °C (5-50)
  humidity: number; // % (5-100)
  windSpeed: number; // km/h (0-120)
  droughtFactor?: number; // 0-10, defaults to 5.0
}

/**
 * Weather profile representing typical conditions for a fire danger rating
 */
export interface WeatherProfile {
  temperature: number;
  humidity: number;
  windSpeed: number;
  droughtFactor: number;
}

/**
 * FDI thresholds for each fire danger rating category.
 * Based on AFDRS and Bureau of Meteorology standards.
 */
export const FDI_THRESHOLDS: Record<FireDangerRating, { min: number; max: number }> = {
  moderate: { min: 0, max: 11.9 },
  high: { min: 12, max: 23.9 },
  veryHigh: { min: 24, max: 49.9 },
  severe: { min: 50, max: 74.9 },
  extreme: { min: 75, max: 99.9 },
  catastrophic: { min: 100, max: 150 },
};

/**
 * Typical weather profiles for each fire danger rating.
 * These represent conditions commonly associated with each rating level.
 * Users can adjust individual parameters after selecting a rating.
 */
export const RATING_WEATHER_PROFILES: Record<FireDangerRating, WeatherProfile> = {
  moderate: {
    temperature: 22,
    humidity: 50,
    windSpeed: 12,
    droughtFactor: 3.0,
  },
  high: {
    temperature: 28,
    humidity: 30,
    windSpeed: 25,
    droughtFactor: 5.0,
  },
  veryHigh: {
    temperature: 35,
    humidity: 20,
    windSpeed: 40,
    droughtFactor: 6.0,
  },
  severe: {
    temperature: 40,
    humidity: 12,
    windSpeed: 60,
    droughtFactor: 7.0,
  },
  extreme: {
    temperature: 43,
    humidity: 8,
    windSpeed: 80,
    droughtFactor: 8.0,
  },
  catastrophic: {
    temperature: 46,
    humidity: 5,
    windSpeed: 100,
    droughtFactor: 10.0,
  },
};

/**
 * Calculate McArthur Forest Fire Danger Index (FFDI) Mark 5.
 *
 * Formula: FFDI = 2.0 * exp(-0.45 + 0.987 * ln(DF) - 0.0345 * RH + 0.0338 * T + 0.0234 * WS)
 *
 * @param params Weather and drought parameters
 * @returns FFDI value (0-150, typically)
 */
export function calculateFFDI(params: FDICalculationParams): number {
  const { temperature, humidity, windSpeed, droughtFactor = 5.0 } = params;

  // Validate inputs
  if (droughtFactor <= 0) {
    throw new Error('Drought factor must be greater than 0');
  }

  // McArthur FFDI formula (Mark 5)
  const exponent =
    -0.45 +
    0.987 * Math.log(droughtFactor) -
    0.0345 * humidity +
    0.0338 * temperature +
    0.0234 * windSpeed;

  const ffdi = 2.0 * Math.exp(exponent);

  // Clamp to reasonable bounds (0-150)
  return Math.max(0, Math.min(150, ffdi));
}

/**
 * Calculate McArthur Grassland Fire Danger Index (GFDI).
 *
 * Simplified formula for fully cured grassland (100% curing assumed).
 *
 * Formula: GFDI = 3.35 * WS * sqrt(1 + RH/100) * sqrt(10 - 0.25*(T - RH)) * (1 - exp(-0.0345*T))
 *
 * @param params Weather parameters
 * @returns GFDI value (0-150, typically)
 */
export function calculateGFDI(params: FDICalculationParams): number {
  const { temperature, humidity, windSpeed } = params;

  // GFDI formula components
  const moistureTerm = Math.sqrt(1 + humidity / 100);
  const tempDiffTerm = Math.sqrt(Math.max(0, 10 - 0.25 * (temperature - humidity)));
  const tempExponentialTerm = 1 - Math.exp(-0.0345 * temperature);

  const gfdi = 3.35 * windSpeed * moistureTerm * tempDiffTerm * tempExponentialTerm;

  // Clamp to reasonable bounds (0-150)
  return Math.max(0, Math.min(150, gfdi));
}

/**
 * Calculate a generalized Fire Danger Index suitable for training scenarios.
 *
 * This uses the FFDI formula as it is more widely recognized and applicable
 * across various vegetation types. For grass-specific scenarios, GFDI could
 * be used instead (see calculateGFDI).
 *
 * @param params Weather and drought parameters
 * @returns FDI value rounded to 1 decimal place
 */
export function calculateFireDangerIndex(params: FDICalculationParams): number {
  const fdi = calculateFFDI(params);
  return Math.round(fdi * 10) / 10; // Round to 1 decimal place
}

/**
 * Determine the fire danger rating category for a given FDI value.
 *
 * @param fdi Fire Danger Index value
 * @returns The corresponding fire danger rating category
 */
export function getFDIRating(fdi: number): FireDangerRating {
  if (fdi >= FDI_THRESHOLDS.catastrophic.min) return 'catastrophic';
  if (fdi >= FDI_THRESHOLDS.extreme.min) return 'extreme';
  if (fdi >= FDI_THRESHOLDS.severe.min) return 'severe';
  if (fdi >= FDI_THRESHOLDS.veryHigh.min) return 'veryHigh';
  if (fdi >= FDI_THRESHOLDS.high.min) return 'high';
  return 'moderate';
}

/**
 * Get the typical weather profile for a given fire danger rating.
 *
 * @param rating Fire danger rating category
 * @returns Weather parameters typically associated with that rating
 */
export function getWeatherProfileForRating(rating: FireDangerRating): WeatherProfile {
  return { ...RATING_WEATHER_PROFILES[rating] };
}

/**
 * Get a representative FDI value for a fire danger rating (midpoint of range).
 *
 * @param rating Fire danger rating category
 * @returns A typical FDI value for that rating
 */
export function getTypicalFDIForRating(rating: FireDangerRating): number {
  const { min, max } = FDI_THRESHOLDS[rating];
  // For catastrophic, use 110 as representative rather than midpoint to avoid extreme values
  if (rating === 'catastrophic') return 110;
  return Math.round((min + max) / 2);
}

/**
 * Calculate weather parameters that would produce a target FDI value.
 *
 * This uses an iterative approach starting from a rating's typical profile
 * and adjusting temperature to reach the target FDI.
 *
 * @param targetFDI Desired FDI value
 * @returns Weather parameters that approximate the target FDI
 */
export function getWeatherForFDI(targetFDI: number): WeatherProfile {
  // Start with the profile for the target FDI's rating
  const rating = getFDIRating(targetFDI);
  const baseProfile = getWeatherProfileForRating(rating);

  // If the target is close to the typical FDI for this rating, use the base profile
  const baseFDI = calculateFireDangerIndex(baseProfile);
  if (Math.abs(baseFDI - targetFDI) < 2) {
    return baseProfile;
  }

  // Adjust temperature to reach target FDI (simple linear adjustment)
  // Temperature has coefficient 0.0338 in FFDI formula
  const fdiDiff = targetFDI - baseFDI;
  const tempAdjustment = fdiDiff * 2; // Approximate adjustment factor

  return {
    ...baseProfile,
    temperature: Math.max(5, Math.min(50, baseProfile.temperature + tempAdjustment)),
  };
}

/**
 * Validate that weather parameters are physically plausible.
 *
 * @param params Weather parameters to validate
 * @returns Array of warning messages (empty if valid)
 */
export function validateWeatherParameters(params: FDICalculationParams): string[] {
  const warnings: string[] = [];

  // Check for physically unlikely combinations
  if (params.temperature < 15 && params.humidity < 20) {
    warnings.push('Very low humidity with low temperature is uncommon');
  }

  if (params.temperature > 40 && params.humidity > 50) {
    warnings.push('High humidity with extreme temperature is unusual');
  }

  if (params.windSpeed > 80) {
    warnings.push('Wind speeds above 80 km/h represent severe storm conditions');
  }

  // Check for parameter consistency with calculated FDI
  const fdi = calculateFireDangerIndex(params);
  const rating = getFDIRating(fdi);

  if (rating === 'catastrophic' && params.windSpeed < 30) {
    warnings.push('Catastrophic fire danger with calm winds is highly improbable');
  }

  if (rating === 'moderate' && (params.temperature > 38 || params.windSpeed > 60)) {
    warnings.push('Moderate fire danger with extreme conditions is contradictory');
  }

  return warnings;
}

/**
 * Format fire danger rating for display (converts camelCase to Title Case).
 *
 * @param rating Fire danger rating category
 * @returns Formatted rating name
 */
export function formatRating(rating: FireDangerRating): string {
  const ratingMap: Record<FireDangerRating, string> = {
    moderate: 'Moderate',
    high: 'High',
    veryHigh: 'Very High',
    severe: 'Severe',
    extreme: 'Extreme',
    catastrophic: 'Catastrophic',
  };
  return ratingMap[rating];
}

/**
 * Get a color code for a fire danger rating (for UI styling).
 * Based on AFDRS standard colors.
 *
 * @param rating Fire danger rating category
 * @returns Hex color code
 */
export function getRatingColor(rating: FireDangerRating): string {
  const colorMap: Record<FireDangerRating, string> = {
    moderate: '#0066cc', // Blue
    high: '#ffaa00', // Orange
    veryHigh: '#ff6600', // Dark orange
    severe: '#cc0000', // Red
    extreme: '#990000', // Dark red
    catastrophic: '#660000', // Very dark red / maroon
  };
  return colorMap[rating];
}
