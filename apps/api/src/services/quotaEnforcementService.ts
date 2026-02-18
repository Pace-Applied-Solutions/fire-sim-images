/**
 * Quota enforcement service for checking and enforcing usage limits.
 * Implements tier-based quotas and overage pack credit management.
 */

import { TIER_LIMITS } from '@fire-sim/shared';
import {
  getUserProfile,
  getAvailableOverageCredits,
  incrementUsage,
  useOveragePackCredits,
} from './userProfileService';

/**
 * Result of a quota check.
 */
export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  quotaRemaining: number;
  overageCreditsAvailable: number;
  currentUsage: {
    scenarios: number;
    images: number;
    videos: number;
  };
  limits: {
    scenarios: number | null;
    images: number | null;
    videos: number | null;
  };
}

/**
 * Check if user has quota available for scenario generation.
 */
export async function checkScenarioQuota(userId: string): Promise<QuotaCheckResult> {
  const profile = await getUserProfile(userId);

  if (!profile) {
    return {
      allowed: false,
      reason: 'User profile not found',
      quotaRemaining: 0,
      overageCreditsAvailable: 0,
      currentUsage: { scenarios: 0, images: 0, videos: 0 },
      limits: { scenarios: null, images: null, videos: null },
    };
  }

  const tierLimits = TIER_LIMITS[profile.tier];
  const overageCredits = getAvailableOverageCredits(profile);

  // Free tier uses lifetime limit
  if (profile.tier === 'free') {
    const lifetimeUsed = profile.usage.lifetimeScenarios || 0;
    const lifetimeLimit = tierLimits.quotas.lifetimeScenarios || 0;
    const quotaRemaining = Math.max(0, lifetimeLimit - lifetimeUsed);

    const allowed = quotaRemaining > 0 || overageCredits > 0;

    return {
      allowed,
      reason: allowed ? undefined : 'Free tier lifetime limit exceeded. Purchase overage pack or upgrade.',
      quotaRemaining,
      overageCreditsAvailable: overageCredits,
      currentUsage: {
        scenarios: lifetimeUsed,
        images: profile.usage.imagesGenerated,
        videos: profile.usage.videosGenerated,
      },
      limits: {
        scenarios: tierLimits.quotas.lifetimeScenarios || null,
        images: tierLimits.quotas.imagesPerMonth || null,
        videos: tierLimits.quotas.videosPerMonth || null,
      },
    };
  }

  // Paid tiers use monthly limits
  const monthlyLimit = tierLimits.quotas.scenariosPerMonth || 0;
  const monthlyUsed = profile.usage.scenariosGenerated;
  const quotaRemaining = Math.max(0, monthlyLimit - monthlyUsed);

  const allowed = quotaRemaining > 0 || overageCredits > 0;

  return {
    allowed,
    reason: allowed ? undefined : 'Monthly quota exceeded. Purchase overage pack or upgrade tier.',
    quotaRemaining,
    overageCreditsAvailable: overageCredits,
    currentUsage: {
      scenarios: monthlyUsed,
      images: profile.usage.imagesGenerated,
      videos: profile.usage.videosGenerated,
    },
    limits: {
      scenarios: monthlyLimit,
      images: tierLimits.quotas.imagesPerMonth,
      videos: tierLimits.quotas.videosPerMonth,
    },
  };
}

/**
 * Check if user has quota available for video generation.
 */
export async function checkVideoQuota(userId: string): Promise<QuotaCheckResult> {
  const profile = await getUserProfile(userId);

  if (!profile) {
    return {
      allowed: false,
      reason: 'User profile not found',
      quotaRemaining: 0,
      overageCreditsAvailable: 0,
      currentUsage: { scenarios: 0, images: 0, videos: 0 },
      limits: { scenarios: null, images: null, videos: null },
    };
  }

  const tierLimits = TIER_LIMITS[profile.tier];

  // Free tier doesn't support video generation
  if (profile.tier === 'free') {
    return {
      allowed: false,
      reason: 'Video generation not available on Free tier. Upgrade to Starter or higher.',
      quotaRemaining: 0,
      overageCreditsAvailable: 0,
      currentUsage: {
        scenarios: profile.usage.lifetimeScenarios || 0,
        images: profile.usage.imagesGenerated,
        videos: profile.usage.videosGenerated,
      },
      limits: {
        scenarios: tierLimits.quotas.lifetimeScenarios || null,
        images: tierLimits.quotas.imagesPerMonth || null,
        videos: tierLimits.quotas.videosPerMonth || null,
      },
    };
  }

  // Check video quota for paid tiers
  const monthlyLimit = tierLimits.quotas.videosPerMonth || 0;
  const monthlyUsed = profile.usage.videosGenerated;
  const quotaRemaining = Math.max(0, monthlyLimit - monthlyUsed);

  return {
    allowed: quotaRemaining > 0,
    reason: quotaRemaining > 0 ? undefined : 'Monthly video quota exceeded.',
    quotaRemaining,
    overageCreditsAvailable: 0, // Videos don't use overage packs
    currentUsage: {
      scenarios: profile.usage.scenariosGenerated,
      images: profile.usage.imagesGenerated,
      videos: monthlyUsed,
    },
    limits: {
      scenarios: tierLimits.quotas.scenariosPerMonth,
      images: tierLimits.quotas.imagesPerMonth,
      videos: monthlyLimit,
    },
  };
}

