import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import area from '@turf/area';
import centroid from '@turf/centroid';
import bbox from '@turf/bbox';
import type { Feature, Polygon } from 'geojson';
import type { FirePerimeter, ViewPoint } from '@fire-sim/shared';
import { useAppStore } from '../../store/appStore';
import { useToastStore } from '../../store/toastStore';
import { captureViewpointScreenshots, captureVegetationScreenshot } from '../../utils/mapCapture';
import {
  MAPBOX_TOKEN,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  MAPBOX_STYLE,
  MAX_PITCH,
  TERRAIN_EXAGGERATION,
} from '../../config/mapbox';
import { VegetationTooltip } from './VegetationTooltip';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import styles from './MapContainer.module.css';

/** Vegetation identify result from NVIS GetFeatureInfo */
interface VegetationIdentifyResult {
  subgroup: string;
  group?: string;
  lngLat: [number, number];
  point: { x: number; y: number };
}

function resolveMvsName(props: Record<string, unknown>): string | null {
  const value =
    props['Raster.MVS_NAME'] ??
    props['MVS_NAME'] ??
    props['Pixel Value'] ??
    props['MVS_100_NA'] ??
    props['Label'];
  return value ? String(value) : null;
}

function resolveMvgName(props: Record<string, unknown>): string | null {
  const value = props['Raster.MVG_NAME'] ?? props['MVG_NAME'] ?? props['MVG'];
  return value ? String(value) : null;
}

type ViewpointPreset =
  | 'helicopter_north'
  | 'helicopter_south'
  | 'helicopter_east'
  | 'helicopter_west'
  | 'helicopter_above'
  | 'ground_north'
  | 'ground_south'
  | 'ground_east'
  | 'ground_west'
  | 'ground_above'
  | 'aerial';

const VIEW_PRESET_MAP = {
  helicopter: {
    north: 'helicopter_north',
    south: 'helicopter_south',
    east: 'helicopter_east',
    west: 'helicopter_west',
    above: 'helicopter_above',
  },
  ground: {
    north: 'ground_north',
    south: 'ground_south',
    east: 'ground_east',
    west: 'ground_west',
    above: 'ground_above',
  },
} as const;

type ViewMode = keyof typeof VIEW_PRESET_MAP;
type ViewDirection = keyof (typeof VIEW_PRESET_MAP)['helicopter'];

interface PerimeterMetadata {
  areaHectares: number;
  centroid: [number, number];
  bbox: [number, number, number, number];
}

const ADDRESS_BOUNDS_SOURCE_ID = 'address-search-bounds';
const ADDRESS_BOUNDS_LINE_ID = 'address-search-bounds-line';
const ADDRESS_BOUNDS_FILL_ID = 'address-search-bounds-fill';

