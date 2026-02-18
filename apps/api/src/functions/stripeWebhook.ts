/**
 * Stripe webhook handler for processing payment and subscription events.
 * Handles subscription lifecycle, checkout completion, and tier updates.
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import type Stripe from 'stripe';
import {
  verifyWebhookSignature,
  extractTierFromSubscription,
  createOveragePackFromPayment,
} from '../services/stripeService';
import {
  updateUserTier,
  addOveragePack,
  resetUsageForBillingPeriod,
} from '../services/userProfileService';
import { logAuditEvent } from '../services/auditLog';

/**
 * Handle Stripe webhook events.
 */
async function handleStripeWebhook(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('[StripeWebhook] Received webhook event');

  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      context.log('[StripeWebhook] Missing stripe-signature header');
      return {
        status: 400,
        jsonBody: { error: 'Missing stripe-signature header' },
      };
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = await verifyWebhookSignature(rawBody, signature);
      context.log(`[StripeWebhook] Verified event: ${event.type}`);
    } catch (error: any) {
      context.error('[StripeWebhook] Signature verification failed:', error.message);
      return {
        status: 400,
        jsonBody: { error: 'Webhook signature verification failed' },
      };
    }

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionEvent(event.data.object as Stripe.Subscription, context);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, context);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice, context);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice, context);
        break;

      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, context);
        break;

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object as Stripe.Subscription, context);
        break;

      default:
        context.log(`[StripeWebhook] Unhandled event type: ${event.type}`);
    }

    return {
      status: 200,
      jsonBody: { received: true },
    };
  } catch (error: any) {
    context.error('[StripeWebhook] Error processing webhook:', error);
    return {
      status: 500,
      jsonBody: { error: 'Internal server error' },
    };
  }
}

/**
 * Handle subscription created or updated events.
 */
async function handleSubscriptionEvent(
  subscription: Stripe.Subscription,
  context: InvocationContext
): Promise<void> {
  context.log(`[StripeWebhook] Processing subscription event: ${subscription.id}`);

  const customerId = subscription.customer as string;
  const userId = subscription.metadata?.userId;

  if (!userId) {
    context.warn('[StripeWebhook] Subscription missing userId in metadata');
    return;
  }

  const tier = extractTierFromSubscription(subscription);
  const status = subscription.status as any; // Cast to SubscriptionStatus

  // Safely get period timestamps with fallback - cast to access properties
  const sub = subscription as any;
  const currentPeriodStart = sub.current_period_start
    ? new Date(sub.current_period_start * 1000).toISOString()
    : new Date().toISOString();
  const currentPeriodEnd = sub.current_period_end
    ? new Date(sub.current_period_end * 1000).toISOString()
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // Default 30 days

  // Update user profile with new tier and subscription info
  await updateUserTier(
    userId,
    tier,
    customerId,
    status,
    subscription.id,
    currentPeriodStart,
    currentPeriodEnd
  );

  // Log audit event
  await logAuditEvent(null, 'subscription.updated' as any, 'success', {
    resourceId: subscription.id,
    details: {
      userId,
      tier,
      status,
      customerId,
    },
  });

  context.log(`[StripeWebhook] Updated user ${userId} to tier ${tier}`);
}

/**
 * Handle subscription deleted (cancellation).
 */
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  context: InvocationContext
): Promise<void> {
  context.log(`[StripeWebhook] Processing subscription deletion: ${subscription.id}`);

  const userId = subscription.metadata?.userId;

  if (!userId) {
    context.warn('[StripeWebhook] Subscription missing userId in metadata');
    return;
  }

  // Downgrade user to free tier
  await updateUserTier(userId, 'free', null, null, null, null, null);

  // Log audit event
  await logAuditEvent(null, 'subscription.canceled' as any, 'success', {
    resourceId: subscription.id,
    details: {
      userId,
      canceledAt: new Date().toISOString(),
    },
  });

  context.log(`[StripeWebhook] Downgraded user ${userId} to free tier`);
}

/**
 * Handle successful payment.
 */
