/**
 * API client for interacting with the image generation back-end.
 */

import type { GenerationRequest, GenerationResult, GeoContext } from '@fire-sim/shared';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export interface GenerationStartResponse {
  scenarioId: string;
  statusUrl: string;
  message: string;
}

export interface GenerationStatusResponse {
  scenarioId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: string;
  completedImages: number;
  failedImages: number;
  totalImages: number;
  /** Model thinking/reasoning text from Gemini 3 Pro */
  thinkingText?: string;
  createdAt: string;
  updatedAt: string;
  results?: {
    images: GenerationResult['images'];
    error?: string;
  };
}

/**
 * API client for image generation endpoints.
 */
export class GenerationApiClient {
  /**
   * Get geographic context for a fire perimeter.
   */
  async getGeoContext(geometry: { type: string; coordinates: unknown }): Promise<GeoContext> {
    const response = await fetch(`${API_BASE_URL}/geodata`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ geometry }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch geodata' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Start a new image generation request.
   */
  async startGeneration(request: GenerationRequest): Promise<GenerationStartResponse> {
    const response = await fetch(`${API_BASE_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to start generation' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Poll the status of a generation request.
   */
  async getGenerationStatus(scenarioId: string): Promise<GenerationStatusResponse> {
    const response = await fetch(`${API_BASE_URL}/generate/${scenarioId}/status`, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch status' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get the final results of a generation request.
   */
  async getGenerationResults(scenarioId: string): Promise<GenerationResult> {
    const response = await fetch(`${API_BASE_URL}/generate/${scenarioId}/results`, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch results' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Poll for generation completion with automatic retries.
   * Tolerates transient 404s during the first few polls (cold start / process restart).
   * @param scenarioId The scenario ID to poll
   * @param onProgress Callback for progress updates
   * @param pollIntervalMs Interval between polls in milliseconds (default: 2000)
   * @param maxPolls Maximum number of polls before timeout (default: 300, = 10 minutes)
   */
  async pollForCompletion(
    scenarioId: string,
    onProgress?: (status: GenerationStatusResponse) => void,
    pollIntervalMs = 2000,
    maxPolls = 300
  ): Promise<GenerationResult> {
    let polls = 0;
    let consecutive404s = 0;
    const MAX_INITIAL_404_RETRIES = 5; // Tolerate up to 5 consecutive 404s (cold start)

    while (polls < maxPolls) {
      try {
        const status = await this.getGenerationStatus(scenarioId);

        // Reset 404 counter on success
        consecutive404s = 0;

        if (onProgress) {
          onProgress(status);
        }

        if (status.status === 'completed' || status.status === 'failed') {
          return this.getGenerationResults(scenarioId);
        }
      } catch (error) {
        const isNotFound = error instanceof Error && error.message.includes('Scenario not found');

        if (isNotFound && consecutive404s < MAX_INITIAL_404_RETRIES) {
          consecutive404s++;
          console.warn(
            `Status poll returned 404 (attempt ${consecutive404s}/${MAX_INITIAL_404_RETRIES}), retrying...`
          );
          // Use increasing delay for 404 retries
          await this.delay(pollIntervalMs * consecutive404s);
          polls++;
          continue;
        }

        // Non-404 error or too many consecutive 404s — rethrow
        throw error;
      }

      polls++;
      await this.delay(pollIntervalMs);
    }

    throw new Error('Generation timed out after maximum polling attempts');
  }

  /**
   * Delay helper for polling.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export a singleton instance
export const generationApi = new GenerationApiClient();
