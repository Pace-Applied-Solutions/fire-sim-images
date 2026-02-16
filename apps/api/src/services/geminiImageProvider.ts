import crypto from 'node:crypto';
import type {
  ImageGenerationProvider,
  ImageGenOptions,
  ImageGenResult,
} from './imageGenerationProvider.js';
import type { ImageModelConfig } from '../imageModelConfig.js';

/**
 * Default Gemini API base URL.
 * Can be overridden via IMAGE_MODEL_URL env var.
 */
const DEFAULT_GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Map our size strings to Gemini aspect ratios.
 */
function sizeToAspectRatio(size: string): string {
  switch (size) {
    case '1792x1024':
      return '16:9';
    case '1024x1792':
      return '9:16';
    case '1024x1024':
    default:
      return '1:1';
  }
}

/**
 * Determine whether the configured model supports Gemini 3 Pro features
 * (thinking, 2K/4K resolution, up to 14 reference images).
 */
function isGemini3Pro(model: string): boolean {
  return model.toLowerCase().includes('gemini-3');
}

/**
 * Image generation provider using Google's Gemini (Nano Banana) API.
 * Supports both text-to-image and image-to-image (editing) via the
 * generateContent REST endpoint with interleaved text + image output.
 *
 * Models:
 * - gemini-2.5-flash-image    (Nano Banana)     — fast, 1024px
 * - gemini-3-pro-image-preview (Nano Banana Pro) — professional, thinking, up to 4K
 *
 * Gemini 3 Pro features:
 * - Thinking enabled by default — produces interim "thought" images during
 *   reasoning. The final rendered image is the last non-thought image part.
 * - Interleaved text + image output via responseModalities: ['TEXT', 'IMAGE']
 * - imageSize: '1K' | '2K' | '4K' (uppercase K required)
 * - thought_signature fields preserved for multi-turn continuity
 * - Up to 14 reference images
 */
export class GeminiImageProvider implements ImageGenerationProvider {
  readonly modelId: string;
  readonly maxConcurrent = 2;

