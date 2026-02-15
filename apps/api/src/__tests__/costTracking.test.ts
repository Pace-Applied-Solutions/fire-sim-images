/**
 * Unit tests for cost tracking and estimation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CostEstimator, UsageTracker } from '../utils/costTracking.js';

describe('Cost Tracking', () => {
  describe('CostEstimator', () => {
    let estimator: CostEstimator;

    beforeEach(() => {
      estimator = new CostEstimator();
    });

    it('should estimate cost for standard images with Stable Image Core', () => {
      const breakdown = estimator.estimateScenarioCost({
        imageCount: 5,
        videoCount: 0,
        imageProvider: 'stable-image-core',
        imageQuality: 'standard',
      });

      expect(breakdown.images.count).toBe(5);
      expect(breakdown.images.costPerImage).toBe(0.033); // Default Stable Image Core price
      expect(breakdown.images.totalCost).toBe(5 * 0.033);
      expect(breakdown.videos.totalCost).toBe(0);
      expect(breakdown.totalCost).toBeGreaterThan(0);
    });

    it('should estimate cost for DALL-E 3 standard images', () => {
      const breakdown = estimator.estimateScenarioCost({
        imageCount: 5,
        videoCount: 0,
        imageProvider: 'dalle3',
        imageQuality: 'standard',
      });

      expect(breakdown.images.count).toBe(5);
      expect(breakdown.images.costPerImage).toBe(0.040); // DALL-E 3 standard price
      expect(breakdown.images.totalCost).toBe(5 * 0.040);
    });

    it('should estimate cost for DALL-E 3 HD images', () => {
      const breakdown = estimator.estimateScenarioCost({
        imageCount: 5,
        videoCount: 0,
        imageProvider: 'dalle3',
        imageQuality: 'hd',
      });

      expect(breakdown.images.count).toBe(5);
      expect(breakdown.images.costPerImage).toBe(0.080); // DALL-E 3 HD price
      expect(breakdown.images.totalCost).toBe(5 * 0.080);
    });

    it('should estimate cost for videos', () => {
      const breakdown = estimator.estimateScenarioCost({
        imageCount: 0,
        videoCount: 3,
      });

      expect(breakdown.videos.count).toBe(3);
      expect(breakdown.videos.costPerVideo).toBe(0.50); // Default video price
      expect(breakdown.videos.totalCost).toBe(3 * 0.50);
    });

    it('should estimate storage cost', () => {
      const breakdown = estimator.estimateScenarioCost({
        imageCount: 5,
        videoCount: 0,
        estimatedStorageMB: 20,
      });

      expect(breakdown.storage.sizeBytes).toBe(20 * 1024 * 1024);
      expect(breakdown.storage.costPerGB).toBe(0.020); // Default storage price
      const expectedStorageCost = (20 / 1024) * 0.020;
      expect(breakdown.storage.totalCost).toBeCloseTo(expectedStorageCost, 6);
    });

    it('should calculate total cost correctly', () => {
      const breakdown = estimator.estimateScenarioCost({
        imageCount: 5,
        videoCount: 2,
        imageProvider: 'dalle3',
        imageQuality: 'standard',
        estimatedStorageMB: 10,
      });

      const expectedImageCost = 5 * 0.040;
      const expectedVideoCost = 2 * 0.50;
      const expectedStorageCost = (10 / 1024) * 0.020;
      const expectedTotal = expectedImageCost + expectedVideoCost + expectedStorageCost;

      expect(breakdown.totalCost).toBeCloseTo(expectedTotal, 6);
    });

    it('should use default values when not specified', () => {
      const breakdown = estimator.estimateScenarioCost({
        imageCount: 3,
        videoCount: 1,
      });

      expect(breakdown.images.costPerImage).toBe(0.033); // Default to stable-image-core
      expect(breakdown.storage.sizeBytes).toBe(10 * 1024 * 1024); // Default to 10 MB
    });

    it('should support custom pricing', () => {
      const customEstimator = new CostEstimator({
        dalle3Standard: 0.050,
        videoGeneration: 0.75,
      });

      const breakdown = customEstimator.estimateScenarioCost({
        imageCount: 5,
        videoCount: 2,
        imageProvider: 'dalle3',
        imageQuality: 'standard',
      });

      expect(breakdown.images.costPerImage).toBe(0.050);
      expect(breakdown.videos.costPerVideo).toBe(0.75);
    });

    it('should format cost breakdown as human-readable string', () => {
      const breakdown = estimator.estimateScenarioCost({
        imageCount: 5,
        videoCount: 2,
        estimatedStorageMB: 15,
      });

      const formatted = estimator.formatCostBreakdown(breakdown);

      expect(formatted).toContain('Images: 5');
      expect(formatted).toContain('Videos: 2');
      expect(formatted).toContain('Storage:');
      expect(formatted).toContain('Total:');
      expect(formatted).toContain('$');
    });
  });

  describe('UsageTracker', () => {
    let tracker: UsageTracker;
    let estimator: CostEstimator;

    beforeEach(() => {
      tracker = new UsageTracker();
      estimator = new CostEstimator();
    });

    it('should record scenario costs', () => {
      const breakdown = estimator.estimateScenarioCost({
        imageCount: 5,
        videoCount: 1,
      });

      tracker.recordScenario('scenario-1', breakdown);

      const summary = tracker.getDailySummary();
      expect(summary.totalScenarios).toBe(1);
      expect(summary.totalImages).toBe(5);
      expect(summary.totalVideos).toBe(1);
    });

    it('should aggregate multiple scenarios', () => {
      const breakdown1 = estimator.estimateScenarioCost({
        imageCount: 5,
        videoCount: 1,
      });
      const breakdown2 = estimator.estimateScenarioCost({
        imageCount: 3,
        videoCount: 2,
      });

      tracker.recordScenario('scenario-1', breakdown1);
      tracker.recordScenario('scenario-2', breakdown2);

      const summary = tracker.getDailySummary();
      expect(summary.totalScenarios).toBe(2);
      expect(summary.totalImages).toBe(8); // 5 + 3
      expect(summary.totalVideos).toBe(3); // 1 + 2
      expect(summary.totalCost).toBeGreaterThan(0);
    });

    it('should provide daily summary with date', () => {
      const breakdown = estimator.estimateScenarioCost({
        imageCount: 5,
        videoCount: 0,
      });

      tracker.recordScenario('scenario-1', breakdown);

      const today = new Date();
      const summary = tracker.getDailySummary(today);
      
      expect(summary.date).toBe(today.toISOString().split('T')[0]);
    });

    it('should include cost breakdown in summary', () => {
      const breakdown = estimator.estimateScenarioCost({
        imageCount: 5,
        videoCount: 1,
      });

      tracker.recordScenario('scenario-1', breakdown);

      const summary = tracker.getDailySummary();
      expect(summary.costBreakdown).toBeDefined();
      expect(summary.costBreakdown.images.count).toBe(5);
      expect(summary.costBreakdown.videos.count).toBe(1);
    });
  });

  describe('Cost Estimation Scenarios', () => {
    it('should estimate cost for typical Blue Mountains scenario', () => {
      const estimator = new CostEstimator();
      const breakdown = estimator.estimateScenarioCost({
        imageCount: 5,
        videoCount: 0,
        imageProvider: 'stable-image-core',
        estimatedStorageMB: 12,
      });

      expect(breakdown.images.count).toBe(5);
      expect(breakdown.totalCost).toBeGreaterThan(0);
      expect(breakdown.totalCost).toBeLessThan(1.0); // Should be under $1
    });

    it('should estimate cost for high-quality scenario with videos', () => {
      const estimator = new CostEstimator();
      const breakdown = estimator.estimateScenarioCost({
        imageCount: 8,
        videoCount: 3,
        imageProvider: 'dalle3',
        imageQuality: 'hd',
        estimatedStorageMB: 50,
      });

      expect(breakdown.images.count).toBe(8);
      expect(breakdown.videos.count).toBe(3);
      expect(breakdown.totalCost).toBeGreaterThan(1.0);
    });
  });
});
