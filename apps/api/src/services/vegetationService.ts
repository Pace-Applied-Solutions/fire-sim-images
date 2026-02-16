/**
 * NSW State Vegetation Type Map (SVTM) spatial query service.
 *
 * Queries the ArcGIS REST identify endpoint at multiple points around a fire
 * perimeter to determine vegetation formation types in each direction. This
 * provides spatially resolved vegetation context for AI image generation prompts.
 *
 * Data source: NSW DCCEEW SVTM (CC-BY 4.0)
 * https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Vegetation_IBCA/nswmap_2_3a_ext/MapServer
 */

import { SVTM_REST_URL } from '@fire-sim/shared';
import type { VegetationContext } from '@fire-sim/shared';

/** Compass directions for surrounding queries */
type CompassDirection =
  | 'north'
  | 'south'
  | 'east'
  | 'west'
  | 'northeast'
  | 'southeast'
  | 'southwest'
  | 'northwest';

/** Raw response from the ArcGIS identify endpoint */
interface IdentifyResult {
  results: Array<{
    layerId: number;
    layerName: string;
    attributes: {
      'Pixel Value'?: string;
      ClassName?: string;
      FormationName?: string;
      FormationNumber?: string;
      MapName?: string;
      VIS_ID?: string;
    };
  }>;
}

/**
 * Offset a geographic point by approximate metres using small-angle approximation.
 * Acceptable for offsets <10km at NSW latitudes (~-28° to -37°).
 */
function offsetPoint(
  lng: number,
  lat: number,
  eastMetres: number,
  northMetres: number
): [number, number] {
  const latRad = (lat * Math.PI) / 180;
  const dLat = northMetres / 111_320;
  const dLng = eastMetres / (111_320 * Math.cos(latRad));
  return [lng + dLng, lat + dLat];
}

/**
 * Build compass-offset sample points around a centroid.
 *
 * Returns the centroid plus 8 compass points at `radiusM` metres out.
 */
function buildSamplePoints(
  centroid: [number, number],
  radiusM: number
): Array<{ direction: CompassDirection | 'center'; point: [number, number] }> {
  const [lng, lat] = centroid;
  const r = radiusM;
  const d = r * Math.SQRT1_2; // diagonal offset

  return [
    { direction: 'center', point: [lng, lat] },
    { direction: 'north', point: offsetPoint(lng, lat, 0, r) },
    { direction: 'northeast', point: offsetPoint(lng, lat, d, d) },
    { direction: 'east', point: offsetPoint(lng, lat, r, 0) },
    { direction: 'southeast', point: offsetPoint(lng, lat, d, -d) },
    { direction: 'south', point: offsetPoint(lng, lat, 0, -r) },
    { direction: 'southwest', point: offsetPoint(lng, lat, -d, -d) },
    { direction: 'west', point: offsetPoint(lng, lat, -r, 0) },
    { direction: 'northwest', point: offsetPoint(lng, lat, -d, d) },
  ];
}

/**
 * Query the SVTM identify endpoint for a single point.
 * Returns the FormationName and ClassName, or null on failure.
 */
