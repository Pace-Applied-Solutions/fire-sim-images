import crypto from 'node:crypto';
import type {
  ImageGenerationProvider,
  ImageGenOptions,
  ImageGenResult,
} from './imageGenerationProvider.js';
import type { ImageModelConfig } from '../fluxConfig.js';

/**
 * Detects whether the config points to an Azure AI serverless endpoint
 * (e.g., /providers/blackforestlabs/...) vs the OpenAI-compatible format.
 */
function isServerlessEndpoint(config: ImageModelConfig): boolean {
  return Boolean(config.baseUrl?.includes('/providers/'));
}

export class AzureImageProvider implements ImageGenerationProvider {
  readonly modelId: string;
  readonly maxConcurrent = 2;

  constructor(private readonly config: ImageModelConfig) {
    this.modelId = config.deployment;
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.config.apiKey && this.config.deployment &&
      (this.config.baseUrl || this.config.endpoint));
  }

  async generateImage(prompt: string, options?: ImageGenOptions): Promise<ImageGenResult> {
    const startTime = Date.now();
    const size = options?.size ?? '1024x1024';
    const [width, height] = size.split('x').map(Number);

    const serverless = isServerlessEndpoint(this.config);

    // Build URL — use baseUrl if provided, otherwise construct OpenAI-compatible URL
    const url = this.config.baseUrl
      ? this.config.baseUrl
      : `${this.config.endpoint}/openai/deployments/${this.config.deployment}/images/generations?api-version=${this.config.apiVersion}`;

    // If a map screenshot is provided, use image-to-image mode.
    const referenceImage = options?.mapScreenshot ?? options?.referenceImage;
    let effectivePrompt = prompt;
    let base64Image: string | undefined;

    if (referenceImage) {
      let base64Data: string;
      if (Buffer.isBuffer(referenceImage)) {
        base64Data = referenceImage.toString('base64');
      } else if (typeof referenceImage === 'string') {
        base64Data = referenceImage.replace(/^data:image\/\w+;base64,/, '');
      } else {
        base64Data = '';
      }
      if (base64Data.length > 0) {
        base64Image = base64Data;
        effectivePrompt =
          'Using the provided satellite/terrain map as a strict spatial reference, generate a photorealistic photograph of this exact location. ' +
          'CRITICAL: Preserve every topographic feature — the shape of hills, ridges, valleys, gullies, roads, clearings, tree canopy outlines, bare earth patches, and water bodies — exactly as they appear in the reference image. ' +
          'Match the same camera angle, field of view, and spatial composition. ' +
          'Replace the map rendering style with photorealistic textures: real vegetation, real soil, real sky, natural lighting. ' +
          'Then overlay the following fire scenario onto this faithful landscape rendering: ' +
          prompt;
      }
    }

    // Build request body — different shape for serverless vs OpenAI-compatible
    let body: Record<string, unknown>;
    let headers: Record<string, string>;

    if (serverless) {
      // Azure AI serverless (Black Forest Labs) format
      body = {
        prompt: effectivePrompt,
        width,
        height,
        steps: 25,
        guidance: 3.5,
        safety_tolerance: 5,
        seed: options?.seed,
      };
      if (base64Image) {
        body.image = base64Image;
      }
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      };
    } else {
      // OpenAI-compatible format
      body = {
        prompt: effectivePrompt,
        size,
        n: 1,
        response_format: 'b64_json',
      };
      if (base64Image) {
        body.image = base64Image;
      }
      headers = {
        'Content-Type': 'application/json',
        'api-key': this.config.apiKey,
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Image model API error ${response.status}: ${text.substring(0, 500)}`
      );
    }

    const payload = await response.json() as Record<string, unknown>;

    // Extract base64 image data — handle both response formats
    const b64 = this.extractBase64(payload);
    if (!b64) {
      throw new Error(
        `Image model API returned no image data. Response: ${JSON.stringify(payload).substring(0, 300)}`
      );
    }

    const imageData = Buffer.from(b64, 'base64');
    const generationTime = Date.now() - startTime;
    const promptHash = crypto.createHash('sha256').update(prompt).digest('hex').substring(0, 16);

    if (imageData.length < 100) {
      throw new Error(
        `Generated image is suspiciously small (${imageData.length} bytes). This may indicate an API error or placeholder response.`
      );
    }

    return {
      imageData,
      format: 'png',
      metadata: {
        model: this.modelId,
        promptHash,
        generationTime,
        width,
        height,
        seed: options?.seed,
      },
    };
  }

  /**
   * Extract base64 image data from various API response formats:
   * - OpenAI: { data: [{ b64_json: "..." }] }
   * - BFL serverless: { image: { url: "data:...;base64,..." } }
   * - BFL serverless alt: { images: [{ bytes: "..." }] }
   * - BFL serverless alt2: { sample: "base64..." }
   */
  private extractBase64(payload: Record<string, unknown>): string | undefined {
    // OpenAI format
    const data = payload.data as Array<{ b64_json?: string }> | undefined;
    if (data?.[0]?.b64_json) {
      return data[0].b64_json;
    }

    // BFL serverless: { image: { url: "data:image/...;base64,..." } }
    const image = payload.image as { url?: string } | undefined;
    if (image?.url) {
      const match = image.url.match(/base64,(.+)/);
      if (match) return match[1];
      // Might be raw base64
      return image.url;
    }

    // BFL alt: { images: [{ bytes: "..." }] }
    const images = payload.images as Array<{ bytes?: string }> | undefined;
    if (images?.[0]?.bytes) {
      return images[0].bytes;
    }

    // BFL alt: { sample: "base64..." }
    if (typeof payload.sample === 'string') {
      const sampleStr = payload.sample as string;
      const match = sampleStr.match(/base64,(.+)/);
      return match ? match[1] : sampleStr;
    }

    return undefined;
  }
}
