/**
 * Fire Danger Rating and Behaviour Characteristics
 *
 * This module implements the Australian Fire Danger Rating System (AFDRS)
 * and provides fire behaviour characteristics for different vegetation types.
 *
 * References:
 * - Bureau of Meteorology - Australian Fire Danger Rating System
 * - AFAC (Australasian Fire and Emergency Services Authorities Council)
 * - Cheney, P., & Sullivan, A. (2008). Grassfires: Fuel, Weather and Fire Behaviour.
 * - Cruz, M.G., & Alexander, M.E. (2013). Fire rates of spread predictions.
 */

import type { FireDangerRating } from './types';

/**
 * Weather profile representing typical conditions for a fire danger rating
 */
export interface WeatherProfile {
  temperature: number;
  humidity: number;
  windSpeed: number;
}

/**
 * Fire behaviour characteristics for a given rating and vegetation type
 */
export interface FireBehaviour {
  flameHeight: { min: number; max: number }; // meters
  rateOfSpread: { min: number; max: number }; // km/h
  spottingDistance: string; // descriptive range
  intensity: 'low' | 'moderate' | 'high' | 'veryHigh' | 'extreme';
  descriptor: string; // qualitative description for prompts
}

/**
 * Typical weather profiles for each AFDRS rating level.
 * These represent common conditions associated with each rating.
 */
export const RATING_WEATHER_PROFILES: Record<FireDangerRating, WeatherProfile> = {
  noRating: {
    temperature: 18,
    humidity: 60,
    windSpeed: 8,
  },
  moderate: {
    temperature: 25,
    humidity: 40,
    windSpeed: 15,
  },
  high: {
    temperature: 32,
    humidity: 25,
    windSpeed: 35,
  },
  extreme: {
    temperature: 40,
    humidity: 10,
    windSpeed: 70,
  },
  catastrophic: {
    temperature: 46,
    humidity: 5,
    windSpeed: 100,
  },
};

/**
 * Fire behaviour characteristics by vegetation type and rating.
 * Based on published fire behaviour research and operational guidelines.
 */
export const FIRE_BEHAVIOUR_BY_VEGETATION: Record<
  string,
  Record<FireDangerRating, FireBehaviour>
> = {
  'Dry Sclerophyll Forest': {
    noRating: {
      flameHeight: { min: 0.5, max: 1 },
      rateOfSpread: { min: 0.2, max: 0.5 },
      spottingDistance: 'Minimal',
      intensity: 'low',
      descriptor: 'Very low intensity fire with minimal flames and smoke',
    },
    moderate: {
      flameHeight: { min: 1, max: 3 },
      rateOfSpread: { min: 0.5, max: 1.5 },
      spottingDistance: '<100 m',
      intensity: 'low',
      descriptor: 'Controlled fire with 1-3m flames, light smoke, minimal spotting',
    },
    high: {
      flameHeight: { min: 3, max: 8 },
      rateOfSpread: { min: 1.5, max: 4 },
      spottingDistance: '100-500 m',
      intensity: 'moderate',
      descriptor: 'Active fire with 3-8m flames, moderate smoke column, some ember activity',
    },
    extreme: {
      flameHeight: { min: 8, max: 20 },
      rateOfSpread: { min: 4, max: 10 },
      spottingDistance: '500-2000 m',
      intensity: 'veryHigh',
      descriptor:
        'Very intense fire with 8-20m towering flames, dense black smoke column, heavy spotting',
    },
    catastrophic: {
      flameHeight: { min: 20, max: 40 },
      rateOfSpread: { min: 10, max: 20 },
      spottingDistance: '2+ km',
      intensity: 'extreme',
      descriptor:
        'Catastrophic fire intensity with 20+ meter flames, pyrocumulonimbus development, extreme spotting and fire whirls',
    },
  },
  Grassland: {
    noRating: {
      flameHeight: { min: 0.3, max: 0.5 },
      rateOfSpread: { min: 1, max: 2 },
      spottingDistance: 'Minimal',
      intensity: 'low',
      descriptor: 'Slow grass fire with low flames, light smoke',
    },
    moderate: {
      flameHeight: { min: 0.5, max: 1.5 },
      rateOfSpread: { min: 2, max: 6 },
      spottingDistance: 'Minimal',
      intensity: 'low',
      descriptor: 'Fast-moving grass fire with low flames, light smoke',
    },
    high: {
      flameHeight: { min: 1.5, max: 3 },
      rateOfSpread: { min: 6, max: 15 },
      spottingDistance: '50-100 m',
      intensity: 'moderate',
      descriptor: 'Rapid grass fire with 1.5-3m flames, moderate smoke, short-range spotting',
    },
    extreme: {
      flameHeight: { min: 3, max: 8 },
      rateOfSpread: { min: 15, max: 35 },
      spottingDistance: '100-500 m',
      intensity: 'veryHigh',
      descriptor: 'Extremely rapid grass fire with 3-8m flames, heavy ember showers',
    },
    catastrophic: {
      flameHeight: { min: 8, max: 12 },
      rateOfSpread: { min: 35, max: 60 },
      spottingDistance: '500+ m',
      intensity: 'extreme',
      descriptor: 'Catastrophic grass fire with 8+ meter flames, near-instantaneous spread',
    },
  },
  Heath: {
    noRating: {
      flameHeight: { min: 0.5, max: 1 },
      rateOfSpread: { min: 0.2, max: 0.5 },
      spottingDistance: 'Minimal',
      intensity: 'low',
      descriptor: 'Very slow-burning heath fire with minimal flames',
    },
    moderate: {
      flameHeight: { min: 1, max: 2 },
      rateOfSpread: { min: 0.5, max: 1.2 },
      spottingDistance: 'Minimal',
      intensity: 'low',
      descriptor: 'Slow-burning heath fire with 1-2m flames',
    },
    high: {
      flameHeight: { min: 2, max: 6 },
      rateOfSpread: { min: 1.2, max: 3 },
      spottingDistance: '50-300 m',
      intensity: 'moderate',
      descriptor: 'Active heath fire with 2-6m flames, moderate spotting',
    },
    extreme: {
      flameHeight: { min: 6, max: 15 },
      rateOfSpread: { min: 3, max: 7 },
      spottingDistance: '300-1500 m',
      intensity: 'veryHigh',
      descriptor: 'Very intense heath fire with 6-15m flames, heavy spotting and ember storms',
    },
    catastrophic: {
      flameHeight: { min: 15, max: 25 },
      rateOfSpread: { min: 7, max: 12 },
      spottingDistance: '1500+ m',
      intensity: 'extreme',
      descriptor: 'Catastrophic heath fire with 15+ meter flames, extreme fire behaviour',
    },
  },
};

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
 * Get fire behaviour characteristics for a given rating and vegetation type.
 *
 * @param rating Fire danger rating category
 * @param vegetationType Vegetation classification
 * @returns Fire behaviour characteristics
 */
