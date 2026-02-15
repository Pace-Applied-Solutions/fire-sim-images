import functions from '@azure/functions';
import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { createLogger } from '../utils/logger.js';
import { globalUsageTracker } from '../utils/costTracking.js';

const { app } = functions;

/**
 * Admin endpoint to get usage summary.
 * GET /api/admin/usage-summary
 * 
 * Security: Requires function-level authentication.
 * TODO: Add role-based access control in Issue 12.
 */
export async function getUsageSummary(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const logger = createLogger(context);
  logger.info('Usage summary requested');

  try {
    // Get date from query parameter or use today
    const dateParam = request.query.get('date');
    const date = dateParam ? new Date(dateParam) : new Date();

    // Validate date
    if (isNaN(date.getTime())) {
      return {
        status: 400,
        jsonBody: {
          error: 'Invalid date parameter. Use ISO 8601 format (YYYY-MM-DD).',
        },
      };
    }

    // Get daily summary
    const summary = globalUsageTracker.getDailySummary(date);

    logger.info('Usage summary retrieved', {
      date: summary.date,
      totalScenarios: summary.totalScenarios,
      totalCost: summary.totalCost,
    });

    return {
      status: 200,
      jsonBody: summary,
    };
  } catch (error) {
    logger.error('Failed to retrieve usage summary', error instanceof Error ? error : undefined);
    
    return {
      status: 500,
      jsonBody: {
        error: 'Failed to retrieve usage summary',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

// Register the function with function-level authentication
// This requires an API key to access the endpoint
app.http('getUsageSummary', {
  methods: ['GET'],
  authLevel: 'function', // Requires function key for authentication
  route: 'admin/usage-summary',
  handler: getUsageSummary,
});
