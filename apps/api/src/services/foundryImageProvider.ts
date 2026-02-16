import crypto from 'node:crypto';
import type {
  ImageGenerationProvider,
  ImageGenOptions,
  ImageGenResult,
} from './imageGenerationProvider.js';
import type { FoundryConfig } from '../foundryConfig.js';

export class FoundryImageProvider implements ImageGenerationProvider {
  readonly modelId: string;
  readonly maxConcurrent = 2;
  private endpoint: string;
  private apiKey: string;
  private apiVersion: string;

  constructor(private readonly config: FoundryConfig) {
    // Model ID comes from foundry config
    this.modelId = config.imageModel;
    
    // Construct OpenAI-compatible endpoint from region and project path
    // If projectPath looks like an endpoint, use it directly
    if (config.projectPath.startsWith('http')) {
      this.endpoint = config.projectPath;
      this.apiKey = config.projectAuthToken || '';
    } else {
      // Otherwise construct from region and project path
      this.endpoint = `https://${config.projectRegion}.api.cognitive.microsoftml.com/projects/${config.projectPath}`;
      this.apiKey = config.projectAuthToken || '';
    }
    
    this.apiVersion = '2024-12-01-preview';
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(
      this.config.projectPath &&
      this.config.projectRegion &&
      this.config.imageModel &&
      this.apiKey
    );
  }

  async generateImage(prompt: string, options?: ImageGenOptions): Promise<ImageGenResult> {
    const startTime = Date.now();
    const size = options?.size ?? '1024x1024';

    // Azure OpenAI compatible endpoint format
    const url = `${this.endpoint}/openai/deployments/${this.modelId}/images/generations?api-version=${this.apiVersion}`;

    // If a map screenshot is provided, use image-to-image mode.
    // Modify the prompt to instruct the model to transform the terrain reference.
    const referenceImage = options?.mapScreenshot ?? options?.referenceImage;
    let effectivePrompt = prompt;
    let base64Image: string | undefined;

    if (referenceImage) {
      let base64Data: string;
      if (Buffer.isBuffer(referenceImage)) {
        base64Data = referenceImage.toString('base64');
      } else if (typeof referenceImage === 'string') {
        // Strip data URL prefix if present (e.g. "data:image/jpeg;base64,...")
        base64Data = referenceImage.replace(/^data:image\/\w+;base64,/, '');
      } else {
        base64Data = '';
      }
      if (base64Data.length > 0) {
        base64Image = base64Data;
        // Prefix the prompt to tell the model to use the reference as a terrain base
        effectivePrompt = `Transform this satellite/terrain map view into a photorealistic photograph showing the following fire scenario, keeping the exact same terrain, topography, vegetation layout, and camera angle: ${prompt}`;
      }
    }

    const body = {
      prompt: effectivePrompt,
      size,
      n: 1,
      response_format: 'b64_json',
    } as Record<string, unknown>;

    if (base64Image) {
      body.image = base64Image;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey,
        },
      });
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error);
      throw new Error(`Foundry API request failed: ${err}`);
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Foundry API error ${response.status}: ${text.substring(0, 500)}`
      );
    }

    let payload: { data?: Array<{ b64_json?: string }> };
    try {
      payload = (await response.json()) as {
        data?: Array<{ b64_json?: string }>;
      };
    } catch (error) {
      throw new Error(`Failed to parse Foundry API response: ${error instanceof Error ? error.message : String(error)}`);
    }

    const b64 = payload.data?.[0]?.b64_json;
    if (!b64) {
      throw new Error(
        `Foundry API returned no image data. Response: ${JSON.stringify(payload).substring(0, 200)}`
      );
    }

    const imageData = Buffer.from(b64, 'base64');
    const generationTime = Date.now() - startTime;
    const promptHash = crypto.createHash('sha256').update(prompt).digest('hex').substring(0, 16);

    if (imageData.length < 100) {
      throw new Error(
        `Foundry generated image is suspiciously small (${imageData.length} bytes). This may indicate an API error or placeholder response.`
      );
    }

    return {
      imageData,
      format: 'png',
      metadata: {
        model: this.modelId,
        promptHash,
        generationTime,
        width: parseInt(size.split('x')[0], 10) || 1024,
        height: parseInt(size.split('x')[1], 10) || 1024,
        seed: options?.seed,
      },
    };
  }
}
