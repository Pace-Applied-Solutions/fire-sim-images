import '../setup.js';
import functions from '@azure/functions';
import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { GenerationOrchestrator } from '../services/generationOrchestrator.js';

const { app } = functions;

/**
 * HTTP-triggered function to get the final results of a generation request.
 * GET /api/generate/{scenarioId}/results
 * Returns: GenerationResult
 */
export async function getGenerationResults(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const scenarioId = request.params.scenarioId;

  if (!scenarioId) {
    return {
      status: 400,
      jsonBody: { error: 'Missing scenarioId parameter' },
    };
  }

  try {
    const orchestrator = new GenerationOrchestrator(context);
    const result = await orchestrator.getResults(scenarioId);

    if (!result) {
      return {
        status: 404,
        jsonBody: { error: 'Scenario not found' },
      };
    }

    if (result.status === 'pending' || result.status === 'in_progress') {
      return {
        status: 202,
        jsonBody: {
          ...result,
          message: 'Generation still in progress. Use the status endpoint to poll for updates.',
        },
      };
    }

    context.log('Results retrieved', {
      scenarioId,
      status: result.status,
      imageCount: result.images.length,
    });

    return {
      status: 200,
      jsonBody: result,
    };
  } catch (error) {
    context.error('Error retrieving generation results:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      status: 500,
      jsonBody: {
        error: 'Failed to retrieve generation results',
        details: errorMessage,
      },
    };
  }
}

// Register the function with Azure Functions runtime
app.http('getGenerationResults', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'generate/{scenarioId}/results',
  handler: getGenerationResults,
});