export const MapContainer = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const mapLoadedRef = useRef(false);
  const locationRequestInFlightRef = useRef(false);
  const locationErrorRef = useRef<string | null>(null);

  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [perimeter, setPerimeter] = useState<FirePerimeter | null>(null);
  const [metadata, setMetadata] = useState<PerimeterMetadata | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('helicopter');
  const [currentDirection, setCurrentDirection] = useState<ViewDirection>('north');
  const [showVegetation, setShowVegetation] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [hintDismissed, setHintDismissed] = useState(false);
  const [hasStartedDraw, setHasStartedDraw] = useState(false);
  const [vegIdentifyResult, setVegIdentifyResult] = useState<VegetationIdentifyResult | null>(null);
  const [vegIdentifyLoading, setVegIdentifyLoading] = useState(false);
  const vegIdentifyAbortRef = useRef<AbortController | null>(null);
  const [vegLegendItems, setVegLegendItems] = useState<Array<{ name: string; color: string }>>([]);
  const [vegLegendLoading, setVegLegendLoading] = useState(false);
  const [vegLegendError, setVegLegendError] = useState<string | null>(null);
  const vegLegendAbortRef = useRef<AbortController | null>(null);
  const vegLegendColorRef = useRef<Map<string, string>>(new Map());

  const setAppPerimeter = useAppStore((s) => s.setPerimeter);
  const setState = useAppStore((s) => s.setState);
  const setCaptureMapScreenshots = useAppStore((s) => s.setCaptureMapScreenshots);
  const setCaptureVegetationScreenshot = useAppStore((s) => s.setCaptureVegetationScreenshot);
  const setVegetationLegendItems = useAppStore((s) => s.setVegetationLegendItems);
  const setHandleLocationSelect = useAppStore((s) => s.setHandleLocationSelect);
  const setHandleGeolocationRequest = useAppStore((s) => s.setHandleGeolocationRequest);
  const isResultsPanelOpen = useAppStore((s) => s.isResultsPanelOpen);
  const { addToast } = useToastStore();

  const setMapCursor = useCallback((cursor: string | null) => {
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().style.cursor = cursor ?? '';
  }, []);

  // Toggle NVIS national vegetation overlay visibility
  const toggleVegetationOverlay = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer('nvis-vegetation-layer')) return;
    const next = !showVegetation;
    map.setLayoutProperty('nvis-vegetation-layer', 'visibility', next ? 'visible' : 'none');
    setShowVegetation(next);
    if (!next) {
      setVegIdentifyResult(null);
      setVegLegendItems([]);
      setVegLegendError(null);
    }
  }, [showVegetation]);

  /**
   * Handle click-to-identify on the vegetation overlay.
   * Sends a WMS GetFeatureInfo request to the NVIS MVS service.
   */
  const handleVegetationIdentify = useCallback(
    async (e: mapboxgl.MapMouseEvent) => {
      if (!showVegetation) return;

      // Cancel any in-flight request
      vegIdentifyAbortRef.current?.abort();
      const controller = new AbortController();
      vegIdentifyAbortRef.current = controller;

      const { lng, lat } = e.lngLat;
      const point = e.point;

      // Build a small bbox around the clicked point (WMS 1.3.0 uses lat/lng order for EPSG:4326)
      const delta = 0.001; // ~100m at mid-latitudes
      const bboxStr = `${lat - delta},${lng - delta},${lat + delta},${lng + delta}`;

      const params = new URLSearchParams({
        SERVICE: 'WMS',
        VERSION: '1.3.0',
        REQUEST: 'GetFeatureInfo',
        LAYERS: 'NVIS_ext_mvs',
        QUERY_LAYERS: 'NVIS_ext_mvs',
        INFO_FORMAT: 'application/geo+json',
        CRS: 'EPSG:4326',
        BBOX: bboxStr,
        WIDTH: '101',
        HEIGHT: '101',
        I: '50',
        J: '50',
      });

      const url = `/api/nvis-wms-proxy?${params}`;
      setVegIdentifyLoading(true);

      try {
        const response = await fetch(url, {
          signal: controller.signal,
        });

        if (!response.ok) {
          setVegIdentifyResult(null);
          return;
        }

        const data = await response.json();

        // ESRI WMS GetFeatureInfo JSON response typically contains features array
        const features = data?.features ?? data?.results;
        if (features && features.length > 0) {
          const props = features[0].properties ?? features[0].attributes ?? {};
          const subgroup = resolveMvsName(props) ?? 'Unknown vegetation type';
          const group = resolveMvgName(props);

          setVegIdentifyResult({
            subgroup: String(subgroup),
            group: group ? String(group) : undefined,
            lngLat: [lng, lat],
            point: { x: point.x, y: point.y },
          });
        } else {
          setVegIdentifyResult({
            subgroup: 'No vegetation data at this location',
            lngLat: [lng, lat],
            point: { x: point.x, y: point.y },
          });
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.warn('NVIS GetFeatureInfo failed:', err);
        setVegIdentifyResult(null);
      } finally {
        if (!controller.signal.aborted) {
          setVegIdentifyLoading(false);
        }
      }
    },
    [showVegetation]
  );

  const fetchLegendItemAt = useCallback(
    async (lng: number, lat: number, signal: AbortSignal): Promise<string | null> => {
      const delta = 0.001;
      const bboxStr = `${lat - delta},${lng - delta},${lat + delta},${lng + delta}`;

      const params = new URLSearchParams({
        SERVICE: 'WMS',
        VERSION: '1.3.0',
        REQUEST: 'GetFeatureInfo',
        LAYERS: 'NVIS_ext_mvs',
        QUERY_LAYERS: 'NVIS_ext_mvs',
        INFO_FORMAT: 'application/geo+json',
        CRS: 'EPSG:4326',
        BBOX: bboxStr,
        WIDTH: '101',
        HEIGHT: '101',
        I: '50',
        J: '50',
      });

      const response = await fetch(`/api/nvis-wms-proxy?${params}`, { signal });
      if (!response.ok) return null;

      const data = await response.json();
      const features = data?.features ?? data?.results;
      if (!features || features.length === 0) return null;

      const props = features[0].properties ?? features[0].attributes ?? {};
      return resolveMvsName(props);
    },
    []
  );

  const fetchLegendColorAt = useCallback(
    async (lng: number, lat: number, signal: AbortSignal): Promise<string | null> => {
      const delta = 0.0005;
      const bboxStr = `${lat - delta},${lng - delta},${lat + delta},${lng + delta}`;

      const params = new URLSearchParams({
        SERVICE: 'WMS',
        VERSION: '1.3.0',
        REQUEST: 'GetMap',
        LAYERS: 'NVIS_ext_mvs',
        STYLES: '',
        FORMAT: 'image/png',
        TRANSPARENT: 'true',
        CRS: 'EPSG:4326',
        BBOX: bboxStr,
        WIDTH: '1',
        HEIGHT: '1',
      });

      const response = await fetch(`/api/nvis-wms-proxy?${params}`, { signal });
      if (!response.ok) return null;

      const blob = await response.blob();
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(bitmap, 0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      const alpha = a / 255;
      if (alpha === 0) return null;
      return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
    },
    []
  );

  const refreshVegetationLegend = useCallback(async () => {
    if (!showVegetation) return;
    const map = mapRef.current;
    if (!map) return;

    vegLegendAbortRef.current?.abort();
    const controller = new AbortController();
    vegLegendAbortRef.current = controller;

    setVegLegendLoading(true);
    setVegLegendError(null);

    try {
      const bounds = map.getBounds();
      if (!bounds) {
        setVegLegendError('Map bounds not available');
        setVegLegendLoading(false);
        return;
      }

      const west = bounds.getWest();
      const east = bounds.getEast();
      const south = bounds.getSouth();
      const north = bounds.getNorth();

      const samplesX = 4;
      const samplesY = 3;
      const lngStep = (east - west) / (samplesX - 1);
      const latStep = (north - south) / (samplesY - 1);

      const requests: Array<Promise<{ name: string; color: string } | null>> = [];
      for (let x = 0; x < samplesX; x += 1) {
        for (let y = 0; y < samplesY; y += 1) {
          const lng = west + lngStep * x;
          const lat = south + latStep * y;
          requests.push(
            (async () => {
              const name = await fetchLegendItemAt(lng, lat, controller.signal);
              if (!name) return null;

              const cached = vegLegendColorRef.current.get(name);
              if (cached) {
                return { name, color: cached };
              }

              const color = await fetchLegendColorAt(lng, lat, controller.signal);
              const resolvedColor = color ?? 'rgba(255, 255, 255, 0.6)';
              vegLegendColorRef.current.set(name, resolvedColor);
              return { name, color: resolvedColor };
            })()
          );
        }
      }

      const results = await Promise.allSettled(requests);
      const items = new Map<string, string>();
      results.forEach((result) => {
        if (result.status !== 'fulfilled' || !result.value) return;
        items.set(result.value.name, result.value.color);
      });

      const nextItems = Array.from(items.entries())
        .map(([name, color]) => ({ name, color }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setVegLegendItems(nextItems);
      setVegetationLegendItems(nextItems);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setVegLegendError('Unable to load visible legend items');
      setVegLegendItems([]);
      setVegetationLegendItems(null);
    } finally {
      if (!controller.signal.aborted) {
        setVegLegendLoading(false);
      }
    }
  }, [fetchLegendColorAt, fetchLegendItemAt, setVegetationLegendItems, showVegetation]);

  // Dismiss the vegetation tooltip
  const handleDismissVegTooltip = useCallback(() => {
    setVegIdentifyResult(null);
  }, []);

  // Register / deregister click handler for vegetation identify
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    if (showVegetation) {
      map.on('click', handleVegetationIdentify);
    }

    return () => {
      map.off('click', handleVegetationIdentify);
    };
  }, [isMapLoaded, showVegetation, handleVegetationIdentify]);

  // Dismiss tooltip on Escape key
  useEffect(() => {
    if (!vegIdentifyResult) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setVegIdentifyResult(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [vegIdentifyResult]);

  const flyToLocation = useCallback((coords: [number, number]) => {
    const map = mapRef.current;
    if (!map) return;

    map.flyTo({
      center: coords,
      zoom: 13,
      pitch: 45,
      duration: 1800,
      essential: true,
    });
  }, []);

  const requestUserLocation = useCallback(
    (showToastOnError = true) => {
      if (!navigator.geolocation) {
        if (showToastOnError) {
          addToast({
            type: 'info',
            message: 'Geolocation not supported; staying on Australia view.',
          });
        }
        return;
      }

      if (locationRequestInFlightRef.current) {
        return;
      }

      locationRequestInFlightRef.current = true;

      navigator.geolocation.getCurrentPosition(
        (position) => {
          locationRequestInFlightRef.current = false;
          locationErrorRef.current = null;
          setUserLocation([position.coords.longitude, position.coords.latitude]);
        },
        (error) => {
          locationRequestInFlightRef.current = false;
          let message = 'Showing Australia view while we confirm your location.';
          if (error.code === error.PERMISSION_DENIED) {
            message = 'Location permission denied; staying on Australia view.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            message = 'Location unavailable; staying on Australia view.';
          } else if (error.code === error.TIMEOUT) {
            message = 'Location timed out; staying on Australia view.';
          }

          if (locationErrorRef.current !== message && showToastOnError) {
            locationErrorRef.current = message;
            addToast({
              type: 'info',
              message,
            });
          } else {
            locationErrorRef.current = message;
          }
        },
        { timeout: 8000, enableHighAccuracy: true }
      );
    },
    [addToast]
  );

  const startPolygonDraw = useCallback(() => {
    if (!drawRef.current) return;
    drawRef.current.changeMode('draw_polygon');
    setMapCursor('crosshair');
  }, [setMapCursor]);

  const handleStartDrawing = useCallback(() => {
    startPolygonDraw();
    setHasStartedDraw(true);
  }, [startPolygonDraw]);

  const clearPerimeter = useCallback(() => {
    if (!drawRef.current) return;
    drawRef.current.deleteAll();
    setMapCursor(null);
    setHasStartedDraw(false);
  }, [setMapCursor]);

  const handleDismissHint = useCallback(() => {
    setHintDismissed(true);
  }, []);

  useEffect(() => {
    requestUserLocation(true);
  }, [requestUserLocation]);

  // Initialize Mapbox map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Check for token
    if (!MAPBOX_TOKEN) {
      setMapError('Mapbox token not configured. Add VITE_MAPBOX_TOKEN to your .env file.');
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    // Default centre (Sydney basin) — user can tap the locate button for their position
    const initialCenter: [number, number] = DEFAULT_CENTER;
    const initialZoom = DEFAULT_ZOOM;

    // Initialize map
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: MAPBOX_STYLE,
      center: initialCenter,
      zoom: initialZoom,
      pitch: 40, // Start with mild 3D tilt
      bearing: 0,
      maxPitch: MAX_PITCH,
      preserveDrawingBuffer: true, // Required for canvas.toDataURL() screenshot capture
    });

    mapRef.current = map;

    // Add navigation controls (zoom, rotate, pitch)
    map.addControl(
      new mapboxgl.NavigationControl({
        showCompass: true,
        showZoom: true,
        visualizePitch: true,
      }),
      'top-left'
    );

    // Add compass-only control at bottom-right for quick bearing reference
    map.addControl(
      new mapboxgl.NavigationControl({
        showCompass: true,
        showZoom: false,
        visualizePitch: true,
      }),
      'bottom-right'
    );

    // Add scale bar
    map.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

    // Setup 3D terrain once style is ready.
    // Use 'style.load' (fires as soon as the style document is parsed) instead
    // of 'load' (fires after all tiles are fetched) to avoid the "Couldn't find
    // terrain source" error from the render loop accessing terrain before the
    // source exists.
    map.once('style.load', () => {
      if (!map.getSource('mapbox-dem')) {
        map.addSource('mapbox-dem', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxzoom: 14,
        });
      }

      // Enable terrain once the DEM tiles arrive
      const enableTerrain = () => {
        try {
          if (map.getSource('mapbox-dem') && map.isSourceLoaded('mapbox-dem')) {
            map.setTerrain({
              source: 'mapbox-dem',
              exaggeration: TERRAIN_EXAGGERATION,
            });
          } else {
            const onSourceData = (e: mapboxgl.MapSourceDataEvent) => {
              if (
                e.sourceId === 'mapbox-dem' &&
                map.getSource('mapbox-dem') &&
                map.isSourceLoaded('mapbox-dem')
              ) {
                map.setTerrain({
                  source: 'mapbox-dem',
                  exaggeration: TERRAIN_EXAGGERATION,
                });
                map.off('sourcedata', onSourceData);
              }
            };
            map.on('sourcedata', onSourceData);
          }
        } catch {
          // Terrain not ready yet — safe to ignore; tiles will arrive shortly
        }
      };

      enableTerrain();

      // Add contour lines from Mapbox terrain tileset
      if (!map.getSource('mapbox-contours')) {
        map.addSource('mapbox-contours', {
          type: 'vector',
          url: 'mapbox://mapbox.mapbox-terrain-v2',
        });

        map.addLayer({
          id: 'contour-lines',
          type: 'line',
          source: 'mapbox-contours',
          'source-layer': 'contour',
          paint: {
            'line-color': 'rgba(255, 255, 255, 0.25)',
            'line-width': [
              'match',
              ['get', 'index'],
              5,
              1.5, // Every 5th contour line is thicker (major)
              0.6,
            ],
          },
          layout: {
            'line-join': 'round',
          },
        });

        map.addLayer({
          id: 'contour-labels',
          type: 'symbol',
          source: 'mapbox-contours',
          'source-layer': 'contour',
          filter: ['==', ['get', 'index'], 5], // Only label major contour lines
          paint: {
            'text-color': 'rgba(255, 255, 255, 0.5)',
            'text-halo-color': 'rgba(0, 0, 0, 0.6)',
            'text-halo-width': 1,
          },
          layout: {
            'symbol-placement': 'line',
            'text-field': ['concat', ['to-string', ['get', 'ele']], 'm'],
            'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
            'text-size': 10,
          },
        });
      }

      // Add sky layer for atmosphere effect (check if it already exists)
      if (!map.getLayer('sky')) {
        map.addLayer({
          id: 'sky',
          type: 'sky',
          paint: {
            'sky-type': 'atmosphere',
            'sky-atmosphere-sun': [0.0, 90.0],
            'sky-atmosphere-sun-intensity': 15,
          },
        });
      }

      // Add NVIS (National Vegetation Information System) as a WMS raster overlay
      // CC-BY 4.0 — Australian Government DCCEEW. Proxied through /api/nvis-wms-proxy
      // because gis.environment.gov.au does not send CORS headers.
      if (!map.getSource('nvis-vegetation')) {
        const wmsUrl = `/api/nvis-wms-proxy?service=WMS&request=GetMap&layers=NVIS_ext_mvs&styles=&format=image/png&transparent=true&version=1.3.0&crs=EPSG:3857&width=256&height=256&bbox={bbox-epsg-3857}`;
        map.addSource('nvis-vegetation', {
          type: 'raster',
          tiles: [wmsUrl],
          tileSize: 256,
        });

        map.addLayer({
          id: 'nvis-vegetation-layer',
          type: 'raster',
          source: 'nvis-vegetation',
          paint: { 'raster-opacity': 0.65 },
          layout: { visibility: 'none' },
        });
      }

      // NSW SVTM overlay — disabled in favour of NVIS national coverage.
      // To re-enable, uncomment the block below and add SVTM_WMS_URL import.
      // if (!map.getSource('nsw-vegetation')) {
      //   const wmsUrl = `${SVTM_WMS_URL}?service=WMS&request=GetMap&layers=0&styles=&format=image/png&transparent=true&version=1.3.0&crs=EPSG:3857&width=256&height=256&bbox={bbox-epsg-3857}`;
      //   map.addSource('nsw-vegetation', { type: 'raster', tiles: [wmsUrl], tileSize: 256 });
      //   map.addLayer({ id: 'nsw-vegetation-layer', type: 'raster', source: 'nsw-vegetation', paint: { 'raster-opacity': 0.65 }, layout: { visibility: 'none' } });
      // }

      setIsMapLoaded(true);
      setMapError(null);
      mapLoadedRef.current = true;
    });

    // Handle map errors
    map.on('error', (e) => {
      // Type guard: error events from sources may include sourceId at runtime
      const errorWithSource = e as typeof e & { sourceId?: string };
      if (errorWithSource?.sourceId === 'nvis-vegetation') {
        console.warn('NVIS vegetation WMS error:', e?.error ?? e);
        return;
      }

      if (mapLoadedRef.current) {
        console.warn('Map error after load:', e?.error ?? e);
        return;
      }

      console.error('Map error:', e);
      setMapError('Map failed to load. Check your Mapbox token and network access.');
    });

    // Cleanup
    return () => {
      if (drawRef.current && map) {
        try {
          map.removeControl(drawRef.current);
        } catch {
          // Ignore cleanup errors
        }
      }
      map.remove();
      drawRef.current = null;
      mapRef.current = null;
      setIsMapLoaded(false);
      mapLoadedRef.current = false;
    };
  }, []);

  // Initialize MapboxDraw for polygon drawing
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded || drawRef.current) return;

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: false,
        trash: false,
      },
      defaultMode: 'simple_select',
      styles: [
        // Polygon fill - fire red with transparency
        {
          id: 'gl-draw-polygon-fill',
          type: 'fill',
          filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
          paint: {
            'fill-color': '#ff6b35',
            'fill-opacity': 0.3,
          },
        },
        // Active polygon fill - brighter
        {
          id: 'gl-draw-polygon-fill-active',
          type: 'fill',
          filter: ['all', ['==', '$type', 'Polygon'], ['==', 'active', 'true']],
          paint: {
            'fill-color': '#ff6b35',
            'fill-opacity': 0.4,
          },
        },
        // Polygon outline - red for going edge
        {
          id: 'gl-draw-polygon-stroke-active',
          type: 'line',
          filter: ['all', ['==', '$type', 'Polygon'], ['==', 'active', 'true']],
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
          paint: {
            'line-color': '#ff0000',
            'line-dasharray': [0.2, 2],
            'line-width': 3,
          },
        },
        // Inactive polygon outline - black for inactive edge
        {
          id: 'gl-draw-polygon-stroke-inactive',
          type: 'line',
          filter: ['all', ['==', '$type', 'Polygon'], ['==', 'active', 'false']],
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
          paint: {
            'line-color': '#000000',
            'line-dasharray': [0.2, 2],
            'line-width': 2,
          },
        },
        // Vertex points - visible and draggable
        {
          id: 'gl-draw-polygon-and-line-vertex-halo-active',
          type: 'circle',
          filter: [
            'all',
            ['==', 'meta', 'vertex'],
            ['==', '$type', 'Point'],
            ['!=', 'mode', 'static'],
          ],
          paint: {
            'circle-radius': 6,
            'circle-color': '#FFF',
          },
        },
        {
          id: 'gl-draw-polygon-and-line-vertex-active',
          type: 'circle',
          filter: [
            'all',
            ['==', 'meta', 'vertex'],
            ['==', '$type', 'Point'],
            ['!=', 'mode', 'static'],
          ],
          paint: {
            'circle-radius': 4,
            'circle-color': '#ff0000',
          },
        },
      ],
    });

    map.addControl(draw, 'top-right');
    drawRef.current = draw;

    const handleModeChange = (event: { mode?: string }) => {
      if (event.mode === 'draw_polygon') {
        setMapCursor('crosshair');
        return;
      }
      setMapCursor(null);
    };

    // Handle draw events
    map.on('draw.create', handleDrawUpdate);
    map.on('draw.update', handleDrawUpdate);
    map.on('draw.delete', handleDrawDelete);
    map.on('draw.modechange', handleModeChange);

    return () => {
      if (map && draw) {
        map.off('draw.create', handleDrawUpdate);
        map.off('draw.update', handleDrawUpdate);
        map.off('draw.delete', handleDrawDelete);
        map.off('draw.modechange', handleModeChange);
      }
    };
  }, [isMapLoaded, addToast, setMapCursor]);

  // Handle polygon draw/update
  const handleDrawUpdate = useCallback(
    (event: { features?: Feature[] }) => {
      const features = event.features;
      if (!features || features.length === 0) return;

      const feature = features[0] as Feature<Polygon>;
      if (feature.geometry.type !== 'Polygon') return;

      // Create FirePerimeter GeoJSON
      const firePerimeter: FirePerimeter = {
        type: 'Feature',
        geometry: feature.geometry,
        properties: {
          drawn: true,
          timestamp: new Date().toISOString(),
        },
      };

      setPerimeter(firePerimeter);
      setAppPerimeter(firePerimeter);

      // Calculate metadata
      const areaM2 = area(feature);
      const areaHectares = areaM2 / 10000;
      const center = centroid(feature);
      const bounds = bbox(feature);

      const meta: PerimeterMetadata = {
        areaHectares,
        centroid: center.geometry.coordinates as [number, number],
        bbox: bounds as [number, number, number, number],
      };

      setMetadata(meta);

      // Update app state to configuring
      setState('configuring');
    },
    [setAppPerimeter, setState]
  );

  // Handle polygon deletion
  const handleDrawDelete = useCallback(() => {
    setPerimeter(null);
    setMetadata(null);
    setAppPerimeter(null);
    setState('idle');
  }, [setAppPerimeter, setState]);

  // Capture map view as PNG
  const captureMapView = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    try {
      const canvas = map.getCanvas();
      const dataURL = canvas.toDataURL('image/png');

      // Store captured view in app state or return for processing
      console.log('Map view captured:', dataURL.substring(0, 50) + '...');
      return dataURL;
    } catch (error) {
      console.error('Failed to capture map view:', error);
      addToast({
        type: 'error',
        message: 'Failed to capture map view',
      });
      return null;
    }
  }, [addToast]);

  // Register map screenshot capture function in the store for ScenarioInputPanel to use
  useEffect(() => {
    if (!isMapLoaded || !metadata) {
      setCaptureMapScreenshots(null);
      setCaptureVegetationScreenshot(null);
      return;
    }

    const captureFn = async (viewpoints: ViewPoint[]): Promise<Record<string, string>> => {
      const map = mapRef.current;
      if (!map) return {};

      return captureViewpointScreenshots(
        map,
        {
          centroid: metadata.centroid,
          bbox: metadata.bbox,
        },
        viewpoints
      );
    };

    const vegCaptureFn = async (): Promise<string | null> => {
      const map = mapRef.current;
      if (!map) return null;

      return captureVegetationScreenshot(map, {
        centroid: metadata.centroid,
        bbox: metadata.bbox,
      });
    };

    setCaptureMapScreenshots(captureFn);
    setCaptureVegetationScreenshot(vegCaptureFn);

    return () => {
      setCaptureMapScreenshots(null);
      setCaptureVegetationScreenshot(null);
    };
  }, [isMapLoaded, metadata, setCaptureMapScreenshots, setCaptureVegetationScreenshot]);

  // Fly to viewpoint preset
  const flyToViewpoint = useCallback(
    (preset: ViewpointPreset) => {
      const map = mapRef.current;
      if (!map || !metadata) {
        return;
      }

      const [centerLng, centerLat] = metadata.centroid;
      const [minLng, minLat, maxLng, maxLat] = metadata.bbox;

      // Calculate appropriate zoom
      const lngDiff = maxLng - minLng;
      const latDiff = maxLat - minLat;
      const maxDiff = Math.max(lngDiff, latDiff);

      // Base zoom on size of perimeter
      const baseZoom = 14 - Math.log2(maxDiff * 100);

      let bearing = 0;
      let pitch = 0;
      let zoom = baseZoom - 1;
      let center: [number, number] = [centerLng, centerLat];

      switch (preset) {
        // Helicopter views: Elevated wide-area perspective (existing behavior)
        case 'helicopter_north':
          bearing = 180; // Look from north (camera south, looking north)
          pitch = 60;
          zoom = baseZoom - 1;
          center = [centerLng, centerLat - maxDiff * 0.8];
          break;
        case 'helicopter_south':
          bearing = 0; // Look from south (camera north, looking south)
          pitch = 60;
          zoom = baseZoom - 1;
          center = [centerLng, centerLat + maxDiff * 0.8];
          break;
        case 'helicopter_east':
          bearing = 270; // Look from east (camera west, looking east)
          pitch = 60;
          zoom = baseZoom - 1;
          center = [centerLng + maxDiff * 0.8, centerLat];
          break;
        case 'helicopter_west':
          bearing = 90; // Look from west (camera east, looking west)
          pitch = 60;
          zoom = baseZoom - 1;
          center = [centerLng - maxDiff * 0.8, centerLat];
          break;
        case 'helicopter_above':
          bearing = 0;
          pitch = 30; // Slightly angled down
          zoom = baseZoom - 1;
          center = [centerLng, centerLat];
          break;

        // Ground-level views: Flat horizontal perspective (truck/vehicle view)
        case 'ground_north':
          bearing = 180; // Look from north (camera south, looking north)
          pitch = 85; // Nearly horizontal, ground-level perspective
          zoom = baseZoom + 1.5; // Much closer zoom (simulates <2km distance)
          center = [centerLng, centerLat - maxDiff * 0.35]; // Closer to fire
          break;
        case 'ground_south':
          bearing = 0; // Look from south (camera north, looking south)
          pitch = 85;
          zoom = baseZoom + 1.5;
          center = [centerLng, centerLat + maxDiff * 0.35];
          break;
        case 'ground_east':
          bearing = 270; // Look from east (camera west, looking east)
          pitch = 85;
          zoom = baseZoom + 1.5;
          center = [centerLng + maxDiff * 0.35, centerLat];
          break;
        case 'ground_west':
          bearing = 90; // Look from west (camera east, looking west)
          pitch = 85;
          zoom = baseZoom + 1.5;
          center = [centerLng - maxDiff * 0.35, centerLat];
          break;
        case 'ground_above':
          bearing = 0;
          pitch = 0; // Top-down, but closer
          zoom = baseZoom + 1; // Zoomed in compared to helicopter_above
          center = [centerLng, centerLat];
          break;

        // Legacy aerial view
        case 'aerial':
          bearing = 0;
          pitch = 0; // Top-down view
          zoom = baseZoom - 1;
          center = [centerLng, centerLat];
          break;
      }

      map.flyTo({
        center,
        zoom,
        bearing,
        pitch,
        duration: 2000,
        essential: true,
      });
    },
    [metadata]
  );

  const toggleViewMode = useCallback(() => {
    setViewMode((prevMode) => {
      const nextMode = prevMode === 'ground' ? 'helicopter' : 'ground';
      flyToViewpoint(VIEW_PRESET_MAP[nextMode][currentDirection]);
      return nextMode;
    });
  }, [currentDirection, flyToViewpoint]);

  const handleDirectionSelect = useCallback(
    (direction: ViewDirection) => {
      setCurrentDirection(direction);
      flyToViewpoint(VIEW_PRESET_MAP[viewMode][direction]);
    },
    [flyToViewpoint, viewMode]
  );

  /**
   * Handle location selection from address search
   */
  const handleLocationSelect = useCallback(
    (
      longitude: number,
      latitude: number,
      _placeName: string,
      bbox?: [number, number, number, number]
    ) => {
      const map = mapRef.current;
      if (!map) return;

      const ensureAddressBoundsLayer = () => {
        if (!map.getSource(ADDRESS_BOUNDS_SOURCE_ID)) {
          map.addSource(ADDRESS_BOUNDS_SOURCE_ID, {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [],
            },
          });
        }

        if (!map.getLayer(ADDRESS_BOUNDS_FILL_ID)) {
          map.addLayer({
            id: ADDRESS_BOUNDS_FILL_ID,
            type: 'fill',
            source: ADDRESS_BOUNDS_SOURCE_ID,
            paint: {
              'fill-color': '#ff9f3f',
              'fill-opacity': 0.08,
            },
          });
        }

        if (!map.getLayer(ADDRESS_BOUNDS_LINE_ID)) {
          map.addLayer({
            id: ADDRESS_BOUNDS_LINE_ID,
            type: 'line',
            source: ADDRESS_BOUNDS_SOURCE_ID,
            paint: {
              'line-color': '#ffb866',
              'line-width': 2,
              'line-dasharray': [2, 2],
            },
          });
        }
      };

      // If bbox is available, use fitBounds for better framing
      if (bbox && bbox.length === 4) {
        const [minLng, minLat, maxLng, maxLat] = bbox;

        ensureAddressBoundsLayer();

        const source = map.getSource(ADDRESS_BOUNDS_SOURCE_ID) as mapboxgl.GeoJSONSource;
        source.setData({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [
                  [
                    [minLng, minLat],
                    [maxLng, minLat],
                    [maxLng, maxLat],
                    [minLng, maxLat],
                    [minLng, minLat],
                  ],
                ],
              },
              properties: {},
            },
          ],
        });

        const canvas = map.getCanvas();
        const paddingX = Math.round(canvas.clientWidth * 0.15);
        const paddingY = Math.round(canvas.clientHeight * 0.15);
        const padding = {
          top: paddingY,
          bottom: paddingY,
          left: paddingX,
          right: paddingX,
        };

        map.fitBounds(
          [
            [minLng, minLat],
            [maxLng, maxLat],
          ],
          {
            padding,
            duration: 2000,
            essential: true,
            maxZoom: 16, // Prevent excessive zoom for very small areas
          }
        );
      } else {
        ensureAddressBoundsLayer();
        const source = map.getSource(ADDRESS_BOUNDS_SOURCE_ID) as mapboxgl.GeoJSONSource;
        source.setData({
          type: 'FeatureCollection',
          features: [],
        });

        // Fallback to center point with fixed zoom for point-only results
        map.flyTo({
          center: [longitude, latitude],
          zoom: 16,
          duration: 2000,
          essential: true,
        });
      }
    },
    []
  );

  /**
   * Handle geolocation request from search component
   */
  const handleGeolocationRequest = useCallback(() => {
    if (userLocation) {
      flyToLocation(userLocation);
      return;
    }

    requestUserLocation(true);
  }, [flyToLocation, requestUserLocation, userLocation]);

  useEffect(() => {
    if (!isMapLoaded || !userLocation) return;
    flyToLocation(userLocation);
  }, [flyToLocation, isMapLoaded, userLocation]);

  useEffect(() => {
    if (!isMapLoaded || !showVegetation) return;
    const map = mapRef.current;
    if (!map) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void refreshVegetationLegend();
      }, 400);
    };

    map.on('moveend', scheduleRefresh);
    map.on('zoomend', scheduleRefresh);
    scheduleRefresh();

    return () => {
      map.off('moveend', scheduleRefresh);
      map.off('zoomend', scheduleRefresh);
      if (timer) clearTimeout(timer);
      vegLegendAbortRef.current?.abort();
    };
  }, [isMapLoaded, refreshVegetationLegend, showVegetation]);

  // Register location handlers in store for Header's AddressSearch to use
  useEffect(() => {
    if (!isMapLoaded) {
      setHandleLocationSelect(null);
      setHandleGeolocationRequest(null);
      return;
    }

    setHandleLocationSelect(handleLocationSelect);
    setHandleGeolocationRequest(handleGeolocationRequest);

    return () => {
      setHandleLocationSelect(null);
      setHandleGeolocationRequest(null);
    };
  }, [
    isMapLoaded,
    handleLocationSelect,
    handleGeolocationRequest,
    setHandleLocationSelect,
    setHandleGeolocationRequest,
  ]);

  const showToolbarHint = isMapLoaded && !perimeter && !hintDismissed;

  return (
    <div className={styles.container}>
      <div ref={mapContainerRef} className={styles.map} />

      <div className={`${styles.drawControls} ${isResultsPanelOpen ? styles.resultsPanelOpen : ''}`}>
        <button
          className={styles.drawButton}
          onClick={handleStartDrawing}
          title="Draw perimeter"
          aria-label="Draw fire perimeter"
          type="button"
        >
          ⬠
        </button>
        <button
          className={styles.drawButton}
          onClick={clearPerimeter}
          title="Clear perimeter"
          aria-label="Clear fire perimeter"
          type="button"
        >
          🗑️
        </button>
      </div>

      {showToolbarHint && (
        <div className={styles.toolbarHint}>
          <div className={styles.toolbarHintText}>
            <div className={styles.toolbarHintTitle}>
              {hasStartedDraw ? 'Click points on the map to draw a shape.' : 'Start drawing with ⬠'}
            </div>
            {!hasStartedDraw && <p>Click on the map to place the perimeter</p>}
          </div>
          <button
            type="button"
            className={styles.toolbarHintClose}
            aria-label="Dismiss drawing hint"
            onClick={handleDismissHint}
          >
            ×
          </button>
          <div className={styles.toolbarHintArrow} aria-hidden="true">
            →
          </div>
        </div>
      )}

      {/* Map Toolbar */}
      {isMapLoaded && metadata && (
        <div className={styles.mapToolbar}>
          <div className={styles.viewpointControls}>
            <div className={styles.viewpointButtons}>
              <button
                onClick={toggleViewMode}
                className={styles.viewpointToggle}
                aria-pressed={viewMode === 'ground'}
                aria-label={
                  viewMode === 'helicopter'
                    ? 'Switch to fire truck perspective'
                    : 'Switch to helicopter perspective'
                }
                title={
                  viewMode === 'helicopter'
                    ? 'Switch to fire truck perspective'
                    : 'Switch to helicopter perspective'
                }
                type="button"
              >
                {viewMode === 'helicopter' ? '🚁' : '🚒'}
              </button>
              {(['north', 'south', 'east', 'west', 'above'] as ViewDirection[]).map((direction) => (
                <button
                  key={direction}
                  onClick={() => handleDirectionSelect(direction)}
                  className={`${styles.viewpointBtn} ${
                    currentDirection === direction ? styles.viewpointBtnActive : ''
                  }`}
                  title={`${viewMode === 'helicopter' ? 'Helicopter' : 'Truck'} view ${
                    direction === 'above' ? 'above' : `from ${direction}`
                  }`}
                  aria-pressed={currentDirection === direction}
                  type="button"
                >
                  {direction === 'north'
                    ? 'N'
                    : direction === 'south'
                      ? 'S'
                      : direction === 'east'
                        ? 'E'
                        : direction === 'west'
                          ? 'W'
                          : '⬆'}
                </button>
              ))}
              <button
                onClick={captureMapView}
                className={styles.viewpointCapture}
                title="Capture current view"
                aria-label="Capture current view"
                type="button"
              >
                📷
              </button>
              <button
                onClick={toggleVegetationOverlay}
                className={`${styles.viewpointBtn} ${showVegetation ? styles.viewpointBtnActive : ''}`}
                aria-pressed={showVegetation}
                title={
                  showVegetation
                    ? 'Hide vegetation overlay (NVIS National)'
                    : 'Show vegetation overlay (NVIS National)'
                }
                aria-label={showVegetation ? 'Hide vegetation overlay' : 'Show vegetation overlay'}
                type="button"
              >
                🌿
              </button>
            </div>
          </div>
        </div>
      )}

      {mapError && (
        <div className={styles.mapError}>
          <div className={styles.mapErrorTitle}>Map unavailable</div>
          <p className={styles.mapErrorText}>{mapError}</p>
        </div>
      )}

      {vegIdentifyResult && (
        <VegetationTooltip
          result={vegIdentifyResult}
          loading={vegIdentifyLoading}
          onClose={handleDismissVegTooltip}
        />
      )}

      {showVegetation && (
        <div className={`${styles.vegetationLegend} ${isResultsPanelOpen ? styles.resultsPanelOpen : ''}`} role="region" aria-label="NVIS legend">
          <div className={styles.legendHeader}>
            <span>Visible vegetation</span>
            <button
              type="button"
              className={styles.legendRefresh}
              onClick={() => void refreshVegetationLegend()}
            >
              Refresh
            </button>
          </div>
          <div className={styles.legendBody}>
            {vegLegendLoading && (
              <div className={styles.legendStatus}>Loading visible classes...</div>
            )}
            {!vegLegendLoading && vegLegendError && (
              <div className={styles.legendStatus}>{vegLegendError}</div>
            )}
            {!vegLegendLoading && !vegLegendError && vegLegendItems.length === 0 && (
              <div className={styles.legendStatus}>No vegetation data in view</div>
            )}
            {!vegLegendLoading && vegLegendItems.length > 0 && (
              <ul className={styles.legendList}>
                {vegLegendItems.map((item) => (
                  <li key={item.name} className={styles.legendItem}>
                    <span
                      className={styles.legendSwatch}
                      style={{ backgroundColor: item.color }}
                      aria-hidden="true"
                    />
                    <span className={styles.legendLabel}>{item.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
