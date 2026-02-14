import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { GenerationRequest, GenerationResult } from '@fire-sim/shared';

/**
 * HTTP-triggered function to handle scenario generation requests.
 * This is a placeholder implementation for the Azure Functions v4 programming model.
 */
export async function generateScenario(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('HTTP trigger function processed a request for scenario generation.');

  try {
    const body = (await request.json()) as GenerationRequest;

    // Validate request
    if (!body.perimeter || !body.inputs || !body.requestedViews) {
      return {
        status: 400,
        jsonBody: { error: 'Missing required fields' },
      };
    }

    // Placeholder response
    const result: GenerationResult = {
      id: crypto.randomUUID(),
      status: 'pending',
      images: [],
      createdAt: new Date().toISOString(),
    };

    context.log(`Created scenario generation request: ${result.id}`);

    return {
      status: 202,
      jsonBody: result,
    };
  } catch (error) {
    context.error('Error processing generation request:', error);
    return {
      status: 500,
      jsonBody: { error: 'Internal server error' },
    };
  }
}

// Register the function with Azure Functions runtime
app.http('generateScenario', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: generateScenario,
});
