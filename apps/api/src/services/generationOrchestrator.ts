/**
 * Generation orchestrator service that manages the full image generation pipeline.
 * Orchestrates: geodata lookup -> prompt generation -> image generation -> blob storage.
 */

import type { InvocationContext } from '@azure/functions';
import type {
  GenerationRequest,
  GenerationResult,
  GeneratedImage,
  ViewPoint,
  ScenarioMetadata,
} from '@fire-sim/shared';
import { generatePrompts } from '@fire-sim/shared';
import type { VegetationContext } from '@fire-sim/shared';
import { v4 as uuidv4 } from 'uuid';
import { ImageGeneratorService } from './imageGenerator.js';
import { BlobStorageService } from './blobStorage.js';
import { queryVegetationContext, formatVegetationContextForPrompt } from './vegetationService.js';
import { ConsistencyValidator } from '../validation/consistencyValidator.js';
import { createLogger } from '../utils/logger.js';
import { startTimer, GenerationMetrics } from '../utils/metrics.js';
import { globalCostEstimator, globalUsageTracker } from '../utils/costTracking.js';

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
  /** Model thinking/reasoning text (latest) */
  thinkingText?: string;
  createdAt: string;
  updatedAt: string;
}

// In-memory store for generation progress (would use Durable Functions state in production)
const progressStore = new Map<string, GenerationProgress>();

// Maximum seed value for random seed generation
const MAX_SEED_VALUE = 1000000;

export class GenerationOrchestrator {
  private imageGenerator: ImageGeneratorService;
  private blobStorage: BlobStorageService;
  private consistencyValidator: ConsistencyValidator;
  private logger;

  constructor(context: InvocationContext) {
    this.imageGenerator = new ImageGeneratorService(context);
    this.blobStorage = new BlobStorageService(context);
    this.consistencyValidator = new ConsistencyValidator();
    this.logger = createLogger(context);
  }

