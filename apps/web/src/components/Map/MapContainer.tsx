import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import area from '@turf/area';
import centroid from '@turf/centroid';
import bbox from '@turf/bbox';
import type { Feature, Polygon } from 'geojson';
import type { FirePerimeter } from '@fire-sim/shared';
import { useAppStore } from '../../store/appStore';
import { useToastStore } from '../../store/toastStore';
import {
	MAPBOX_TOKEN,
	DEFAULT_CENTER,
	DEFAULT_ZOOM,
	MAPBOX_STYLE,
	MAX_PITCH,
	TERRAIN_EXAGGERATION,
} from '../../config/mapbox';
import { AddressSearch } from './AddressSearch';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import styles from './MapContainer.module.css';

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

export const MapContainer = () => {
	const mapContainerRef = useRef<HTMLDivElement>(null);
	const mapRef = useRef<mapboxgl.Map | null>(null);
	const drawRef = useRef<MapboxDraw | null>(null);

	const [isMapLoaded, setIsMapLoaded] = useState(false);
	const [perimeter, setPerimeter] = useState<FirePerimeter | null>(null);
	const [metadata, setMetadata] = useState<PerimeterMetadata | null>(null);
	const [mapError, setMapError] = useState<string | null>(null);
	const [viewMode, setViewMode] = useState<ViewMode>('helicopter');
	const [currentDirection, setCurrentDirection] = useState<ViewDirection>('north');

	const { setPerimeter: setAppPerimeter, setState } = useAppStore();
	const { addToast } = useToastStore();

	const setMapCursor = useCallback((cursor: string | null) => {
		const map = mapRef.current;
		if (!map) return;
		map.getCanvas().style.cursor = cursor ?? '';
	}, []);

	const startPolygonDraw = useCallback(() => {
		if (!drawRef.current) return;
		drawRef.current.changeMode('draw_polygon');
		setMapCursor('crosshair');
		addToast({
			type: 'info',
			message: 'Polygon draw mode enabled',
		});
	}, [addToast, setMapCursor]);

	const clearPerimeter = useCallback(() => {
		if (!drawRef.current) return;
		drawRef.current.deleteAll();
		setMapCursor(null);
		addToast({
			type: 'info',
			message: 'Perimeter cleared',
		});
	}, [addToast, setMapCursor]);

	// Initialize Mapbox map
	useEffect(() => {
		if (!mapContainerRef.current || mapRef.current) return;

		// Check for token
		if (!MAPBOX_TOKEN) {
			setMapError('Mapbox token not configured. Add VITE_MAPBOX_TOKEN to your .env file.');
			addToast({
				type: 'error',
				message:
					'Mapbox token not configured. Please set VITE_MAPBOX_TOKEN environment variable.',
			});
			return;
		}

		mapboxgl.accessToken = MAPBOX_TOKEN;

		// Try to get user's location for initial map center
		const initialCenter: [number, number] = DEFAULT_CENTER;
		const initialZoom = DEFAULT_ZOOM;

		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					const { latitude, longitude } = position.coords;
					if (mapRef.current && !mapRef.current.isMoving()) {
						// Only move if map hasn't been interacted with yet
						mapRef.current.flyTo({
							center: [longitude, latitude],
							zoom: 12,
							duration: 2000,
						});
						addToast({
							type: 'success',
							message: 'Map centered on your location',
						});
					}
				},
				(error) => {
					console.warn('Geolocation error:', error);
					// Silently fall back to default location
				},
				{ timeout: 5000 }
			);
		}

		// Initialize map
		const map = new mapboxgl.Map({
			container: mapContainerRef.current,
			style: MAPBOX_STYLE,
			center: initialCenter,
			zoom: initialZoom,
			pitch: 40, // Start with mild 3D tilt
			bearing: 0,
			maxPitch: MAX_PITCH,
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

		// Add scale bar
		map.addControl(new mapboxgl.ScaleControl(), 'bottom-right');

		// Setup 3D terrain once style loads
		map.on('load', () => {
			// Add Mapbox terrain source
			map.addSource('mapbox-dem', {
				type: 'raster-dem',
				url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
				tileSize: 512,
				maxzoom: 14,
			});

			// Enable 3D terrain
			map.setTerrain({
				source: 'mapbox-dem',
				exaggeration: TERRAIN_EXAGGERATION,
			});

			// Add sky layer for atmosphere effect
			map.addLayer({
				id: 'sky',
				type: 'sky',
				paint: {
					'sky-type': 'atmosphere',
					'sky-atmosphere-sun': [0.0, 90.0],
					'sky-atmosphere-sun-intensity': 15,
				},
			});

			setIsMapLoaded(true);
			setMapError(null);
			addToast({
				type: 'success',
				message: '3D map loaded successfully',
			});
		});

		// Handle map errors
		map.on('error', (e) => {
			console.error('Map error:', e);
			setMapError('Map failed to load. Check your Mapbox token and network access.');
			addToast({
				type: 'error',
				message: 'Map error occurred. Check console for details.',
			});
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
		};
	}, [addToast]);

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

			addToast({
				type: 'success',
				message: `Fire perimeter drawn: ${areaHectares.toFixed(1)} hectares`,
			});
		},
		[setAppPerimeter, setState, addToast]
	);

	// Handle polygon deletion
	const handleDrawDelete = useCallback(() => {
		setPerimeter(null);
		setMetadata(null);
		setAppPerimeter(null);
		setState('idle');

		addToast({
			type: 'info',
			message: 'Fire perimeter deleted',
		});
	}, [setAppPerimeter, setState, addToast]);

	// Capture map view as PNG
	const captureMapView = useCallback(() => {
		const map = mapRef.current;
		if (!map) return;

		try {
			const canvas = map.getCanvas();
			const dataURL = canvas.toDataURL('image/png');

			addToast({
				type: 'success',
				message: 'Map view captured',
			});

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

	// Fly to viewpoint preset
	const flyToViewpoint = useCallback(
		(preset: ViewpointPreset) => {
			const map = mapRef.current;
			if (!map || !metadata) {
				addToast({
					type: 'warning',
					message: 'Draw a fire perimeter first',
				});
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

			addToast({
				type: 'info',
				message: `View: ${preset.charAt(0).toUpperCase() + preset.slice(1)}`,
			});
		},
		[metadata, addToast]
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
		(longitude: number, latitude: number, placeName: string) => {
			const map = mapRef.current;
			if (!map) return;

			map.flyTo({
				center: [longitude, latitude],
				zoom: 14,
				duration: 2000,
				essential: true,
			});

			addToast({
				type: 'success',
				message: `Navigated to: ${placeName}`,
			});
		},
		[addToast]
	);

	/**
	 * Handle geolocation request from search component
	 */
	const handleGeolocationRequest = useCallback(() => {
		if (!navigator.geolocation) {
			addToast({
				type: 'error',
				message: 'Geolocation not supported by your browser',
			});
			return;
		}

		const map = mapRef.current;
		if (!map) return;

		addToast({
			type: 'info',
			message: 'Requesting location...',
		});

		navigator.geolocation.getCurrentPosition(
			(position) => {
				const { latitude, longitude } = position.coords;
				map.flyTo({
					center: [longitude, latitude],
					zoom: 14,
					duration: 2000,
				});
				addToast({
					type: 'success',
					message: 'Map centered on your location',
				});
			},
			(error) => {
				console.error('Geolocation error:', error);
				let message = 'Failed to get your location';
				if (error.code === error.PERMISSION_DENIED) {
					message = 'Location permission denied';
				} else if (error.code === error.POSITION_UNAVAILABLE) {
					message = 'Location information unavailable';
				} else if (error.code === error.TIMEOUT) {
					message = 'Location request timed out';
				}
				addToast({
					type: 'error',
					message,
				});
			},
			{ timeout: 10000, enableHighAccuracy: true }
		);
	}, [addToast]);

	return (
		<div className={styles.container}>
			<div ref={mapContainerRef} className={styles.map} />

			<div className={styles.drawControls}>
				<button
					className={styles.drawButton}
					onClick={startPolygonDraw}
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

			{/* Address Search */}
			{isMapLoaded && (
				<div className={styles.searchContainer}>
					<AddressSearch
						onLocationSelect={handleLocationSelect}
						onGeolocationRequest={handleGeolocationRequest}
					/>
				</div>
			)}

			{mapError && (
				<div className={styles.mapError}>
					<div className={styles.mapErrorTitle}>Map unavailable</div>
					<p className={styles.mapErrorText}>{mapError}</p>
				</div>
			)}

			{/* Viewpoint Controls */}
			{metadata && (
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
						{(['north', 'south', 'east', 'west', 'above'] as ViewDirection[]).map(
							(direction) => (
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
							)
						)}
						<button
							onClick={captureMapView}
							className={styles.viewpointCapture}
							title="Capture current view"
							aria-label="Capture current view"
							type="button"
						>
							📷
						</button>
					</div>
				</div>
			)}

			{/* Perimeter Metadata Panel */}
			{metadata && (
				<div className={styles.metadataPanel}>
					<div className={styles.metadataTitle}>Fire Perimeter</div>
					<div className={styles.metadataItem}>
						<span className={styles.metadataLabel}>Area:</span>
						<span className={styles.metadataValue}>
							{metadata.areaHectares.toFixed(2)} ha
						</span>
					</div>
					<div className={styles.metadataItem}>
						<span className={styles.metadataLabel}>Centroid:</span>
						<span className={styles.metadataValue}>
							{metadata.centroid[1].toFixed(4)}°,{' '}
							{metadata.centroid[0].toFixed(4)}°
						</span>
					</div>
					<div className={styles.metadataItem}>
						<span className={styles.metadataLabel}>Bounding Box:</span>
						<span className={styles.metadataValue}>
							{metadata.bbox[1].toFixed(4)}°, {metadata.bbox[0].toFixed(4)}° to{' '}
							{metadata.bbox[3].toFixed(4)}°, {metadata.bbox[2].toFixed(4)}°
						</span>
					</div>
				</div>
			)}

			{/* Instructions */}
			{!perimeter && isMapLoaded && (
				<div className={styles.instructions}>
					<div className={styles.instructionsText}>
						<div className={styles.instructionsTitle}>Start drawing with ⬠</div>
						<p>Click on the map to place the perimeter</p>
					</div>
					<div className={styles.instructionsArrow} aria-hidden="true">
						→
					</div>
				</div>
			)}
		</div>
	);
};