/**
 * Consume quota for scenario generation.
 * Tries to use monthly quota first, then overage pack credits.
 */
export async function consumeScenarioQuota(
  userId: string,
  imageCount: number = 5
): Promise<{ success: boolean; usedOverageCredit: boolean; message?: string }> {
  const quotaCheck = await checkScenarioQuota(userId);

  if (!quotaCheck.allowed) {
    return {
      success: false,
      usedOverageCredit: false,
      message: quotaCheck.reason,
    };
  }

  const profile = await getUserProfile(userId);
  if (!profile) {
    return {
      success: false,
      usedOverageCredit: false,
      message: 'User profile not found',
    };
  }

  // If quota remaining, use it
  if (quotaCheck.quotaRemaining > 0) {
    await incrementUsage(userId, 1, imageCount, 0);
    return {
      success: true,
      usedOverageCredit: false,
    };
  }

  // Otherwise, use overage pack credits
  if (quotaCheck.overageCreditsAvailable > 0) {
    const result = await useOveragePackCredits(userId, 1);
    if (result.success) {
      await incrementUsage(userId, 1, imageCount, 0);
      return {
        success: true,
        usedOverageCredit: true,
      };
    }
  }

  return {
    success: false,
    usedOverageCredit: false,
    message: 'No quota or overage credits available',
  };
}

/**
 * Consume quota for video generation.
 */
export async function consumeVideoQuota(userId: string, videoCount: number = 1): Promise<{ success: boolean; message?: string }> {
  const quotaCheck = await checkVideoQuota(userId);

  if (!quotaCheck.allowed) {
    return {
      success: false,
      message: quotaCheck.reason,
    };
  }

  await incrementUsage(userId, 0, 0, videoCount);
  return {
    success: true,
  };
}

/**
 * Get usage percentage for a user.
 */
export async function getUsagePercentage(userId: string): Promise<{
  scenarios: number;
  images: number;
  videos: number;
}> {
  const profile = await getUserProfile(userId);

  if (!profile) {
    return { scenarios: 0, images: 0, videos: 0 };
  }

  const tierLimits = TIER_LIMITS[profile.tier];

  if (profile.tier === 'free') {
    const lifetimeLimit = tierLimits.quotas.lifetimeScenarios || 1;
    const lifetimeUsed = profile.usage.lifetimeScenarios || 0;
    return {
      scenarios: (lifetimeUsed / lifetimeLimit) * 100,
      images: 0,
      videos: 0,
    };
  }

  const scenarioLimit = tierLimits.quotas.scenariosPerMonth || 1;
  const imageLimit = tierLimits.quotas.imagesPerMonth || 1;
  const videoLimit = tierLimits.quotas.videosPerMonth || 1;

  return {
    scenarios: (profile.usage.scenariosGenerated / scenarioLimit) * 100,
    images: (profile.usage.imagesGenerated / imageLimit) * 100,
    videos: (profile.usage.videosGenerated / videoLimit) * 100,
  };
}

/**
 * Check if user should receive quota warning (75%, 90%, 100%).
 */
export async function shouldSendQuotaWarning(userId: string): Promise<{
  shouldWarn: boolean;
  level: '75' | '90' | '100' | null;
  percentUsed: number;
}> {
  const usage = await getUsagePercentage(userId);
  const scenarioPercent = usage.scenarios;

  if (scenarioPercent >= 100) {
    return { shouldWarn: true, level: '100', percentUsed: scenarioPercent };
  }

  if (scenarioPercent >= 90) {
    return { shouldWarn: true, level: '90', percentUsed: scenarioPercent };
  }

  if (scenarioPercent >= 75) {
    return { shouldWarn: true, level: '75', percentUsed: scenarioPercent };
  }

  return { shouldWarn: false, level: null, percentUsed: scenarioPercent };
}