  /**
   * Start a new generation request and return the scenario ID.
   */
  async startGeneration(request: GenerationRequest): Promise<string> {
    const scenarioId = uuidv4();
    const timestamp = new Date().toISOString();

    // Generate seed if not provided (for consistency across viewpoints)
    const seed = request.seed ?? Math.floor(Math.random() * MAX_SEED_VALUE);

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

    this.logger.info('Generation request received', {
      scenarioId,
      requestedViews: request.requestedViews.length,
      viewpoints: request.requestedViews,
      seed,
    });

    // Start generation asynchronously (don't await)
    this.executeGeneration(scenarioId, { ...request, seed }).catch((error) => {
      this.logger.error('Generation orchestration failed', error, { scenarioId });
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
      completedAt:
        progress.status === 'completed' || progress.status === 'failed'
          ? progress.updatedAt
          : undefined,
      error: progress.error,
      thinkingText: progress.thinkingText,
    };

    return result;
  }

  /**
   * Execute the full generation pipeline with anchor image strategy.
   * Pass 1: Generate a ground-level anchor view
   * Pass 2: Generate remaining views using anchor as reference
   */
  private async executeGeneration(scenarioId: string, request: GenerationRequest): Promise<void> {
    const progress = progressStore.get(scenarioId)!;
    progress.status = 'in_progress';
    progress.updatedAt = new Date().toISOString();

    const logger = this.logger.child({ scenarioId });
    const endToEndTimer = startTimer('generation', { scenarioId });

    try {
      // Step 1: Generate prompts for all viewpoints
      logger.info('Generating prompts');
      const promptTimer = startTimer('prompt.generation', { scenarioId });
      const promptSet = generatePrompts(request);
      promptTimer.stop();

      logger.info('Prompts generated', {
        promptCount: promptSet.prompts.length,
        templateVersion: promptSet.templateVersion,
      });

      // Step 1b: Query NSW SVTM vegetation context at the fire perimeter
      let vegetationContext: VegetationContext | null = null;
      let vegetationPromptText = '';
      try {
        const perimeterCoords = request.perimeter.geometry.coordinates[0];
        const lngs = perimeterCoords.map((c: number[]) => c[0]);
        const lats = perimeterCoords.map((c: number[]) => c[1]);
        const centroid: [number, number] = [
          lngs.reduce((a: number, b: number) => a + b, 0) / lngs.length,
          lats.reduce((a: number, b: number) => a + b, 0) / lats.length,
        ];
        const perimeterBbox: [number, number, number, number] = [
          Math.min(...lngs),
          Math.min(...lats),
          Math.max(...lngs),
          Math.max(...lats),
        ];

        logger.info('Querying NSW SVTM vegetation context', { centroid });
        vegetationContext = await queryVegetationContext(centroid, perimeterBbox);

        if (vegetationContext) {
          vegetationPromptText = formatVegetationContextForPrompt(vegetationContext);
          logger.info('SVTM vegetation context resolved', {
            centerFormation: vegetationContext.centerFormation,
            uniqueFormations: vegetationContext.uniqueFormations,
          });
        } else {
          logger.warn('SVTM vegetation context unavailable — continuing without');
        }
      } catch (vegError) {
        // Non-fatal — continue without vegetation context
        logger.warn('SVTM vegetation query failed', {
          error: vegError instanceof Error ? vegError.message : String(vegError),
        });
      }

      // Step 2: Determine anchor viewpoint (prefer ground-level, fallback to first available)
      const maxImages = 10;
      const viewpointsToGenerate = request.requestedViews.slice(0, maxImages);
      const anchorViewpoint =
        viewpointsToGenerate.find((viewpoint) => viewpoint.startsWith('ground_')) ??
        (viewpointsToGenerate.includes('helicopter_above')
          ? 'helicopter_above'
          : viewpointsToGenerate.includes('aerial')
            ? 'aerial'
            : viewpointsToGenerate[0]);

      logger.info('Starting anchor image generation', {
        anchorViewpoint,
        seed: request.seed,
      });

      // Step 3: Generate anchor image first
      let anchorImage: GeneratedImage | undefined;
      let anchorImageData: Buffer | undefined;
      const anchorPrompt = promptSet.prompts.find((p) => p.viewpoint === anchorViewpoint);

      // Collect model text responses for the generation log
      const modelTextResponses: Array<{ viewpoint: string; text?: string }> = [];

      if (anchorPrompt) {
        try {
          const imageGenTimer = startTimer('image.generation.anchor', {
            scenarioId,
            viewpoint: anchorViewpoint,
          });
          // Use the map screenshot for this viewpoint as a terrain reference
          const anchorMapScreenshot = request.mapScreenshots?.[anchorViewpoint];
          const result = await this.imageGenerator.generateImage(anchorPrompt.promptText, {
            seed: request.seed,
            mapScreenshot: anchorMapScreenshot,
            vegetationMapScreenshot: request.vegetationMapScreenshot,
            vegetationPromptText: vegetationPromptText || undefined,
            // Surface thinking text to the progress store in real time so the
            // frontend poll picks it up while the model is still working.
            onThinkingUpdate: (thinkingText: string) => {
              progress.thinkingText = thinkingText;
              progress.updatedAt = new Date().toISOString();
            },
          });
          const imageGenDuration = imageGenTimer.stop();

          logger.info('Anchor image generated', {
            viewpoint: anchorViewpoint,
            durationMs: imageGenDuration,
            model: result.metadata.model,
          });

          // Capture model text response for generation log
          if (result.modelTextResponse) {
            modelTextResponses.push({ viewpoint: anchorViewpoint, text: result.modelTextResponse });
          }

          // Upload anchor image
          const uploadTimer = startTimer('blob.upload', { scenarioId, viewpoint: anchorViewpoint });
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
          uploadTimer.stop();

          const sasUrl = await this.blobStorage.generateSASUrl(blobUrl, {
            expiresInHours: 24,
            permissions: 'r',
          });

          logger.info('Generated SAS URL for anchor image', {
            viewpoint: anchorViewpoint,
            blobUrl: blobUrl.substring(0, 60) + '...',
            sasUrl: sasUrl.substring(0, 60) + '...',
            hasSasToken: sasUrl.includes('?'),
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
          // Push anchor into progress.images immediately so the status
          // endpoint returns it to the frontend while remaining views
          // (if any) are still generating.
          progress.images.push(anchorImage);

          // Capture model thinking text if available
          if (result.thinkingText) {
            progress.thinkingText = result.thinkingText;
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          // Capture thinking text from the error if available
          const thinkingText = (error as { thinkingText?: string })?.thinkingText;
          if (thinkingText) {
            progress.thinkingText = thinkingText;
          }
          logger.error(
            'Anchor image generation failed',
            error instanceof Error ? error : undefined,
            {
              viewpoint: anchorViewpoint,
              errorMessage: errorMsg,
              errorStack: error instanceof Error ? error.stack : undefined,
            }
          );
          GenerationMetrics.trackGenerationError({ scenarioId, viewpoint: anchorViewpoint });
          progress.failedImages++;
          progress.error = `Anchor image generation failed: ${errorMsg}`;
        }
      }

      // Step 4: Generate remaining viewpoints with anchor reference
      const remainingViewpoints = viewpointsToGenerate.filter((v) => v !== anchorViewpoint);

      logger.info('Starting derived views generation', {
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
        request.mapScreenshots,
        request.vegetationMapScreenshot,
        vegetationPromptText || undefined
      );

      // Step 5: Upload images to blob storage and generate SAS URLs
      const images: GeneratedImage[] = anchorImage ? [anchorImage] : [];

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
            const uploadTimer = startTimer('blob.upload', { scenarioId, viewpoint });
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
                  usedReference: anchorImageData ? 'true' : 'false',
                },
              }
            );
            uploadTimer.stop();

            // Generate SAS URL for 24-hour access
            const sasUrl = await this.blobStorage.generateSASUrl(blobUrl, {
              expiresInHours: 24,
              permissions: 'r',
            });

            logger.info('Generated SAS URL for image', {
              viewpoint,
              blobUrl: blobUrl.substring(0, 60) + '...',
              sasUrl: sasUrl.substring(0, 60) + '...',
              hasSasToken: sasUrl.includes('?'),
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
            // Push derived image into progress.images immediately so the
            // status endpoint returns it to the frontend while remaining
            // views are still generating.
            progress.images.push(generatedImage);

            logger.info('Image generated and uploaded', {
              viewpoint,
              progress: `${progress.completedImages}/${progress.totalImages}`,
              model: metadata.model,
            });
          } catch (uploadError) {
            const uploadErr =
              uploadError instanceof Error ? uploadError : new Error(String(uploadError));
            logger.error(`Failed to upload image: ${uploadErr.message}`, uploadErr, {
              viewpoint,
            });
            progress.failedImages++;
          }
        } else {
          logger.error('Image generation failed', undefined, {
            viewpoint: result.reason?.viewpoint,
            error: result.reason?.error,
          });
          GenerationMetrics.trackGenerationError({
            scenarioId,
            viewpoint: result.reason?.viewpoint,
          });
          progress.failedImages++;
        }
      }

      // Step 6: Validate consistency
      let validationResult;
      if (images.length > 1) {
        logger.info('Running consistency validation', { imageCount: images.length });
        validationResult = this.consistencyValidator.validateImageSet(
          images,
          request.inputs,
          anchorImage
        );

        logger.info('Consistency validation complete', {
          score: validationResult.score,
          passed: validationResult.passed,
          warnings: validationResult.warnings.length,
        });

        if (validationResult.warnings.length > 0) {
          logger.warn('Consistency validation warnings', {
            warnings: validationResult.warnings,
          });
        }

        // Add validation warnings to error field if score is low
        if (!validationResult.passed && validationResult.warnings.length > 0) {
          const warningMessage = `Consistency warnings: ${validationResult.warnings.join('; ')}`;
          progress.error = progress.error ? `${progress.error}. ${warningMessage}` : warningMessage;
        }
      }

      // Step 7: Store complete scenario metadata for gallery
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
          anchorImage,
          seed: request.seed,
          createdAt: progress.createdAt,
          completedAt: new Date().toISOString(),
        },
        promptVersion: promptSet.templateVersion,
      };

      await this.blobStorage.uploadMetadata(scenarioId, scenarioMetadata);

      // Step 8: Save generation log (prompt, thinking, responses) as markdown
      // in the same blob container folder as the images for audit/evaluation
      try {
        const generationLog = {
          prompts: promptSet.prompts.map((p) => ({
            viewpoint: p.viewpoint,
            promptText: p.promptText,
          })),
          thinkingText: progress.thinkingText,
          modelResponses: modelTextResponses,
          seed: request.seed,
          model: images[0]?.metadata.model,
          generationTimeMs: Date.now() - new Date(progress.createdAt).getTime(),
          timestamp: new Date().toISOString(),
          vegetationContext: vegetationContext ?? undefined,
          hadVegetationScreenshot: !!request.vegetationMapScreenshot,
        };
        await this.blobStorage.uploadGenerationLog(scenarioId, generationLog);
        logger.info('Generation log saved', { scenarioId });
      } catch (logError) {
        // Non-fatal — don't fail the generation if logging fails
        logger.warn('Failed to save generation log', {
          error: logError instanceof Error ? logError.message : String(logError),
        });
      }

      // Calculate and track costs
      const costBreakdown = globalCostEstimator.estimateScenarioCost({
        imageCount: progress.completedImages,
        videoCount: 0, // Videos not yet implemented
        imageQuality: 'standard',
        imageProvider: 'stable-image-core',
        estimatedStorageMB: 10,
      });

      globalUsageTracker.recordScenario(scenarioId, costBreakdown);

      logger.info('Cost estimated', {
        totalCost: costBreakdown.totalCost,
        imageCount: costBreakdown.images.count,
        costPerImage: costBreakdown.images.costPerImage,
      });

      // Update progress
      progress.images = images;
      progress.status = progress.failedImages === progress.totalImages ? 'failed' : 'completed';
      progress.updatedAt = new Date().toISOString();

      if (progress.failedImages > 0 && progress.completedImages > 0) {
        progress.error = `Partial success: ${progress.completedImages} succeeded, ${progress.failedImages} failed`;
      }

      // Track final metrics
      const totalDuration = endToEndTimer.stop();
      GenerationMetrics.trackGenerationDuration(totalDuration, { scenarioId });
      GenerationMetrics.trackImagesCount(progress.completedImages, { scenarioId });

      logger.info('Generation completed', {
        status: progress.status,
        completedImages: progress.completedImages,
        failedImages: progress.failedImages,
        totalDurationMs: totalDuration,
        estimatedCost: costBreakdown.totalCost,
        seed: request.seed,
      });
    } catch (error) {
      logger.error(
        'Generation pipeline failed',
        error instanceof Error ? error : new Error(String(error))
      );
      GenerationMetrics.trackGenerationError({ scenarioId });
      progress.status = 'failed';
      progress.error = error instanceof Error ? error.message : String(error);
      progress.updatedAt = new Date().toISOString();
      endToEndTimer.stop();
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
    mapScreenshots?: Record<ViewPoint, string>,
    vegetationMapScreenshot?: string,
    vegetationPromptText?: string
  ): Promise<
    Array<
      PromiseSettledResult<{
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
      }>
    >
  > {
    const tasks = viewpoints.map(async (viewpoint) => {
      const prompt = prompts.find((p) => p.viewpoint === viewpoint);
      if (!prompt) {
        throw new Error(`No prompt found for viewpoint: ${viewpoint}`);
      }

      try {
        // Get map screenshot for this viewpoint if available
        // Prefer viewpoint-specific map screenshot over the generic anchor image
        // because the screenshot provides terrain-specific grounding for this exact perspective
        const mapScreenshot = mapScreenshots?.[viewpoint];

        const result = await this.imageGenerator.generateImage(prompt.promptText, {
          seed,
          referenceImage: !mapScreenshot ? anchorImage : undefined,
          referenceStrength: 0.5, // 50% adherence to reference
          mapScreenshot,
          vegetationMapScreenshot,
          vegetationPromptText,
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
    const results: Array<
      PromiseSettledResult<{
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
      }>
    > = [];
    for (let i = 0; i < tasks.length; i += maxConcurrent) {
      const batch = tasks.slice(i, i + maxConcurrent);
      const batchResults = await Promise.allSettled(batch);
      results.push(...batchResults);

      console.log('Batch completed', {
        scenarioId,
        batchIndex: Math.floor(i / maxConcurrent) + 1,
        totalBatches: Math.ceil(tasks.length / maxConcurrent),
      });
    }

    return results;
  }
}
