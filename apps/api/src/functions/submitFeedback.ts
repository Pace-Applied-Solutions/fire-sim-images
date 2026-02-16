import '../setup.js';
/**
 * Azure Function: Submit Feedback
 * POST /api/scenarios/{scenarioId}/feedback
 *
 * Allows trainers to provide feedback on generated images for quality assessment.
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import type { ImageFeedback } from '@fire-sim/shared';
import { BlobStorageService } from '../services/blobStorage.js';
import { createLogger } from '../utils/logger.js';

interface FeedbackRequest {
  imageUrl: string;
  viewpoint: string;
  ratings: {
    realism: number;
    accuracy: number;
    usefulness: number;
  };
  comments?: string;
}

/**
 * Validate feedback ratings.
 */
function validateRatings(ratings: FeedbackRequest['ratings']): string[] {
  const errors: string[] = [];

  if (ratings.realism < 1 || ratings.realism > 5) {
    errors.push('Realism rating must be between 1 and 5');
  }
  if (ratings.accuracy < 1 || ratings.accuracy > 5) {
    errors.push('Accuracy rating must be between 1 and 5');
  }
  if (ratings.usefulness < 1 || ratings.usefulness > 5) {
    errors.push('Usefulness rating must be between 1 and 5');
  }

  return errors;
}

/**
 * Submit feedback handler.
 */
export async function submitFeedback(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const logger = createLogger(context);

  try {
    const scenarioId = request.params.scenarioId;
    if (!scenarioId) {
      return {
        status: 400,
        jsonBody: { error: 'Scenario ID is required' },
      };
    }

    // Parse request body
    const body = (await request.json()) as FeedbackRequest;

    // Validate required fields
    if (!body.imageUrl || !body.viewpoint || !body.ratings) {
      return {
        status: 400,
        jsonBody: { error: 'imageUrl, viewpoint, and ratings are required' },
      };
    }

    // Validate ratings
    const errors = validateRatings(body.ratings);
    if (errors.length > 0) {
      return {
        status: 400,
        jsonBody: { error: 'Invalid ratings', details: errors },
      };
    }

    // Get user information (from authentication context if available)
    // For MVP, use a placeholder - in production, extract from JWT or session
    const trainerId = request.headers.get('x-user-id') || 'anonymous';

    // Create feedback object
    const feedback: ImageFeedback = {
      scenarioId,
      imageUrl: body.imageUrl,
      viewpoint: body.viewpoint as any,
      trainerId,
      timestamp: new Date().toISOString(),
      ratings: body.ratings,
      comments: body.comments,
    };

    // Store feedback in blob storage
    const blobStorage = new BlobStorageService(context);
    const feedbackKey = `${scenarioId}/feedback/${body.viewpoint}-${Date.now()}`;

    await blobStorage.uploadMetadata(feedbackKey, feedback);

    logger.info('Feedback submitted', {
      scenarioId,
      viewpoint: body.viewpoint,
      trainerId,
      ratings: body.ratings,
    });

    return {
      status: 201,
      jsonBody: {
        message: 'Feedback submitted successfully',
        feedbackId: feedbackKey,
      },
    };
  } catch (error) {
    logger.error('Failed to submit feedback', error instanceof Error ? error : undefined);

    return {
      status: 500,
      jsonBody: { error: 'Failed to submit feedback' },
    };
  }
}

app.http('submitFeedback', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'scenarios/{scenarioId}/feedback',
  handler: submitFeedback,
});
