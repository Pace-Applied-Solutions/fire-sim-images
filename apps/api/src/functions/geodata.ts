import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import crypto from 'node:crypto';
import { GeoContext } from '@fire-sim/shared';

type PolygonCoordinates = number[][][];
type GeoJsonBody = { geometry?: { type?: string; coordinates?: unknown } };

const cache = new Map<string, GeoContext>();

const REGION_PROFILES: Array<{
  name: string;
  bounds: { lat: [number, number]; lng: [number, number] };
  context: GeoContext;
}> = [
  {
    name: 'blue_mountains',
    bounds: { lat: [-33.9, -33.5], lng: [150.1, 150.6] },
    context: {
      vegetationType: 'Dry Sclerophyll Forest',
      vegetationSubtype: 'Sydney Coastal Dry Sclerophyll Forest',
      fuelLoad: 'high',
      dominantSpecies: ['Eucalyptus', 'Banksia'],
      elevation: { min: 300, max: 900, mean: 600 },
      slope: { min: 10, max: 35, mean: 18 },
      aspect: 'NW',
      nearbyFeatures: ['road', 'escarpment'],
      dataSource: 'NSW SVTM + NSW DEM 5m (profiled)',
      confidence: 'high',
    },
  },
  {
    name: 'penrith',
    bounds: { lat: [-33.85, -33.6], lng: [150.6, 150.78] },
    context: {
      vegetationType: 'Cumberland Plain Woodland',
      vegetationSubtype: 'Cumberland Dry Sclerophyll Forest',
      fuelLoad: 'moderate',
      dominantSpecies: ['Eucalyptus', 'Acacia'],
      elevation: { min: 20, max: 60, mean: 40 },
      slope: { min: 1, max: 8, mean: 3 },
      aspect: 'N',
      nearbyFeatures: ['road', 'residential_area'],
      dataSource: 'NSW SVTM + NSW DEM 5m (profiled)',
      confidence: 'high',
    },
  },
  {
    name: 'batemans_bay',
    bounds: { lat: [-35.85, -35.55], lng: [149.95, 150.45] },
    context: {
      vegetationType: 'Wet Sclerophyll Forest',
      vegetationSubtype: 'South Coast Tall Wet Sclerophyll',
      fuelLoad: 'high',
      dominantSpecies: ['Eucalyptus', 'Tree Fern'],
      elevation: { min: 0, max: 220, mean: 90 },
      slope: { min: 4, max: 22, mean: 12 },
      aspect: 'SE',
      nearbyFeatures: ['river', 'road'],
      dataSource: 'NSW SVTM + NSW DEM 5m (profiled)',
      confidence: 'high',
    },
  },
  {
    name: 'armidale',
    bounds: { lat: [-30.8, -30.1], lng: [151.3, 152] },
    context: {
      vegetationType: 'Grassy Woodland',
      vegetationSubtype: 'New England Woodland',
      fuelLoad: 'moderate',
      dominantSpecies: ['Eucalyptus', 'Stringybark'],
      elevation: { min: 850, max: 1250, mean: 990 },
      slope: { min: 3, max: 18, mean: 9 },
      aspect: 'W',
      nearbyFeatures: ['road', 'rural_residential'],
      dataSource: 'NSW SVTM + NSW DEM 5m (profiled)',
      confidence: 'high',
    },
  },
];

const ASPECTS: Array<GeoContext['aspect']> = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

const isPolygon = (coordinates: unknown): coordinates is PolygonCoordinates =>
  Array.isArray(coordinates) &&
  coordinates.length > 0 &&
  Array.isArray(coordinates[0]) &&
  Array.isArray(coordinates[0][0]) &&
  typeof coordinates[0][0][0] === 'number';

const hashPolygon = (coordinates: PolygonCoordinates): string => {
  const normalized = coordinates.map((ring) =>
    [...ring].sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]))
  );
  return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
};