  constructor(private readonly config: ImageModelConfig) {
    this.modelId = config.model;
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.config.key && this.config.model);
  }

  async generateImage(prompt: string, options?: ImageGenOptions): Promise<ImageGenResult> {
    const startTime = Date.now();
    const size = options?.size ?? '1024x1024';
    const [width, height] = size.split('x').map(Number);
    const aspectRatio = sizeToAspectRatio(size);
    const isProModel = isGemini3Pro(this.config.model);

    // Build URL: {url}/models/{model}:generateContent?key={key}
    const baseUrl = this.config.url || DEFAULT_GEMINI_BASE_URL;
    const url = `${baseUrl}/models/${this.config.model}:generateContent?key=${this.config.key}`;

    // Prepare the reference image for img2img, if provided
    const referenceImage = options?.mapScreenshot ?? options?.referenceImage;
    let effectivePrompt = prompt;

    // Build the content parts array
    const parts: Array<Record<string, unknown>> = [];

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
        // Add the descriptive img2img prompt prefix
        effectivePrompt =
          'REFERENCE IMAGE DESCRIPTION: The provided image is a 3D terrain visualisation of a real landscape, rendered from a mapping application. ' +
          'It shows the actual topography with a satellite/aerial photograph draped over the 3D terrain surface. ' +
          'In this rendering: grassy paddocks and pasture appear as light brown, tan, or green areas; ' +
          'tree canopy and bushland appear as darker green textured patches with visible individual tree crowns; ' +
          'bare earth, fire breaks, and cleared land appear as pale brown or beige; ' +
          'sealed roads appear as thin grey or dark lines; unsealed roads and tracks appear as lighter dirt-coloured lines; ' +
          'buildings and structures appear as small rectangular light-coloured shapes, often with visible rooftops and shadows; ' +
          'water bodies such as dams, creeks, and rivers appear as dark blue or dark patches; ' +
          'fences and property boundaries may appear as faint straight lines. ' +
          'YOUR TASK: Using this terrain visualisation as a strict spatial guide, produce a photorealistic photograph of this exact location as if captured by a real camera. ' +
          'CRITICAL — you must preserve the exact spatial layout: the shape and position of every hill, ridge, valley, gully, road, clearing, tree canopy outline, bare earth patch, structure, and water body must remain in the same position and proportion. ' +
          'Match the same camera angle, field of view, and spatial composition. ' +
          'Replace the map rendering style with photorealistic textures — real eucalyptus trees, real Australian bush vegetation, real grass, real soil, real sky with natural lighting and atmospheric haze. ' +
          'Then overlay the following fire scenario onto this faithful landscape rendering: ' +
          prompt;

        // Add the image part first, then text
        parts.push({
          inline_data: {
            mime_type: 'image/png',
            data: base64Data,
          },
        });
      }
    }

    // Add the text prompt part
    parts.push({ text: effectivePrompt });

    // Build generationConfig — differ by model capabilities
    const imageConfig: Record<string, string> = { aspectRatio };
    if (isProModel) {
      // Gemini 3 Pro supports imageSize — use 2K for good quality/speed balance
      imageConfig.imageSize = '2K';
    }

    const generationConfig: Record<string, unknown> = {
      // Interleaved text + image output — the model returns descriptive text
      // alongside the generated image, giving insight into its reasoning.
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig,
    };

    // Gemini 3 Pro has thinking enabled by default and it cannot be disabled.
    // We explicitly include thoughts so response parsing can filter them.
    if (isProModel) {
      generationConfig.thinkingConfig = {
        includeThoughts: true,
      };
    }

    // Build the request body per Gemini generateContent API
    const body = {
      contents: [{ parts }],
      generationConfig,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Image model API error ${response.status}: ${text.substring(0, 500)}`
      );
    }

    const payload = await response.json() as Record<string, unknown>;

    // Extract the final (non-thought) base64 image data from the response
    const extracted = this.extractResponse(payload);
    if (!extracted.imageBase64) {
      throw new Error(
        `Image model API returned no image data. Response: ${JSON.stringify(payload).substring(0, 500)}`
      );
    }

    const imageData = Buffer.from(extracted.imageBase64, 'base64');
    const generationTime = Date.now() - startTime;
    const promptHash = crypto.createHash('sha256').update(prompt).digest('hex').substring(0, 16);

    if (imageData.length < 100) {
      throw new Error(
        `Generated image is suspiciously small (${imageData.length} bytes). This may indicate an API error or placeholder response.`
      );
    }

    // Log any accompanying text from the model (useful for debugging)
    if (extracted.text) {
      console.log(`[GeminiImageProvider] Model text response: ${extracted.text.substring(0, 300)}`);
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
   * Extract the final image and any accompanying text from the Gemini
   * generateContent response.
   *
   * Response shape (with thinking / interleaved):
   * {
   *   candidates: [{
   *     content: {
   *       parts: [
   *         { inline_data: { ... }, thought: true },           // interim thought image
   *         { text: "reasoning...", thought: true },            // thought text
   *         { text: "Here is the image...", thought_signature: "..." },  // final text
   *         { inline_data: { mime_type: "image/png", data: "b64..." }, thought_signature: "..." } // final image
   *       ]
   *     }
   *   }]
   * }
   */
  private extractResponse(payload: Record<string, unknown>): {
    imageBase64: string | undefined;
    text: string | undefined;
  } {
    const candidates = payload.candidates as Array<{
      content?: {
        parts?: Array<{
          text?: string;
          inline_data?: { mime_type?: string; data?: string };
          thought?: boolean;
          thought_signature?: string;
        }>;
      };
    }> | undefined;

    if (!candidates?.length) {
      return { imageBase64: undefined, text: undefined };
    }

    const parts = candidates[0].content?.parts;
    if (!parts?.length) {
      return { imageBase64: undefined, text: undefined };
    }

    // Collect non-thought text parts (model's descriptive response)
    const textParts: string[] = [];
    for (const part of parts) {
      if (part.text && !part.thought) {
        textParts.push(part.text);
      }
    }

    // Find the last non-thought image part — Gemini 3 Pro produces interim
    // "thought" images during reasoning; the final rendered image is what we want
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];
      if (part.inline_data?.data && !part.thought) {
        return {
          imageBase64: part.inline_data.data,
          text: textParts.length > 0 ? textParts.join('\n') : undefined,
        };
      }
    }

    // Fallback: any image part (including thought images if no final image found)
    for (const part of parts) {
      if (part.inline_data?.data) {
        return {
          imageBase64: part.inline_data.data,
          text: textParts.length > 0 ? textParts.join('\n') : undefined,
        };
      }
    }

    return {
      imageBase64: undefined,
      text: textParts.length > 0 ? textParts.join('\n') : undefined,
    };
  }
}

/**
 * Returns true if the config looks like it should use the Gemini provider.
 * Checks for 'gemini-' prefix in deployment or 'googleapis.com' in baseUrl.
 */
export function isGeminiConfig(config: ImageModelConfig): boolean {
  if (config.model?.toLowerCase().startsWith('gemini-')) {
    return true;
  }
  if (config.url?.includes('googleapis.com')) {
    return true;
  }
  return false;
}
