/**
 * Cost tracking utility for estimating scenario generation costs.
 * Based on Azure OpenAI and Azure AI Foundry pricing.
 */

export interface CostBreakdown {
  images: {
    count: number;
    costPerImage: number;
    totalCost: number;
  };
  videos: {
    count: number;
    costPerVideo: number;
    totalCost: number;
  };
  storage: {
    sizeBytes: number;
    costPerGB: number;
    totalCost: number;
  };
  totalCost: number;
}

export interface PricingConfig {
  // Azure OpenAI DALL-E 3 pricing (USD)
  dalle3Standard: number; // per image
  dalle3HD: number; // per image
  
  // Azure AI Foundry Stable Image Core pricing (USD)
  stableImageCore: number; // per image
  
  // Video generation pricing (estimated, USD)
  videoGeneration: number; // per video (4-10 seconds)
  
  // Storage pricing (USD)
  storagePerGB: number; // per GB per month
}

/**
 * Default pricing based on Azure OpenAI and Azure services.
 * Prices are in USD and should be reviewed periodically.
 * 
 * Note: These are estimates based on public pricing as of 2024.
 * Actual prices may vary by region and may change over time.
 * TODO(Future): Consider implementing dynamic pricing updates via Azure Pricing API
 * when the project scales to multi-region or high-volume usage.
 */
const DEFAULT_PRICING: PricingConfig = {
  dalle3Standard: 0.040, // $0.040 per image (1024x1024)
  dalle3HD: 0.080, // $0.080 per image (1024x1792 or 1792x1024)
  stableImageCore: 0.033, // $0.033 per image (estimated)
  videoGeneration: 0.50, // $0.50 per video (estimated for SVD or similar)
  storagePerGB: 0.020, // $0.020 per GB per month (Blob Storage hot tier)
};

/**
 * Cost estimator for scenario generation.
 */
export class CostEstimator {
  private pricing: PricingConfig;

  constructor(customPricing?: Partial<PricingConfig>) {
    this.pricing = {
      ...DEFAULT_PRICING,
      ...customPricing,
    };
  }

  /**
   * Estimate the cost of generating a scenario.
   */
  estimateScenarioCost(params: {
    imageCount: number;
    videoCount: number;
    imageQuality?: 'standard' | 'hd';
    imageProvider?: 'dalle3' | 'stable-image-core';
    estimatedStorageMB?: number;
  }): CostBreakdown {
    const {
      imageCount,
      videoCount,
      imageQuality = 'standard',
      imageProvider = 'stable-image-core',
      estimatedStorageMB = 10, // Default: 10 MB per scenario
    } = params;

    // Calculate image cost
    let costPerImage = this.pricing.stableImageCore;
    if (imageProvider === 'dalle3') {
      costPerImage = imageQuality === 'hd' 
        ? this.pricing.dalle3HD 
        : this.pricing.dalle3Standard;
    }

    const imageCost = imageCount * costPerImage;

    // Calculate video cost
    const videoCost = videoCount * this.pricing.videoGeneration;

    // Calculate storage cost (monthly, prorated)
    const storageSizeGB = estimatedStorageMB / 1024;
    const storageCost = storageSizeGB * this.pricing.storagePerGB;

    // Total cost
    const totalCost = imageCost + videoCost + storageCost;

    return {
      images: {
        count: imageCount,
        costPerImage,
        totalCost: imageCost,
      },
      videos: {
        count: videoCount,
        costPerVideo: this.pricing.videoGeneration,
        totalCost: videoCost,
      },
      storage: {
        sizeBytes: estimatedStorageMB * 1024 * 1024,
        costPerGB: this.pricing.storagePerGB,
        totalCost: storageCost,
      },
      totalCost,
    };
  }

  /**
   * Format cost breakdown as a human-readable string.
   */
  formatCostBreakdown(breakdown: CostBreakdown): string {
    const lines = [
      `Images: ${breakdown.images.count} × $${breakdown.images.costPerImage.toFixed(4)} = $${breakdown.images.totalCost.toFixed(4)}`,
      `Videos: ${breakdown.videos.count} × $${breakdown.videos.costPerVideo.toFixed(4)} = $${breakdown.videos.totalCost.toFixed(4)}`,
      `Storage: ${(breakdown.storage.sizeBytes / (1024 * 1024)).toFixed(2)} MB × $${breakdown.storage.costPerGB.toFixed(4)}/GB = $${breakdown.storage.totalCost.toFixed(4)}`,
      `Total: $${breakdown.totalCost.toFixed(4)}`,
    ];
    return lines.join('\n');
  }
}

/**
 * Daily usage summary for admin reporting.
 */
export interface DailyUsageSummary {
  date: string;
  totalScenarios: number;
  totalImages: number;
  totalVideos: number;
  totalCost: number;
  costBreakdown: CostBreakdown;
}

/**
 * Track and aggregate usage data for cost reporting.
 */
export class UsageTracker {
  private scenarios: Map<string, CostBreakdown>;

  constructor(_customPricing?: Partial<PricingConfig>) {
    this.scenarios = new Map();
  }

  /**
   * Record a scenario's cost.
   */
  recordScenario(scenarioId: string, breakdown: CostBreakdown): void {
    this.scenarios.set(scenarioId, breakdown);
  }

  /**
   * Get daily summary for a specific date.
   */
  getDailySummary(date: Date = new Date()): DailyUsageSummary {
    const dateStr = date.toISOString().split('T')[0];

    // Aggregate all scenarios (in a real implementation, filter by date)
    let totalScenarios = 0;
    let totalImages = 0;
    let totalVideos = 0;
    let totalImageCost = 0;
    let totalVideoCost = 0;
    let totalStorageCost = 0;
    let totalStorageBytes = 0;

    for (const breakdown of this.scenarios.values()) {
      totalScenarios++;
      totalImages += breakdown.images.count;
      totalVideos += breakdown.videos.count;
      totalImageCost += breakdown.images.totalCost;
      totalVideoCost += breakdown.videos.totalCost;
      totalStorageCost += breakdown.storage.totalCost;
      totalStorageBytes += breakdown.storage.sizeBytes;
    }

    const totalCost = totalImageCost + totalVideoCost + totalStorageCost;

    return {
      date: dateStr,
      totalScenarios,
      totalImages,
      totalVideos,
      totalCost,
      costBreakdown: {
        images: {
          count: totalImages,
          costPerImage: totalImages > 0 ? totalImageCost / totalImages : 0,
          totalCost: totalImageCost,
        },
        videos: {
          count: totalVideos,
          costPerVideo: totalVideos > 0 ? totalVideoCost / totalVideos : 0,
          totalCost: totalVideoCost,
        },
        storage: {
          sizeBytes: totalStorageBytes,
          costPerGB: 0.020,
          totalCost: totalStorageCost,
        },
        totalCost,
      },
    };
  }

  /**
   * Clear all tracked data.
   */
  clear(): void {
    this.scenarios.clear();
  }
}

/**
 * Global usage tracker instance.
 */
export const globalUsageTracker = new UsageTracker();

/**
 * Global cost estimator instance.
 */
export const globalCostEstimator = new CostEstimator();
