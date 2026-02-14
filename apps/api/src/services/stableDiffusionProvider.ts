/**
 * Stable Diffusion image generation provider for dev mode testing.
 * Note: This is a mock implementation for development. Replace with actual
 * Stable Diffusion API integration when available.
 */

import crypto from 'node:crypto';
import type { ImageGenerationProvider, ImageGenOptions, ImageGenResult } from './imageGenerationProvider.js';

export class StableDiffusionProvider implements ImageGenerationProvider {
  readonly modelId = 'stable-diffusion-xl-1.0';
  readonly maxConcurrent = 3;

  constructor(config?: { apiEndpoint?: string; apiKey?: string }) {
    // Store config for future use when actual SD API is integrated
    if (config?.apiEndpoint) {
      process.env.STABLE_DIFFUSION_ENDPOINT = config.apiEndpoint;
    }
    if (config?.apiKey) {
      process.env.STABLE_DIFFUSION_API_KEY = config.apiKey;
    }
  }

  async isAvailable(): Promise<boolean> {
    // For dev mode, we'll create mock images
    // In production, check if API endpoint is configured
    return true;
  }

  async generateImage(prompt: string, options?: ImageGenOptions): Promise<ImageGenResult> {
    const startTime = Date.now();
    const promptHash = crypto.createHash('sha256').update(prompt).digest('hex').substring(0, 16);

    // Parse size from options
    const size = options?.size || '1024x1024';
    const [widthStr, heightStr] = size.split('x');
    const width = parseInt(widthStr, 10);
    const height = parseInt(heightStr, 10);

    // For dev mode, generate a mock PNG image (1x1 pixel placeholder)
    // In production, this would call the actual Stable Diffusion API
    const imageData = await this.generateMockImage(width, height, prompt);
    const generationTime = Date.now() - startTime;

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
   * Generate a mock PNG image for development testing.
   * Creates a simple colored rectangle based on prompt hash.
   */
  private async generateMockImage(_width: number, _height: number, _prompt: string): Promise<Buffer> {
    // Create a minimal valid PNG (1x1 pixel)
    // In production, this would use the prompt hash to generate varied colors

    // Create a minimal valid PNG (1x1 pixel)
    // PNG signature + IHDR + IDAT + IEND chunks
    const png = Buffer.concat([
      // PNG signature
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      // IHDR chunk (13 bytes data)
      this.createChunk('IHDR', Buffer.from([
        0x00, 0x00, 0x00, 0x01, // width: 1
        0x00, 0x00, 0x00, 0x01, // height: 1
        0x08, // bit depth: 8
        0x02, // color type: 2 (RGB)
        0x00, // compression: 0
        0x00, // filter: 0
        0x00, // interlace: 0
      ])),
      // IDAT chunk (pixel data)
      this.createChunk('IDAT', Buffer.from([
        0x78, 0x9c, // zlib header
        0x62, 0x62, 0x62, 0x00, 0x00, 0x00, 0x04, 0x00, 0x01, // compressed RGB data
      ])),
      // IEND chunk
      this.createChunk('IEND', Buffer.alloc(0)),
    ]);

    return png;
  }

  /**
   * Create a PNG chunk with type, data, and CRC.
   */
  private createChunk(type: string, data: Buffer): Buffer {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);

    const typeBuffer = Buffer.from(type, 'ascii');
    const crc = this.calculateCRC(Buffer.concat([typeBuffer, data]));
    const crcBuffer = Buffer.alloc(4);
    crcBuffer.writeUInt32BE(crc, 0);

    return Buffer.concat([length, typeBuffer, data, crcBuffer]);
  }

  /**
   * Calculate CRC32 checksum for PNG chunk.
   */
  private calculateCRC(data: Buffer): number {
    let crc = 0xffffffff;
    for (const byte of data) {
      crc ^= byte;
      for (let k = 0; k < 8; k++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }
}
