import crypto from 'node:crypto';
import type {
  ImageGenerationProvider,
  ImageGenOptions,
  ImageGenResult,
} from './imageGenerationProvider.js';
import type { FluxConfig } from '../fluxConfig.js';

export class FluxImageProvider implements ImageGenerationProvider {
  readonly modelId = 'FLUX.1-Kontext-pro';
  readonly maxConcurrent = 2;

  constructor(private readonly config: FluxConfig) {}

  async isAvailable(): Promise<boolean> {
    return Boolean(this.config.endpoint && this.config.apiKey && this.config.deployment);
  }

  async generateImage(prompt: string, options?: ImageGenOptions): Promise<ImageGenResult> {
    const startTime = Date.now();
    const size = options?.size ?? '1024x1024';
    const url = `${this.config.endpoint}/openai/deployments/${this.config.deployment}/images/generations?api-version=${this.config.apiVersion}`;

    const body = {
      prompt,
      size,
      n: 1,
      response_format: 'b64_json',
    } as Record<string, unknown>;

    let response: Response;
    response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.config.apiKey,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Flux API error ${response.status}: ${text.substring(0, 500)}`
      );
    }

    const payload = (await response.json()) as {
      data?: Array<{ b64_json?: string }>;
    };

    const b64 = payload.data?.[0]?.b64_json;
    if (!b64) {
      throw new Error(
        `Flux API returned no image data. Response: ${JSON.stringify(payload).substring(0, 200)}`
      );
    }

    const imageData = Buffer.from(b64, 'base64');
    const generationTime = Date.now() - startTime;
    const promptHash = crypto.createHash('sha256').update(prompt).digest('hex').substring(0, 16);

    if (imageData.length < 100) {
      throw new Error(
        `Flux generated image is suspiciously small (${imageData.length} bytes). This may indicate an API error or placeholder response.`
      );
    }

    return {
      imageData,
      format: 'png',
      metadata: {
        model: this.modelId,
        promptHash,
        generationTime,
        width: Number(size.split('x')[0]),
        height: Number(size.split('x')[1]),
        seed: options?.seed,
      },
    };
  }
}
