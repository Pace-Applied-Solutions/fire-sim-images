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
 * Default map center coordinates for NSW, Australia.
 * Approximately centered on NSW with good coverage of fire-prone areas.
 */
export const DEFAULT_CENTER: [number, number] = [150.5, -33.8];

/**
 * Default zoom level for initial map view.
 * Zoom 10 provides a regional overview suitable for scenario creation.
 */
export const DEFAULT_ZOOM = 10;

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
