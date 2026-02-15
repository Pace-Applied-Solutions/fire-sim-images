/**
 * Azure Function: List Scenarios
 * GET /api/scenarios
 * 
 * Returns a paginated list of past scenarios with metadata.
 */

import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions';
import { BlobStorageService } from '../services/blobStorage';
import type { ScenarioMetadata, ScenarioSummary } from '@fire-sim/shared';

export async function listScenarios(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('List scenarios request received');

  try {
    // Parse pagination parameters
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const cursor = url.searchParams.get('cursor') || undefined;

    // Get all scenarios from blob storage
    const blobService = new BlobStorageService(context);
    const scenarios = await blobService.listScenarios();

    // Convert to summaries and sort by timestamp (most recent first)
    const summaries: ScenarioSummary[] = scenarios
      .map(({ scenarioId, metadata }) => {
        try {
          const scenarioMetadata = metadata as ScenarioMetadata;
          return createScenarioSummary(scenarioId, scenarioMetadata);
        } catch (error) {
          context.warn(`Failed to create summary for scenario ${scenarioId}`, error);
          return null;
        }
      })
      .filter((s): s is ScenarioSummary => s !== null)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply cursor-based pagination
    let startIndex = 0;
    if (cursor) {
      const cursorIndex = summaries.findIndex((s) => s.id === cursor);
      if (cursorIndex >= 0) {
        startIndex = cursorIndex + 1;
      }
    }

    const paginatedResults = summaries.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < summaries.length;
    const nextCursor = hasMore ? paginatedResults[paginatedResults.length - 1]?.id : undefined;

    return {
      status: 200,
      jsonBody: {
        scenarios: paginatedResults,
        pagination: {
          limit,
          cursor: nextCursor,
          hasMore,
          total: summaries.length,
        },
      },
    };
  } catch (error) {
    context.error('Error listing scenarios', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Failed to list scenarios',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Create a scenario summary from full metadata.
 */
function createScenarioSummary(
  scenarioId: string,
  metadata: ScenarioMetadata
): ScenarioSummary {
  // Calculate centroid from perimeter
  const coordinates = metadata.perimeter.geometry.coordinates[0];
  const centroid = calculateCentroid(coordinates);

  // Find a representative thumbnail (prefer aerial, fallback to first available)
  const aerialImage = metadata.result.images.find((img) => img.viewPoint === 'aerial');
  const thumbnailUrl = aerialImage?.url || metadata.result.images[0]?.url || '';

  return {
    id: scenarioId,
    timestamp: metadata.result.createdAt,
    location: {
      centroid,
      placeName: undefined, // Reverse geocoding to be implemented in future enhancement
    },
    conditions: {
      temperature: metadata.inputs.temperature,
      windSpeed: metadata.inputs.windSpeed,
      windDirection: metadata.inputs.windDirection,
      humidity: metadata.inputs.humidity,
      intensity: metadata.inputs.intensity,
      fireDangerRating: metadata.inputs.fireDangerRating,
    },
    vegetation: metadata.geoContext.vegetationType,
    imageCount: metadata.result.images.length,
    thumbnailUrl,
    promptVersion: metadata.promptVersion,
  };
}

/**
 * Calculate centroid of a polygon.
 */
function calculateCentroid(coordinates: number[][]): [number, number] {
  let sumLng = 0;
  let sumLat = 0;
  const count = coordinates.length;

  for (const [lng, lat] of coordinates) {
    sumLng += lng;
    sumLat += lat;
  }

  return [sumLng / count, sumLat / count];
}

app.http('listScenarios', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'scenarios',
  handler: listScenarios,
});
