/**
 * Stripe Checkout API endpoints.
 * Handles subscription sign-up, overage pack purchases, and customer portal access.
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { withAuth } from '../middleware/auth';
import type { User } from '@fire-sim/shared';
import {
  createOrGetCustomer,
  createSubscriptionCheckoutSession,
  createOveragePackCheckoutSession,
  createCustomerPortalSession,
} from '../services/stripeService';
import { getUserProfile, createUserProfile } from '../services/userProfileService';

/**
 * POST /api/checkout/subscription
 * Create a Stripe Checkout session for subscription sign-up.
 */
async function createSubscriptionCheckoutHandler(
  request: HttpRequest,
  context: InvocationContext,
  user: User
): Promise<HttpResponseInit> {
  context.log(`[Checkout] Creating subscription checkout for user: ${user.id}`);

  try {
    const body = await request.json() as any;
    const { tier, successUrl, cancelUrl } = body;

    // Validate tier
    if (!tier || (tier !== 'starter' && tier !== 'professional')) {
      return {
        status: 400,
        jsonBody: {
          error: 'Invalid tier. Must be "starter" or "professional"',
        },
      };
    }

    // Validate URLs
    if (!successUrl || !cancelUrl) {
      return {
        status: 400,
        jsonBody: {
          error: 'Missing required fields: successUrl, cancelUrl',
        },
      };
    }

    // Get or create user profile
    let profile = await getUserProfile(user.id);
    if (!profile) {
      profile = await createUserProfile(user.id, user.email, user.name);
    }

    // Create or get Stripe customer
    const customer = await createOrGetCustomer(user.id, user.email, user.name);

    // Create checkout session
    const session = await createSubscriptionCheckoutSession(
      customer.id,
      tier,
      successUrl,
      cancelUrl
    );

    return {
      status: 200,
      jsonBody: {
        sessionId: session.id,
        url: session.url,
      },
    };
  } catch (error: any) {
    context.error('[Checkout] Error creating subscription checkout:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Failed to create checkout session',
        message: error.message,
      },
    };
  }
}

/**
 * POST /api/checkout/overage-pack
 * Create a Stripe Checkout session for overage pack purchase.
 */
async function createOveragePackCheckoutHandler(
  request: HttpRequest,
  context: InvocationContext,
  user: User
): Promise<HttpResponseInit> {
  context.log(`[Checkout] Creating overage pack checkout for user: ${user.id}`);

  try {
    const body = await request.json() as any;
    const { successUrl, cancelUrl } = body;

    // Validate URLs
    if (!successUrl || !cancelUrl) {
      return {
        status: 400,
        jsonBody: {
          error: 'Missing required fields: successUrl, cancelUrl',
        },
      };
    }

    // Get or create user profile
    let profile = await getUserProfile(user.id);
    if (!profile) {
      profile = await createUserProfile(user.id, user.email, user.name);
    }

    // Create or get Stripe customer
    const customer = await createOrGetCustomer(user.id, user.email, user.name);

    // Create checkout session
    const session = await createOveragePackCheckoutSession(
      customer.id,
      successUrl,
      cancelUrl
    );

    return {
      status: 200,
      jsonBody: {
        sessionId: session.id,
        url: session.url,
      },
    };
  } catch (error: any) {
    context.error('[Checkout] Error creating overage pack checkout:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Failed to create checkout session',
        message: error.message,
      },
    };
  }
}

/**
 * GET /api/checkout/customer-portal
 * Get Stripe Customer Portal URL for subscription management.
 */
async function getCustomerPortalHandler(
  request: HttpRequest,
  context: InvocationContext,
  user: User
): Promise<HttpResponseInit> {
  context.log(`[Checkout] Creating customer portal session for user: ${user.id}`);

  try {
    const returnUrl = request.query.get('returnUrl');

    if (!returnUrl) {
      return {
        status: 400,
        jsonBody: {
          error: 'Missing required query parameter: returnUrl',
        },
      };
    }

    // Get user profile
    const profile = await getUserProfile(user.id);
    if (!profile) {
      return {
        status: 404,
        jsonBody: {
          error: 'User profile not found',
        },
      };
    }

    // Check if user has a Stripe customer ID
    if (!profile.stripeCustomerId) {
      return {
        status: 400,
        jsonBody: {
          error: 'No active subscription or payment history found',
        },
      };
    }

    // Create customer portal session
    const session = await createCustomerPortalSession(profile.stripeCustomerId, returnUrl);

    return {
      status: 200,
      jsonBody: {
        url: session.url,
      },
    };
  } catch (error: any) {
    context.error('[Checkout] Error creating customer portal session:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Failed to create customer portal session',
        message: error.message,
      },
    };
  }
}

/**
 * Register checkout API endpoints.
 */
app.http('createSubscriptionCheckout', {
  methods: ['POST'],
  authLevel: 'anonymous', // Authenticated via middleware
  route: 'checkout/subscription',
  handler: withAuth(createSubscriptionCheckoutHandler),
});

app.http('createOveragePackCheckout', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'checkout/overage-pack',
  handler: withAuth(createOveragePackCheckoutHandler),
});

app.http('getCustomerPortal', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'checkout/customer-portal',
  handler: withAuth(getCustomerPortalHandler),
});
