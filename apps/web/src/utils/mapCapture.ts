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
 * Wait for the map to fully finish rendering tiles and terrain.
 * More robust than a single `idle` event — waits for tiles to load
 * and the map to stabilise before resolving.
 */
function waitForMapReady(map: MapboxMap, maxWaitMs = 8000): Promise<void> {
  return new Promise((resolve) => {
    // If already fully loaded, still allow one render cycle to settle
    const checkReady = () => map.loaded() && map.areTilesLoaded();

    if (checkReady()) {
      // Give one extra animation frame for the GPU to flush the render
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      return;
    }

    const timeout = setTimeout(() => {
      cleanup();
      resolve(); // Resolve even on timeout to avoid hanging
    }, maxWaitMs);

    const onIdle = () => {
      // After idle fires, verify tiles are loaded (idle can fire before source loads)
      if (checkReady()) {
        cleanup();
        // Extra frame buffer so the canvas pixel data has been flushed
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }
      // else: stay subscribed, another idle will fire once sources finish
    };

    map.on('idle', onIdle);

    function cleanup() {
      clearTimeout(timeout);
      map.off('idle', onIdle);
    }
  });
}

/**
 * Wait for any in-flight camera movement to complete before capturing.
 */
function waitForMovementEnd(map: MapboxMap, maxWaitMs = 4000): Promise<void> {
  return new Promise((resolve) => {
    if (!map.isMoving()) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      cleanup();
      resolve();
    }, maxWaitMs);

    const onMoveEnd = () => {
      cleanup();
      resolve();
    };

    map.once('moveend', onMoveEnd);

    function cleanup() {
      clearTimeout(timeout);
      map.off('moveend', onMoveEnd);
    }
  });
}

/**
 * Wait for a specific raster source to have loaded its tiles.
 * Useful for WMS layers like NVIS which can take longer than vector tiles.
 * Also resolves on source errors to avoid hanging when the WMS server is down.
 */
function waitForSourceLoaded(map: MapboxMap, sourceId: string, maxWaitMs = 12000): Promise<void> {
  return new Promise((resolve) => {
    if (map.isSourceLoaded(sourceId)) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      cleanup();
      resolve();
    }, maxWaitMs);

    const onSourceData = (e: { sourceId?: string; isSourceLoaded?: boolean }) => {
      if (e.sourceId === sourceId && map.isSourceLoaded(sourceId)) {
        cleanup();
        resolve();
      }
    };

    // Also resolve on source errors so we don't hang when WMS is down
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onError = (e: any) => {
      console.warn(
        `Map error during source '${sourceId}' load — proceeding with capture`,
        e?.error?.message
      );
      cleanup();
      resolve();
    };

    map.on('sourcedata', onSourceData);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map.on('error', onError as any);

    function cleanup() {
      clearTimeout(timeout);
      map.off('sourcedata', onSourceData);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.off('error', onError as any);
    }
  });
}

/**
 * Smoothly transition the map camera and wait for all tiles to render.
 * Uses `easeTo` for a polished feel, falls back to `jumpTo` if duration is 0.
 */