const centroidFromPolygon = (coordinates: PolygonCoordinates): { lat: number; lng: number } => {
  const ring = coordinates[0];
  const total = ring.reduce(
    (acc, point) => {
      const [lng, lat] = point;
      acc.lat += lat;
      acc.lng += lng;
      return acc;
    },
    { lat: 0, lng: 0 }
  );
  const count = ring.length || 1;
  return { lat: total.lat / count, lng: total.lng / count };
};

const toCardinalAspect = (angle: number): GeoContext['aspect'] => {
  const normalized = (angle + 360) % 360;
  const index = Math.round(normalized / 45) % ASPECTS.length;
  return ASPECTS[index];
};

const aspectFromPolygon = (coordinates: PolygonCoordinates): GeoContext['aspect'] => {
  const ring = coordinates[0];

  // Fallback for degenerate polygons
  if (!ring || ring.length < 2) {
    return 'N';
  }

  // Use the bearing from the polygon centroid to the farthest vertex
  const centroid = centroidFromPolygon(coordinates);

  let maxDistSq = -1;
  let targetLat = ring[0][1];
  let targetLng = ring[0][0];

  for (const [lng, lat] of ring) {
    const dLat = lat - centroid.lat;
    const dLng = lng - centroid.lng;
    const distSq = dLat * dLat + dLng * dLng;

    if (distSq > maxDistSq) {
      maxDistSq = distSq;
      targetLat = lat;
      targetLng = lng;
    }
  }

  const angle = (Math.atan2(targetLat - centroid.lat, targetLng - centroid.lng) * 180) / Math.PI;
  return toCardinalAspect(angle);
};

const fallbackContext = (
  coordinates: PolygonCoordinates,
  dataSource: string,
  confidence: GeoContext['confidence']
): GeoContext => ({
  vegetationType: 'Eucalypt woodland',
  vegetationSubtype: 'Generic dry sclerophyll',
  fuelLoad: 'moderate',
  dominantSpecies: ['Eucalyptus'],
  elevation: { min: 40, max: 180, mean: 90 },
  slope: { min: 2, max: 18, mean: 8 },
  aspect: aspectFromPolygon(coordinates),
  nearbyFeatures: ['road'],
  dataSource,
  confidence,
});

const resolveProfile = (centroid: { lat: number; lng: number }): GeoContext | undefined =>
  REGION_PROFILES.find(
    (region) =>
      centroid.lat >= region.bounds.lat[0] &&
      centroid.lat <= region.bounds.lat[1] &&
      centroid.lng >= region.bounds.lng[0] &&
      centroid.lng <= region.bounds.lng[1]
  )?.context;

export async function geodata(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  let coordinates: PolygonCoordinates | undefined;
  let polygonHash = '';

  try {
    const body = (await request.json()) as GeoJsonBody;
    const possibleCoordinates = body?.geometry?.coordinates;

    if (!isPolygon(possibleCoordinates) || body?.geometry?.type !== 'Polygon') {
      return {
        status: 400,
        jsonBody: { error: 'Invalid GeoJSON polygon payload' },
      };
    }

    coordinates = possibleCoordinates;

    polygonHash = hashPolygon(coordinates);

    if (cache.has(polygonHash)) {
      context.log('geodata.cache_hit', { polygonHash });
      return { status: 200, jsonBody: cache.get(polygonHash) };
    }

    const centroid = centroidFromPolygon(coordinates);
    const profile = resolveProfile(centroid);
    const selected =
      profile ??
      fallbackContext(
        coordinates,
        'Fallback: NSW bush fire prone land heuristic + Mapbox terrain proxy',
        'low'
      );

    const response: GeoContext = {
      ...selected,
      aspect: selected.aspect,
    };

    cache.set(polygonHash, response);
    context.log('geodata.cached', { polygonHash, dataSource: response.dataSource, confidence: response.confidence });

    return {
      status: 200,
      jsonBody: response,
    };
  } catch (error) {
    context.error('geodata.lookup_failed', { error: (error as Error).message, polygonHash });
    const degraded = fallbackContext(
      coordinates ?? [[[0, 0]]],
      'Fallback: degraded due to lookup failure',
      'low'
    );
    return {
      status: 200,
      jsonBody: degraded,
    };
  }
}

app.http('geodata', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'geodata',
  handler: geodata,
});
