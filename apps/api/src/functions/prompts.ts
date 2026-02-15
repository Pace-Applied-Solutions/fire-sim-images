import functions from '@azure/functions';
import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import type { GenerationRequest } from '@fire-sim/shared';
import { generatePrompts } from '@fire-sim/shared';

const { app } = functions;

/**
 * HTTP-triggered function to generate prompts for a fire scenario.
 * Accepts a GenerationRequest and returns an array of prompts for each requested viewpoint.
 */
export async function prompts(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('HTTP trigger function processing prompt generation request.');

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

    // Generate prompts
    const promptSet = generatePrompts(body);

    context.log('Prompt generation successful', {
      promptSetId: promptSet.id,
      templateVersion: promptSet.templateVersion,
      viewpointCount: promptSet.prompts.length,
    });

    // TODO: Store prompt set in Blob Storage under scenario-data/{scenarioId}/prompts.json
    // This will be implemented as part of Issue 8 (Image Generation Pipeline)
    // For now, we just return the prompts

    // Return the prompt array with metadata
    return {
      status: 200,
      jsonBody: {
        promptSetId: promptSet.id,
        templateVersion: promptSet.templateVersion,
        prompts: promptSet.prompts.map((p) => ({
          viewpoint: p.viewpoint,
          promptText: p.promptText,
          promptSetId: p.promptSetId,
          templateVersion: p.templateVersion,
        })),
        createdAt: promptSet.createdAt,
      },
    };
  } catch (error) {
    context.error('Error generating prompts:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      status: 500,
      jsonBody: {
        error: 'Failed to generate prompts',
        details: errorMessage,
      },
    };
  }
}

// Register the function with Azure Functions runtime
app.http('prompts', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'prompts',
  handler: prompts,
});
