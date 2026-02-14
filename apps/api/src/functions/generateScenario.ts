import functions from '@azure/functions';
import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import type { GenerationRequest, GenerationResult } from '@fire-sim/shared';
import { getFoundryConfig } from '../foundryConfig.ts';

const { app } = functions;

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

    const foundryConfig = await getFoundryConfig(context);
    context.log('Foundry config loaded.', {
      projectPath: foundryConfig.projectPath,
      projectRegion: foundryConfig.projectRegion,
      imageModel: foundryConfig.imageModel,
    });

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
