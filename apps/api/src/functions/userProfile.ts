/**
 * User profile API endpoints.
 * Provides access to user tier, subscription, usage, and overage pack information.
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { withAuth } from '../middleware/auth';
import type { User } from '@fire-sim/shared';
import {
  getUserProfile,
  createUserProfile,
  getAvailableOverageCredits,
} from '../services/userProfileService';
import { TIER_LIMITS } from '@fire-sim/shared';

/**
 * GET /api/user/profile
 * Get current user profile including tier, subscription, and usage.
 */
async function getUserProfileHandler(
  _request: HttpRequest,
  context: InvocationContext,
  user: User
): Promise<HttpResponseInit> {
  context.log(`[UserProfile] Getting profile for user: ${user.id}`);

  try {
    let profile = await getUserProfile(user.id);

    // Create profile if it doesn't exist
    if (!profile) {
      context.log(`[UserProfile] Creating new profile for user: ${user.id}`);
      profile = await createUserProfile(user.id, user.email, user.name);
    }

    return {
      status: 200,
      jsonBody: profile,
    };
  } catch (error: any) {
    context.error('[UserProfile] Error getting profile:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Failed to retrieve user profile',
        message: error.message,
      },
    };
  }
}

/**
 * GET /api/user/usage
 * Get detailed usage breakdown for current billing period.
 */
async function getUserUsageHandler(
  _request: HttpRequest,
  context: InvocationContext,
  user: User
): Promise<HttpResponseInit> {
  context.log(`[UserUsage] Getting usage for user: ${user.id}`);

  try {
    const profile = await getUserProfile(user.id);

    if (!profile) {
      return {
        status: 404,
        jsonBody: {
          error: 'User profile not found',
        },
      };
    }

    const tierLimits = TIER_LIMITS[profile.tier];
    const availableOverageCredits = getAvailableOverageCredits(profile);

    // Calculate limits based on tier
    let limits;
    if (profile.tier === 'free') {
      limits = {
        scenarios: tierLimits.quotas.lifetimeScenarios || 0,
        images: null,
        videos: null,
        type: 'lifetime' as const,
      };
    } else {
      limits = {
        scenarios: tierLimits.quotas.scenariosPerMonth || 0,
        images: tierLimits.quotas.imagesPerMonth || 0,
        videos: tierLimits.quotas.videosPerMonth || 0,
        type: 'monthly' as const,
      };
    }

    // Calculate remaining quotas
    const remaining = {
      scenarios:
        profile.tier === 'free'
          ? Math.max(0, (tierLimits.quotas.lifetimeScenarios || 0) - (profile.usage.lifetimeScenarios || 0))
          : Math.max(0, (tierLimits.quotas.scenariosPerMonth || 0) - profile.usage.scenariosGenerated),
      images:
        profile.tier === 'free'
          ? null
          : Math.max(0, (tierLimits.quotas.imagesPerMonth || 0) - profile.usage.imagesGenerated),
      videos:
        profile.tier === 'free'
          ? null
          : Math.max(0, (tierLimits.quotas.videosPerMonth || 0) - profile.usage.videosGenerated),
    };

    return {
      status: 200,
      jsonBody: {
        tier: profile.tier,
        usage: profile.usage,
        limits,
        remaining,
        overageCreditsAvailable: availableOverageCredits,
        billingPeriod: {
          start: profile.currentPeriodStart,
          end: profile.currentPeriodEnd,
        },
      },
    };
  } catch (error: any) {
    context.error('[UserUsage] Error getting usage:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Failed to retrieve usage information',
        message: error.message,
      },
    };
  }
}

/**
 * GET /api/user/subscription
 * Get subscription status and billing information.
 */
async function getUserSubscriptionHandler(
  _request: HttpRequest,
  context: InvocationContext,
  user: User
): Promise<HttpResponseInit> {
  context.log(`[UserSubscription] Getting subscription for user: ${user.id}`);

  try {
    const profile = await getUserProfile(user.id);

    if (!profile) {
      return {
        status: 404,
        jsonBody: {
          error: 'User profile not found',
        },
      };
    }

    const tierLimits = TIER_LIMITS[profile.tier];

    return {
      status: 200,
      jsonBody: {
        tier: profile.tier,
        tierName: tierLimits.name,
        monthlyPriceAUD: tierLimits.monthlyPriceAUD,
        subscriptionStatus: profile.subscriptionStatus,
        subscriptionId: profile.subscriptionId,
        stripeCustomerId: profile.stripeCustomerId,
        currentPeriod: {
          start: profile.currentPeriodStart,
          end: profile.currentPeriodEnd,
        },
        features: tierLimits.features,
      },
    };
  } catch (error: any) {
    context.error('[UserSubscription] Error getting subscription:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Failed to retrieve subscription information',
        message: error.message,
      },
    };
  }
}

/**
 * GET /api/user/overage-packs
 * Get active overage pack credits and expiration dates.
 */
async function getUserOveragePacksHandler(
  _request: HttpRequest,
  context: InvocationContext,
  user: User
): Promise<HttpResponseInit> {
  context.log(`[UserOveragePacks] Getting overage packs for user: ${user.id}`);

  try {
    const profile = await getUserProfile(user.id);

    if (!profile) {
      return {
        status: 404,
        jsonBody: {
          error: 'User profile not found',
        },
      };
    }

    const now = new Date();

    // Filter and categorize packs
    const activePacks = profile.overagePacks.filter(
      (pack) => !pack.isExpired && new Date(pack.expirationDate) > now && pack.remainingCredits > 0
    );

    const expiredPacks = profile.overagePacks.filter(
      (pack) => pack.isExpired || new Date(pack.expirationDate) <= now
    );

    const totalCreditsAvailable = activePacks.reduce((sum, pack) => sum + pack.remainingCredits, 0);

    return {
      status: 200,
      jsonBody: {
        activePacks,
        expiredPacks,
        totalCreditsAvailable,
        summary: {
          activePackCount: activePacks.length,
          totalCreditsRemaining: totalCreditsAvailable,
        },
      },
    };
  } catch (error: any) {
    context.error('[UserOveragePacks] Error getting overage packs:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Failed to retrieve overage pack information',
        message: error.message,
      },
    };
  }
}

/**
 * Register user profile API endpoints.
 */
app.http('getUserProfile', {
  methods: ['GET'],
  authLevel: 'anonymous', // Authenticated via middleware
  route: 'user/profile',
  handler: withAuth(getUserProfileHandler),
});

app.http('getUserUsage', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'user/usage',
  handler: withAuth(getUserUsageHandler),
});

app.http('getUserSubscription', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'user/subscription',
  handler: withAuth(getUserSubscriptionHandler),
});

app.http('getUserOveragePacks', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'user/overage-packs',
  handler: withAuth(getUserOveragePacksHandler),
});