async function transitionAndCapture(
  map: MapboxMap,
  camera: CameraParams,
  durationMs = 800
): Promise<void> {
  if (durationMs > 0) {
    map.easeTo({
      center: camera.center,
      zoom: camera.zoom,
      bearing: camera.bearing,
      pitch: camera.pitch,
      duration: durationMs,
      easing: (t) => t * (2 - t), // ease-out quadratic
    });

    // Wait for the animation to complete
    await new Promise<void>((resolve) => {
      map.once('moveend', () => resolve());
      // Safety timeout
      setTimeout(resolve, durationMs + 500);
    });
  } else {
    map.jumpTo({
      center: camera.center,
      zoom: camera.zoom,
      bearing: camera.bearing,
      pitch: camera.pitch,
    });
  }

  // Wait for tiles and terrain to fully load after the camera settles
  await waitForMapReady(map, 8000);
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
 * Temporarily hides all MapboxDraw layers (polygon fills, outlines, vertices)
 * so that screenshots sent to the AI model show a clean landscape without the
 * fire perimeter overlay. The overlay would otherwise be reproduced as a red
 * outline in the generated image rather than replaced by realistic fire.
 *
 * @returns A restore function that shows the hidden layers again.
 */
function hideDrawLayers(map: MapboxMap): () => void {
  const hiddenLayers: string[] = [];
  try {
    const layers = map.getStyle()?.layers ?? [];
    for (const layer of layers) {
      if (layer.id.startsWith('gl-draw-')) {
        const visibility = map.getLayoutProperty(layer.id, 'visibility');
        // Only hide layers that are currently visible (default is 'visible' when not set)
        if (visibility !== 'none') {
          map.setLayoutProperty(layer.id, 'visibility', 'none');
          hiddenLayers.push(layer.id);
        }
      }
    }
  } catch (err) {
    console.warn('[mapCapture] Failed to hide draw layers:', err);
  }
  return () => {
    for (const layerId of hiddenLayers) {
      try {
        map.setLayoutProperty(layerId, 'visibility', 'visible');
      } catch (err) {
        console.warn(`[mapCapture] Failed to restore draw layer "${layerId}":`, err);
      }
    }
  };
}

/**
 * Waits for the next animation frame so that map style changes (such as
 * hiding/showing layers) take effect before a canvas capture.
 */
function waitForFrame(): Promise<void> {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

/**
 * Capture the current map view as-is (no camera repositioning).
 * Used to capture the user's manually positioned perspective view.
 * Draw layers are hidden before capture so the AI receives a clean landscape
 * image without the red fire perimeter overlay.
 */
export async function captureCurrentView(map: MapboxMap): Promise<string> {
  await waitForMovementEnd(map, 5000);
  await waitForMapReady(map, 5000);
  const restoreDrawLayers = hideDrawLayers(map);
  // Allow one render frame for the layer change to take effect before capture
  await waitForFrame();
  const dataUrl = captureCanvas(map);
  restoreDrawLayers();
  return dataUrl;
}

/**
 * Capture a top-down aerial overview screenshot centered on the fire perimeter.
 * Positions the camera straight down (pitch 0, bearing 0) with 10% padding.
 * Used as a fire extent reference for AI generation.
 */
export async function captureAerialOverview(
  map: MapboxMap,
  perimeterInfo: PerimeterInfo
): Promise<string> {
  // Save current camera position
  const savedCamera = {
    center: map.getCenter().toArray() as [number, number],
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
  };

  // Move to flat aerial view centered on fire perimeter with 10% padding
  const [minLng, minLat, maxLng, maxLat] = perimeterInfo.bbox;
  map.setBearing(0);
  map.setPitch(0);
  const canvas = map.getCanvas();
  const paddingX = Math.round(canvas.clientWidth * 0.1);
  const paddingY = Math.round(canvas.clientHeight * 0.1);

  map.fitBounds(
    [
      [minLng, minLat],
      [maxLng, maxLat],
    ],
    {
      padding: { top: paddingY, bottom: paddingY, left: paddingX, right: paddingX },
      duration: 0,
      maxZoom: 16,
    }
  );

  await waitForMovementEnd(map, 4000);
  await waitForMapReady(map, 8000);
  const restoreDrawLayers = hideDrawLayers(map);
  // Allow one render frame for the layer change to take effect before capture
  await waitForFrame();
  const dataUrl = captureCanvas(map);
  restoreDrawLayers();

  // Restore camera with smooth transition
  map.easeTo({
    center: savedCamera.center,
    zoom: savedCamera.zoom,
    bearing: savedCamera.bearing,
    pitch: savedCamera.pitch,
    duration: 400,
    easing: (t) => t * (2 - t),
  });

  return dataUrl;
}

/**
 * Capture map screenshots for each requested viewpoint.
 * Smoothly transitions the camera between viewpoints, waits for all tiles
 * and terrain to render, then captures.
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

    // Use smooth transition for a polished sequence (shorter for first move)
    const duration = i === 0 ? 400 : 800;
    await transitionAndCapture(map, camera, duration);

    // Hide draw layers so the AI receives a clean landscape without red polygon overlay
    const restoreDrawLayers = hideDrawLayers(map);
    // Allow one render frame for the layer change to take effect before capture
    await waitForFrame();
    // Capture the screenshot
    const dataUrl = captureCanvas(map);
    restoreDrawLayers();
    screenshots[viewpoint] = dataUrl;
  }

  // Restore original camera position with a smooth transition
  map.easeTo({
    center: savedCamera.center,
    zoom: savedCamera.zoom,
    bearing: savedCamera.bearing,
    pitch: savedCamera.pitch,
    duration: 600,
    easing: (t) => t * (2 - t),
  });

  return screenshots;
}

/**
 * Capture a vegetation overlay screenshot from the NVIS WMS layer.
 *
 * Temporarily toggles the 'nvis-vegetation-layer' on, moves the camera
 * to a flat aerial (top-down) view centered on the fire perimeter, waits
 * for WMS tiles to fully load, captures the canvas, then restores the
 * original state.
 *
 * @param map - The Mapbox GL map instance
 * @param perimeterInfo - Centroid and bounding box of the fire perimeter
 * @returns Base64 PNG data URL of the vegetation overlay, or null if layer unavailable
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

  // Turn vegetation layer ON at full opacity for a clean classification image
  map.setLayoutProperty('nvis-vegetation-layer', 'visibility', 'visible');
  const savedOpacity = map.getPaintProperty('nvis-vegetation-layer', 'raster-opacity') ?? 0.65;
  map.setPaintProperty('nvis-vegetation-layer', 'raster-opacity', 1.0);

  // Move to flat aerial view and fit perimeter to ~80% of the viewport
  const [minLng, minLat, maxLng, maxLat] = perimeterInfo.bbox;
  map.setBearing(0);
  map.setPitch(0);
  const canvas = map.getCanvas();
  const paddingX = Math.round(canvas.clientWidth * 0.1);
  const paddingY = Math.round(canvas.clientHeight * 0.1);

  map.fitBounds(
    [
      [minLng, minLat],
      [maxLng, maxLat],
    ],
    {
      padding: {
        top: paddingY,
        bottom: paddingY,
        left: paddingX,
        right: paddingX,
      },
      duration: 0,
      maxZoom: 16,
    }
  );

  // Wait specifically for the NVIS WMS source tiles to load (can be slow)
  const nvisSourceId = 'nvis-vegetation';
  if (map.getSource(nvisSourceId)) {
    await waitForSourceLoaded(map, nvisSourceId, 12000);
  }

  // Then wait for the full map (including the raster layer render) to be idle
  await waitForMovementEnd(map, 5000);
  await waitForMapReady(map, 10000);

  // Hide draw layers so the vegetation map is clean without polygon overlays
  const restoreDrawLayers = hideDrawLayers(map);
  // Allow one render frame for the layer change to take effect before capture
  await waitForFrame();

  // Capture
  const dataUrl = map.getCanvas().toDataURL('image/png');

  restoreDrawLayers();

  // Restore vegetation layer opacity and visibility
  map.setPaintProperty('nvis-vegetation-layer', 'raster-opacity', savedOpacity as number);
  if (!wasVisible) {
    map.setLayoutProperty('nvis-vegetation-layer', 'visibility', 'none');
  }

  // Restore camera with smooth transition
  map.easeTo({
    center: savedCamera.center,
    zoom: savedCamera.zoom,
    bearing: savedCamera.bearing,
    pitch: savedCamera.pitch,
    duration: 400,
    easing: (t) => t * (2 - t),
  });

  return dataUrl;
}
