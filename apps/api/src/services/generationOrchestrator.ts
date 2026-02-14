/**
 * Generation orchestrator service that manages the full image generation pipeline.
 * Orchestrates: geodata lookup -> prompt generation -> image generation -> blob storage.
 */

import type { InvocationContext } from '@azure/functions';
import type { GenerationRequest, GenerationResult, GeneratedImage, ViewPoint } from '@fire-sim/shared';
import { generatePrompts } from '@fire-sim/shared';
import { v4 as uuidv4 } from 'uuid';
import { ImageGeneratorService } from './imageGenerator.js';
import { BlobStorageService } from './blobStorage.js';
import { ConsistencyValidator } from '../validation/consistencyValidator.js';

export interface GenerationProgress {
  scenarioId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  totalImages: number;
  completedImages: number;
  failedImages: number;
  images: GeneratedImage[];
  anchorImage?: GeneratedImage;
  seed?: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

// In-memory store for generation progress (would use Durable Functions state in production)
const progressStore = new Map<string, GenerationProgress>();

export class GenerationOrchestrator {
  private imageGenerator: ImageGeneratorService;
  private blobStorage: BlobStorageService;
  private consistencyValidator: ConsistencyValidator;

  constructor(private context: InvocationContext) {
    this.imageGenerator = new ImageGeneratorService(context);
    this.blobStorage = new BlobStorageService(context);
    this.consistencyValidator = new ConsistencyValidator();
  }

  /**
   * Start a new generation request and return the scenario ID.
   */
  async startGeneration(request: GenerationRequest): Promise<string> {
    const scenarioId = uuidv4();
    const timestamp = new Date().toISOString();

    // Generate seed if not provided (for consistency across viewpoints)
    const seed = request.seed ?? Math.floor(Math.random() * 1000000);

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
      seed,
    });

    // Start generation asynchronously (don't await)
    this.executeGeneration(scenarioId, { ...request, seed }).catch((error) => {
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
      anchorImage: progress.anchorImage,
      seed: progress.seed,
      createdAt: progress.createdAt,
      completedAt: progress.status === 'completed' || progress.status === 'failed' 
        ? progress.updatedAt 
        : undefined,
      error: progress.error,
    };

    return result;
  }

