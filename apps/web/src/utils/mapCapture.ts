/**
 * Utility for programmatically capturing Mapbox map screenshots from specific viewpoints.
 * Used to generate terrain reference images for AI image generation.
 */
import type { Map as MapboxMap } from 'mapbox-gl';
import type { ViewPoint } from '@fire-sim/shared';

interface PerimeterInfo {
  centroid: [number, number]; // [lng, lat]
  bbox: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
}

interface CameraParams {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
}

/**
 * Calculate camera parameters for a given viewpoint relative to a fire perimeter.
 */
function getCameraForViewpoint(viewpoint: ViewPoint, info: PerimeterInfo): CameraParams {
  const [centerLng, centerLat] = info.centroid;
  const [minLng, minLat, maxLng, maxLat] = info.bbox;

  const lngDiff = maxLng - minLng;
  const latDiff = maxLat - minLat;
  const maxDiff = Math.max(lngDiff, latDiff);
  const baseZoom = 14 - Math.log2(maxDiff * 100);

  let bearing = 0;
  let pitch = 0;
  let zoom = baseZoom - 1;
  let center: [number, number] = [centerLng, centerLat];

  switch (viewpoint) {
    case 'helicopter_north':
      bearing = 180;
      pitch = 60;
      zoom = baseZoom - 1;
      center = [centerLng, centerLat - maxDiff * 0.8];
      break;
    case 'helicopter_south':
      bearing = 0;
      pitch = 60;
      zoom = baseZoom - 1;
      center = [centerLng, centerLat + maxDiff * 0.8];
      break;
    case 'helicopter_east':
      bearing = 270;
      pitch = 60;
      zoom = baseZoom - 1;
      center = [centerLng + maxDiff * 0.8, centerLat];
      break;
    case 'helicopter_west':
      bearing = 90;
      pitch = 60;
      zoom = baseZoom - 1;
      center = [centerLng - maxDiff * 0.8, centerLat];
      break;
    case 'helicopter_above':
      bearing = 0;
      pitch = 30;
      zoom = baseZoom - 1;
      center = [centerLng, centerLat];
      break;
    case 'ground_north':
      bearing = 180;
      pitch = 85;
      zoom = baseZoom + 1.5;
      center = [centerLng, centerLat - maxDiff * 0.35];
      break;
    case 'ground_south':
      bearing = 0;
      pitch = 85;
      zoom = baseZoom + 1.5;
      center = [centerLng, centerLat + maxDiff * 0.35];
      break;
    case 'ground_east':
      bearing = 270;
      pitch = 85;
      zoom = baseZoom + 1.5;
      center = [centerLng + maxDiff * 0.35, centerLat];
      break;
    case 'ground_west':
      bearing = 90;
      pitch = 85;
      zoom = baseZoom + 1.5;
      center = [centerLng - maxDiff * 0.35, centerLat];
      break;
    case 'ground_above':
      bearing = 0;
      pitch = 0;
      zoom = baseZoom + 1;
      center = [centerLng, centerLat];
      break;
    case 'aerial':
      bearing = 0;
      pitch = 0;
      zoom = baseZoom - 1;
      center = [centerLng, centerLat];
      break;
    case 'ridge':
      bearing = 0;
      pitch = 70;
      zoom = baseZoom;
      center = [centerLng, centerLat - maxDiff * 0.5];
      break;
  }

  return { center, zoom, bearing, pitch };
}

/**
 * Wait for the map to reach an idle state after a camera move.
 * Times out after maxWaitMs to avoid hanging.
 */
