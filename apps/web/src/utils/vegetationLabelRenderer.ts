/**
 * Utility for rendering vegetation type labels on vegetation overlay images.
 * Uses flood-fill algorithm to detect contiguous blocks and places labels.
 */

interface VegetationBlock {
  color: string;
  pixels: Set<number>;
  centroid: { x: number; y: number };
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

/**
 * Convert RGB color to a unique string key for grouping pixels
 */
function colorKey(r: number, g: number, b: number): string {
  return `${r},${g},${b}`;
}

/**
 * Find contiguous blocks of vegetation using flood-fill algorithm.
 * Groups adjacent pixels with the same color into blocks.
 */
function findContiguousBlocks(
  imageData: ImageData,
  minBlockSize: number = 500
): VegetationBlock[] {
  const width = imageData.width;
  const height = imageData.height;
  const visited = new Set<number>();
  const blocks: VegetationBlock[] = [];

  // Helper to get pixel index
  const getIndex = (x: number, y: number) => y * width + x;

  // Helper to get color at pixel
  const getColor = (x: number, y: number) => {
    const idx = (y * width + x) * 4;
    return {
      r: imageData.data[idx],
      g: imageData.data[idx + 1],
      b: imageData.data[idx + 2],
      a: imageData.data[idx + 3],
    };
  };

  // Flood fill to find contiguous region
  const floodFill = (startX: number, startY: number, targetColor: string): VegetationBlock => {
    const stack: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];
    const pixels = new Set<number>();
    let minX = startX, maxX = startX, minY = startY, maxY = startY;
    let sumX = 0, sumY = 0;

    while (stack.length > 0) {
      const { x, y } = stack.pop()!;

      if (x < 0 || x >= width || y < 0 || y >= height) continue;

      const pixelIdx = getIndex(x, y);
      if (visited.has(pixelIdx)) continue;

      const color = getColor(x, y);
      const currentColorKey = colorKey(color.r, color.g, color.b);

      // Skip transparent pixels
      if (color.a < 128) continue;

      if (currentColorKey !== targetColor) continue;

      visited.add(pixelIdx);
      pixels.add(pixelIdx);

      sumX += x;
      sumY += y;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);

      // Add neighbors
      stack.push({ x: x + 1, y });
      stack.push({ x: x - 1, y });
      stack.push({ x, y: y + 1 });
      stack.push({ x, y: y - 1 });
    }

    return {
      color: targetColor,
      pixels,
      centroid: {
        x: Math.round(sumX / pixels.size),
        y: Math.round(sumY / pixels.size),
      },
      bounds: { minX, minY, maxX, maxY },
    };
  };

  // Scan through image to find all contiguous blocks
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelIdx = getIndex(x, y);
      if (visited.has(pixelIdx)) continue;

      const color = getColor(x, y);

      // Skip transparent pixels
      if (color.a < 128) continue;

      const currentColorKey = colorKey(color.r, color.g, color.b);
      const block = floodFill(x, y, currentColorKey);

      // Only include blocks larger than minimum size
      if (block.pixels.size >= minBlockSize) {
        blocks.push(block);
      }
    }
  }

  return blocks;
}

/**
 * Simple color-to-vegetation-type mapper.
 * This is a basic implementation - in production you'd want to map NVIS WMS colors
 * to specific vegetation types from NVIS_MVS_DESCRIPTORS.
 */
function getVegetationLabel(color: string): string {
  // Parse color string "r,g,b"
  const [r, g, b] = color.split(',').map(Number);

  // Map common colors to vegetation types
  // These are approximate mappings - actual NVIS colors may differ
  const hue = (Math.atan2(Math.sqrt(3) * (g - b), 2 * r - g - b) * 180 / Math.PI + 360) % 360;
  const saturation = (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(r, g, b);
  const value = Math.max(r, g, b) / 255;

  // Simple heuristic-based classification
  if (value < 0.3) return 'Cleared/Water';
  if (saturation < 0.2) return 'Cleared/Urban';
  if (hue >= 60 && hue < 180 && value > 0.4) {
    if (saturation > 0.5) return 'Eucalyptus Forest';
    return 'Grassland';
  }
  if (hue >= 20 && hue < 60) return 'Dry Sclerophyll';
  if (hue >= 180 && hue < 240) return 'Wet Sclerophyll';

  return 'Vegetation';
}

/**
 * Render labels on a vegetation overlay image.
 * Detects contiguous blocks and draws text labels at their centroids.
 *
 * @param imageDataUrl - Base64 data URL of the vegetation overlay image
 * @param showLabels - Whether to show labels (toggle control)
 * @param minBlockSize - Minimum number of pixels to consider a block worth labeling
 * @returns Promise resolving to labeled image data URL, or original if labels disabled
 */
export async function renderVegetationLabels(
  imageDataUrl: string,
  showLabels: boolean = true,
  minBlockSize: number = 1000
): Promise<string> {
  if (!showLabels) {
    return imageDataUrl;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Get image data for analysis
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Find contiguous blocks
      const blocks = findContiguousBlocks(imageData, minBlockSize);

      // Draw labels
      ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (const block of blocks) {
        const label = getVegetationLabel(block.color);
        const { x, y } = block.centroid;

        // Measure text
        const metrics = ctx.measureText(label);
        const textWidth = metrics.width;
        const textHeight = 20; // Approximate height

        // Draw background rectangle for better readability
        const padding = 6;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(
          x - textWidth / 2 - padding,
          y - textHeight / 2 - padding,
          textWidth + padding * 2,
          textHeight + padding * 2
        );

        // Draw border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 1;
        ctx.strokeRect(
          x - textWidth / 2 - padding,
          y - textHeight / 2 - padding,
          textWidth + padding * 2,
          textHeight + padding * 2
        );

        // Draw text
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillText(label, x, y);
      }

      // Convert to data URL
      resolve(canvas.toDataURL('image/png'));
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = imageDataUrl;
  });
}