async function identifyAtPoint(
  point: [number, number],
  bbox: [number, number, number, number]
): Promise<{ formationName: string; className: string } | null> {
  const [lng, lat] = point;
  const [minLng, minLat, maxLng, maxLat] = bbox;

  const params = new URLSearchParams({
    geometry: `${lng},${lat}`,
    geometryType: 'esriGeometryPoint',
    sr: '4283',
    layers: 'all',
    tolerance: '5',
    mapExtent: `${minLng},${minLat},${maxLng},${maxLat}`,
    imageDisplay: '512,512,96',
    returnGeometry: 'false',
    f: 'json',
  });

  const url = `${SVTM_REST_URL}/identify?${params}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as IdentifyResult;

    if (data.results && data.results.length > 0) {
      const attrs = data.results[0].attributes;
      return {
        formationName: attrs.FormationName || 'Unknown',
        className: attrs.ClassName || 'Unknown',
      };
    }

    return null;
  } catch {
    // Network error, timeout, or parse failure — non-fatal
    return null;
  }
}

/**
 * Query vegetation formations at multiple points around a fire perimeter.
 *
 * Queries the SVTM identify endpoint at the centroid and 8 compass points.
 * Queries run in parallel for speed (~1–2s total).
 *
 * @param centroid - [lng, lat] of the fire perimeter centre
 * @param bbox - [minLng, minLat, maxLng, maxLat] bounding box of the perimeter
 * @param radiusM - Offset distance in metres for compass points (default: 500m)
 * @returns VegetationContext with formation data for each direction
 */
export async function queryVegetationContext(
  centroid: [number, number],
  bbox: [number, number, number, number],
  radiusM = 500
): Promise<VegetationContext | null> {
  // Expand bbox slightly to ensure all query points fall within the map extent
  const bufferLng = (bbox[2] - bbox[0]) * 0.5;
  const bufferLat = (bbox[3] - bbox[1]) * 0.5;
  const expandedBbox: [number, number, number, number] = [
    bbox[0] - bufferLng,
    bbox[1] - bufferLat,
    bbox[2] + bufferLng,
    bbox[3] + bufferLat,
  ];

  const samplePoints = buildSamplePoints(centroid, radiusM);

  // Run all 9 queries in parallel
  const results = await Promise.all(
    samplePoints.map(async ({ direction, point }) => ({
      direction,
      result: await identifyAtPoint(point, expandedBbox),
    }))
  );

  // Extract center result
  const centerResult = results.find((r) => r.direction === 'center')?.result;
  if (!centerResult) {
    // If even the center query failed, the service is likely down
    return null;
  }

  // Build surrounding map
  const surrounding: VegetationContext['surrounding'] = {};
  for (const { direction, result } of results) {
    if (direction !== 'center' && result) {
      surrounding[direction as CompassDirection] = result.formationName;
    }
  }

  // Collect unique formation names
  const allFormations = results
    .map((r) => r.result?.formationName)
    .filter((f): f is string => f != null && f !== 'Unknown');
  const uniqueFormations = [...new Set(allFormations)];

  return {
    centerFormation: centerResult.formationName,
    centerClassName: centerResult.className,
    surrounding,
    uniqueFormations,
    dataSource: 'NSW SVTM C2.0.M2.2 via ArcGIS REST',
  };
}

/**
 * Format a VegetationContext into a natural language description
 * suitable for inclusion in an AI image generation prompt.
 */
export function formatVegetationContextForPrompt(ctx: VegetationContext): string {
  const lines: string[] = [];

  lines.push(`Vegetation at the fire location: ${ctx.centerFormation}`);
  if (ctx.centerClassName && ctx.centerClassName !== ctx.centerFormation) {
    lines.push(`(specifically: ${ctx.centerClassName})`);
  }

  const directionEntries = Object.entries(ctx.surrounding) as Array<[CompassDirection, string]>;
  if (directionEntries.length > 0) {
    const spatialParts = directionEntries
      .filter(([, formation]) => formation !== ctx.centerFormation)
      .map(([dir, formation]) => `${dir}: ${formation}`);

    if (spatialParts.length > 0) {
      lines.push(`Surrounding vegetation varies: ${spatialParts.join('; ')}.`);
    } else {
      lines.push(`Vegetation is uniformly ${ctx.centerFormation} in all directions.`);
    }
  }

  if (ctx.uniqueFormations.length > 1) {
    lines.push(
      `This area contains a mix of ${ctx.uniqueFormations.length} vegetation formations: ${ctx.uniqueFormations.join(', ')}.`
    );
    lines.push(
      'Ensure the generated image shows the correct vegetation type in each part of the landscape — ' +
        'ridgelines may have drier forest, gullies may have wetter forest, and flat areas may be grassland or cleared.'
    );
  }

  return lines.join(' ');
}
