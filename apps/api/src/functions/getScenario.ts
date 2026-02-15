/**
 * Azure Function: Get Scenario
 * GET /api/scenarios/{scenarioId}
 *
 * Returns complete metadata for a specific scenario.
 */

import {
  app,
  type HttpRequest,
  type HttpResponseInit,
  type InvocationContext,
} from '@azure/functions';
import { BlobStorageService } from '../services/blobStorage.js';

export async function getScenario(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const scenarioId = request.params.scenarioId;
  context.log('Get scenario request received', { scenarioId });

  if (!scenarioId) {
    return {
      status: 400,
      jsonBody: {
        error: 'Scenario ID is required',
      },
    };
  }

  try {
    const blobService = new BlobStorageService(context);
    const metadata = await blobService.getMetadata(scenarioId);

    return {
      status: 200,
      jsonBody: metadata,
    };
  } catch (error) {
    context.error('Error fetching scenario', error);

    // Check if it's a 404 error
    if (error instanceof Error && error.message.includes('BlobNotFound')) {
      return {
        status: 404,
        jsonBody: {
          error: 'Scenario not found',
          scenarioId,
        },
      };
    }

    return {
      status: 500,
      jsonBody: {
        error: 'Failed to fetch scenario',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

app.http('getScenario', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'scenarios/{scenarioId}',
  handler: getScenario,
});
