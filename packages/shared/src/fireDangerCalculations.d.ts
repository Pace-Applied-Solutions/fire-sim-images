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
    flameHeight: {
        min: number;
        max: number;
    };
    rateOfSpread: {
        min: number;
        max: number;
    };
    spottingDistance: string;
    intensity: 'low' | 'moderate' | 'high' | 'veryHigh' | 'extreme';
    descriptor: string;
}
/**
 * Typical weather profiles for each AFDRS rating level.
 * These represent common conditions associated with each rating.
 */
export declare const RATING_WEATHER_PROFILES: Record<FireDangerRating, WeatherProfile>;
/**
 * Fire behaviour characteristics by vegetation type and rating.
 * Based on published fire behaviour research and operational guidelines.
 */
export declare const FIRE_BEHAVIOUR_BY_VEGETATION: Record<string, Record<FireDangerRating, FireBehaviour>>;
/**
 * Get the typical weather profile for a given fire danger rating.
 *
 * @param rating Fire danger rating category
 * @returns Weather parameters typically associated with that rating
 */
export declare function getWeatherProfileForRating(rating: FireDangerRating): WeatherProfile;
/**
 * Get fire behaviour characteristics for a given rating and vegetation type.
 *
 * @param rating Fire danger rating category
 * @param vegetationType Vegetation classification
 * @returns Fire behaviour characteristics
 */
export declare function getFireBehaviour(rating: FireDangerRating, vegetationType: string): FireBehaviour;
/**
 * Format fire danger rating for display (converts camelCase to Title Case).
 *
 * @param rating Fire danger rating category
 * @returns Formatted rating name
 */
export declare function formatRating(rating: FireDangerRating): string;
/**
 * Get a color code for a fire danger rating (for UI styling).
 * Based on official AFDRS standard colors.
 *
 * Reference: https://afdrs.com.au/
 *
 * @param rating Fire danger rating category
 * @returns Hex color code
 */
export declare function getRatingColor(rating: FireDangerRating): string;
/**
 * Get the description text for a fire danger rating.
 * Based on official AFDRS messaging.
 *
 * Reference: https://afdrs.com.au/
 *
 * @param rating Fire danger rating category
 * @returns Description of what the rating means
 */
export declare function getRatingDescription(rating: FireDangerRating): string;
/**
 * Validate that weather parameters are plausible for the scenario.
 *
 * @param params Weather parameters to validate
 * @returns Array of warning messages (empty if valid)
 */
export declare function validateWeatherParameters(params: {
    temperature: number;
    humidity: number;
    windSpeed: number;
}): string[];
//# sourceMappingURL=fireDangerCalculations.d.ts.map