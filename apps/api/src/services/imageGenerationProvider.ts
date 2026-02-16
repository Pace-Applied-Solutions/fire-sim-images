/**
 * Image generation provider abstraction layer.
 * Allows swapping between different AI image generation models (Stable Diffusion, DALL-E, etc.)
 */

export interface ImageGenOptions {
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'high';
  style?: 'natural' | 'vivid';
  seed?: number;
  referenceImage?: string | Buffer; // Base64 data URL or Buffer for reference/anchor image
  referenceStrength?: number; // 0-1, how much to adhere to reference (0.5 default)
  mapScreenshot?: string | Buffer; // Map view screenshot for terrain grounding
  /**
   * Called whenever new thinking/reasoning text arrives during streaming.
   * The callback receives the full accumulated thinking text so far.
   */
  onThinkingUpdate?: (thinkingText: string) => void;
}

export interface ImageGenResult {
  imageData: Buffer | string; // Buffer for binary data or base64 string
  format: 'png' | 'jpeg' | 'webp';
  /** Model thinking/reasoning text (from Gemini 3 Pro interleaved output) */
  thinkingText?: string;
  /** Model's non-thought text response (scene description, etc.) */
  modelTextResponse?: string;
  metadata: {
    model: string;
    promptHash: string;
    generationTime: number; // milliseconds
    width: number;
    height: number;
    seed?: number;
  };
}

/**
 * Interface for image generation providers.
 * Implementations should handle model-specific details internally.
 */
export interface ImageGenerationProvider {
  /**
   * Generate an image from a text prompt.
   */
  generateImage(prompt: string, options?: ImageGenOptions): Promise<ImageGenResult>;

  /**
   * Unique identifier for this provider/model.
   */
  readonly modelId: string;

  /**
   * Maximum number of concurrent generation requests this provider can handle.
   */
  readonly maxConcurrent: number;

  /**
   * Whether this provider is currently available and configured.
   */
  isAvailable(): Promise<boolean>;
}
