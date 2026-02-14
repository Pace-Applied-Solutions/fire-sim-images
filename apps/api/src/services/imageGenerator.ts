/**
 * Image generator service that orchestrates image generation using the configured provider.
 */

import type { InvocationContext } from '@azure/functions';
import type { ImageGenerationProvider, ImageGenOptions, ImageGenResult } from './imageGenerationProvider.js';
import { StableDiffusionProvider } from './stableDiffusionProvider.js';

export interface ImageGeneratorConfig {
  provider?: ImageGenerationProvider;
  defaultSize?: '1024x1024' | '1792x1024' | '1024x1792';
  defaultQuality?: 'standard' | 'high';
  defaultStyle?: 'natural' | 'vivid';
  maxRetries?: number;
  timeoutMs?: number;
}

export class ImageGeneratorService {
  private provider: ImageGenerationProvider;
  private config: Required<ImageGeneratorConfig>;

  constructor(
    private context: InvocationContext,
    config?: ImageGeneratorConfig
  ) {
    this.provider = config?.provider || new StableDiffusionProvider();
    this.config = {
      provider: this.provider,
      defaultSize: config?.defaultSize || '1024x1024',
      defaultQuality: config?.defaultQuality || 'high',
      defaultStyle: config?.defaultStyle || 'natural',
      maxRetries: config?.maxRetries || 3,
      timeoutMs: config?.timeoutMs || 60000, // 60 seconds
    };
  }

  /**
   * Generate an image from a prompt with retry logic.
   */
  async generateImage(
    prompt: string,
    options?: ImageGenOptions
  ): Promise<ImageGenResult> {
    const mergedOptions: ImageGenOptions = {
      size: options?.size || this.config.defaultSize,
      quality: options?.quality || this.config.defaultQuality,
      style: options?.style || this.config.defaultStyle,
      seed: options?.seed,
    };

    let lastError: Error | undefined;
    let attempt = 0;

    while (attempt < this.config.maxRetries) {
      attempt++;

      try {
        this.context.log('Generating image', {
          attempt,
          maxRetries: this.config.maxRetries,
          model: this.provider.modelId,
          size: mergedOptions.size,
          promptLength: prompt.length,
        });

        // Generate image with timeout
        const result = await this.withTimeout(
          this.provider.generateImage(prompt, mergedOptions),
          this.config.timeoutMs
        );

        this.context.log('Image generation successful', {
          attempt,
          model: result.metadata.model,
          generationTime: result.metadata.generationTime,
          promptHash: result.metadata.promptHash,
        });

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        this.context.warn('Image generation failed', {
          attempt,
          error: lastError.message,
          willRetry: attempt < this.config.maxRetries,
        });

        if (attempt < this.config.maxRetries) {
          // Exponential backoff: 1s, 4s, 16s
          const delayMs = Math.pow(4, attempt - 1) * 1000;
          await this.delay(delayMs);
        }
      }
    }

    throw lastError || new Error('Image generation failed after retries');
  }

  /**
   * Check if the provider is available and configured.
   */
  async isAvailable(): Promise<boolean> {
    return this.provider.isAvailable();
  }

  /**
   * Get the current provider's model ID.
   */
  getModelId(): string {
    return this.provider.modelId;
  }

  /**
   * Get the maximum number of concurrent requests the provider can handle.
   */
  getMaxConcurrent(): number {
    return this.provider.maxConcurrent;
  }

  /**
   * Execute a promise with a timeout.
   */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);
  }

  /**
   * Delay for a specified number of milliseconds.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
