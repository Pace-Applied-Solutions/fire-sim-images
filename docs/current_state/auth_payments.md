# Authentication and Payment Infrastructure

**Status**: Implementation in progress  
**Created**: 2026-02-18  
**Last Updated**: 2026-02-18

## Overview

This document describes the implementation of authentication and payment infrastructure for the Fire Sim Images application, following the design specification in the master plan (Section 8a).

## Architecture

### Authentication (Microsoft Entra External ID)

- **Provider**: Microsoft Entra External ID (CIAM)
- **Client Library**: @azure/msal-browser and @azure/msal-react
- **Token Storage**: LocalStorage (with automatic refresh)
- **API Authentication**: JWT Bearer tokens via Authorization header

### Payment Processing (Stripe)

- **Provider**: Stripe with Meter API
- **Pricing Model**: Consumption-based billing with tier subscriptions
- **Payment Flows**:
  - Subscription sign-up (Starter, Professional)
  - Overage pack purchases (one-time payments)
  - Customer Portal (self-service tier management)

### Data Storage

- **User Profiles**: Azure Table Storage (`UserProfiles` table)
- **Audit Logs**: Application Insights
- **Usage Tracking**: Stripe Meters + Azure Table Storage
- **Secrets**: Azure Key Vault (production) / Environment variables (development)

## Implementation Status

### Backend Services

#### ✅ Stripe Service (`apps/api/src/services/stripeService.ts`)
- Stripe client initialization
- Customer management (create/get)
- Checkout session creation (subscriptions and overage packs)
- Customer Portal session creation
- Meter event tracking for usage billing
- Webhook signature verification
- Tier extraction from subscription metadata

#### ✅ User Profile Service (`apps/api/src/services/userProfileService.ts`)
- User profile CRUD operations (Azure Table Storage)
- Usage tracking (scenarios, images, videos)
- Overage pack credit management
- Billing period usage reset
- Tier and subscription status updates

#### ✅ Quota Enforcement Service (`apps/api/src/services/quotaEnforcementService.ts`)
- Pre-generation quota checks
- Quota consumption (monthly quota + overage packs)
- Usage percentage calculations
- Warning threshold detection (75%, 90%, 100%)
- Free tier lifetime limit enforcement
- Paid tier monthly limit enforcement

#### ✅ Secrets Utility (`apps/api/src/utils/secrets.ts`)
- Azure Key Vault integration
- Environment variable fallback
- Secret caching for performance

### API Endpoints

#### ✅ User Profile Endpoints (`apps/api/src/functions/userProfile.ts`)
- `GET /api/user/profile` - Get user profile, tier, and subscription
- `GET /api/user/usage` - Get detailed usage breakdown
- `GET /api/user/subscription` - Get subscription status and features
- `GET /api/user/overage-packs` - Get active overage pack credits

#### ✅ Checkout Endpoints (`apps/api/src/functions/checkout.ts`)
- `POST /api/checkout/subscription` - Create subscription checkout session
- `POST /api/checkout/overage-pack` - Create overage pack checkout session
- `GET /api/checkout/customer-portal` - Get Customer Portal URL

#### ✅ Stripe Webhook Handler (`apps/api/src/functions/stripeWebhook.ts`)
- `POST /api/webhooks/stripe` - Handle Stripe webhook events
- Supported events:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
  - `checkout.session.completed`
  - `customer.subscription.trial_will_end`

#### ✅ Updated Generation Endpoint (`apps/api/src/functions/generateScenario.ts`)
- Quota checks before generation
- Usage tracking after successful generation
- Stripe meter event reporting
- Usage headers in API responses
- 402 Payment Required on quota exhaustion

### Frontend Components

#### ✅ MSAL Configuration (`apps/web/src/config/msal.ts`)
- Entra External ID endpoint configuration
- Token acquisition scopes
- Browser storage settings

#### ✅ Authentication Hook (`apps/web/src/hooks/useAuth.ts`)
- Sign-in/sign-out flows
- Token management (acquisition and refresh)
- User state management
- Role extraction from JWT claims

#### ✅ Auth Components (`apps/web/src/components/Auth/`)
- `SignInButton` - Trigger authentication flow
- `SignOutButton` - Sign out user
- `UserMenu` - Display user info and sign-out option
- `AuthButton` - Conditional auth UI based on state

#### ✅ App Integration
- MSAL provider wrapper in App.tsx
- MSAL initialization in main.tsx

## Membership Tiers

### Tier Limits

| Tier | Monthly Price (AUD) | Scenarios/Month | Images/Month | Videos/Month | Video Gen | Retention | API Access |
|------|---------------------|-----------------|--------------|--------------|-----------|-----------|------------|
| **Free** | $0 | 5 (lifetime) | N/A | 0 | No | 30 days | No |
| **Starter** | $29 | 25 | 125 | 10 | Yes | 90 days | No |
| **Professional** | $99 | 100 | 500 | 50 | Yes | 365 days | Yes |
| **Enterprise** | Custom | Custom | Custom | Custom | Yes | Unlimited | Yes |

### Overage Packs