async function handlePaymentSucceeded(
  invoice: Stripe.Invoice,
  context: InvocationContext
): Promise<void> {
  context.log(`[StripeWebhook] Processing successful payment: ${invoice.id}`);

  const subscriptionId = (invoice as any).subscription as string;
  const customerId = invoice.customer as string;

  if (!subscriptionId) {
    // One-time payment (overage pack handled in checkout.session.completed)
    return;
  }

  // For subscription renewal, reset usage counters
  const subscription = invoice.lines?.data?.find((line: any) => line.subscription);
  if (subscription) {
    const userId = (subscription as any).metadata?.userId;
    if (userId) {
      await resetUsageForBillingPeriod(userId);
      context.log(`[StripeWebhook] Reset usage for user ${userId} after successful payment`);
    }
  }

  // Log audit event
  await logAuditEvent(null, 'payment.succeeded' as any, 'success', {
    resourceId: invoice.id,
    details: {
      customerId,
      amount: invoice.amount_paid ? invoice.amount_paid / 100 : 0, // Convert from cents
      currency: invoice.currency,
    },
  });
}

/**
 * Handle failed payment.
 */
async function handlePaymentFailed(
  invoice: Stripe.Invoice,
  context: InvocationContext
): Promise<void> {
  context.log(`[StripeWebhook] Processing failed payment: ${invoice.id}`);

  const customerId = invoice.customer as string;

  // Log audit event for monitoring
  await logAuditEvent(null, 'payment.failed' as any, 'failure', {
    resourceId: invoice.id,
    details: {
      customerId,
      amount: invoice.amount_due ? invoice.amount_due / 100 : 0,
      currency: invoice.currency,
      attemptCount: invoice.attempt_count,
    },
  });

  context.warn(`[StripeWebhook] Payment failed for customer ${customerId}`);
  // Note: Stripe handles automatic retries, we just log for monitoring
}

/**
 * Handle checkout session completed (for subscriptions and overage packs).
 */
async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  context: InvocationContext
): Promise<void> {
  context.log(`[StripeWebhook] Processing checkout completion: ${session.id}`);

  const customerId = session.customer as string;
  const mode = session.mode;
  const metadata = session.metadata || {};

  if (mode === 'subscription') {
    // Subscription checkout - handled by subscription.created event
    context.log(`[StripeWebhook] Subscription checkout completed for ${customerId}`);
    return;
  }

  if (mode === 'payment' && metadata.type === 'overage_pack') {
    // Overage pack purchase
    const paymentIntentId = session.payment_intent as string;
    const userId = metadata.userId;

    if (!userId) {
      context.warn('[StripeWebhook] Overage pack purchase missing userId in metadata');
      return;
    }

    // Create overage pack record
    const pack = createOveragePackFromPayment(paymentIntentId);

    // Add to user profile
    await addOveragePack(userId, pack);

    // Log audit event
      await logAuditEvent(null, 'overage_pack.purchased' as any, 'success', {
        resourceId: paymentIntentId,
        details: {
          userId,
          credits: pack.totalCredits,
          expirationDate: pack.expirationDate,
        },
      });

    context.log(`[StripeWebhook] Added overage pack for user ${userId}`);
  }
}

/**
 * Handle trial ending soon notification.
 */
async function handleTrialWillEnd(
  subscription: Stripe.Subscription,
  context: InvocationContext
): Promise<void> {
  context.log(`[StripeWebhook] Trial ending soon: ${subscription.id}`);

  const userId = subscription.metadata?.userId;

  if (!userId) {
    context.warn('[StripeWebhook] Subscription missing userId in metadata');
    return;
  }

  // Log for monitoring - could trigger email notification in the future
  await logAuditEvent(null, 'trial.ending_soon' as any, 'success', {
    resourceId: subscription.id,
    details: {
      userId,
      trialEnd: new Date((subscription.trial_end || 0) * 1000).toISOString(),
    },
  });

  context.log(`[StripeWebhook] Trial ending soon for user ${userId}`);
}

/**
 * Register the Stripe webhook function.
 */
app.http('stripeWebhook', {
  methods: ['POST'],
  authLevel: 'anonymous', // Authenticated via Stripe signature
  route: 'webhooks/stripe',
  handler: handleStripeWebhook,
});