export function getFireBehaviour(
  rating: FireDangerRating,
  vegetationType: string
): FireBehaviour {
  // Try exact match first
  if (FIRE_BEHAVIOUR_BY_VEGETATION[vegetationType]) {
    return FIRE_BEHAVIOUR_BY_VEGETATION[vegetationType][rating];
  }

  // Fall back to similar vegetation types
  if (vegetationType.includes('Forest') || vegetationType.includes('Woodland')) {
    return FIRE_BEHAVIOUR_BY_VEGETATION['Dry Sclerophyll Forest'][rating];
  }
  if (vegetationType.includes('Grass')) {
    return FIRE_BEHAVIOUR_BY_VEGETATION['Grassland'][rating];
  }
  if (vegetationType.includes('Heath') || vegetationType.includes('Scrub')) {
    return FIRE_BEHAVIOUR_BY_VEGETATION['Heath'][rating];
  }

  // Default fallback to dry forest
  return FIRE_BEHAVIOUR_BY_VEGETATION['Dry Sclerophyll Forest'][rating];
}

/**
 * Format fire danger rating for display (converts camelCase to Title Case).
 *
 * @param rating Fire danger rating category
 * @returns Formatted rating name
 */
export function formatRating(rating: FireDangerRating): string {
  const ratingMap: Record<FireDangerRating, string> = {
    noRating: 'No Rating',
    moderate: 'Moderate',
    high: 'High',
    extreme: 'Extreme',
    catastrophic: 'Catastrophic',
  };
  return ratingMap[rating];
}

/**
 * Get a color code for a fire danger rating (for UI styling).
 * Based on official AFDRS standard colors.
 *
 * Reference: https://afdrs.com.au/
 *
 * @param rating Fire danger rating category
 * @returns Hex color code
 */
export function getRatingColor(rating: FireDangerRating): string {
  const colorMap: Record<FireDangerRating, string> = {
    noRating: '#ffffff', // White
    moderate: '#22c55e', // Green
    high: '#eab308', // Yellow
    extreme: '#f97316', // Orange
    catastrophic: '#dc2626', // Red
  };
  return colorMap[rating];
}

/**
 * Get the description text for a fire danger rating.
 * Based on official AFDRS messaging.
 *
 * Reference: https://afdrs.com.au/
 *
 * @param rating Fire danger rating category
 * @returns Description of what the rating means
 */
export function getRatingDescription(rating: FireDangerRating): string {
  const descriptions: Record<FireDangerRating, string> = {
    noRating: 'Minimal fire danger. No special action required.',
    moderate: 'Plan and prepare. Most fires can be controlled.',
    high: 'Be ready to act. Fires can be dangerous.',
    extreme: 'Take action now to protect your life and property.',
    catastrophic: 'For your survival, leave bushfire risk areas.',
  };
  return descriptions[rating];
}

/**
 * Validate that weather parameters are plausible for the scenario.
 *
 * @param params Weather parameters to validate
 * @returns Array of warning messages (empty if valid)
 */
export function validateWeatherParameters(params: {
  temperature: number;
  humidity: number;
  windSpeed: number;
}): string[] {
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

  return warnings;
}
