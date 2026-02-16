import functions from '@azure/functions';
import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { GenerationOrchestrator } from '../services/generationOrchestrator.js';

const { app } = functions;

/**
 * HTTP-triggered function to get the status of a generation request.
 * GET /api/generate/{scenarioId}/status
 * Returns: { status, progress, results? }
 */
export async function getGenerationStatus(
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
    const progress = await orchestrator.getStatus(scenarioId);

    if (!progress) {
      return {
        status: 404,
        jsonBody: { error: 'Scenario not found' },
      };
    }

    const response = {
      scenarioId: progress.scenarioId,
      status: progress.status,
      progress: `${progress.completedImages}/${progress.totalImages} images`,
      completedImages: progress.completedImages,
      failedImages: progress.failedImages,
      totalImages: progress.totalImages,
      thinkingText: progress.thinkingText,
      createdAt: progress.createdAt,
      updatedAt: progress.updatedAt,
      // Always include partial images AND anchorImage so frontend can render progressively
      results: { 
        images: progress.images || [], 
        anchorImage: progress.anchorImage,
        error: progress.error 
      },
    };

    context.log('Status retrieved', {
      scenarioId,
      status: progress.status,
      progress: `${progress.completedImages}/${progress.totalImages}`,
    });

    return {
      status: 200,
      jsonBody: response,
    };
  } catch (error) {
    context.error('Error retrieving generation status:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      status: 500,
      jsonBody: {
        error: 'Failed to retrieve generation status',
        details: errorMessage,
      },
    };
  }
}

// Register the function with Azure Functions runtime
app.http('getGenerationStatus', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'generate/{scenarioId}/status',
  handler: getGenerationStatus,
});
