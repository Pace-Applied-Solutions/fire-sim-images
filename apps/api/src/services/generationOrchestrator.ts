/**
 * Generation orchestrator service that manages the full image generation pipeline.
 * Orchestrates: geodata lookup -> prompt generation -> image generation -> blob storage.
 */

import type { InvocationContext } from '@azure/functions';
import type { GenerationRequest, GenerationResult, GeneratedImage, ViewPoint, ScenarioMetadata } from '@fire-sim/shared';
import { generatePrompts } from '@fire-sim/shared';
import { v4 as uuidv4 } from 'uuid';
import { ImageGeneratorService } from './imageGenerator.js';
import { BlobStorageService } from './blobStorage.js';

export interface GenerationProgress {
  scenarioId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  totalImages: number;
  completedImages: number;
  failedImages: number;
  images: GeneratedImage[];
  error?: string;
  createdAt: string;
  updatedAt: string;
}

// In-memory store for generation progress (would use Durable Functions state in production)
const progressStore = new Map<string, GenerationProgress>();

export class GenerationOrchestrator {
  private imageGenerator: ImageGeneratorService;
  private blobStorage: BlobStorageService;

  constructor(private context: InvocationContext) {
    this.imageGenerator = new ImageGeneratorService(context);
    this.blobStorage = new BlobStorageService(context);
  }

