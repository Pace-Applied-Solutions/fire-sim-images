import functions from '@azure/functions';
import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import type { GenerationRequest, User } from '@fire-sim/shared';
import { GenerationOrchestrator } from '../services/generationOrchestrator.js';
import { withAuth } from '../middleware/auth';
import { checkScenarioQuota, consumeScenarioQuota } from '../services/quotaEnforcementService';
import { trackScenarioUsage, trackImageUsage } from '../services/stripeService';
import { getUserProfile } from '../services/userProfileService';

const { app } = functions;

/**
 * HTTP-triggered function to start a scenario generation request.
 * POST /api/generate
 * Returns: { scenarioId, statusUrl } (HTTP 202 Accepted)
 */
export async function generateScenario(
  request: HttpRequest,
  context: InvocationContext,
  user: User
): Promise<HttpResponseInit> {
  context.log('HTTP trigger function processing generation request.', { userId: user.id });

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

    // Check quota before generation
    const quotaCheck = await checkScenarioQuota(user.id);
    if (!quotaCheck.allowed) {
      return {
        status: 402, // Payment Required
        headers: {
          'X-Quota-Limit': quotaCheck.limits.scenarios?.toString() || '0',
          'X-Quota-Used': quotaCheck.currentUsage.scenarios.toString(),
          'X-Quota-Remaining': quotaCheck.quotaRemaining.toString(),
          'X-Overage-Credits': quotaCheck.overageCreditsAvailable.toString(),
        },
        jsonBody: {
          error: 'Quota exceeded',
          message: quotaCheck.reason,
          quota: {
            limit: quotaCheck.limits.scenarios,
            used: quotaCheck.currentUsage.scenarios,
            remaining: quotaCheck.quotaRemaining,
            overageCreditsAvailable: quotaCheck.overageCreditsAvailable,
          },
        },
      };
    }

    // Consume quota (either from monthly quota or overage pack)
    const imageCount = body.requestedViews.length;
    const consumeResult = await consumeScenarioQuota(user.id, imageCount);

    if (!consumeResult.success) {
      return {
        status: 402,
        jsonBody: {
          error: 'Failed to consume quota',
          message: consumeResult.message,
        },
      };
    }

    // Start generation
    const orchestrator = new GenerationOrchestrator(context);
    const scenarioId = await orchestrator.startGeneration(body);

    // Track usage in Stripe (async, don't block response)
    const profile = await getUserProfile(user.id);
    if (profile?.stripeCustomerId) {
      trackScenarioUsage(profile.stripeCustomerId, scenarioId).catch((error) => {
        context.warn('Failed to track scenario usage in Stripe:', error);
      });
      trackImageUsage(profile.stripeCustomerId, scenarioId, imageCount).catch((error) => {
        context.warn('Failed to track image usage in Stripe:', error);
      });
    }

    // Construct status URL
    const baseUrl = process.env.WEBSITE_HOSTNAME
      ? `https://${process.env.WEBSITE_HOSTNAME}`
      : 'http://localhost:7071';
    const statusUrl = `${baseUrl}/api/generate/${scenarioId}/status`;

    context.log('Generation started', { scenarioId, statusUrl, userId: user.id });

    // Include usage info in response headers
    const updatedQuota = await checkScenarioQuota(user.id);

    return {
      status: 202,
      headers: {
        'X-Quota-Limit': updatedQuota.limits.scenarios?.toString() || '0',
        'X-Quota-Used': updatedQuota.currentUsage.scenarios.toString(),
        'X-Quota-Remaining': updatedQuota.quotaRemaining.toString(),
        'X-Overage-Credits': updatedQuota.overageCreditsAvailable.toString(),
        'X-Used-Overage-Credit': consumeResult.usedOverageCredit ? 'true' : 'false',
      },
      jsonBody: {
        scenarioId,
        statusUrl,
        message: 'Generation started',
        quota: {
          limit: updatedQuota.limits.scenarios,
          used: updatedQuota.currentUsage.scenarios,
          remaining: updatedQuota.quotaRemaining,
          overageCreditsAvailable: updatedQuota.overageCreditsAvailable,
          usedOverageCredit: consumeResult.usedOverageCredit,
        },
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
  authLevel: 'anonymous', // Authenticated via middleware
  route: 'generate',
  handler: withAuth(generateScenario),
});
