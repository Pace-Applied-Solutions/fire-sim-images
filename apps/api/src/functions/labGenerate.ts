import functions from '@azure/functions';
import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getImageModelConfig } from '../imageModelConfig.js';
import { GeminiImageProvider } from '../services/geminiImageProvider.js';

const { app } = functions;

/**
 * Lab generation request payload.
 * Allows arbitrary reference images and custom prompt/system instruction.
 */
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

/**
 * HTTP-triggered function for Prompt Lab single-image generation.
 * POST /api/lab/generate
 * Returns: SSE stream with thinking text + final image
 */
export async function labGenerate(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('[LabGenerate] Processing lab generation request');

  try {
    const body = (await request.json()) as LabGenerationRequest;

    // Validate request
    if (!body.prompt) {
      return {
        status: 400,
        jsonBody: { error: 'Missing required field: prompt' },
      };
    }

    if (!body.referenceImages || body.referenceImages.length === 0) {
      return {
        status: 400,
        jsonBody: { error: 'At least one reference image is required' },
      };
    }

    if (body.referenceImages.length > 14) {
      return {
        status: 400,
        jsonBody: { error: 'Maximum 14 reference images allowed (Gemini 3 Pro limit)' },
      };
    }

    // Get image model config
    const modelConfig = await getImageModelConfig(context);
    if (!modelConfig) {
      return {
        status: 503,
        jsonBody: { error: 'Image generation service not configured' },
      };
    }

    // Create provider
    const provider = new GeminiImageProvider(modelConfig);

    // Check if SSE is requested
    const acceptHeader = request.headers.get('accept') || '';
    const wantsSSE = acceptHeader.includes('text/event-stream');

    if (wantsSSE) {
      // Return SSE stream
      return await handleSSEGeneration(body, provider, context);
    } else {
      // Return single JSON response
      return await handleJSONGeneration(body, provider, context);
    }
  } catch (error) {
    context.error('[LabGenerate] Error processing request:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      status: 500,
      jsonBody: {
        error: 'Failed to generate image',
        details: errorMessage,
      },
    };
  }
}

/**
 * Handle SSE streaming generation.
 * Sends thinking text as events and final image as JSON event.
 */
async function handleSSEGeneration(
  body: LabGenerationRequest,
  provider: GeminiImageProvider,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];

  // Helper to send SSE event
  const sendEvent = (eventType: string, data: unknown) => {
    const json = JSON.stringify(data);
    const event = `event: ${eventType}\ndata: ${json}\n\n`;
    chunks.push(encoder.encode(event));
  };

  try {
    // Prepare reference images
    const mapScreenshot = body.referenceImages.find(
      (img) => img.type === 'map_screenshot'
    )?.dataUrl;
    const vegetationOverlay = body.referenceImages.find(
      (img) => img.type === 'vegetation_overlay'
    )?.dataUrl;

    // Start generation with thinking text callback
    let lastThinkingText = '';
    const result = await provider.generateImage(body.prompt, {
      size: body.size,
      seed: body.seed,
      mapScreenshot: mapScreenshot,
      vegetationMapScreenshot: vegetationOverlay,
      onThinkingUpdate: (thinkingText: string) => {
        // Only send if text has changed
        if (thinkingText !== lastThinkingText) {
          sendEvent('thinking', { text: thinkingText });
          lastThinkingText = thinkingText;
        }
      },
    });

    // Convert image data to base64
    const imageBase64 =
      typeof result.imageData === 'string'
        ? result.imageData
        : result.imageData.toString('base64');

    const dataUrl = `data:image/${result.format};base64,${imageBase64}`;

    // Send final result
    sendEvent('result', {
      dataUrl,
      thinkingText: result.thinkingText,
      metadata: result.metadata,
    });

    // Send done event
    sendEvent('done', {});

    // Combine all chunks
    const responseBody = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
      responseBody.set(chunk, offset);
      offset += chunk.length;
    }

    return {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
      body: responseBody,
    };
  } catch (error) {
    context.error('[LabGenerate] SSE generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    sendEvent('error', { error: errorMessage });
    sendEvent('done', {});

    const responseBody = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
      responseBody.set(chunk, offset);
      offset += chunk.length;
    }

    return {
      status: 200, // SSE uses 200 even for errors
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
      body: responseBody,
    };
  }
}

/**
 * Handle JSON generation (no streaming).
 */
async function handleJSONGeneration(
  body: LabGenerationRequest,
  provider: GeminiImageProvider,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Prepare reference images
    const mapScreenshot = body.referenceImages.find(
      (img) => img.type === 'map_screenshot'
    )?.dataUrl;
    const vegetationOverlay = body.referenceImages.find(
      (img) => img.type === 'vegetation_overlay'
    )?.dataUrl;

    // Generate image
    const result = await provider.generateImage(body.prompt, {
      size: body.size,
      seed: body.seed,
      mapScreenshot: mapScreenshot,
      vegetationMapScreenshot: vegetationOverlay,
    });

    // Convert image data to base64
    const imageBase64 =
      typeof result.imageData === 'string'
        ? result.imageData
        : result.imageData.toString('base64');

    const dataUrl = `data:image/${result.format};base64,${imageBase64}`;

    return {
      status: 200,
      jsonBody: {
        dataUrl,
        thinkingText: result.thinkingText,
        metadata: result.metadata,
      },
    };
  } catch (error) {
    context.error('[LabGenerate] JSON generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      status: 500,
      jsonBody: {
        error: 'Failed to generate image',
        details: errorMessage,
      },
    };
  }
}

// Register the function with Azure Functions runtime
app.http('labGenerate', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'lab/generate',
  handler: labGenerate,
});
