/**
 * Utility functions for capturing map screenshots from different viewpoints.
 * These screenshots are used as reference images for AI generation to ensure
 * terrain consistency across all generated views.
 */

import type { Map as MapboxMap } from 'mapbox-gl';
import type { ViewPoint } from '@fire-sim/shared';

export interface ViewpointCamera {
  center: [number, number];
  bearing: number;
  pitch: number;
  zoom: number;
}

/**
 * Calculate camera position for a viewpoint given a center point.
 * This mirrors the logic in MapContainer's flyToViewpoint function.
 */
export function calculateViewpointCamera(
  center: [number, number],
  viewpoint: ViewPoint,
  baseZoom: number = 15
): ViewpointCamera {
  const [lng, lat] = center;

  switch (viewpoint) {
    // Helicopter views (elevated, 60° pitch)
    case 'helicopter_north':
      return {
        center: [lng, lat - 0.01],
        bearing: 180,
        pitch: 60,
        zoom: baseZoom - 1,
      };
    case 'helicopter_south':
      return {
        center: [lng, lat + 0.01],
        bearing: 0,
        pitch: 60,
        zoom: baseZoom - 1,
      };
    case 'helicopter_east':
      return {
        center: [lng + 0.01, lat],
        bearing: 270,
        pitch: 60,
        zoom: baseZoom - 1,
      };
    case 'helicopter_west':
      return {
        center: [lng - 0.01, lat],
        bearing: 90,
        pitch: 60,
        zoom: baseZoom - 1,
      };
    case 'helicopter_above':
      return {
        center: [lng, lat],
        bearing: 0,
        pitch: 30,
        zoom: baseZoom - 1,
      };

    // Ground views (ground-level, 85° pitch)
    case 'ground_north':
      return {
        center: [lng, lat - 0.003],
        bearing: 180,
        pitch: 85,
        zoom: baseZoom + 1.5,
      };
    case 'ground_south':
      return {
        center: [lng, lat + 0.003],
        bearing: 0,
        pitch: 85,
        zoom: baseZoom + 1.5,
      };
    case 'ground_east':
      return {
        center: [lng + 0.003, lat],
        bearing: 270,
        pitch: 85,
        zoom: baseZoom + 1.5,
      };
    case 'ground_west':
      return {
        center: [lng - 0.003, lat],
        bearing: 90,
        pitch: 85,
        zoom: baseZoom + 1.5,
      };
    case 'ground_above':
      return {
        center: [lng, lat],
        bearing: 0,
        pitch: 0,
        zoom: baseZoom + 1,
      };

    // Legacy views
    case 'aerial':
      return {
        center: [lng, lat],
        bearing: 0,
        pitch: 0,
        zoom: baseZoom,
      };
    case 'ridge':
      return {
        center: [lng - 0.005, lat],
        bearing: 90,
        pitch: 70,
        zoom: baseZoom,
      };

    default:
      return {
        center: [lng, lat],
        bearing: 0,
        pitch: 0,
        zoom: baseZoom,
      };
  }
}

/**
 * Capture a screenshot from the map at a specific viewpoint.
 * Returns a base64-encoded PNG data URL.
 */
export async function captureViewpointScreenshot(
  map: MapboxMap,
  viewpoint: ViewPoint,
  center: [number, number]
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const camera = calculateViewpointCamera(center, viewpoint);

      // Jump to the viewpoint (no animation for screenshot)
      map.jumpTo({
        center: camera.center,
        bearing: camera.bearing,
        pitch: camera.pitch,
        zoom: camera.zoom,
      });

      // Wait for map to render at new position
      map.once('idle', () => {
        try {
          const canvas = map.getCanvas();
          const dataURL = canvas.toDataURL('image/png');
          resolve(dataURL);
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Capture screenshots for all requested viewpoints.
 * Returns a map of viewpoint to base64-encoded PNG data URL.
 */
export async function captureAllViewpointScreenshots(
  map: MapboxMap,
  viewpoints: ViewPoint[],
  center: [number, number]
): Promise<Record<ViewPoint, string>> {
  const screenshots: Partial<Record<ViewPoint, string>> = {};

  for (const viewpoint of viewpoints) {
    try {
      const screenshot = await captureViewpointScreenshot(map, viewpoint, center);
      screenshots[viewpoint] = screenshot;

      // Small delay between captures to ensure map finishes rendering
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Failed to capture screenshot for ${viewpoint}:`, error);
      // Continue with other viewpoints even if one fails
    }
  }

  return screenshots as Record<ViewPoint, string>;
}
