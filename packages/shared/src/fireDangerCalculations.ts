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
  moderate: {
    temperature: 22,
    humidity: 50,
    windSpeed: 12,
  },
  high: {
    temperature: 28,
    humidity: 30,
    windSpeed: 25,
  },
  veryHigh: {
    temperature: 35,
    humidity: 20,
    windSpeed: 40,
  },
  severe: {
    temperature: 40,
    humidity: 12,
    windSpeed: 60,
  },
  extreme: {
    temperature: 43,
    humidity: 8,
    windSpeed: 80,
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
    moderate: {
      flameHeight: { min: 1, max: 2 },
      rateOfSpread: { min: 0.5, max: 1 },
      spottingDistance: '<100 m',
      intensity: 'low',
      descriptor: 'Controlled fire with 1-2m flames, light smoke, minimal spotting',
    },
    high: {
      flameHeight: { min: 2, max: 4 },
      rateOfSpread: { min: 1, max: 2 },
      spottingDistance: '100-200 m',
      intensity: 'moderate',
      descriptor: 'Active fire with 2-4m flames, moderate smoke column, some ember activity',
    },
    veryHigh: {
      flameHeight: { min: 4, max: 8 },
      rateOfSpread: { min: 2, max: 4 },
      spottingDistance: '200-500 m',
      intensity: 'high',
      descriptor: 'Intense fire with 4-8m flames, large smoke plume, active spotting ahead',
    },
    severe: {
      flameHeight: { min: 8, max: 15 },
      rateOfSpread: { min: 4, max: 6 },
      spottingDistance: '500-1000 m',
      intensity: 'veryHigh',
      descriptor:
        'Very intense fire with 8-15m towering flames, dense black smoke column, heavy spotting',
    },
    extreme: {
      flameHeight: { min: 15, max: 25 },
      rateOfSpread: { min: 6, max: 10 },
      spottingDistance: '1-2 km',
      intensity: 'extreme',
      descriptor:
        'Catastrophic fire with 15-25m flames, pyrocumulonimbus development, extreme spotting and fire whirls',
    },
    catastrophic: {
      flameHeight: { min: 25, max: 40 },
      rateOfSpread: { min: 10, max: 20 },
      spottingDistance: '2+ km',
      intensity: 'extreme',
      descriptor:
        'Unprecedented fire intensity with 25+ meter flames, fire-generated weather, massive fire front',
    },
  },
  Grassland: {
    moderate: {
      flameHeight: { min: 0.5, max: 1 },
      rateOfSpread: { min: 2, max: 4 },
      spottingDistance: 'Minimal',
      intensity: 'low',
      descriptor: 'Fast-moving grass fire with low flames, light smoke',
    },
    high: {
      flameHeight: { min: 1, max: 2 },
      rateOfSpread: { min: 4, max: 8 },
      spottingDistance: '<50 m',
      intensity: 'moderate',
      descriptor: 'Rapid grass fire with 1-2m flames, moderate smoke, short-range spotting',
    },
    veryHigh: {
      flameHeight: { min: 2, max: 3 },
      rateOfSpread: { min: 8, max: 15 },
      spottingDistance: '50-100 m',
      intensity: 'high',
      descriptor: 'Very rapid grass fire with 2-3m flames, active spotting',
    },
    severe: {
      flameHeight: { min: 3, max: 5 },
      rateOfSpread: { min: 15, max: 25 },
      spottingDistance: '100-200 m',
      intensity: 'veryHigh',
      descriptor: 'Extremely rapid grass fire with 3-5m flames, heavy ember showers',
    },
    extreme: {
      flameHeight: { min: 5, max: 8 },
      rateOfSpread: { min: 25, max: 40 },
      spottingDistance: '200-500 m',
      intensity: 'extreme',
      descriptor: 'Explosive grass fire spread with 5-8m flames, extreme spotting',
    },
    catastrophic: {
      flameHeight: { min: 8, max: 12 },
      rateOfSpread: { min: 40, max: 60 },
      spottingDistance: '500+ m',
      intensity: 'extreme',
      descriptor: 'Catastrophic grass fire with 8+ meter flames, near-instantaneous spread',
    },
  },
  Heath: {
    moderate: {
      flameHeight: { min: 1, max: 1.5 },
      rateOfSpread: { min: 0.3, max: 0.8 },
      spottingDistance: 'Minimal',
      intensity: 'low',
      descriptor: 'Slow-burning heath fire with 1-1.5m flames',
    },
    high: {
      flameHeight: { min: 1.5, max: 3 },
      rateOfSpread: { min: 0.8, max: 1.5 },
      spottingDistance: '50-100 m',
      intensity: 'moderate',
      descriptor: 'Active heath fire with 1.5-3m flames, moderate spotting',
    },
    veryHigh: {
      flameHeight: { min: 3, max: 6 },
      rateOfSpread: { min: 1.5, max: 3 },
      spottingDistance: '100-300 m',
      intensity: 'high',
      descriptor: 'Intense heath fire with 3-6m flames, active ember activity',
    },
    severe: {
      flameHeight: { min: 6, max: 10 },
      rateOfSpread: { min: 3, max: 5 },
      spottingDistance: '300-700 m',
      intensity: 'veryHigh',
      descriptor: 'Very intense heath fire with 6-10m flames, heavy spotting',
    },
    extreme: {
      flameHeight: { min: 10, max: 18 },
      rateOfSpread: { min: 5, max: 8 },
      spottingDistance: '700-1500 m',
      intensity: 'extreme',
      descriptor: 'Extreme heath fire with 10-18m flames, massive ember storms',
    },
    catastrophic: {
      flameHeight: { min: 18, max: 25 },
      rateOfSpread: { min: 8, max: 12 },
      spottingDistance: '1500+ m',
      intensity: 'extreme',
      descriptor: 'Catastrophic heath fire with 18+ meter flames, extreme fire behaviour',
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

/**
 * Get the description text for a fire danger rating.
 *
 * @param rating Fire danger rating category
 * @returns Description of what the rating means
 */
export function getRatingDescription(rating: FireDangerRating): string {
  const descriptions: Record<FireDangerRating, string> = {
    moderate: 'Most fires can be controlled.',
    high: 'Fires can be dangerous.',
    veryHigh: 'Fires will be very dangerous and unpredictable.',
    severe: 'Fires will be extremely dangerous and spread quickly.',
    extreme: 'Fires will be uncontrollable, unpredictable and extremely dangerous.',
    catastrophic: 'If a fire starts and takes hold, lives are likely to be lost.',
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
