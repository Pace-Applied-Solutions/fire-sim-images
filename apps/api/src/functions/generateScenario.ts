import functions from '@azure/functions';
import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import type { GenerationRequest } from '@fire-sim/shared';
import { GenerationOrchestrator } from '../services/generationOrchestrator.js';

const { app } = functions;

/**
 * HTTP-triggered function to start a scenario generation request.
 * POST /api/generate
 * Returns: { scenarioId, statusUrl } (HTTP 202 Accepted)
 */
export async function generateScenario(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('HTTP trigger function processing generation request.');

  try {
    const body = (await request.json()) as GenerationRequest;

    // Validate request
    if (!body.perimeter || !body.inputs || !body.geoContext || !body.requestedViews) {
      return {
        status: 400,
        jsonBody: {
          error: 'Missing required fields: perimeter, inputs, geoContext, or requestedViews',
        },
      };
    }

    if (body.requestedViews.length === 0) {
      return {
        status: 400,
        jsonBody: { error: 'At least one viewpoint must be requested' },
      };
    }

    if (body.requestedViews.length > 10) {
      return {
        status: 400,
        jsonBody: { error: 'Maximum 10 viewpoints allowed per scenario' },
      };
    }

    // Start generation
    const orchestrator = new GenerationOrchestrator(context);
    const scenarioId = await orchestrator.startGeneration(body);

    // Construct status URL
    const baseUrl = process.env.WEBSITE_HOSTNAME
      ? `https://${process.env.WEBSITE_HOSTNAME}`
      : 'http://localhost:7071';
    const statusUrl = `${baseUrl}/api/generate/${scenarioId}/status`;

    context.log('Generation started', { scenarioId, statusUrl });

    return {
      status: 202,
      jsonBody: {
        scenarioId,
        statusUrl,
        message: 'Generation started',
      },
    };
  } catch (error) {
    context.error('Error processing generation request:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      status: 500,
      jsonBody: {
        error: 'Failed to start generation',
        details: errorMessage,
      },
    };
  }
}

// Register the function with Azure Functions runtime
app.http('generateScenario', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'generate',
  handler: generateScenario,
});
