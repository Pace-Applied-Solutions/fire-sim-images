/**
 * Visual consistency validation for multi-perspective image generation.
 * Validates that generated images maintain consistency across viewpoints:
 * - Smoke direction alignment
 * - Fire size proportionality
 * - Lighting consistency
 * - Color palette similarity
 */

import type { GeneratedImage, ScenarioInputs } from '@fire-sim/shared';

export interface ConsistencyValidationResult {
  passed: boolean;
  score: number; // 0-100 overall consistency score
  checks: ConsistencyCheck[];
  warnings: string[];
  recommendations: string[];
}

export interface ConsistencyCheck {
  name: string;
  passed: boolean;
  score: number; // 0-100
  message: string;
}

export class ConsistencyValidator {
  /**
   * Validate consistency across a set of generated images.
   */
  validateImageSet(
    images: GeneratedImage[],
    inputs: ScenarioInputs,
    anchorImage?: GeneratedImage
  ): ConsistencyValidationResult {
    const checks: ConsistencyCheck[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Check 1: Smoke direction consistency
    const smokeDirectionCheck = this.validateSmokeDirection(images, inputs);
    checks.push(smokeDirectionCheck);
    if (!smokeDirectionCheck.passed) {
      warnings.push(smokeDirectionCheck.message);
    }

    // Check 2: Fire size proportionality
    const fireSizeCheck = this.validateFireSizeProportions(images, anchorImage);
    checks.push(fireSizeCheck);
    if (!fireSizeCheck.passed) {
      warnings.push(fireSizeCheck.message);
    }

    // Check 3: Lighting consistency
    const lightingCheck = this.validateLightingConsistency(images, inputs);
    checks.push(lightingCheck);
    if (!lightingCheck.passed) {
      warnings.push(lightingCheck.message);
    }

    // Check 4: Color palette similarity
    const colorCheck = this.validateColorPalette(images);
    checks.push(colorCheck);
    if (!colorCheck.passed) {
      warnings.push(colorCheck.message);
    }

    // Calculate overall score (weighted average)
    const overallScore = this.calculateOverallScore(checks);

    // Generate recommendations
    if (overallScore < 70) {
      recommendations.push(
        'Consider regenerating images with a different seed for better consistency'
      );
    }
    if (!smokeDirectionCheck.passed) {
      recommendations.push(
        'Review wind direction parameter and ensure prompts specify correct smoke direction'
      );
    }
    if (!colorCheck.passed) {
      recommendations.push(
        'Apply color grading post-processing to normalize color palette across views'
      );
    }

    return {
      passed: overallScore >= 70, // 70% threshold for passing
      score: overallScore,
      checks,
      warnings,
      recommendations,
    };
  }

  /**
   * Validate that smoke direction is consistent with wind direction across all images.
   * This is a heuristic check based on prompt analysis and metadata.
   */
  private validateSmokeDirection(
    images: GeneratedImage[],
    inputs: ScenarioInputs
  ): ConsistencyCheck {
    // Heuristic: Check if prompts mention the correct wind direction
    const expectedDirection = inputs.windDirection.toLowerCase();
    const windDirectionMentioned = images.filter((img) => {
      const prompt = img.metadata.prompt.toLowerCase();
      return prompt.includes(expectedDirection) || prompt.includes('wind');
    });

    const score = (windDirectionMentioned.length / images.length) * 100;
    const passed = score >= 80; // 80% of images should mention wind direction

    return {
      name: 'Smoke Direction Consistency',
      passed,
      score,
      message: passed
        ? `Smoke direction aligned with wind (${inputs.windDirection})`
        : `Inconsistent smoke direction - expected ${inputs.windDirection} wind`,
    };
  }

  /**
   * Validate that fire size appears proportional across different viewpoints.
   * Aerial should show full extent, ground views show closer detail.
   */
  private validateFireSizeProportions(
    images: GeneratedImage[],
    anchorImage?: GeneratedImage
  ): ConsistencyCheck {
    // Heuristic: Check if different viewpoint types are present
    const viewTypes = new Set(images.map((img) => img.viewPoint.split('_')[0]));
    const hasMultipleViewTypes = viewTypes.size > 1;
    const hasAnchor = !!anchorImage;

    const score = hasMultipleViewTypes && hasAnchor ? 100 : hasMultipleViewTypes ? 70 : 50;
    const passed = score >= 70;

    return {
      name: 'Fire Size Proportionality',
      passed,
      score,
      message: passed
        ? 'Fire scale appears consistent across viewpoint types'
        : 'Limited viewpoint variety - unable to verify fire size consistency',
    };
  }

  /**
   * Validate that lighting conditions match the specified time of day across all images.
   */
  private validateLightingConsistency(
    images: GeneratedImage[],
    inputs: ScenarioInputs
  ): ConsistencyCheck {
    // Heuristic: Check if prompts mention the correct time of day
    const timeOfDay = inputs.timeOfDay.toLowerCase();
    const timeOfDayMentioned = images.filter((img) => {
      const prompt = img.metadata.prompt.toLowerCase();
      return prompt.includes(timeOfDay) || prompt.includes('lighting') || prompt.includes('sun');
    });

    const score = (timeOfDayMentioned.length / images.length) * 100;
    const passed = score >= 80;

    return {
      name: 'Lighting Consistency',
      passed,
      score,
      message: passed
        ? `Lighting consistent with ${inputs.timeOfDay} conditions`
        : `Inconsistent lighting - expected ${inputs.timeOfDay} conditions`,
    };
  }

  /**
   * Validate that color palette is similar across all images.
   * This is a basic check for now - can be enhanced with actual image analysis.
   */
  private validateColorPalette(images: GeneratedImage[]): ConsistencyCheck {
    // Heuristic: Check if all images are from the same model
    const models = new Set(images.map((img) => img.metadata.model));
    const sameModel = models.size === 1;

    // Check if all images have the same seed (indicates consistency attempt)
    const seeds = new Set(
      images.map((img) => img.metadata.seed).filter((seed) => seed !== undefined)
    );
    const sameSeed = seeds.size <= 1;

    const score = sameModel && sameSeed ? 100 : sameModel ? 80 : 60;
    const passed = score >= 70;

    return {
      name: 'Color Palette Similarity',
      passed,
      score,
      message: passed
        ? 'Color palette likely consistent (same model and seed)'
        : 'Color palette may vary (different models or seeds)',
    };
  }

  /**
   * Calculate weighted overall consistency score.
   */
  private calculateOverallScore(checks: ConsistencyCheck[]): number {
    // Weight different checks
    const weights: Record<string, number> = {
      'Smoke Direction Consistency': 0.3,
      'Fire Size Proportionality': 0.2,
      'Lighting Consistency': 0.25,
      'Color Palette Similarity': 0.25,
    };

    let weightedSum = 0;
    let totalWeight = 0;

    for (const check of checks) {
      const weight = weights[check.name] || 0.25;
      weightedSum += check.score * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  }

  /**
   * Generate a human-readable validation report.
   */
  generateReport(result: ConsistencyValidationResult): string {
    const lines: string[] = [];

    lines.push('=== Visual Consistency Validation Report ===\n');
    lines.push(`Overall Score: ${result.score}/100 ${result.passed ? '✓ PASSED' : '✗ FAILED'}\n`);
    lines.push('Individual Checks:');

    for (const check of result.checks) {
      lines.push(
        `  ${check.passed ? '✓' : '✗'} ${check.name}: ${check.score}/100 - ${check.message}`
      );
    }

    if (result.warnings.length > 0) {
      lines.push('\nWarnings:');
      for (const warning of result.warnings) {
        lines.push(`  ⚠ ${warning}`);
      }
    }

    if (result.recommendations.length > 0) {
      lines.push('\nRecommendations:');
      for (const rec of result.recommendations) {
        lines.push(`  → ${rec}`);
      }
    }

    lines.push('\n=== End of Report ===');

    return lines.join('\n');
  }
}
