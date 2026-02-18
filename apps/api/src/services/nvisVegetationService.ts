/**
 * NVIS (National Vegetation Information System) vegetation query service.
 *
 * Queries the NVIS MVS WMS GetFeatureInfo endpoint to identify vegetation
 * subgroups at geographic points around a fire perimeter. This replaces the
 * NSW-only SVTM ArcGIS REST identify approach with a national WMS-based
 * alternative.
 *
 * Data source: Australian Government DCCEEW NVIS 6.0 (CC-BY 4.0)
 * https://gis.environment.gov.au/gispubmap/ogc_services/NVIS_ext_mvs/MapServer/WMSServer
 */

import { NVIS_WMS_MVS_URL, getNvisDescriptor } from '@fire-sim/shared';
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

/**
 * Offset a geographic point by approximate metres using small-angle approximation.
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
 */
function buildSamplePoints(
  centroid: [number, number],
  radiusM: number
): Array<{ direction: CompassDirection | 'center'; point: [number, number] }> {
  const [lng, lat] = centroid;
  const r = radiusM;
  const d = r * Math.SQRT1_2;

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
 * Query NVIS MVS WMS GetFeatureInfo for a single point.
 *
 * Builds a small BBOX around the point and queries the centre pixel.
 * Returns the MVS subgroup name or null on failure.
 */
async function identifyAtPoint(
  point: [number, number]
): Promise<{ formationName: string; className: string } | null> {
  const [lng, lat] = point;

  // Small bbox around the point (~200m). WMS 1.3.0 with EPSG:4326 uses lat/lng axis order.
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

  const url = `${NVIS_WMS_MVS_URL}?${params}`;
  console.log('[NVIS] Querying point:', { lng, lat, url });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    console.log('[NVIS] Response status:', response.status, response.statusText);

    if (!response.ok) {
      console.warn('[NVIS] Bad response:', response.status, response.statusText);
      return null;
    }

    const data = (await response.json()) as Record<string, unknown>;
    console.log('[NVIS] Response data:', JSON.stringify(data, null, 2));

    // ESRI WMS GetFeatureInfo JSON: features array or results array
    const features = (data?.features ?? data?.results) as
      | Array<{
          properties?: Record<string, string>;
          attributes?: Record<string, string>;
        }>
      | undefined;
    
    console.log('[NVIS] Features found:', features?.length ?? 0);
    
    if (features && features.length > 0) {
      const props = features[0].properties ?? features[0].attributes ?? {};
      console.log('[NVIS] Feature properties:', props);
      
      const mvsName =
        props['Raster.MVS_NAME'] ??
        props['MVS_NAME'] ??
        props['Raster.Pixel Value'] ??
        props['Pixel Value'] ??
        props['MVS_100_NA'] ??
        props['Label'] ??
        'Unknown';
      const mvgName = props['Raster.MVG_NAME'] ?? props['MVG_NAME'] ?? props['MVG'] ?? mvsName;

      console.log('[NVIS] Extracted vegetation:', { formationName: mvsName, className: mvgName });

      return {
        formationName: String(mvsName),
        className: String(mvgName),
      };
    }

    console.warn('[NVIS] No features in response');
    return null;
  } catch (error) {
    console.error('[NVIS] Query error:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Query NVIS vegetation context at multiple points around a fire perimeter.
 *
 * Queries the NVIS MVS WMS GetFeatureInfo endpoint at the centroid and 8 compass
 * points. Queries run in parallel for speed.
 *
 * @param centroid - [lng, lat] of the fire perimeter centre
 * @param _bbox - bounding box (unused for NVIS WMS but kept for API compatibility)
 * @param radiusM - Offset distance in metres for compass points (default: 500m)
 * @returns VegetationContext with formation data for each direction
 */
export async function queryNvisVegetationContext(
  centroid: [number, number],
  _bbox: [number, number, number, number],
  radiusM = 500
): Promise<VegetationContext | null> {
  console.log('[NVIS] Starting vegetation context query:', { centroid, radiusM });
  
  const samplePoints = buildSamplePoints(centroid, radiusM);
  console.log('[NVIS] Sample points built:', samplePoints.length);

  const results = await Promise.all(
    samplePoints.map(async ({ direction, point }) => ({
      direction,
      result: await identifyAtPoint(point),
    }))
  );

  console.log('[NVIS] Query results:', results.map(r => ({ dir: r.direction, hasResult: !!r.result })));

  const centerResult = results.find((r) => r.direction === 'center')?.result;
  if (!centerResult) {
    console.warn('[NVIS] Center query failed - returning null');
    return null;
  }

  console.log('[NVIS] Center result:', centerResult);

  const surrounding: VegetationContext['surrounding'] = {};
  for (const { direction, result } of results) {
    if (direction !== 'center' && result) {
      surrounding[direction as CompassDirection] = result.formationName;
    }
  }

  const allFormations = results
    .map((r) => r.result?.formationName)
    .filter((f): f is string => f != null && f !== 'Unknown');
  const uniqueFormations = [...new Set(allFormations)];

  console.log('[NVIS] Final context:', {
    centerFormation: centerResult.formationName,
    centerClassName: centerResult.className,
    uniqueFormationsCount: uniqueFormations.length,
    uniqueFormations,
  });

  return {
    centerFormation: centerResult.formationName,
    centerClassName: centerResult.className,
    surrounding,
    uniqueFormations,
    dataSource: 'NVIS MVS 6.0 via WMS GetFeatureInfo (DCCEEW)',
  };
}

/**
 * Format an NVIS VegetationContext into a natural language description
 * suitable for inclusion in an AI image generation prompt.
 */
export function formatNvisVegetationContextForPrompt(ctx: VegetationContext): string {
  const lines: string[] = [];

  const descriptor = getNvisDescriptor(ctx.centerFormation);
  lines.push(`Vegetation at the fire location: ${ctx.centerFormation}.`);
  lines.push(`Description: ${descriptor}`);

  if (ctx.centerClassName && ctx.centerClassName !== ctx.centerFormation) {
    lines.push(`(Major Vegetation Group: ${ctx.centerClassName})`);
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
      `This area contains a mix of ${ctx.uniqueFormations.length} vegetation types: ${ctx.uniqueFormations.join(', ')}.`
    );
    lines.push(
      'Ensure the generated image shows the correct vegetation type in each part of the landscape — ' +
        'ridgelines may have drier forest, gullies may have wetter forest, and flat areas may be grassland or cleared.'
    );
  }

  return lines.join(' ');
}