  /**
   * Start a new generation request and return the scenario ID.
   */
  async startGeneration(request: GenerationRequest): Promise<string> {
    const scenarioId = uuidv4();
    const timestamp = new Date().toISOString();

    // Initialize progress tracking
    const progress: GenerationProgress = {
      scenarioId,
      status: 'pending',
      totalImages: request.requestedViews.length,
      completedImages: 0,
      failedImages: 0,
      images: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    progressStore.set(scenarioId, progress);

    this.context.log('Generation request started', {
      scenarioId,
      requestedViews: request.requestedViews,
      totalImages: progress.totalImages,
    });

    // Start generation asynchronously (don't await)
    this.executeGeneration(scenarioId, request).catch((error) => {
      this.context.error('Generation orchestration failed', { scenarioId, error });
    });

    return scenarioId;
  }

  /**
   * Get the current status of a generation request.
   */
  getStatus(scenarioId: string): GenerationProgress | undefined {
    return progressStore.get(scenarioId);
  }

  /**
   * Get the final results of a completed generation request.
   */
  async getResults(scenarioId: string): Promise<GenerationResult | undefined> {
    const progress = progressStore.get(scenarioId);
    if (!progress) {
      return undefined;
    }

    const result: GenerationResult = {
      id: scenarioId,
      status: progress.status,
      images: progress.images,
      createdAt: progress.createdAt,
      completedAt: progress.status === 'completed' || progress.status === 'failed' 
        ? progress.updatedAt 
        : undefined,
      error: progress.error,
    };

    return result;
  }

  /**
   * Execute the full generation pipeline.
   */
  private async executeGeneration(
    scenarioId: string,
    request: GenerationRequest
  ): Promise<void> {
    const progress = progressStore.get(scenarioId)!;
    progress.status = 'in_progress';
    progress.updatedAt = new Date().toISOString();

    try {
      // Step 1: Generate prompts for all viewpoints
      this.context.log('Generating prompts', { scenarioId });
      const promptSet = generatePrompts(request);

      // Step 2: Generate images for each viewpoint
      // Enforce max 10 images per scenario
      const maxImages = 10;
      const viewpointsToGenerate = request.requestedViews.slice(0, maxImages);

      this.context.log('Starting image generation', {
        scenarioId,
        totalViewpoints: viewpointsToGenerate.length,
        maxConcurrent: this.imageGenerator.getMaxConcurrent(),
      });

      // Generate images with concurrency control
      const results = await this.generateImagesWithConcurrency(
        scenarioId,
        promptSet.prompts,
        viewpointsToGenerate,
        this.imageGenerator.getMaxConcurrent()
      );

      // Step 3: Upload images to blob storage and generate SAS URLs
      const images: GeneratedImage[] = [];
      let totalCost = 0;

      for (const result of results) {
        if (result.status === 'fulfilled') {
          const { viewpoint, imageData, metadata } = result.value as {
            viewpoint: ViewPoint;
            imageData: Buffer | string;
            metadata: {
              model: string;
              promptHash: string;
              generationTime: number;
              width: number;
              height: number;
              seed?: number;
            };
          };

          try {
            // Upload to blob storage
            const blobUrl = await this.blobStorage.uploadImage(
              scenarioId,
              viewpoint,
              imageData as Buffer,
              {
                contentType: 'image/png',
                metadata: {
                  model: metadata.model,
                  promptHash: metadata.promptHash,
                  generationTime: metadata.generationTime.toString(),
                },
              }
            );

            // Generate SAS URL for 24-hour access
            const sasUrl = await this.blobStorage.generateSASUrl(blobUrl, {
              expiresInHours: 24,
              permissions: 'r',
            });

            const generatedImage: GeneratedImage = {
              viewPoint: viewpoint,
              url: sasUrl,
              metadata: {
                width: metadata.width,
                height: metadata.height,
                prompt: promptSet.prompts.find((p) => p.viewpoint === viewpoint)?.promptText || '',
                model: metadata.model,
                seed: metadata.seed,
                generatedAt: new Date().toISOString(),
              },
            };

            images.push(generatedImage);
            progress.completedImages++;

            // Estimate cost (approximate $0.04 per image for DALL-E 3 / Stable Diffusion)
            totalCost += 0.04;

            this.context.log('Image generated and uploaded', {
              scenarioId,
              viewpoint,
              progress: `${progress.completedImages}/${progress.totalImages}`,
            });
          } catch (uploadError) {
            this.context.error('Failed to upload image', {
              scenarioId,
              viewpoint,
              error: uploadError,
            });
            progress.failedImages++;
          }
        } else {
          this.context.error('Image generation failed', {
            scenarioId,
            viewpoint: result.reason?.viewpoint,
            error: result.reason?.error,
          });
          progress.failedImages++;
        }
      }

      // Step 4: Store complete scenario metadata for gallery
      const scenarioMetadata: ScenarioMetadata = {
        id: scenarioId,
        perimeter: request.perimeter,
        inputs: request.inputs,
        geoContext: request.geoContext,
        requestedViews: request.requestedViews,
        result: {
          id: scenarioId,
          status: progress.status,
          images,
          createdAt: progress.createdAt,
          completedAt: new Date().toISOString(),
        },
        promptVersion: promptSet.templateVersion,
      };

      await this.blobStorage.uploadMetadata(scenarioId, scenarioMetadata);

      // Update progress
      progress.images = images;
      progress.status = progress.failedImages === progress.totalImages ? 'failed' : 'completed';
      progress.updatedAt = new Date().toISOString();

      if (progress.failedImages > 0 && progress.completedImages > 0) {
        progress.error = `Partial success: ${progress.completedImages} succeeded, ${progress.failedImages} failed`;
      }

      this.context.log('Generation completed', {
        scenarioId,
        status: progress.status,
        completedImages: progress.completedImages,
        failedImages: progress.failedImages,
        estimatedCost: totalCost,
      });
    } catch (error) {
      this.context.error('Generation pipeline failed', { scenarioId, error });
      progress.status = 'failed';
      progress.error = error instanceof Error ? error.message : 'Unknown error';
      progress.updatedAt = new Date().toISOString();
    }
  }

  /**
   * Generate images with concurrency control.
   */
  private async generateImagesWithConcurrency(
    scenarioId: string,
    prompts: Array<{ viewpoint: ViewPoint; promptText: string }>,
    viewpoints: ViewPoint[],
    maxConcurrent: number
  ): Promise<Array<PromiseSettledResult<{
    viewpoint: ViewPoint;
    imageData: Buffer | string;
    metadata: {
      model: string;
      promptHash: string;
      generationTime: number;
      width: number;
      height: number;
      seed?: number;
    };
  }>>> {
    const tasks = viewpoints.map(async (viewpoint) => {
      const prompt = prompts.find((p) => p.viewpoint === viewpoint);
      if (!prompt) {
        throw new Error(`No prompt found for viewpoint: ${viewpoint}`);
      }

      try {
        const result = await this.imageGenerator.generateImage(prompt.promptText);
        return {
          viewpoint,
          imageData: result.imageData,
          metadata: result.metadata,
        };
      } catch (error) {
        throw {
          viewpoint,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });

    // Execute with concurrency control
    const results: Array<PromiseSettledResult<{
      viewpoint: ViewPoint;
      imageData: Buffer | string;
      metadata: {
        model: string;
        promptHash: string;
        generationTime: number;
        width: number;
        height: number;
        seed?: number;
      };
    }>> = [];
    for (let i = 0; i < tasks.length; i += maxConcurrent) {
      const batch = tasks.slice(i, i + maxConcurrent);
      const batchResults = await Promise.allSettled(batch);
      results.push(...batchResults);

      this.context.log('Batch completed', {
        scenarioId,
        batchIndex: Math.floor(i / maxConcurrent) + 1,
        totalBatches: Math.ceil(tasks.length / maxConcurrent),
      });
    }

    return results;
  }
}
