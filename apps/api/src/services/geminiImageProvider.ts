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
 * Inactivity timeout for streaming: if no new data arrives for this long,
 * assume the model has stalled and stop waiting.  This replaces the old hard
 * wall-clock timeout — as long as thinking chunks keep arriving, we keep
 * waiting indefinitely.
 */
const INACTIVITY_TIMEOUT_MS = 60_000; // 60 seconds

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

/** Shape of a single part inside a Gemini response candidate. */
interface GeminiPart {
  text?: string;
  /** Gemini API returns camelCase `inlineData` in SSE responses */
  inlineData?: { mimeType?: string; data?: string };
  /** Some older API versions / REST may use snake_case */
  inline_data?: { mime_type?: string; data?: string };
  thought?: boolean;
  thoughtSignature?: string;
  thought_signature?: string;
}

/**
 * Image generation provider using Google's Gemini API.
 *
 * Uses the **streaming** endpoint (`streamGenerateContent?alt=sse`) so that
 * thinking text is delivered incrementally.  An inactivity-based timeout
 * replaces the old hard wall-clock cap: as long as new chunks keep arriving
 * (indicating the model is still reasoning), we keep waiting.  If no data
 * arrives for {@link INACTIVITY_TIMEOUT_MS} we abort.
 *
 * Models:
 * - gemini-2.5-flash-image      — fast, 1024px
 * - gemini-3-pro-image-preview   — professional, thinking, up to 4K
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

    // ── Build URL ──────────────────────────────────────────────
    const baseUrl = this.config.url || DEFAULT_GEMINI_BASE_URL;
    // Use streaming endpoint with SSE format so we get incremental chunks
    const url = `${baseUrl}/models/${this.config.model}:streamGenerateContent?alt=sse&key=${this.config.key}`;

    // ── Prepare request body ───────────────────────────────────
    const referenceImage = options?.mapScreenshot ?? options?.referenceImage;
    let effectivePrompt = prompt;

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
        effectivePrompt =
          'You are looking at a 3D terrain visualisation of a real Australian landscape, rendered from a mapping application. ' +
          'It shows the actual topography with a satellite or aerial photograph draped over the 3D terrain surface. ' +
          'In this rendering, grassy paddocks and pasture appear as light brown, tan, or green areas. ' +
          'Tree canopy and bushland appear as darker green textured patches with visible individual tree crowns. ' +
          'Bare earth, fire breaks, and cleared land appear as pale brown or beige. ' +
          'Roads appear as thin grey or dark lines, and buildings appear as small rectangular light-coloured shapes with visible rooftops.\n\n' +
          'Step 1: Study the terrain visualisation carefully \u2014 note the exact shape and position of every hill, ridge, valley, gully, road, clearing, tree canopy outline, bare earth patch, structure, and water body.\n\n' +
          'Step 2: Recreate this exact landscape as a photorealistic photograph, as if captured by a real camera from the same angle and field of view. ' +
          'Replace the map rendering style with photorealistic textures \u2014 real eucalyptus trees, real Australian bush vegetation, real grass, real soil, and a real sky with natural lighting and atmospheric haze. ' +
          'The spatial layout must be identical to the reference.\n\n' +
          'Step 3: Overlay the following fire scenario onto this faithful landscape rendering:\n\n' +
          prompt;

        parts.push({
          inline_data: {
            mime_type: 'image/png',
            data: base64Data,
          },
        });
      }
    }

    // ── Vegetation overlay image (NSW SVTM) ────────────────────
    // If a vegetation map screenshot is provided, include it as a second reference
    // image with instructions for the AI to use it for vegetation spatial accuracy.
    const vegScreenshot = options?.vegetationMapScreenshot;
    if (vegScreenshot) {
      let vegBase64: string;
      if (Buffer.isBuffer(vegScreenshot)) {
        vegBase64 = vegScreenshot.toString('base64');
      } else if (typeof vegScreenshot === 'string') {
        vegBase64 = vegScreenshot.replace(/^data:image\/\w+;base64,/, '');
      } else {
        vegBase64 = '';
      }

      if (vegBase64.length > 0) {
        parts.push({
          inline_data: {
            mime_type: 'image/png',
            data: vegBase64,
          },
        });

        effectivePrompt +=
          '\n\nVEGETATION REFERENCE MAP: The previous image is a vegetation formation overlay from the NSW State Vegetation Type Map. ' +
          'Each colour represents a different vegetation formation type. Use this to ensure each part of the landscape has the correct vegetation:\n' +
          '- Dark green areas = Wet sclerophyll forests (tall eucalypts with dense fern understorey)\n' +
          '- Medium green areas = Dry sclerophyll forests (eucalypt woodland with sparse understorey and leaf litter)\n' +
          '- Light green areas = Grassy woodlands (scattered eucalypts over native grasses)\n' +
          '- Yellow-green areas = Grasslands (open grass with no tree canopy)\n' +
          '- Orange/brown areas = Heathlands (low dense shrubland)\n' +
          '- White/light grey areas = Cleared land (farmland, urban, minimal vegetation)\n' +
          '- Teal/blue-green areas = Forested or freshwater wetlands\n' +
          '- Dark olive areas = Rainforests (dense closed canopy)\n' +
          'Match the vegetation in each part of your generated image to what this map shows.';
      }
    }

    // ── Spatial vegetation context from SVTM queries ───────────
    // Append text-based vegetation context from ArcGIS identify queries
    if (options?.vegetationPromptText) {
      effectivePrompt +=
        '\n\nSPATIAL VEGETATION DATA (from NSW State Vegetation Type Map): ' +
        options.vegetationPromptText;
    }

    if (options?.vegetationLegendItems && options.vegetationLegendItems.length > 0) {
      const legendLines = options.vegetationLegendItems
        .map((item) => `- ${item.color}: ${item.name}`)
        .join('\n');

      effectivePrompt +=
        '\n\nVISIBLE VEGETATION LEGEND (color -> subgroup):\n' +
        legendLines +
        '\nUse these color labels to match the vegetation regions in the reference overlay.';
    }

    parts.push({ text: effectivePrompt });

    // Generation config
    const imageConfig: Record<string, string> = { aspectRatio };
    if (isProModel) {
      imageConfig.imageSize = '2K';
    }

    const generationConfig: Record<string, unknown> = {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig,
    };

    if (isProModel) {
      generationConfig.thinkingConfig = { includeThoughts: true };
    }

    const body: Record<string, unknown> = {
      contents: [{ parts }],
      generationConfig,
    };

    // Use systemInstruction for consistent scene guidance across multi-image sets
    if (isProModel) {
      body.systemInstruction = {
        parts: [
          {
            text:
              'You are a photorealistic bushfire scenario renderer for Australian fire service training. ' +
              'Generate a single high-quality image per request. Each image is part of a multi-perspective set ' +
              'depicting the SAME fire event at the SAME moment in time. Maintain strict visual consistency: ' +
              'identical smoke plume shape and colour, identical flame intensity, identical vegetation state, ' +
              'identical weather conditions (cloud cover, haze, lighting), and identical terrain features across all perspectives. ' +
              'Use Australian flora (eucalyptus, banksia, spinifex) and realistic fire behaviour. ' +
              'Never include people, animals, vehicles, or text overlays in the image.',
          },
        ],
      };
    }

    // ── Make the streaming request ──────────────────────────────
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Image model API error ${response.status}: ${text.substring(0, 500)}`);
    }

    // ── Read SSE stream with inactivity timeout ─────────────────
    const { parts: allParts, thinkingText } = await this.readSSEStream(
      response,
      INACTIVITY_TIMEOUT_MS,
      options?.onThinkingUpdate
    );

    console.log(
      `[GeminiImageProvider] SSE stream complete. Parts: ${allParts.length}, thinkingText: ${thinkingText ? `${thinkingText.length} chars` : '(none)'}`
    );

    // Reconstruct canonical payload for extractResponse()
    const payload: Record<string, unknown> = {
      candidates: [{ content: { parts: allParts } }],
    };

    const extracted = this.extractResponse(payload);

    if (!extracted.imageBase64) {
      const thinkingPreview = thinkingText ? `\n\nModel thinking:\n${thinkingText}` : '';
      throw Object.assign(
        new Error(
          `Image model API returned no image data — the model may still be processing.${thinkingPreview}`
        ),
        { thinkingText: thinkingText || extracted.text }
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

    if (extracted.text) {
      console.log(`[GeminiImageProvider] Model text response: ${extracted.text.substring(0, 300)}`);
    }

    return {
      imageData,
      format: 'png',
      thinkingText: thinkingText || extracted.text,
      modelTextResponse: extracted.text,
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

  // ─── SSE stream reader ────────────────────────────────────────

  /**
   * Read a `text/event-stream` response from Gemini's `streamGenerateContent`
   * endpoint, accumulating all content parts.  Resets an inactivity timer on
   * every received chunk — as long as the model keeps producing data we keep
   * listening.
   *
   * Calls `onThinkingUpdate` whenever a new thinking text part is received so
   * callers can surface progress in real time.
   */
  private async readSSEStream(
    response: Response,
    inactivityTimeoutMs: number,
    onThinkingUpdate?: (text: string) => void
  ): Promise<{ parts: GeminiPart[]; thinkingText: string | undefined }> {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const allParts: GeminiPart[] = [];
    const thinkingParts: string[] = [];

    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        // Race the next chunk against an inactivity timeout.
        // Clear the timer when data arrives to avoid leaking timers.
        let inactivityTimer: ReturnType<typeof setTimeout> | undefined;
        const readResult = await Promise.race([
          reader.read().then((r) => {
            if (inactivityTimer) clearTimeout(inactivityTimer);
            return r;
          }),
          new Promise<{ done: true; value: undefined }>((resolve) => {
            inactivityTimer = setTimeout(
              () => resolve({ done: true, value: undefined }),
              inactivityTimeoutMs
            );
          }),
        ]);

        if (readResult.done) {
          console.log(
            `[GeminiSSE] Stream ended. Parts: ${allParts.length}, thinking chunks: ${thinkingParts.length}`
          );
          if (buffer.length > 0) {
            console.log(
              `[GeminiSSE] Warning: ${buffer.length} chars left in buffer (data may be lost)`
            );
          }
          break;
        }

        const chunk = decoder.decode(readResult.value, { stream: true });
        buffer += chunk;

        // SSE events are separated by double newlines.
        // Gemini API uses \r\n\r\n (CRLF) — normalise to \n to handle both.
        buffer = buffer.replace(/\r\n/g, '\n');
        const events = buffer.split('\n\n');
        buffer = events.pop() || ''; // keep trailing incomplete event

        for (const event of events) {
          for (const line of event.split('\n')) {
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;

            try {
              const chunk = JSON.parse(jsonStr);
              const candidates = chunk.candidates as
                | Array<{
                    content?: { parts?: GeminiPart[] };
                  }>
                | undefined;
              const parts = candidates?.[0]?.content?.parts;
              if (!parts) continue;

              for (const part of parts) {
                allParts.push(part);

                // Accumulate thinking text and notify caller
                if (part.text && part.thought) {
                  thinkingParts.push(part.text);
                  if (onThinkingUpdate) {
                    onThinkingUpdate(thinkingParts.join('\n'));
                  }
                }
              }
            } catch {
              // Malformed JSON in a chunk — skip
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return {
      parts: allParts,
      thinkingText: thinkingParts.length > 0 ? thinkingParts.join('\n') : undefined,
    };
  }

  // ─── Response extraction helpers ──────────────────────────────

  /**
   * Extract the final image and any accompanying text from the accumulated
   * Gemini response parts.
   */
  private extractResponse(payload: Record<string, unknown>): {
    imageBase64: string | undefined;
    text: string | undefined;
  } {
    const candidates = payload.candidates as
      | Array<{
          content?: { parts?: GeminiPart[] };
        }>
      | undefined;

    if (!candidates?.length) {
      return { imageBase64: undefined, text: undefined };
    }

    const parts = candidates[0].content?.parts;
    if (!parts?.length) {
      return { imageBase64: undefined, text: undefined };
    }

    // Non-thought text parts (the model's descriptive response)
    const textParts: string[] = [];
    for (const part of parts) {
      if (part.text && !part.thought) {
        textParts.push(part.text);
      }
    }

    // Find the last non-thought image part
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];
      const imageData = part.inlineData?.data || part.inline_data?.data;
      if (imageData && !part.thought) {
        return {
          imageBase64: imageData,
          text: textParts.length > 0 ? textParts.join('\n') : undefined,
        };
      }
    }

    // Fallback: any image (including thought images)
    for (const part of parts) {
      const imageData = part.inlineData?.data || part.inline_data?.data;
      if (imageData) {
        return {
          imageBase64: imageData,
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