  /**
   * Execute the full generation pipeline with anchor image strategy.
   * Pass 1: Generate aerial view as anchor
   * Pass 2: Generate remaining views using anchor as reference
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

      // Step 2: Determine anchor viewpoint (prefer aerial, fallback to first available)
      const maxImages = 10;
      const viewpointsToGenerate = request.requestedViews.slice(0, maxImages);
      const anchorViewpoint = viewpointsToGenerate.includes('aerial')
        ? 'aerial'
        : viewpointsToGenerate.includes('helicopter_above')
          ? 'helicopter_above'
          : viewpointsToGenerate[0];

      this.context.log('Starting anchor image generation', {
        scenarioId,
        anchorViewpoint,
        seed: request.seed,
      });

      // Step 3: Generate anchor image first
      let anchorImage: GeneratedImage | undefined;
      let anchorImageData: Buffer | undefined;
      const anchorPrompt = promptSet.prompts.find((p) => p.viewpoint === anchorViewpoint);

      if (anchorPrompt) {
        try {
          const result = await this.imageGenerator.generateImage(anchorPrompt.promptText, {
            seed: request.seed,
          });

          // Upload anchor image
          const blobUrl = await this.blobStorage.uploadImage(
            scenarioId,
            anchorViewpoint,
            result.imageData as Buffer,
            {
              contentType: 'image/png',
              metadata: {
                model: result.metadata.model,
                promptHash: result.metadata.promptHash,
                generationTime: result.metadata.generationTime.toString(),
                isAnchor: 'true',
              },
            }
          );

          const sasUrl = await this.blobStorage.generateSASUrl(blobUrl, {
            expiresInHours: 24,
            permissions: 'r',
          });

          anchorImage = {
            viewPoint: anchorViewpoint,
            url: sasUrl,
            metadata: {
              width: result.metadata.width,
              height: result.metadata.height,
              prompt: anchorPrompt.promptText,
              model: result.metadata.model,
              seed: request.seed,
              generatedAt: new Date().toISOString(),
              isAnchor: true,
            },
          };

          anchorImageData = result.imageData as Buffer;
          progress.completedImages++;
          progress.anchorImage = anchorImage;
          progress.seed = request.seed;

          this.context.log('Anchor image generated', {
            scenarioId,
            viewpoint: anchorViewpoint,
          });
        } catch (error) {
          this.context.error('Anchor image generation failed', {
            scenarioId,
            viewpoint: anchorViewpoint,
            error,
          });
          progress.failedImages++;
        }
      }

      // Step 4: Generate remaining viewpoints with anchor reference
      const remainingViewpoints = viewpointsToGenerate.filter(
        (v) => v !== anchorViewpoint
      );

      this.context.log('Starting derived views generation', {
        scenarioId,
        totalViewpoints: remainingViewpoints.length,
        maxConcurrent: this.imageGenerator.getMaxConcurrent(),
        usingAnchorReference: !!anchorImageData,
      });

      const results = await this.generateImagesWithReference(
        scenarioId,
        promptSet.prompts,
        remainingViewpoints,
        this.imageGenerator.getMaxConcurrent(),
        request.seed,
        anchorImageData,
        request.mapScreenshots
      );

      // Step 5: Upload images to blob storage and generate SAS URLs
      const images: GeneratedImage[] = anchorImage ? [anchorImage] : [];
      let totalCost = anchorImage ? 0.04 : 0;

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
                  usedReference: !!anchorImageData ? 'true' : 'false',
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
                seed: request.seed,
                generatedAt: new Date().toISOString(),
                usedReferenceImage: !!anchorImageData,
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

      // Step 6: Validate consistency
      let validationResult;
      if (images.length > 1) {
        this.context.log('Running consistency validation', { scenarioId });
        validationResult = this.consistencyValidator.validateImageSet(
          images,
          request.inputs,
          anchorImage
        );

        const report = this.consistencyValidator.generateReport(validationResult);
        this.context.log('Consistency validation complete', {
          scenarioId,
          score: validationResult.score,
          passed: validationResult.passed,
        });
        this.context.log(report);

        // Add validation warnings to error field if score is low
        if (!validationResult.passed && validationResult.warnings.length > 0) {
          const warningMessage = `Consistency warnings: ${validationResult.warnings.join('; ')}`;
          progress.error = progress.error ? `${progress.error}. ${warningMessage}` : warningMessage;
        }
      }

      // Step 7: Store scenario metadata
      const metadata = {
        scenarioId,
        request,
        seed: request.seed,
        anchorViewpoint,
        promptSetId: promptSet.id,
        promptTemplateVersion: promptSet.templateVersion,
        prompts: promptSet.prompts,
        images,
        anchorImage,
        validation: validationResult,
        estimatedCost: totalCost,
        createdAt: progress.createdAt,
        completedAt: new Date().toISOString(),
      };

      await this.blobStorage.uploadMetadata(scenarioId, metadata);

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
        seed: request.seed,
      });
    } catch (error) {
      this.context.error('Generation pipeline failed', { scenarioId, error });
      progress.status = 'failed';
      progress.error = error instanceof Error ? error.message : 'Unknown error';
      progress.updatedAt = new Date().toISOString();
    }
  }

  /**
   * Generate images with reference image and concurrency control.
   */
  private async generateImagesWithReference(
    scenarioId: string,
    prompts: Array<{ viewpoint: ViewPoint; promptText: string }>,
    viewpoints: ViewPoint[],
    maxConcurrent: number,
    seed?: number,
    anchorImage?: Buffer,
    mapScreenshots?: Record<ViewPoint, string>
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
        // Get map screenshot for this viewpoint if available
        const mapScreenshot = mapScreenshots?.[viewpoint];

        const result = await this.imageGenerator.generateImage(prompt.promptText, {
          seed,
          referenceImage: anchorImage,
          referenceStrength: 0.5, // 50% adherence to reference
          mapScreenshot,
        });
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
