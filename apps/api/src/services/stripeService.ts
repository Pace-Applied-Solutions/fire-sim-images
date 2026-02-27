/**
 * Stripe service for payment processing, subscription management, and usage tracking.
 * Handles Stripe Meter API for consumption-based billing and Checkout sessions.
 */

import Stripe from 'stripe';
import type { MembershipTier, OveragePack } from '@fire-sim/shared';
import { OVERAGE_PACK } from '@fire-sim/shared';
import { getSecretValue } from '../utils/secrets';

let stripeClient: Stripe | null = null;

/**
 * Initialize Stripe client with secret key from Azure Key Vault or environment.
 */
export async function initializeStripe(): Promise<Stripe> {
  if (stripeClient) {
    return stripeClient;
  }

  const secretKey = await getSecretValue('STRIPE_SECRET_KEY');
  if (!secretKey) {
    throw new Error('Stripe secret key not configured');
  }

  stripeClient = new Stripe(secretKey, {
    apiVersion: '2026-02-25.clover',
    typescript: true,
  });

  return stripeClient;
}

/**
 * Get initialized Stripe client instance.
 */
export async function getStripeClient(): Promise<Stripe> {
  if (!stripeClient) {
    return initializeStripe();
  }
  return stripeClient;
}

/**
 * Create or retrieve a Stripe customer for a user.
 */
export async function createOrGetCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<Stripe.Customer> {
  const stripe = await getStripeClient();

  // Search for existing customer by email
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0];
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email,
    name: name || email,
    metadata: {
      userId,
    },
  });

  return customer;
}

/**
 * Create a Checkout session for subscription sign-up.
 */
export async function createSubscriptionCheckoutSession(
  customerId: string,
  tier: 'starter' | 'professional',
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  const stripe = await getStripeClient();

  // Get product ID from environment based on tier
  const productIdEnvKey = tier === 'starter' ? 'STRIPE_PRODUCT_ID_STARTER' : 'STRIPE_PRODUCT_ID_PROFESSIONAL';
  const productId = await getSecretValue(productIdEnvKey);

  if (!productId) {
    throw new Error(`Stripe product ID not configured for tier: ${tier}`);
  }

  // Get the price for this product
  const prices = await stripe.prices.list({
    product: productId,
    active: true,
    limit: 1,
  });

  if (prices.data.length === 0) {
    throw new Error(`No active price found for tier: ${tier}`);
  }

  const priceId = prices.data[0].id;

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      metadata: {
        tier,
      },
    },
    metadata: {
      tier,
    },
  });

  return session;
}

/**
 * Create a Checkout session for overage pack purchase (one-time payment).
 */
export async function createOveragePackCheckoutSession(
  customerId: string,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  const stripe = await getStripeClient();

  // Get overage pack product ID from environment
  const productId = await getSecretValue('STRIPE_PRODUCT_ID_OVERAGE_PACK');

  if (!productId) {
    throw new Error('Stripe overage pack product ID not configured');
  }

  // Get the price for this product
  const prices = await stripe.prices.list({
    product: productId,
    active: true,
    limit: 1,
  });

  if (prices.data.length === 0) {
    throw new Error('No active price found for overage pack');
  }

  const priceId = prices.data[0].id;

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'payment',
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    payment_intent_data: {
      metadata: {
        type: 'overage_pack',
        credits: OVERAGE_PACK.scenariosIncluded.toString(),
      },
    },
    metadata: {
      type: 'overage_pack',
      credits: OVERAGE_PACK.scenariosIncluded.toString(),
    },
  });

  return session;
}

/**
 * Create a Customer Portal session for subscription management.
 */
export async function createCustomerPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  const stripe = await getStripeClient();

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

/**
 * Track usage event with Stripe Meter API.
 * Reports consumption for billing purposes.
 */
export async function trackMeterEvent(
  meterId: string,
  customerId: string,
  value: number,
  idempotencyKey: string
): Promise<void> {
  const stripe = await getStripeClient();

  try {
    await stripe.billing.meterEvents.create(
      {
        event_name: meterId,
        payload: {
          stripe_customer_id: customerId,
          value: value.toString(),
        },
      },
      {
        idempotencyKey,
      }
    );
  } catch (error: any) {
    // Log but don't throw - usage tracking failures shouldn't block generation
    console.error('[Stripe] Failed to track meter event:', error.message);
  }
}

/**
 * Track scenario generation usage.
 */
export async function trackScenarioUsage(
  customerId: string,
  scenarioId: string
): Promise<void> {
  const meterId = await getSecretValue('STRIPE_METER_ID_SCENARIOS');
  if (!meterId) {
    console.warn('[Stripe] Scenarios meter ID not configured, skipping usage tracking');
    return;
  }

  const idempotencyKey = `scenario-${scenarioId}`;
  await trackMeterEvent(meterId, customerId, 1, idempotencyKey);
}

/**
 * Track image generation usage.
 */
export async function trackImageUsage(
  customerId: string,
  scenarioId: string,
  imageCount: number
): Promise<void> {
  const meterId = await getSecretValue('STRIPE_METER_ID_IMAGES');
  if (!meterId) {
    console.warn('[Stripe] Images meter ID not configured, skipping usage tracking');
    return;
  }

  const idempotencyKey = `images-${scenarioId}`;
  await trackMeterEvent(meterId, customerId, imageCount, idempotencyKey);
}

/**
 * Track video generation usage.
 */
export async function trackVideoUsage(
  customerId: string,
  scenarioId: string,
  videoCount: number
): Promise<void> {
  const meterId = await getSecretValue('STRIPE_METER_ID_VIDEOS');
  if (!meterId) {
    console.warn('[Stripe] Videos meter ID not configured, skipping usage tracking');
    return;
  }

  const idempotencyKey = `videos-${scenarioId}`;
  await trackMeterEvent(meterId, customerId, videoCount, idempotencyKey);
}

/**
 * Get subscription details for a customer.
 */
export async function getCustomerSubscription(
  customerId: string
): Promise<Stripe.Subscription | null> {
  const stripe = await getStripeClient();

  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 1,
  });

  if (subscriptions.data.length === 0) {
    return null;
  }

  return subscriptions.data[0];
}

/**
 * Verify Stripe webhook signature.
 */
export async function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Promise<Stripe.Event> {
  const stripe = await getStripeClient();
  const webhookSecret = await getSecretValue('STRIPE_WEBHOOK_SECRET');

  if (!webhookSecret) {
    throw new Error('Stripe webhook secret not configured');
  }

  try {
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    return event;
  } catch (error: any) {
    throw new Error(`Webhook signature verification failed: ${error.message}`);
  }
}

/**
 * Extract tier from subscription metadata.
 */
export function extractTierFromSubscription(subscription: Stripe.Subscription): MembershipTier {
  const tier = subscription.metadata?.tier || 'free';

  if (tier === 'starter' || tier === 'professional' || tier === 'enterprise') {
    return tier;
  }

  return 'free';
}

/**
 * Create an overage pack record from a successful payment.
 */
export function createOveragePackFromPayment(paymentIntentId: string): OveragePack {
  const now = new Date();
  const expirationDate = new Date(now);
  expirationDate.setMonth(expirationDate.getMonth() + OVERAGE_PACK.validityMonths);

  return {
    packId: paymentIntentId,
    purchaseDate: now.toISOString(),
    expirationDate: expirationDate.toISOString(),
    totalCredits: OVERAGE_PACK.scenariosIncluded,
    usedCredits: 0,
    remainingCredits: OVERAGE_PACK.scenariosIncluded,
    isExpired: false,
  };
}
