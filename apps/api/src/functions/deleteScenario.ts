/**
 * Azure Function: Delete Scenario
 * DELETE /api/scenarios/{scenarioId}
 * 
 * Deletes a scenario and all its associated images and metadata.
 */

import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions';
import { BlobStorageService } from '../services/blobStorage';

export async function deleteScenario(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const scenarioId = request.params.scenarioId;
  context.log('Delete scenario request received', { scenarioId });

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
    
    // Check if scenario exists by trying to get its metadata
    try {
      await blobService.getMetadata(scenarioId);
    } catch (error) {
      return {
        status: 404,
        jsonBody: {
          error: 'Scenario not found',
          scenarioId,
        },
      };
    }

    // Delete the scenario
    await blobService.deleteScenario(scenarioId);

    return {
      status: 200,
      jsonBody: {
        message: 'Scenario deleted successfully',
        scenarioId,
      },
    };
  } catch (error) {
    context.error('Error deleting scenario', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Failed to delete scenario',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

app.http('deleteScenario', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'scenarios/{scenarioId}',
  handler: deleteScenario,
});
