/**
 * Mapbox Configuration
 *
 * Manages Mapbox access token configuration with environment variable support.
 * Provides centralized token management for map tiles and services.
 */

/**
 * Retrieves the Mapbox access token from environment variables.
 *
 * Supports VITE_MAPBOX_TOKEN for consistent naming with the master plan.
 * Returns undefined if no token is configured.
 */
export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

/**
 * Default map center coordinates for Australia.
 * Starts wide so users briefly see the national context before zooming in.
 */
export const DEFAULT_CENTER: [number, number] = [134.489563, -25.734968];

/**
 * Default zoom level for initial map view.
 * Zoom 3.5 fits the Australian continent in view.
 */
export const DEFAULT_ZOOM = 3.5;

/**
 * Mapbox style URL for custom fire simulation view.
 * Uses a custom style with optimized colors and visibility for fire scenarios.
 */
export const MAPBOX_STYLE = 'mapbox://styles/richardbt/cmf7esv62000n01qw0khz891t';

/**
 * Maximum pitch angle for 3D terrain views (degrees).
 * 85° provides dramatic 3D perspective while maintaining usability.
 */
export const MAX_PITCH = 85;

/**
 * Terrain exaggeration factor for 3D visualization.
 * 1.5x makes topographic features more visible and dramatic.
 */
export const TERRAIN_EXAGGERATION = 1.5;
