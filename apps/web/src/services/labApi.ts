/**
 * API client for Prompt Lab image generation.
 * Supports SSE streaming for thinking text feedback.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export interface LabGenerationRequest {
  /** Full compiled prompt text */
  prompt: string;
  /** System instruction (for multi-perspective consistency) */
  systemInstruction?: string;
  /** Reference images as base64 data URLs */
  referenceImages: Array<{
    dataUrl: string;
    type: 'map_screenshot' | 'vegetation_overlay' | 'uploaded' | 'generated_output';
  }>;
  /** Image size */
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  /** Optional seed for reproducibility */
  seed?: number;
}

export interface LabGenerationResult {
  /** Generated image as data URL */
  dataUrl: string;
  /** Model thinking/reasoning text */
  thinkingText?: string;
  /** Generation metadata */
  metadata: {
    model: string;
    promptHash: string;
    generationTime: number;
    width: number;
    height: number;
    seed?: number;
  };
}

export interface LabGenerationCallbacks {
  /** Called when thinking text is updated during generation */
  onThinking?: (text: string) => void;
  /** Called when generation progress updates */
  onProgress?: (message: string) => void;
  /** Called when generation completes successfully */
  onComplete?: (result: LabGenerationResult) => void;
  /** Called if generation fails */
  onError?: (error: string) => void;
}

/**
 * Lab API client for single-image generation with SSE streaming.
 */
export class LabApiClient {
  /**
   * Generate a single image with SSE streaming support.
   * Returns a promise that resolves when generation completes.
   */
  async generateImage(
    request: LabGenerationRequest,
    callbacks?: LabGenerationCallbacks
  ): Promise<LabGenerationResult> {
    const url = `${API_BASE_URL}/lab/generate`;

    // Try SSE streaming first
    try {
      return await this.generateWithSSE(url, request, callbacks);
    } catch (error) {
      // If SSE fails, fall back to JSON
      console.warn('[LabApi] SSE failed, falling back to JSON:', error);
      return await this.generateWithJSON(url, request, callbacks);
    }
  }

  /**
   * Generate using SSE streaming (preferred for thinking text).
   */
  private async generateWithSSE(
    url: string,
    request: LabGenerationRequest,
    callbacks?: LabGenerationCallbacks
  ): Promise<LabGenerationResult> {
    return new Promise((resolve, reject) => {
      const eventSource = new EventSource(url);
      let result: LabGenerationResult | null = null;

      eventSource.addEventListener('thinking', (event) => {
        try {
          const data = JSON.parse(event.data);
          if (callbacks?.onThinking) {
            callbacks.onThinking(data.text);
          }
        } catch (err) {
          console.error('[LabApi] Failed to parse thinking event:', err);
        }
      });

      eventSource.addEventListener('result', (event) => {
        try {
          const data = JSON.parse(event.data);
          result = {
            dataUrl: data.dataUrl,
            thinkingText: data.thinkingText,
            metadata: data.metadata,
          };
          if (callbacks?.onComplete) {
            callbacks.onComplete(result);
          }
        } catch (err) {
          console.error('[LabApi] Failed to parse result event:', err);
        }
      });

      eventSource.addEventListener('error', (event) => {
        try {
          const data = JSON.parse((event as MessageEvent).data);
          const errorMessage = data.error || 'Unknown error';
          if (callbacks?.onError) {
            callbacks.onError(errorMessage);
          }
          reject(new Error(errorMessage));
        } catch (err) {
          const errorMessage = 'Connection error';
          if (callbacks?.onError) {
            callbacks.onError(errorMessage);
          }
          reject(new Error(errorMessage));
        } finally {
          eventSource.close();
        }
      });

      eventSource.addEventListener('done', () => {
        eventSource.close();
        if (result) {
          resolve(result);
        } else {
          const errorMessage = 'No result received';
          if (callbacks?.onError) {
            callbacks.onError(errorMessage);
          }
          reject(new Error(errorMessage));
        }
      });

      // Send the request
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(request),
      }).catch((err) => {
        eventSource.close();
        reject(err);
      });
    });
  }

  /**
   * Generate using JSON (fallback, no streaming).
   */
  private async generateWithJSON(
    url: string,
    request: LabGenerationRequest,
    callbacks?: LabGenerationCallbacks
  ): Promise<LabGenerationResult> {
    callbacks?.onProgress?.('Generating image...');

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to generate image' }));
      const errorMessage = error.error || `HTTP ${response.status}`;
      if (callbacks?.onError) {
        callbacks.onError(errorMessage);
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();

    if (callbacks?.onComplete) {
      callbacks.onComplete(result);
    }

    return result;
  }
}

// Export singleton instance
export const labApi = new LabApiClient();
