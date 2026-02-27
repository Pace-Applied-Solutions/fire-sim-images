import functions from '@azure/functions';
import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getImageModelConfig } from '../imageModelConfig.js';
import { GeminiImageProvider } from '../services/geminiImageProvider.js';

const { app } = functions;

/**
 * Lab modification request payload.
 * Accepts a previously generated image + original prompt + natural language edit request.
 * The backend builds a multi-turn Gemini conversation so the model has full prior context.
 */
export interface LabModifyRequest {
  /** The exact prompt used in the original generation */
  originalPrompt: string;
  /** Previously generated image as a base64 data URL (data:image/png;base64,...) */
  imageDataUrl: string;
  /** Natural language description of the desired change, e.g. "make the sky red" */
  editRequest: string;
  /** Optional system instruction (pass the same one used in the original generation) */
  systemInstruction?: string;
  /** Optional original reference images for spatial context */
  referenceImages?: Array<{
    dataUrl: string;
    type: 'map_screenshot' | 'aerial_overview' | 'vegetation_overlay' | 'uploaded' | 'generated_output';
  }>;
  /** Image size */
  size?: '1024x1024' | '1792x1024' | '1024x1792';
}

/**
 * HTTP-triggered function for modifying a previously generated Prompt Lab image.
 * POST /api/lab/modify
 *
 * Uses a multi-turn Gemini conversation (original context → generated image → edit request)
 * so the model retains all prior scenario context when applying the modification.
 *
 * Returns: SSE stream with thinking text + final image (same format as lab/generate).
 */
export async function labModify(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('[LabModify] Processing image modification request');

  try {
    const body = (await request.json()) as LabModifyRequest;

    // Validate required fields
    if (!body.originalPrompt) {
      return { status: 400, jsonBody: { error: 'Missing required field: originalPrompt' } };
    }
    if (!body.imageDataUrl) {
      return { status: 400, jsonBody: { error: 'Missing required field: imageDataUrl' } };
    }
    if (!body.editRequest || !body.editRequest.trim()) {
      return { status: 400, jsonBody: { error: 'Missing required field: editRequest' } };
    }

    // Get image model config
    const modelConfig = await getImageModelConfig(context);
    if (!modelConfig) {
      return { status: 503, jsonBody: { error: 'Image generation service not configured' } };
    }

    const provider = new GeminiImageProvider(modelConfig);

    // Check if SSE is requested
    const acceptHeader = request.headers.get('accept') || '';
    const wantsSSE = acceptHeader.includes('text/event-stream');

    if (wantsSSE) {
      return await handleSSEModification(body, provider, context);
    } else {
      return await handleJSONModification(body, provider, context);
    }
  } catch (error) {
    context.error('[LabModify] Error processing request:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      status: 500,
      jsonBody: { error: 'Failed to modify image', details: errorMessage },
    };
  }
}

/**
 * Handle SSE streaming modification.
 */
async function handleSSEModification(
  body: LabModifyRequest,
  provider: GeminiImageProvider,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];

  const sendEvent = (eventType: string, data: unknown) => {
    const json = JSON.stringify(data);
    const event = `event: ${eventType}\ndata: ${json}\n\n`;
    chunks.push(encoder.encode(event));
  };

  const buildResponse = () => {
    const responseBody = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
      responseBody.set(chunk, offset);
      offset += chunk.length;
    }
    return responseBody;
  };

  try {
    let lastThinkingText = '';
    const result = await provider.modifyImage(
      body.originalPrompt,
      body.imageDataUrl,
      body.editRequest,
      {
        size: body.size,
        systemInstruction: body.systemInstruction,
        referenceImages: body.referenceImages,
        onThinkingUpdate: (thinkingText: string) => {
          if (thinkingText !== lastThinkingText) {
            sendEvent('thinking', { text: thinkingText });
            lastThinkingText = thinkingText;
          }
        },
      }
    );

    const imageBase64 =
      typeof result.imageData === 'string'
        ? result.imageData
        : result.imageData.toString('base64');

    const dataUrl = `data:image/${result.format};base64,${imageBase64}`;

    sendEvent('result', {
      dataUrl,
      thinkingText: result.thinkingText,
      metadata: result.metadata,
    });
    sendEvent('done', {});

    return {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
      body: buildResponse(),
    };
  } catch (error) {
    context.error('[LabModify] SSE modification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    sendEvent('error', { error: errorMessage });
    sendEvent('done', {});
    return {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
      body: buildResponse(),
    };
  }
}

/**
 * Handle JSON modification (no streaming).
 */
async function handleJSONModification(
  body: LabModifyRequest,
  provider: GeminiImageProvider,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const result = await provider.modifyImage(
      body.originalPrompt,
      body.imageDataUrl,
      body.editRequest,
      {
        size: body.size,
        systemInstruction: body.systemInstruction,
        referenceImages: body.referenceImages,
      }
    );

    const imageBase64 =
      typeof result.imageData === 'string'
        ? result.imageData
        : result.imageData.toString('base64');

    const dataUrl = `data:image/${result.format};base64,${imageBase64}`;

    return {
      status: 200,
      jsonBody: { dataUrl, thinkingText: result.thinkingText, metadata: result.metadata },
    };
  } catch (error) {
    context.error('[LabModify] JSON modification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      status: 500,
      jsonBody: { error: 'Failed to modify image', details: errorMessage },
    };
  }
}

// Register the function with Azure Functions runtime
app.http('labModify', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'lab/modify',
  handler: labModify,
});