function waitForMapIdle(map: MapboxMap, maxWaitMs = 5000): Promise<void> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve();
    }, maxWaitMs);

    map.once('idle', () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

/**
 * Capture a screenshot of the map canvas as a JPEG data URL.
 * Uses JPEG at 0.8 quality to keep payloads small (~100-150KB per screenshot).
 */
function captureCanvas(map: MapboxMap): string {
  const canvas = map.getCanvas();
  return canvas.toDataURL('image/jpeg', 0.8);
}

/**
 * Capture map screenshots for each requested viewpoint.
 * Moves the camera to each viewpoint, waits for tiles to load, and captures.
 *
 * @param map - The Mapbox GL map instance
 * @param perimeterInfo - Centroid and bounding box of the fire perimeter
 * @param viewpoints - Array of viewpoints to capture
 * @param onProgress - Optional callback for progress updates
 * @returns Record mapping viewpoint to base64 JPEG data URL
 */
export async function captureViewpointScreenshots(
  map: MapboxMap,
  perimeterInfo: PerimeterInfo,
  viewpoints: ViewPoint[],
  onProgress?: (current: number, total: number, viewpoint: ViewPoint) => void
): Promise<Record<string, string>> {
  const screenshots: Record<string, string> = {};

  // Save current camera position to restore later
  const savedCamera = {
    center: map.getCenter().toArray() as [number, number],
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
  };

  for (let i = 0; i < viewpoints.length; i++) {
    const viewpoint = viewpoints[i];
    onProgress?.(i + 1, viewpoints.length, viewpoint);

    const camera = getCameraForViewpoint(viewpoint, perimeterInfo);

    // Jump immediately (no animation) for speed
    map.jumpTo({
      center: camera.center,
      zoom: camera.zoom,
      bearing: camera.bearing,
      pitch: camera.pitch,
    });

    // Wait for tiles and terrain to load
    await waitForMapIdle(map, 6000);

    // Capture the screenshot
    const dataUrl = captureCanvas(map);
    screenshots[viewpoint] = dataUrl;
  }

  // Restore original camera position
  map.jumpTo({
    center: savedCamera.center,
    zoom: savedCamera.zoom,
    bearing: savedCamera.bearing,
    pitch: savedCamera.pitch,
  });

  return screenshots;
}

/**
 * Capture a vegetation overlay screenshot from the NSW SVTM WMS layer.
 *
 * Temporarily toggles the 'nsw-vegetation-layer' on, moves the camera
 * to a flat aerial (top-down) view centered on the fire perimeter, waits
 * for WMS tiles to load, captures the canvas, then restores the original
 * state.
 *
 * @param map - The Mapbox GL map instance
 * @param perimeterInfo - Centroid and bounding box of the fire perimeter
 * @returns Base64 JPEG data URL of the vegetation overlay, or null if layer unavailable
 */
export async function captureVegetationScreenshot(
  map: MapboxMap,
  perimeterInfo: PerimeterInfo
): Promise<string | null> {
  // Check the vegetation layer exists
  if (!map.getLayer('nvis-vegetation-layer')) {
    console.warn('NVIS vegetation layer not found — skipping vegetation capture');
    return null;
  }

  // Save current state
  const savedCamera = {
    center: map.getCenter().toArray() as [number, number],
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
  };
  const wasVisible = map.getLayoutProperty('nvis-vegetation-layer', 'visibility') === 'visible';

  // Turn vegetation layer ON
  map.setLayoutProperty('nvis-vegetation-layer', 'visibility', 'visible');

  // Move to flat aerial view showing the full perimeter with buffer
  const [centerLng, centerLat] = perimeterInfo.centroid;
  const [minLng, minLat, maxLng, maxLat] = perimeterInfo.bbox;
  const lngDiff = maxLng - minLng;
  const latDiff = maxLat - minLat;
  const maxDiff = Math.max(lngDiff, latDiff);
  // Zoom out a bit more than the terrain views so the vegetation context
  // covers a wider area around the fire
  const vegZoom = 14 - Math.log2(maxDiff * 100) - 2;

  map.jumpTo({
    center: [centerLng, centerLat],
    zoom: vegZoom,
    bearing: 0,
    pitch: 0, // Top-down
  });

  // Wait for WMS tiles to load (may be slower than Mapbox tiles)
  await waitForMapIdle(map, 8000);

  // Capture
  const dataUrl = captureCanvas(map);

  // Restore vegetation layer visibility
  if (!wasVisible) {
    map.setLayoutProperty('nvis-vegetation-layer', 'visibility', 'none');
  }

  // Restore camera
  map.jumpTo({
    center: savedCamera.center,
    zoom: savedCamera.zoom,
    bearing: savedCamera.bearing,
    pitch: savedCamera.pitch,
  });

  return dataUrl;
}