- **Price**: $25 AUD
- **Credits**: 10 scenarios
- **Validity**: 12 months from purchase
- **Stacking**: Multiple packs can be purchased
- **Usage**: FIFO (oldest packs used first)

## Configuration

### Environment Variables

#### Backend (.env or Azure Key Vault)
```
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRODUCT_ID_STARTER=prod_...
STRIPE_PRODUCT_ID_PROFESSIONAL=prod_...
STRIPE_PRODUCT_ID_OVERAGE_PACK=prod_...
STRIPE_METER_ID_SCENARIOS=mtr_...
STRIPE_METER_ID_IMAGES=mtr_...
STRIPE_METER_ID_VIDEOS=mtr_...

# Azure
AZURE_STORAGE_ACCOUNT_NAME=...
KEY_VAULT_URL=https://...vault.azure.net/
```

#### Frontend (.env.local)
```
# Entra External ID
VITE_ENTRA_CLIENT_ID=...
VITE_ENTRA_TENANT_ID=...
VITE_ENTRA_AUTHORITY=https://login.microsoftonline.com/...

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## Deployment Notes

### Azure Resources Required

1. **Microsoft Entra External ID Tenant**
   - App Registration configured
   - API permissions granted
   - Redirect URIs configured

2. **Azure Table Storage**
   - `UserProfiles` table created
   - Managed identity access configured

3. **Azure Key Vault** (production)
   - Secrets configured
   - Azure Functions managed identity access granted

4. **Application Insights**
   - Connection string configured
   - Custom events for audit logs

### Stripe Configuration

1. **Products**
   - Create Starter tier product
   - Create Professional tier product
   - Create Overage Pack product

2. **Prices**
   - Attach metered pricing to subscription products
   - Attach one-time pricing to overage pack product

3. **Meters**
   - Create `scenarios_generated` meter
   - Create `images_generated` meter
   - Create `videos_generated` meter

4. **Webhooks**
   - Configure webhook endpoint URL
   - Select required events
   - Note webhook signing secret

## Remaining Work

### High Priority

1. **API Client Updates**
   - Add Authorization header to all API requests
   - Handle 401 responses with re-authentication
   - Implement retry logic for token refresh

2. **User Profile Page**
   - Display current tier and subscription status
   - Show usage statistics with progress bars
   - Display overage pack credits
   - Link to Stripe Customer Portal

3. **Pricing Page**
   - Tier comparison table
   - Feature comparison matrix
   - Upgrade/purchase buttons

4. **Quota Warning UI**
   - Banner for approaching limits (75%, 90%)
   - Modal for exceeded quota
   - Overage pack purchase flow

### Medium Priority

5. **Navigation Updates**
   - Add Profile link
   - Add Pricing/Upgrade link
   - Display current tier badge

6. **Testing**
   - Unit tests for services
   - Integration tests for webhooks
   - E2E tests for payment flows

7. **Documentation**
   - Update master_plan.md progress
   - API endpoint documentation
   - Webhook setup guide
   - Deployment runbook

### Low Priority

8. **Security Hardening**
   - Rate limiting on sensitive endpoints
   - CodeQL security scan
   - Dependency vulnerability scan

9. **Monitoring**
   - Authentication event logging
   - Payment event alerting
   - Usage anomaly detection

10. **Compliance**
    - Privacy policy review
    - Data retention documentation
    - GDPR compliance checklist

## Testing Guide

### Local Development

1. **Set up test Stripe account**
   ```bash
   # Use Stripe test mode keys (sk_test_...)
   # Use test webhook endpoint (stripe CLI)
   stripe listen --forward-to localhost:7071/api/webhooks/stripe
   ```

2. **Configure Entra External ID**
   ```bash
   # Create test tenant
   # Register test application
   # Configure redirect URIs for localhost
   ```

3. **Test quota enforcement**
   ```bash
   # Create test user profile
   # Generate scenarios until quota exceeded
   # Purchase overage pack
   # Verify credits applied
   ```

### Webhook Testing

Use Stripe CLI to trigger test events:

```bash
# Subscription created
stripe trigger customer.subscription.created

# Payment succeeded
stripe trigger invoice.payment_succeeded

# Checkout completed
stripe trigger checkout.session.completed
```

## Known Issues / Limitations

1. **Authentication in dev mode**: Auth middleware disabled by default for local development (uses mock user)
2. **Stripe test mode**: Some webhook events may not fire in test mode
3. **Rate limiting**: Not yet implemented on sensitive endpoints
4. **Email notifications**: Quota warning emails not yet implemented
5. **Enterprise tier**: Requires manual configuration (not self-service)

## References

- [Master Plan Section 8a](../master_plan.md#8a-authentication-payments-and-membership-tiers-design-specification)
- [Stripe Meter API Documentation](https://docs.stripe.com/billing/subscriptions/usage-based/implementation-guide)
- [Microsoft Entra External ID Documentation](https://learn.microsoft.com/en-us/entra/external-id/)
- [MSAL.js Documentation](https://github.com/AzureAD/microsoft-authentication-library-for-js)
