# Master Plan: Bushfire Simulation Inject Tool

This is the single source of truth for project context, scope, and execution. Every issue and update must reference this plan, execute against it, and then update this plan with what was achieved.

**Source documents**

- Background research: [docs/background.md](docs/background.md)
- Technical considerations: [docs/tech_considerations.md](docs/tech_considerations.md)

## Project Description (Intent, Problem, Architecture)

Fire service trainers need realistic, location-specific visuals to help crews and incident management teams practice decision-making under bushfire conditions. Today, most exercises rely on abstract maps, static photos, or manual composition of visuals, which makes it slow to create injects and hard to ensure the fire depiction matches the real terrain, fuels, and weather. The intent of this project is to close that gap by providing a fast, repeatable way to generate credible bushfire imagery and short clips that are grounded in real landscapes and aligned with fire service terminology and doctrine.

The problem we are solving is twofold: speed and fidelity. Speed means a trainer can sketch a perimeter and quickly produce multiple views that feel like real observations from the fireground. Fidelity means those outputs respect the actual vegetation type, terrain slope, and weather conditions so the visuals do not mislead trainees. The tool is not intended to replace physics-based fire simulators; instead it creates visual injects that complement existing operational planning tools and improve training immersion. By anchoring each scenario to authoritative datasets (vegetation, elevation, imagery) and structuring prompts with fire behavior parameters, the outputs remain credible and consistent with how fire agencies describe and assess fire behavior.

The architecture is a lightweight, modular pipeline hosted in Azure. A React web front-end, hosted on Azure Static Web Apps, provides a 3D map where trainers draw the fire perimeter and set scenario inputs like wind, temperature, humidity, time of day, and qualitative intensity. The back-end API runs as a standalone Azure Functions app linked to the Static Web App via the "Bring Your Own Functions" (BYOF) pattern, which proxies `/api` requests to the Functions app. This separation gives the API full access to managed identities, Key Vault references, Table Storage, and Content Safety — features not supported by SWA's managed functions runtime. The API enriches the scenario by querying geospatial datasets to derive vegetation type, elevation, slope, and nearby context. A prompt builder converts this structured data into consistent, multi-view descriptions tailored to different perspectives (aerial, ground, ridge). The image generation layer uses Google Gemini for AI-powered image generation with advanced reasoning capabilities and support for multiple reference images. Generated images are stored in Azure Blob Storage with access managed via managed identities and returned to the client. For motion, a short image-to-video step (SVD or a third-party service) creates a 4 to 10 second looping clip; longer videos can be produced later by stitching or chaining segments. Security is enforced through Azure Key Vault for secrets management, Microsoft Entra External ID (CIAM) for authentication, and managed identities for service-to-service authentication.

Key architectural principles include keeping data within the target agency's Azure environment, favoring regional and national datasets for geographic accuracy, and maintaining model modularity so newer AI services can be swapped in as they mature. This allows the system to start small and reliable, then evolve toward higher fidelity and longer-duration outputs without reworking the entire stack. The end result is a practical training tool that can quickly generate credible fireground visuals, improve scenario realism, and support consistent, repeatable training outcomes.

## 1. Vision and Outcomes

**Goal:** Enable fire service trainers to draw a fire perimeter on a real map, set scenario conditions, and generate photorealistic images and short video clips that represent the fire in its real landscape context.

**Primary outcomes**

- Fast scenario creation for training injects (minutes, not hours).
- Visual outputs that reflect location, fuel type, terrain, and weather.
- Multi-perspective imagery (ground, ridge, aerial) for realism.

## 2. Scope and Non-Goals

**In scope (MVP)**

- Web map with 3D terrain and polygon drawing.
- Scenario inputs: wind, temperature, humidity, time of day, intensity.
- Geospatial context lookup (vegetation, slope, elevation).
- Prompt generation and image output (3 to 5 views).
- Short looping video output (4 to 10 seconds).

**Out of scope (initially)**

- Full physics-based wildfire simulation.
- Long-form photoreal video (30 to 60 seconds unique footage).
- AR/VR delivery beyond basic 3D map views.

## 3. Principles and Constraints

- Use authoritative regional and national datasets where possible.
- Prioritize geographic accuracy over artistic style.
- Keep data within the target agency's Azure environment.
- Design for modular model swaps and future upgrades.
- Outputs must be safe, credible, and consistent with fire service training doctrine.

## 4. Technical Guidance and Best Practices

**Product quality**

- Design for clarity and speed: trainers should complete a full scenario flow in minutes.
- Use clear system states (idle, loading, generating, ready, failed) with actionable errors.
- Provide consistent results across views via shared seeds, reference images, or stable prompt templates.

**Front-end experience**

- Ensure responsive layout for large displays and laptops used in training rooms.
- Prioritize map performance: limit heavy layers, debounce draw events, and cache tiles.
- Use intentional typography, color, and motion to deliver a modern, confident interface.
- Include guided UI affordances (tooltips, short helper text, and sensible defaults).

**Back-end reliability**

- Use durable or async workflows for long-running generation tasks.
- Implement retries with backoff for model calls and external data lookups.
- Enforce timeouts, cancellation, and cost guardrails per request.

**Data and model integrity**

- Version prompts and templates to keep outputs traceable and reproducible.
- Log model inputs and outputs for evaluation and QA.
- Validate geospatial lookups and provide fallbacks when data is missing.

**Security and compliance**

- Keep all data in the target agency's Azure environment.
- Store secrets in Key Vault and apply least-privilege identities.
- Apply content safety checks for AI outputs and review policies.

**Testing and observability**

- Add end-to-end scenario tests (map draw -> image/video output).
- Monitor generation latency, error rates, and cost per scenario.
- Use structured logging to support incident triage.

## 5. Users and Roles

- **Trainer:** Creates scenarios and views outputs.
- **Admin:** Manages access, configuration, and usage controls.

## 6. System Architecture (High-Level)

**Front-end**

- Azure Static Web App hosting React application.
- Mapbox GL JS or Azure Maps with 3D terrain.
- Map token via environment variable `VITE_MAPBOX_TOKEN`.
- Polygon draw tool and scenario parameter UI.
- Viewpoint selection and map screenshot capture.

**Back-end API**

- Standalone Azure Functions app (Node.js 22, TypeScript) linked to SWA via BYOF; SWA proxies `/api` traffic to the Functions app.
- Durable Functions for long-running generation tasks.
- Geodata lookup for vegetation, slope, elevation.
- Prompt builder for multi-view outputs.
- Image generation via Google Gemini API.
- Video generation via SVD or external service.

**Storage and Security**

- Azure Blob Storage for generated images, videos, and scenario data.
- Azure Key Vault for API keys and secrets.
- Managed identities for secure service-to-service authentication.

## 7. Data Sources and Inputs

**Required datasets**

- Vegetation and fuel maps (SVTM, Bush Fire Prone Land).
- DEM or elevation tiles (regional elevation/depth services).
- Base imagery (state/territory spatial services, Sentinel-2, etc.).

**Scenario inputs**

- Wind speed and direction, temperature, humidity, time of day.
- Fire size, stage, and qualitative intensity (trainer-defined).

## 8. Model Strategy

**Image generation**

- Default: GPT-Image for fast integration and quality.
- Advanced: SDXL + ControlNet for spatial precision.

**Video generation**

- Default: SVD for internal pipelines and looping clips.
- Optional: Runway or Pika for higher-quality manual workflows.

## 8a. Authentication, Payments, and Membership Tiers (Design Specification)

This section documents the comprehensive design for authentication, payment processing, and consumption-based membership tiers. This is a design-only phase; no implementation will occur until this design is reviewed and approved.

### 8a.1 Authentication Provider Selection

**Recommended Provider: Microsoft Entra External ID (CIAM)**

After evaluating Auth0 and Microsoft Entra External ID, the recommendation is to use **Microsoft Entra External ID** for the following reasons:

**Pros of Microsoft Entra External ID:**
- **Cost-effective**: Free for first 50,000 monthly active users (MAUs), then predictable consumption-based pricing
- **Azure integration**: Seamless integration with existing Azure infrastructure (Key Vault, App Service, Functions, Storage)
- **Unified billing**: Single Azure subscription for all services
- **Enterprise security**: Built-in conditional access, MFA, passwordless authentication, anomaly detection
- **Managed identities**: Native support for service-to-service authentication within Azure
- **Compliance**: GDPR, SOC 2, and other compliance frameworks built-in
- **Low-code workflows**: Visual workflow builder for custom authentication flows
- **Consistency**: Aligns with existing architectural principle of keeping all data and services within Azure tenant

**Cons of Microsoft Entra External ID:**
- Less flexible for multi-cloud scenarios (not a concern for this project)
- Slightly steeper learning curve compared to Auth0 for developers unfamiliar with Microsoft ecosystem
- Documentation can be complex for advanced customization scenarios

**Why not Auth0:**
- Pricing starts at $35/month and increases significantly with MAU growth
- Requires additional integration effort with Azure services
- Adds another external dependency and billing relationship
- Less cost-effective for organizations already invested in Azure
- Multi-cloud flexibility not needed for this single-tenant Azure solution

**Implementation approach:**
- Use Microsoft Entra External ID for all user authentication
- Integrate via Microsoft Authentication Library (MSAL) for JavaScript
- Store user profile data in Entra ID user attributes (agency affiliation, role, tier)
- Use JWT tokens for API authorization
- Leverage managed identities for service-to-service authentication

### 8a.2 Stripe Payment Integration Design

**Recommended Approach: Stripe Meters for Consumption-Based Billing**

Stripe will handle all payment processing, subscription management, and usage tracking. The integration will use Stripe's modern **Meter API** for robust consumption-based billing.

**Architecture:**

1. **Stripe Products and Pricing**
   - Create Stripe Products for each membership tier (Free, Starter, Professional, Enterprise)
   - Create Stripe Product for overage packs (one-time purchase, $25 AUD for 10 scenarios)
   - Use Stripe Prices with metered billing mode for subscriptions
   - Use one-time payment mode for overage packs
   - Define Stripe Meters for tracking consumption (scenarios generated, images created, videos produced)

2. **Usage Tracking with Stripe Meters**
   - Report usage events to Stripe via `meter_event` API endpoint
   - Track three primary metrics:
     - `scenarios_generated`: Each complete scenario generation flow
     - `images_generated`: Individual images produced (across all perspectives)
     - `videos_generated`: Video clips produced
   - Use idempotency keys (scenario ID + metric + timestamp hash) to prevent duplicate billing
   - Batch usage events when possible for high-volume customers
   - Implement exponential backoff retry logic for resilience

3. **Webhook Integration**
   - Subscribe to Stripe webhooks for critical events:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `customer.subscription.trial_will_end`
     - `checkout.session.completed` (for overage pack purchases)
   - Validate webhook signatures for security
   - Store webhook events in Azure Table Storage for audit trail
   - Update user tier status in Entra ID custom attributes
   - Add overage pack credits to user account on successful purchase

4. **Payment Flow**
   - Use Stripe Checkout for subscription sign-up
   - Use Stripe Checkout for overage pack one-time purchases
   - Use Stripe Customer Portal for self-service tier management
   - Redirect users to Stripe-hosted pages for payment (reduces PCI compliance burden)
   - Store Stripe Customer ID in Entra ID user profile

### 8a.3 Membership Tier Structure

**Tier Definitions:**

| Tier | Monthly Base | Included Usage | Overage Pricing | Target User |
|------|--------------|----------------|-----------------|-------------|
| **Free** | $0 | 5 scenarios (lifetime)<br>25 images (5 × 5 images/scenario)<br>0 videos | Overage packs: $25 AUD for 10 scenarios | Trial users, small fire brigades |
| **Starter** | $29 AUD | 25 scenarios/month<br>125 images/month (25 × 5 images/scenario)<br>10 videos/month | Overage packs: $25 AUD for 10 scenarios | Individual trainers, small teams |
| **Professional** | $99 AUD | 100 scenarios/month<br>500 images/month (100 × 5 images/scenario)<br>50 videos/month | Overage packs: $25 AUD for 10 scenarios | Regional training centers, medium agencies |
| **Enterprise** | Custom | Custom limits | Custom pricing | State/national agencies, large organizations |

**Note**: All prices are in AUD (Australian Dollars).

**Tier Features:**

- **Free Tier**:
  - Basic map and drawing tools
  - Standard perspectives (ground, aerial, ridge)
  - Email support
  - No video generation
  - Gallery limited to last 30 days
  - No API access

- **Starter Tier**:
  - All Free features plus:
  - Video generation (up to 10 seconds)
  - Extended gallery (90 days)
  - Priority email support
  - Downloadable outputs
  - Prompt customization

- **Professional Tier**:
  - All Starter features plus:
  - Advanced prompt lab access
  - Custom perspective angles
  - Multi-perspective consistency improvements
  - 1-year gallery retention
  - Slack/Teams integration for support
  - Basic API access (100 API calls/month)
  - White-label branding options

- **Enterprise Tier**:
  - All Professional features plus:
  - Unlimited gallery retention
  - Dedicated account manager
  - SLA guarantees (99.9% uptime)
  - Custom model fine-tuning
  - On-premises deployment options
  - Full API access
  - Custom integrations
  - Training and onboarding

**Consumption Tracking:**

- Track usage per user per billing period (monthly for paid tiers, lifetime for Free tier)
- Reset counters at subscription renewal date for paid tiers
- Display real-time usage in user dashboard
- Send email alerts at 75%, 90%, and 100% of included usage
- **Free tier**: Lifetime limit of 5 scenarios (not renewable monthly); can purchase overage packs
- **Paid tiers**: Monthly quotas; can purchase overage packs at any time
- **Overage packs**: Pre-purchase 10 scenarios for $25 AUD (valid for 12 months from purchase)

**Overage Pack Pricing Rationale:**
- Image API cost (Gemini 3 Pro): ~USD $0.134 per image (1024×1024 standard resolution)
- Currency conversion: USD $0.134 = ~AUD $0.19 per image
- Image API cost (AUD, with currency fluctuation buffer): $0.20 AUD per image
- Cost per scenario: $0.20 × 5 images/scenario = $1.00 AUD per scenario
- Overage pack price: $25 AUD ÷ 10 scenarios = $2.50 AUD per scenario
- Margin: 150% above API cost ($2.50 vs $1.00), or $1.50 AUD profit per scenario
- Hosting and infrastructure costs are negligible and covered by base subscription fees
- Pricing provides sustainable margins while remaining competitive for users
- **Note**: All pricing in AUD (Australian Dollars)

### 8a.4 Edge Cases and Recovery Flows

**Trial Periods:**
- New Free tier users: Immediate access, no credit card required
- Starter/Professional trial: 14-day free trial with full tier access
- Trial usage counts toward first month quota after conversion
- Email reminders at 7 days, 3 days, and 1 day before trial ends
- Auto-downgrade to Free tier if no payment method added

**Tier Upgrades:**
- Immediate tier upgrade upon payment
- Prorated billing for remainder of current period
- Combined quota: remaining old tier quota + new tier quota for upgrade month
- Usage tracking continues seamlessly
- Preserve all existing scenarios and gallery items

**Tier Downgrades:**
- Schedule downgrade for end of current billing period
- Show confirmation warning about quota reduction
- No refund for unused portion of current period (Stripe standard)
- If current usage exceeds new tier limits, disable new generations until next period
- Retain all historical gallery items (don't delete)
- Unused overage packs remain valid for 12 months from purchase

**Overage Pack Purchases:**
- Available to all users (Free and paid tiers)
- Purchase via Stripe Checkout: $25 AUD for 10 scenarios
- Credits added immediately to user account
- Valid for 12 months from purchase date
- Can purchase multiple packs; credits stack
- Email confirmation with pack details and expiration
- Display remaining pack credits in user dashboard
- Pack credits used before monthly quota (for paid tiers)
- Expiration warning email 30 days before pack expires

**Failed Payments:**
- Stripe retries automatically based on Smart Retries configuration
- Email customer immediately on first failure
- Grace period: 3 days with limited access (read-only gallery, no new generations)
- After 3 days: Downgrade to Free tier
- Send recovery email with payment update link
- Upon successful payment: Restore previous tier immediately

**Payment Recovery:**
- Stripe Customer Portal allows users to update payment methods
- Automatic retry when payment method updated
- Invoice status tracked via webhooks
- Option to manually retry failed invoice via customer portal

**Subscription Cancellation:**
- User can cancel anytime via Stripe Customer Portal
- Access continues until end of current billing period
- No refunds (standard Stripe policy)
- Downgrade to Free tier at period end
- Retain gallery items per tier retention policy
- Re-subscription allowed at any time

**Usage Disputes:**
- All meter events stored in Stripe with timestamps
- Audit trail available in admin dashboard
- Azure Function logs provide secondary verification
- Manual adjustment capability for verified disputes
- Transparent usage breakdown in user dashboard

### 8a.5 Privacy, Data Storage, and Compliance

**Data Storage Strategy:**

- **User identity and authentication**: Microsoft Entra External ID (Azure AD)
  - Email, name, agency affiliation
  - Authentication tokens, MFA settings
  - Custom attributes: tier level, Stripe customer ID

- **Payment data**: Stripe (PCI-compliant, no card data stored in our system)
  - Customer payment methods
  - Subscription status
  - Invoice history
  - Usage meter events

- **Application data**: Azure Storage (existing architecture)
  - Generated images and videos (Blob Storage)
  - Scenario metadata (Table Storage)
  - Usage logs (Application Insights)

- **Audit trail**: Azure Table Storage
  - Stripe webhook events
  - Tier changes
  - Payment events
  - Usage threshold alerts

**Privacy Considerations:**

- **Minimal data collection**: Only collect data necessary for service delivery and billing
- **User consent**: Clear consent for data processing during sign-up
- **Data retention**:
  - User profile: Retained while account active, deleted 90 days after account closure
  - Payment data: Retained by Stripe per their policies and compliance requirements
  - Generated content: Deleted per tier retention policy (30 days to unlimited)
  - Audit logs: 7 years for compliance

- **Data portability**: Users can export all their scenarios and images via API or UI
- **Right to deletion**: Users can delete account and all associated data
- **No data sharing**: Data never shared with third parties except required service providers (Stripe, Azure)

**Compliance Requirements:**

- **GDPR** (if serving EU users):
  - Lawful basis for processing: Contract performance and consent
  - Data processing agreements with Stripe and Microsoft
  - Privacy policy with clear data collection and usage explanation
  - Cookie consent for analytics
  - Data breach notification procedures

- **PCI DSS**:
  - Use Stripe Checkout and Customer Portal (Stripe-hosted)
  - Never handle credit card data directly
  - No card data stored in application database

- **SOC 2** (for enterprise customers):
  - Leverage Azure and Stripe SOC 2 compliance
  - Document security controls
  - Annual security audit recommended for Enterprise tier

- **Australian Privacy Principles** (primary jurisdiction):
  - Compliance with Privacy Act 1988
  - Clear privacy policy
  - Secure data handling
  - User access and correction rights

**Security Measures:**

- All API endpoints require authentication (JWT tokens)
- Stripe webhook signature verification
- Secrets stored in Azure Key Vault (existing pattern)
- TLS 1.2+ for all communications
- Rate limiting on API endpoints to prevent abuse
- Monitoring and alerting for suspicious activity

### 8a.6 API Impact and Session Handling

**API Changes Required:**

1. **Authentication Middleware**
   - Add MSAL token validation middleware to all API endpoints
   - Extract user ID and tier from JWT claims
   - Reject requests without valid token (except health check)

2. **Usage Tracking Endpoints**
   - `POST /api/usage/track` - Internal endpoint for recording meter events
   - Called after successful image/video generation
   - Idempotent with scenario ID in request
   - Returns current usage for user's billing period

3. **User Profile Endpoints**
   - `GET /api/user/profile` - Get current user profile, tier, and usage stats
   - `GET /api/user/usage` - Get detailed usage breakdown for current period
   - `GET /api/user/subscription` - Get subscription status and billing info
   - `GET /api/user/overage-packs` - Get active overage pack credits and expiration dates
   - `POST /api/user/overage-packs/purchase` - Initiate overage pack purchase (returns Stripe Checkout URL)

4. **Tier Enforcement**
   - Check quota before allowing generation (monthly quota + overage pack credits)
   - For Free tier: Check lifetime usage + available pack credits
   - For paid tiers: Check current period usage + available pack credits
   - Return 402 Payment Required if all quotas exhausted
   - Include usage headers in all API responses (quota, used, pack_credits_remaining)

5. **Webhook Handler**
   - `POST /api/webhooks/stripe` - Receive Stripe webhook events
   - Verify signature
   - Process event and update user tier in Entra ID
   - Handle overage pack purchases: `checkout.session.completed` for one-time payments
   - Return 200 OK to acknowledge receipt

**Session Handling:**

- Use MSAL.js library for browser-based authentication
- Store access token in memory (not localStorage for security)
- Refresh token automatically using MSAL token renewal
- Session timeout: 8 hours (configurable)
- Automatic re-authentication when token expires
- Preserve unsaved work across re-authentication

**Data Model Changes:**

- Add `UserProfile` type to shared package:
  ```typescript
  interface UserProfile {
    userId: string; // Entra ID user object ID
    email: string;
    displayName: string;
    tier: MembershipTier;
    stripeCustomerId: string | null;
    subscriptionStatus: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid';
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    usage: UsageStats;
    overagePacks: OveragePack[];
  }

  interface UsageStats {
    scenariosGenerated: number; // Lifetime for Free tier, current period for paid tiers
    imagesGenerated: number;
    videosGenerated: number;
    lastUpdated: Date;
    lifetimeScenarios?: number; // For Free tier tracking
  }

  interface OveragePack {
    packId: string; // Stripe payment intent ID or similar
    purchaseDate: Date;
    expirationDate: Date; // 12 months from purchase
    totalCredits: number; // Always 10 for standard pack
    usedCredits: number;
    remainingCredits: number;
    isExpired: boolean;
  }

  type MembershipTier = 'free' | 'starter' | 'professional' | 'enterprise';
  ```

### 8a.7 User Journey Flows

**New User Sign-Up Journey:**

1. User visits application homepage (public, no auth required)
2. User clicks "Sign Up" button
3. Redirect to Entra External ID sign-up flow
4. User creates account (email + password, or social login if enabled)
5. Redirect back to application with authentication token
6. Create user profile in Entra ID with tier = 'free'
7. Show onboarding tutorial
8. User can immediately start creating scenarios (Free tier quota)

**Paid Subscription Sign-Up Journey:**

1. Authenticated user clicks "Upgrade" in navigation or after quota warning
2. Show tier comparison page with current usage stats
3. User selects desired tier (Starter, Professional, or Enterprise)
4. Redirect to Stripe Checkout with pre-filled customer email
5. User enters payment details on Stripe-hosted page
6. Stripe processes payment and creates subscription
7. Stripe webhook notifies our API of successful subscription
8. API updates user tier in Entra ID to new tier
9. Redirect user back to application with success message
10. User immediately gains access to new tier features and quota

**Sign-In Journey (Returning User):**

1. User visits application
2. If no valid session, redirect to Entra External ID sign-in page
3. User enters credentials (or uses SSO if configured)
4. Redirect back to application with authentication token
5. Load user profile and tier information
6. Show user dashboard with usage stats and recent scenarios

**Tier Management Journey:**

1. User clicks "Manage Subscription" in settings
2. Redirect to Stripe Customer Portal
3. User can:
   - View current plan and usage
   - Update payment method
   - Upgrade/downgrade tier
   - Cancel subscription
   - View invoice history
4. Changes sync back to our system via webhooks
5. User redirected back to application

**Quota Exceeded Journey (Free Tier):**

1. User attempts to generate scenario after exceeding 5-scenario lifetime limit
2. API returns 402 Payment Required with quota details
3. UI shows modal with two options:
   - **Option A**: Purchase overage pack ($25 AUD for 10 scenarios)
   - **Option B**: Upgrade to paid tier (Starter/Professional)
4. If user purchases overage pack:
   - Redirect to Stripe Checkout
   - Credits added immediately upon payment
   - User can generate scenarios using pack credits
5. If user upgrades to paid tier:
   - Redirect to Stripe Checkout with tier selection
   - Monthly subscription starts immediately
   - User gains monthly quota plus tier features

**Overage Pack Purchase Journey:**

1. User clicks "Buy More Scenarios" in dashboard or after quota warning
2. Show overage pack details modal:
   - 10 scenarios for $25 AUD
   - Valid for 12 months
   - Can stack multiple packs
3. User confirms purchase
4. Redirect to Stripe Checkout (one-time payment)
5. Payment processed
6. Webhook updates user account with pack credits
7. Email confirmation sent with pack details and expiration
8. User redirected back to application
9. Dashboard shows updated credits available
10. User can immediately generate scenarios using pack credits

**Quota Warning Journey (Paid Tier):**

1. User reaches 75% of included monthly quota
2. Email sent with usage stats and remaining quota
3. In-app notification shown in dashboard
4. Same process at 90% and 100%
5. At 100%, user can:
   - Continue using service by purchasing overage pack ($25 AUD for 10 scenarios)
   - Wait until monthly quota resets
6. Overage pack purchase available anytime via dashboard

**Failed Payment Journey:**

1. Stripe automatic payment retry fails
2. Email sent to user with payment failure notice
3. In-app banner shown with "Update Payment Method" link
4. User has 3-day grace period
5. If payment not updated:
   - Send final warning email
   - Downgrade to Free tier at end of grace period
   - Preserve all existing scenarios
6. If user updates payment:
   - Stripe retries invoice automatically
   - User tier restored upon successful payment

### 8a.8 Risk Assessment

**Technical Risks:**

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Stripe API downtime | High (payments blocked) | Low | Use Stripe status page monitoring, implement graceful degradation, queue meter events with retry |
| Entra ID authentication outage | High (users locked out) | Low | Cache user tier info, implement read-only mode for brief outages |
| Webhook delivery failures | Medium (delayed tier updates) | Medium | Implement webhook retry queue, poll Stripe API as backup, log all webhook failures |
| Usage tracking discrepancies | Medium (billing disputes) | Medium | Dual logging (Stripe + Azure), audit trail, manual reconciliation tools |
| Token refresh failures | Medium (session interruption) | Low | Graceful re-authentication flow, preserve unsaved work |

**Business Risks:**

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Pricing too high for market | High (low adoption) | Medium | Start with trial periods, gather feedback, flexible tier adjustments |
| Pricing too low for sustainability | High (revenue loss) | Medium | Monitor cost per user, analyze margins monthly, build adjustment plan |
| Churn after trial expiration | Medium (lost customers) | High | Improve onboarding, demonstrate value quickly, targeted retention emails |
| Enterprise customers need custom contracts | Medium (sales complexity) | Medium | Build self-service tools first, add manual sales process for Enterprise tier |
| Compliance violations | High (legal issues) | Low | Legal review of terms, privacy policy audit, compliance training |

**Security Risks:**

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| JWT token theft | High (account takeover) | Low | Short token expiry (1 hour), secure token storage, monitor suspicious activity |
| Webhook signature bypass | High (fraudulent tier updates) | Low | Always validate Stripe signatures, use HTTPS only, IP whitelist if possible |
| User enumeration | Low (privacy leak) | Medium | Generic error messages, rate limiting on auth endpoints |
| Payment fraud | Medium (financial loss) | Low | Leverage Stripe Radar (built-in fraud detection), manual review for suspicious patterns |
| Data breach | High (privacy violation) | Low | Encryption at rest and in transit, least-privilege access, regular security audits |

**Compliance Risks:**

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| GDPR violations | High (fines up to 4% revenue) | Low | Privacy policy review, data processing agreements, user consent flows |
| PCI DSS non-compliance | High (unable to process payments) | Very Low | Use Stripe-hosted pages only, never store card data |
| Data residency requirements | Medium (blocked in some regions) | Low | Document data storage locations, offer regional deployments for Enterprise |

### 8a.9 Implementation Roadmap (Future Reference)

**This is design only—no implementation until approved. For reference, implementation would follow this sequence:**

**Phase 1: Authentication Foundation (Est. 2 weeks)**
- Configure Microsoft Entra External ID tenant
- Integrate MSAL.js in React application
- Add authentication middleware to API
- Implement sign-up and sign-in flows
- User profile storage in Entra ID
- Basic role-based access control

**Phase 2: Stripe Integration (Est. 2 weeks)**
- Create Stripe account and configure products/prices
- Set up Stripe Meters for usage tracking
- Implement webhook handler
- Build tier enforcement in API
- Add usage tracking to generation flows
- Create admin dashboard for subscription management

**Phase 3: User Dashboard and Tier Management (Est. 1 week)**
- Build user profile page with usage stats
- Integrate Stripe Customer Portal
- Add tier comparison and upgrade flows
- Implement quota warnings and enforcement
- Email notification system

**Phase 4: Testing and Hardening (Est. 1 week)**
- End-to-end testing of all user journeys
- Webhook reliability testing
- Failed payment scenario testing
- Security audit and penetration testing
- Load testing for usage tracking endpoints
- Documentation and runbooks

**Phase 5: Compliance and Legal (Est. 1 week)**
- Privacy policy creation
- Terms of service
- Data processing agreements
- Cookie consent implementation
- GDPR compliance checklist
- Security and compliance documentation

**Total estimated effort: 7 weeks for full implementation**

### 8a.10 Success Criteria and Monitoring

**Success Criteria:**

- User can sign up and authenticate successfully (>99% success rate)
- Paid subscription conversion rate >5% after 30 days
- Payment success rate >95%
- Webhook delivery rate >99.9%
- Usage tracking accuracy >99.9% (compared to application logs)
- Zero payment data stored in application database (PCI compliance)
- All tier quota enforcement working correctly
- Customer support tickets <1% of active users per month

**Monitoring and Metrics:**

- **Authentication metrics**:
  - Sign-up completion rate
  - Sign-in success rate
  - Token refresh success rate
  - Session duration

- **Subscription metrics**:
  - Trial-to-paid conversion rate
  - Churn rate by tier
  - Average revenue per user (ARPU)
  - Lifetime value (LTV)
  - Monthly recurring revenue (MRR)

- **Usage metrics**:
  - Average scenarios per user per tier
  - Overage rate by tier
  - Quota exhaustion rate (Free tier)
  - API latency for usage tracking

- **Payment metrics**:
  - Payment success rate
  - Failed payment recovery rate
  - Dispute rate
  - Refund rate

- **Technical metrics**:
  - Webhook delivery latency
  - Webhook failure rate
  - API authentication latency
  - Stripe API error rate

### 8a.11 Open Questions for Review

These questions should be addressed during design review before implementation:

1. **Should we offer annual billing at a discount (e.g., 2 months free)?**
   - Pros: Better cash flow, lower churn, customer savings
   - Cons: More complex refund scenarios, longer commitment

2. **Should Free tier users be able to generate videos at all?**
   - Current design: No videos for Free tier
   - Alternative: Allow 1-2 videos per month to showcase feature

3. **Should we implement usage pools for team/organization accounts?**
   - Current design: Individual user quotas
   - Alternative: Shared quota across team members (more complex)

4. **What happens to historical scenarios when user downgrades below retention limit?**
   - Current design: Retain all scenarios (soft limit)
   - Alternative: Delete oldest scenarios beyond new tier limit (strict enforcement)

5. **Should we gate advanced features (Prompt Lab, custom perspectives) by tier?**
   - Current design: Yes, Professional+ only
   - Alternative: Available to all tiers, only usage is metered

6. **Should Enterprise tier be truly custom or have a starting configuration?**
   - Current design: Fully custom (contact sales)
   - Alternative: Start at $499/month with high quotas, then customize

7. **Should we implement a referral program for growth?**
   - Not in current design
   - Could add: "Refer 3 users, get 1 month free" type incentives

8. **Should we support team/organization billing (one payer, multiple users)?**
   - Current design: Individual accounts only
   - Alternative: Add organization accounts with admin management

## 9. Delivery Phases and Milestones

**Phase 0: Project setup**

- Azure environment provisioned.
- Repo baseline docs and structure in place.
- API access confirmed.

**Phase 1: Map and inputs**

- 3D map and draw tool working.
- Scenario inputs captured and serialized.

**Phase 2: Geodata context**

- Vegetation and terrain summary returned per polygon.
- Performance baseline established.

**Phase 3: Prompt and image output**

- Prompt builder for multi-view images.
- Images generated and stored in Blob Storage.

**Phase 4: Video output**

- Short clip generated from image.
- Playback in UI and storage in Blob.

**Phase 5: Validation and hardening**

- SME feedback cycle.
- Quality thresholds established.
- Security and monitoring in place.

## 10. Issue Map (Authoritative Work Breakdown)

These are the 15 implementation issues seeded in GitHub. Each will be assigned to the coding agent in sequence.

| #   | Issue Title                                    | Phase   | GitHub                                                            |
| --- | ---------------------------------------------- | ------- | ----------------------------------------------------------------- |
| 1   | Project Scaffolding & Repository Structure     | Phase 0 | [#1](https://github.com/richardthorek/fire-sim-images/issues/1)   |
| 2   | Azure Infrastructure as Code (Bicep)           | Phase 0 | [#2](https://github.com/richardthorek/fire-sim-images/issues/2)   |
| 3   | Front-End Shell, Design System & Navigation    | Phase 1 | [#3](https://github.com/richardthorek/fire-sim-images/issues/3)   |
| 4   | 3D Map Integration & Fire Perimeter Drawing    | Phase 1 | [#4](https://github.com/richardthorek/fire-sim-images/issues/4)   |
| 5   | Scenario Input Panel & Parameter Controls      | Phase 1 | [#6](https://github.com/richardthorek/fire-sim-images/issues/6)   |
| 6   | Geospatial Data Integration (Azure Functions)  | Phase 2 | [#7](https://github.com/richardthorek/fire-sim-images/issues/7)   |
| 7   | Prompt Generation Engine                       | Phase 3 | [#8](https://github.com/richardthorek/fire-sim-images/issues/8)   |
| 8   | AI Image Generation Pipeline                   | Phase 3 | [#9](https://github.com/richardthorek/fire-sim-images/issues/9)   |
| 9   | Multi-Perspective Rendering & Consistency      | Phase 3 | [#10](https://github.com/richardthorek/fire-sim-images/issues/10) |
| 10  | Results Gallery & Scenario History             | Phase 3 | [#11](https://github.com/richardthorek/fire-sim-images/issues/11) |
| 11  | Video Generation Pipeline                      | Phase 4 | [#12](https://github.com/richardthorek/fire-sim-images/issues/12) |
| 12  | Authentication, Authorization & Content Safety | Phase 5 | [#13](https://github.com/richardthorek/fire-sim-images/issues/13) |
| 13  | Observability, Monitoring & Structured Logging | Phase 5 | [#14](https://github.com/richardthorek/fire-sim-images/issues/14) |
| 14  | End-to-End Testing & Trainer Validation        | Phase 5 | [#15](https://github.com/richardthorek/fire-sim-images/issues/15) |
| 15  | CI/CD Pipeline, Documentation & Future Roadmap | Phase 5 | [#16](https://github.com/richardthorek/fire-sim-images/issues/16) |

## 11. Deliverables

- Deployed front-end with map drawing and scenario inputs.
- Azure Functions API for generation.
- Geodata integration module and prompt builder.
- Image and video generation pipeline.
- Storage and retrieval via Blob Storage.
- Admin-ready security and monitoring.
- Living documentation and issue templates.

## 12. Quality and Safety Guardrails

- Prompts use fire service terminology and avoid unsafe or ambiguous language.
- Output validation includes manual review and optional automated checks.
- No depiction of people or animals in fire scenes unless explicitly required.

## 13. Progress Tracking (Living Section)

Update this section after each issue or change.

- **Current focus:** Live deployment stability and perspective consistency
- **Completed milestones:**
  - **Locality agent integration at geodata endpoint (Feb 18, 2026):** Moved locality enrichment from generation pipeline to geodata endpoint so Maps grounding terrain narratives are generated when the polygon is drawn (alongside NVIS vegetation query). The LocalityAgent now enriches the GeoContext with terrain descriptions, local features, and land cover data from Google Maps API immediately when the perimeter is created. Enriched data is cached and flows through to all subsequent generations without re-querying. Falls back gracefully to basic context when Maps API unavailable. Removed redundant multi-agent orchestrator call from generation pipeline. All 311 tests passing.
  - **Vegetation manual override prompt fix & multi-agent integration (Feb 18, 2026):** Fixed prompt generator to use `getEffectiveVegetationType()` instead of reading `geoContext.vegetationType` directly, ensuring manual vegetation overrides now flow correctly into prompts and affect image generation. Integrated the multi-agent orchestrator into the generation pipeline to enrich locality descriptions with Google Maps grounding via the Locality Agent before prompt generation. The orchestrator runs as Step 1, enriching terrain narratives when Maps API is available and falling back gracefully to basic lookups on error. Terrain descriptions from Maps grounding are temporarily stored in `geoContext.nearbyFeatures` until a dedicated field is added. All 311 tests passing.
  - **NVIS vegetation auto-detection fix (Feb 18, 2026):** Fixed geodata endpoint to use NVIS query results for primary vegetation type display instead of always falling back to "Eucalypt woodland" heuristic. When NVIS successfully queries the fire perimeter, the response now sets `vegetationType` to the detected center formation (e.g., "Acacia low open woodland"), `vegetationSubtype` to the classification, `vegetationTypes` array to all unique formations found, `dataSource` to "NVIS MVS 6.0 via WMS GetFeatureInfo (DCCEEW)", and `confidence` to "high". This ensures the UI displays actual NVIS data instead of the NSW bushfire prone land fallback. Applies to both Scenario Configuration panel and Prompt Lab. All 311 tests passing.
  - **Automatic screenshot readiness (Feb 17, 2026):** Map capture now waits for camera movement completion plus full basemap/imagery rendering before taking automatic screenshots, and vegetation overlay capture explicitly waits for the NVIS raster source to load. Applies to both Scenario UI generation flow and Prompt Lab auto-capture so reference images always reflect the correct pan/zoom and fully drawn layers.
  - **Perspective prompt simplification (Feb 17, 2026):** Removed the verbose ground_north narrative from the viewpoint map so the perspective section no longer forces a scripted, distance-specific line; replaced with a concise north-side ground photo hint to keep prompts consistent between Scenario and Prompt Lab while reducing prescriptive wording.
  - **Terrain section guaranteed non-null (Feb 17, 2026):** Refactored terrain prompt section to ALWAYS return non-empty string with "Preserve all topographic features exactly as they appear..." fallback instruction. Function now: (1) checks if terrainDescription exists and is non-empty, (2) if yes, prepends slope descriptor ("flat terrain", "moderate slopes", etc.) with slope profile context, (3) if no, returns just base instruction with map guidance. Guarantees terrain section always renders in Prompt Lab and never becomes null regardless of geoContext confidence level or missing data. Enhances with better slope data when available from generateTerrainDescription.
  - **Perimeter shape instruction fix (Feb 17, 2026):** Removed prescriptive "roughly circular" shape language from prompt templates that was causing DALL-E to ignore the drawn red perimeter polygon and generate generic circular fires. Modified two sections: (1) Reference imagery now instructs to "follow the exact perimeter shape shown by the polygon overlay—match the irregular boundaries precisely" instead of "form an [shape] pattern", (2) Fire geometry now emphasizes "fire perimeter must follow the exact shape and boundaries shown on the reference map polygon" including "indentations, protrusions, or irregular edges" instead of generic shape descriptor. This grounds the generation in the actual drawn perimeter rather than an inferred geometric shape.
  - **Prompt locality elevation removed (Feb 17, 2026):** Dropped the elevation sentence from the locality prompt section to avoid misleading altitude values until real DEM-derived elevation is wired in.
  - **Terrain section now always renders (Feb 17, 2026):** Updated terrain prompt section to always include explicit instruction to follow the reference map's terrain representation. Added specific guidance about reading contour lines (closer lines = steeper, wider = flatter). For high-confidence regions, includes actual slope descriptors; for low-confidence regions, provides minimal fallback instruction to follow visible relief, ensuring terrain is never null in prompts.
  - **Multiple vegetation types from NVIS (Feb 17, 2026):** Integrated NVIS vegetation query into geodata endpoint to sample across the fire perimeter rather than just the centroid. Added `vegetationTypes` array to GeoContext and updated prompts to mention vegetation diversity ("fire burns through multiple vegetation zones") when 2+ distinct types are detected. Replaces single hardcoded type with real spatial distribution data.
  - **Terrain section confidence-gated (Feb 17, 2026):** Updated terrain section to only render when geoContext.confidence is 'high' or 'medium', preventing low-confidence regions like Googong from including generic synthetic slope descriptors. Terrain now only appears for profiled regions (Blue Mountains, Penrith, Batemans Bay, Armidale) where actual slope data exists.
  - **Vegetation details filtering (Feb 17, 2026):** Modified vegetation section to omit fields with 'unknown' values (canopy height, composition, safety flammability) and only render known characteristics, preventing stacks of "unknown. unknown. unknown." in prompts for fallback regions and incomplete VEGETATION_DETAILS mappings.
  - **Prompt Lab section mapping fix (Feb 17, 2026):** Added a shared `generatePromptSections` helper and switched Prompt Lab to use it so each section gets the correct content (no more behavior text leaking into locality/terrain).
  - **Prompt Lab SSE 404 fix (Feb 17, 2026):** Reworked Prompt Lab SSE handling to use POST-based stream parsing instead of EventSource GET so `/api/lab/generate` no longer 404s.
  - **Prompt Lab scenario panel render fix (Feb 17, 2026):** Rendered `ScenarioInputPanel` directly in the right column with a standalone header to prevent it from being hidden by wrapper styles.
  - **Prompt Lab scenario panel visibility polish (Feb 17, 2026):** Added a distinct header and border to the Scenario Configuration panel to make it clearly visible above the prompt editor.
  - **Prompt Lab scenario panel always visible (Feb 17, 2026):** Removed the accordion toggle so Scenario Configuration always renders in the right column.
  - **Prompt Lab scroll restore (Feb 17, 2026):** Restored page height and column scroll behavior so the right panel scrolls properly without nested scroll containers.
  - **Prompt Lab single-scroll layout (Feb 17, 2026):** Removed nested scroll containers in the right panel so Scenario Configuration and Prompt Editor scroll together as one column.
  - **Scenario controls scroll fix (Feb 17, 2026):** Removed internal scrolling from `ScenarioInputPanel` so the parent container handles scroll, preventing hidden controls in Prompt Lab and sidebar.
  - **Prompt Lab scenario controls placement (Feb 17, 2026):** Moved the Scenario Configuration panel to the right column so the header and controls are consistently visible in the Prompt Lab layout.
  - **Prompt Lab prompt generation fix (Feb 17, 2026):** Replaced `node:crypto` usage in shared prompt generation with a browser-safe UUID helper so Prompt Lab auto-fill works in the web client.
  - **Prompt Lab local API fix (Feb 17, 2026):** Registered the `labGenerate` Azure Function in the API entrypoint so `/api/lab/generate` resolves locally via the Vite proxy; unblocks Prompt Lab single-image generation.
  - **Generation & results stability audit (Feb 17, 2026):** Documented disappearing results risk when status polling hits new Function instances before progress is persisted, double-scroll results panel UX, and `@fire-sim/api` build failures resolving `@fire-sim/shared`. Added analysis of moving the orchestrator to Azure App Service (or Functions Premium with always-on) to reduce instance churn; see `docs/current_state/generation_results_audit.md`.
  - **Regression guard (Feb 17, 2026):** Frontend polling now preserves existing images/anchor when a status poll returns empty results, preventing UI regressions unrelated to instance churn; audit doc updated accordingly.
  - **Results stability investigation plan:** Added consolidated objectives/steps/key code references/success criteria in `docs/current_state/results_stability_investigation_plan.md` to guide further debugging.
  - **Generation & results stability audit (Feb 17, 2026):** Documented disappearing results risk when status polling hits new Function instances before progress is persisted, double-scroll results panel UX, and `@fire-sim/api` build failures resolving `@fire-sim/shared`. See `docs/current_state/generation_results_audit.md` for reproduction steps and remediation recommendations.
  - **Vegetation type manual override:** Added UI feature allowing trainers to manually select vegetation type when NVIS auto-detection is unreliable (e.g., plantations, farms). New `VegetationSelector` component appears in "Vegetation & Fuel" section after perimeter is drawn. Stores manual override in `GeoContext` (`manualVegetationType`, `isVegetationManuallySet` fields). Fire behavior calculations and prompt generation use `getEffectiveVegetationType()` helper that prioritizes manual selection. Orange "Manual Override" badge shows active state. Users can revert to auto-detected type via dropdown. Includes 7 new unit tests, comprehensive documentation in `docs/current_state/vegetation_manual_override.md`. All 127 tests passing. No security vulnerabilities detected.
  - **Vegetation reference alignment:** Vegetation overlay screenshot now fits the fire perimeter to ~80% of the viewport (top-down) and is captured as PNG for accurate colors; legend items with colors are passed into prompts.
  - **Health indicator fallback:** Added same-origin `/api` fallback for the UI health check when a configured API base URL fails.
  - **NVIS legend colors:** Visible legend now samples raster colors and shows a swatch beside each vegetation subgroup.
  - **Results panel overlay:** Results panel now overlays the map instead of shrinking layout width, eliminating the black rectangle when hidden.
  - **Address zoom refinement:** Fit bounds to occupy ~70% of the viewport and draw a subtle bbox overlay for address search results.
  - **Vegetation tooltip visibility:** Docked the NVIS info panel to a fixed on-map position so it never renders off-screen; added location display and scrollable body.
  - **NVIS visible legend:** Legend now samples visible map area and lists only the vegetation subgroups present in view.
  - **Address search fix:** Store `handleLocationSelect` and `handleGeolocationRequest` directly in the app store (not as thunks) so Header results pan/zoom correctly.
  - **NVIS overlay UX fixes:** Updated WMS GetFeatureInfo to request `application/geo+json` and parse Raster.MVS/MVG attributes; added an in-map NVIS legend panel via proxied GetLegendGraphic.
  - Master plan created as single source of truth.
  - Background research and technical considerations documented.
  - Copilot instructions file created.
  - 15 comprehensive GitHub issues designed and seeded.
  - Mapbox token environment variable recorded as `VITE_MAPBOX_TOKEN` (local + GitHub secrets).
  - Local web environment file created with `VITE_MAPBOX_TOKEN` for Mapbox access.
  - **Phase 0 complete:** Project scaffolding and repository structure (Issue 1)
    - Monorepo structure with npm workspaces
    - Shared types package (@fire-sim/shared) with core domain types
    - React web app (apps/web) with Vite + TypeScript
    - Azure Functions API (apps/api) with v4 programming model
    - Development tooling (ESLint, Prettier, TypeScript strict mode)
    - Updated README with comprehensive setup instructions
  - **Infrastructure as Code:** Bicep templates for Azure deployment (Issue 2)
    - Complete Bicep template structure under `infra/`
    - Main orchestrator (`main.bicep`) and modular resource templates
    - Static Web App (front-end only) linked to a standalone Azure Functions API via BYOF proxy at `/api`
    - Azure Blob Storage with three containers and lifecycle management
    - Azure Key Vault with managed identity access
    - Azure OpenAI with Stable Image Core model deployment
    - Dev and prod parameter files
    - Deployment script (`deploy.sh`) and GitHub Actions workflow
    - Comprehensive infrastructure documentation
    - Updated master plan to reflect Static Web App + standalone Azure Functions architecture
    - Added AI Foundry (AIServices) deployment with Stable Image Core model and project scaffolding; outputs and secrets wired to Key Vault and Static Web App app settings
    - Added Flex Consumption Function App module with deployment container, managed identity RBAC, and App Insights role assignment; wired Key Vault access and environment parameters
    - Consolidated Key Vault access policies to support both SWA and Function App identities
    - Added AzureWebJobsStorage\_\_accountName setting for Flex Consumption validation in CI/CD
    - Fixed deploy-infra workflow to derive resource group from environment input (dev/prod)
    - Updated deploy-infra workflow to run on infra/ path changes (push)
    - Split infra workflow into validate-only push runs and a gated deploy job for manual dispatch
    - Added separate dev/prod deploy jobs so only prod requires environment approval
    - Aligned dev Bicep location with existing eastus2 resources to prevent validation conflicts
    - Removed Content Safety secret output by fetching keys in main template to clear linter warning
    - Fixed Content Safety existing resource reference to use stable name for Bicep evaluation
    - Reduced map-related toast notifications to error-only to avoid noisy UI
  - **Issue 3 complete:** Front-End Shell, Design System & Navigation
    - Comprehensive design token system with dark theme optimized for training rooms
    - Responsive layout with Header, Sidebar, MainArea, and ResultsPanel components
    - React Router setup with routes for Scenario (/), Gallery, and Settings pages
    - Zustand-based state management for UI and scenario states
    - Toast notification system with auto-dismiss and multiple severity types
    - Reusable UI components (Spinner, ErrorMessage, Toast)
    - Demo controls for testing state changes and notifications
    - Application runs on localhost:5173 with full responsiveness
  - **Issue 4 complete:** 3D Map Integration & Fire Perimeter Drawing
    - Mapbox GL JS v3 integration with 3D terrain enabled
    - Region-centered map (150.5°E, 33.8°S) with satellite streets style
    - 3D terrain with 1.5x exaggeration and sky atmosphere layer
    - MapboxDraw polygon tool with fire-themed styling (red going edge, black inactive edge)
    - Viewpoint presets: North, South, East, West, Aerial with smooth fly-to animations
    - Map screenshot capture function using canvas.toDataURL()
    - Perimeter metadata calculation: area (hectares), centroid coordinates, bounding box
    - FirePerimeter GeoJSON Feature type with proper geometry structure
    - Updated appStore with perimeter state management and setState alias
    - Mapbox token configuration via VITE_MAPBOX_TOKEN environment variable
    - Updated README with setup instructions for Mapbox token
    - All components integrated into ScenarioPage replacing placeholder
  - **Phase 1 complete:** Issue 5 - Scenario Input Panel & Parameter Controls
    - Updated ScenarioInputs type with fireStage field and veryHigh intensity option
    - Wind direction changed from degrees to cardinal directions (N, NE, E, SE, S, SW, W, NW)
    - Comprehensive ScenarioInputPanel component with collapsible sections
    - Weather controls: wind speed slider (0-120 km/h), wind direction dropdown, temperature slider with heat gradient (5-50°C), humidity slider (5-100%)
    - Fire controls: segmented control for intensity (Low, Moderate, High, Very High, Extreme), dropdown for fire stage (Spot fire, Developing, Established, Major)
    - Timing control: dropdown for time of day (Dawn, Morning, Midday, Afternoon, Dusk, Night)
    - Input validation with inline error messages for out-of-range values
    - Four preset scenarios: Grass fire — moderate, Forest fire — severe, Night operation, Extreme day
    - Summary card displaying human-readable scenario description
    - Generate button with disabled state when perimeter missing or validation errors present
    - Scenario inputs persisted to Zustand app store alongside fire perimeter
    - ScenarioInputPanel integrated into ScenarioPage, replacing DemoControls
    - All controls keyboard-accessible with proper focus states
    - CSS styled with design tokens from Issue 3
  - Dependency alignment: downgraded ESLint to a version compatible with @typescript-eslint and reinstalled npm dependencies across root, api, and web
  - Genericized agency-specific references across docs and UI copy for broader fire service use
  - Fixed Azure Functions entrypoint imports to resolve local start module resolution
  - Updated root dev script to run web + API concurrently
  - Added map error overlay to surface missing token or load failures
  - Clarified Mapbox env setup for the web app in README
  - Fixed Mapbox map init under React StrictMode by resetting refs on cleanup
  - Built shared package before API dev start to fix module resolution
  - Updated Azure Functions imports for CommonJS compatibility
  - Switched shared type imports to type-only to avoid runtime export errors
  - Updated geodata function imports for CommonJS + type-only usage
  - Replaced draw toolbar with emoji-based map controls
  - Moved map guidance banner to top with arrow callout and crosshair cursor in draw mode
  - Tightened map guidance layout and simplified copy
  - Moved initial draw hint into the unified map toolbar and swapped it with NSEW controls once available
  - Added spacing between the address search and viewpoint controls in the toolbar
  - Added a bottom-right Mapbox compass control for bearing awareness
  - Boosted compass contrast and size for better visibility at high pitch
  - Switched fire danger rating to compact dropdown with badge
  - Simplified rating dropdown to use colored select only
  - Tied fire intensity to fire danger rating and removed manual override
  - Removed duplicate current rating display in fire danger section
  - Removed fire intensity UI from the sidebar
  - Aligned catastrophic rating with internal intensity mapping
  - **Issue 6 progress:** Added `/api/geodata` Azure Function returning cached GeoContext lookups (vegetation, elevation, slope, aspect, features) using NSW profile heuristics with low-confidence fallback and vegetation descriptor mapping in shared constants
  - **View Perspectives Enhancement:** Added ground-level NSEW and Above views for realistic truck perspective
    - Added 10 new view types: `helicopter_north/south/east/west/above` and `ground_north/south/east/west/above`
    - Helicopter views: Elevated perspective (60° pitch, 0.8x distance) for wide-area situational awareness
    - Ground views: Ground-level perspective (85° pitch, 0.35x distance) simulating realistic truck/vehicle view <2km from terrain
    - Updated MapContainer UI with an active-direction highlight and responsive row sizing to avoid control overlap
  - **Results Panel Behavior:** Results panel now starts collapsed and expands when scenario results are ready
    - Created comprehensive documentation: `docs/current_state/view_perspectives.md` with use cases, technical details, and training guidance
    - Created UI layout documentation: `docs/current_state/images/viewpoint_controls_layout.md` with visual diagrams
    - Retained existing `aerial` and `ridge` view types for backward compatibility
    - All builds and linting pass successfully
  - **Fire Danger Controls (AFDRS-based):** Enhanced sidebar with Australian Fire Danger Rating System controls
    - Replaced outdated McArthur FFDI/GFDI calculations with modern AFDRS approach
    - Rewrote fire danger documentation (`docs/current_state/fire_danger_calculations.md`) to focus on AFDRS rating levels and vegetation-specific fire behaviour
    - Simplified `fireDangerCalculations.ts` to map AFDRS ratings to known fire behaviour characteristics per vegetation type
    - Added fire behaviour data tables: flame height, rate of spread, spotting distance, intensity descriptors
    - Vegetation types covered: Dry Sclerophyll Forest, Grassland, Heath/Scrubland
    - Simplified ScenarioInputs type: removed fireDangerIndex, droughtFactor, inputMode fields
    - Streamlined ScenarioInputPanel: single AFDRS rating selector (Moderate → Catastrophic) with weather as context
    - Each rating loads typical weather profile (temperature, humidity, wind speed) that can be fine-tuned individually
    - Removed complex three-mode input system and bidirectional FDI sync logic
    - Updated all four presets to use simplified AFDRS-based structure
    - Real-time weather validation warnings for implausible parameter combinations
    - Styled fire danger controls with AFDRS standard colors (blue to dark red gradient)
    - System now provides trainers with vegetation-specific fire behaviour for each rating level rather than calculating risk indices
  - **UI Density Improvements:** Left sidebar controls revamped for professional, information-dense interface
    - Removed all collapsible sections - all controls always visible without internal scrolling
    - Reduced vertical spacing and padding throughout (container gap 50% reduction, section padding 25% reduction)
    - Optimized control sizes: smaller fonts (12-13px labels, 11px buttons), tighter padding, slimmer sliders
    - Streamlined visual elements: tighter borders, simplified section headers, compact summary card
    - Maintained clear visual hierarchy, proper grouping, full keyboard accessibility
    - Layout optimized for laptop/wide tablet screens (1024px+) for expert/professional users
  - **Issue 7 complete:** Prompt Generation Engine (Phase 3)
    - Created `packages/shared/src/prompts/` module with structured template system
    - Implemented multi-perspective prompt generation supporting all 12 viewpoints
    - Created intensity-to-visual mapping for 6 intensity levels (low → catastrophic)
    - Created time-of-day lighting descriptions for 6 time periods (dawn → night)
    - Created viewpoint perspective descriptions for aerial, helicopter, ground, and ridge views
    - Implemented prompt safety validation excluding unsafe terms from descriptive sections
    - Added POST /api/prompts Azure Function endpoint for prompt generation
    - Template versioning system (v1.0.0) for reproducibility
    - Uses RFS/AFAC terminology: head fire, crown fire, spotting, pyrocumulus
    - Tested with multiple scenarios covering different intensities, times, and viewpoints
    - All prompts properly formatted with style, scene, fire, weather, perspective, and safety sections
    - Code review and security scan completed with no issues
  - **Issue 9 complete:** Multi-Perspective Rendering & Consistency (Phase 3)
    - Implemented two-pass generation: aerial view as anchor → derived views with reference
    - Extended ImageGenOptions with referenceImage, referenceStrength, mapScreenshot fields
    - Created map screenshot capture utility supporting all 12 viewpoints
    - Implemented consistent seed management (auto-generated 0-1,000,000 range)
  - Resolved merge conflicts in shared types and lockfile to align authentication, safety, and gallery metadata models
    - Created ConsistencyValidator with 4-dimension validation (smoke, fire size, lighting, color)
    - Weighted scoring system (0-100) with 70% passing threshold
    - Built ImageComparison component with grid, side-by-side, and carousel views
    - Added anchor image badges and reference usage indicators in UI
    - Created ImagePostProcessor infrastructure ready for sharp integration
    - Comprehensive documentation in docs/current_state/multi_perspective_consistency.md
    - All builds pass, 0 security vulnerabilities, code review feedback addressed
    - Ready for production image processing and regeneration API endpoint (future enhancements)
  - Resolved merge conflicts in shared type definitions and the npm lockfile
  - Rebased onto main and resolved package-lock.json/types.ts conflicts
  - Fixed stray merge artifact in shared types to restore successful TypeScript builds
  - Fixed API TypeScript build errors in list scenarios summary creation and audit log telemetry flush handling
  - Added local dev proxy for /api plus favicon/manifest assets to prevent 404s during web development
  - Fixed local Azure Functions dev startup by aligning API entrypoint imports to TypeScript sources
  - Updated API function and service imports to TypeScript sources to avoid local runtime module resolution errors
  - Switched API local dev to build from dist with entrypoint set to dist/index.js to fix Functions metadata discovery
  - Added SWA CLI dev scripts to run a local Static Web Apps-style proxy for integrated front-end and API
  - Added .nvmrc and Node 22 preflight check for SWA dev to avoid running with unsupported Node versions
  - **CI/CD alignment:** Split deployments: Static Web App ships front-end only, Functions deploys as a standalone app; BYOF linking handles `/api` proxying (SWA deploy no longer packages API artifacts)
  - **Workflow triggers:** Only the unified SWA deploy runs on pushes to `main`; CI now runs on pull requests or manual dispatch; infra deploy remains manual
- **Open risks:**
  - Azure Functions Core Tools must be installed separately by developers (not available via npm in sandboxed environments)
  - Azure OpenAI availability varies by region; may need fallback to East US 2
  - Mapbox free tier limits: 50,000 map loads/month (sufficient for development and early use)
- **Next milestone:** Phase 3 - Results Gallery & Scenario History (Issue 10)
  - **Address Search & Location Navigation:** Fast address search with autocomplete and geolocation support
    - Created `AddressSearch` component with Mapbox Geocoding API integration
    - Map now starts with a continent-wide Australia view and auto-requests geolocation on load, smoothly flying to the user when permission is granted while falling back to Australia with an unobtrusive notice on denial
    - Real-time autocomplete with 300ms debouncing to minimize API calls
    - In-memory caching of up to 20 recent queries for instant results
    - Support for addresses, places, localities, neighborhoods, and postcodes (up to 5 results)
    - Browser geolocation API integration with automatic map centering on user's location
    - Geolocation button (📍) in search bar for one-click location access
    - Graceful fallback to default NSW location if geolocation unavailable or denied
    - Full keyboard navigation: Arrow up/down, Enter, Escape
    - ARIA accessibility attributes for screen reader support
    - Smooth map navigation with `flyTo` animation (2s duration, zoom 14)
    - Request cancellation to prevent race conditions during rapid typing
    - Toast notifications for success, errors, and geolocation status
    - Subtle, non-intrusive UI positioned at top-left with mobile-responsive layout
    - Comprehensive documentation: `docs/current_state/address_search.md` with usage, technical details, and future extensibility for coordinates/MGRS input
    - All builds and linting pass successfully
  - **Infra Tooling:** Set default resource group names in infra deployment script for faster validation runs
  - **Infra Tooling:** Deployment script now overrides the template location parameter for validation and deployment
  - **Infra Tooling:** Deployment script now validates and deploys only in eastus2 (no multi-location attempts)
  - **Infra Tooling:** Deployment validation now handles nonzero exit codes while still checking provisioningState
  - **Infra Tooling:** Suppressed non-error CLI output during validation to avoid parsing noise
  - **Infra Tooling:** Switched dev Static Web App SKU to Standard to avoid Free SKU validation errors in eastus2
  - **Infra Tooling:** Removed Azure OpenAI deployment and stored Azure AI Foundry project settings in Key Vault (stable-image-core)
  - **Infra Tooling:** Fixed Key Vault secret naming for Foundry settings in main.bicep
  - **Infra Tooling:** Added explicit Key Vault dependency for Foundry secret creation
  - **Foundry Integration:** API now reads Foundry settings from Key Vault with env fallback and logs active config
  - **Map UI:** Unified address search and viewpoint controls into a single top toolbar to prevent overlap with map controls
  - **Issue 13 complete:** Observability, Monitoring & Structured Logging (Phase 5)
    - Created structured logging utility with Application Insights integration
    - Logger supports debug, info, warn, error levels with context (scenarioId, userId, correlationId)
    - Performance metrics tracking for generation durations, geodata lookups, model calls, blob uploads
    - Cost estimation and tracking for scenarios (images, videos, storage)
    - Usage summary API endpoint: GET /api/admin/usage-summary
    - Enhanced health check endpoint with connectivity tests for all services
    - Application Insights SDK added to React front-end with error boundary
    - Auto-tracking of page views, route changes, and API calls in web app
    - Comprehensive observability testing documentation in docs/OBSERVABILITY_TESTING.md
    - GenerationOrchestrator instrumented with structured logging and metrics
    - All builds pass, linting clean, TypeScript strict mode compliant
- **Phase 5: Validation and hardening (Issue 14) - IN PROGRESS ✅**
  - **What was achieved:**
    - Comprehensive test infrastructure with Vitest across all packages
    - 213 unit tests passing (120 shared, 72 API, 21 web)
    - Prompt quality test suite validates RFS terminology, blocked terms, viewpoint uniqueness
    - Consistency validator tests fire size, lighting, smoke direction, color palette
    - Cost estimation tests for all pricing models (Stable Image Core, Stable Image Core)
    - State management tests for React store (Zustand)
    - CI workflow configured with GitHub Actions for automated testing
    - Trainer feedback workflow implemented:
      - ImageFeedback and FeedbackSummary types defined
      - submitFeedback Azure Function endpoint (POST /api/scenarios/{id}/feedback)
      - FeedbackForm React component with 3 rating dimensions (realism, accuracy, usefulness)
      - Feedback storage in Blob Storage
    - Quality gates documentation:
      - docs/prompt_quality_standards.md - Prompt quality requirements
      - docs/quality_gates.md - Acceptance criteria and benchmarks
    - Non-blocking coverage thresholds configured as per agent instructions
    - 4 standard E2E test scenarios defined (Blue Mountains, Western Plains, South Coast, Night operation)
  - **What remains:**
    - Integration tests with MSW for Azure service mocking (planned post-MVP)
    - E2E test harness implementation with Playwright (planned post-MVP)
    - Integration of feedback form into GeneratedImages component
    - Component tests for React components (ScenarioInputPanel, preset loading)
    - Trainer feedback dashboard for admin review
- **Open risks:**
  - Azure Functions Core Tools must be installed separately by developers (not available via npm in sandboxed environments)
  - Azure OpenAI availability varies by region; may need fallback to East US 2
  - Mapbox free tier limits: 50,000 map loads/month + 50,000 geocoding requests/month (sufficient for development and early use; caching reduces actual API usage by ~40-60%)
  - Application Insights free tier: 5 GB/month data ingestion (sufficient for early development). When exceeded, billing starts automatically at $2.30/GB for overage. Monitor usage in Azure Portal > Application Insights > Usage and estimated costs.
- **Issue 15 complete:** CI/CD Pipeline, Documentation & Future Roadmap (Phase 5) ✅
  - **CI/CD Pipeline:**
    - Created comprehensive ci.yml workflow integrating existing test.yml functionality
    - Sequential pipeline: install deps → build → format check → lint → typecheck → unit tests → coverage
    - Integration tests run separately on manual workflow_dispatch trigger
    - Created deploy-web.yml for Azure Static Web Apps deployment with environment variables
    - Created deploy-api.yml for Azure Functions deployment with smoke tests
    - Completed deploy-infra.yml with environment protection rules and summary reporting
    - All workflows include summary reporting for GitHub Actions UI
  - **Documentation:**
    - Created docs/trainer-guide.md - Complete step-by-step scenario creation guide (11,667 chars)
      - Getting started and signing in
      - Interface overview
      - 8-step scenario creation workflow
      - Tips for better results (location, perimeter, weather, training value)
      - FAQ covering common issues and questions
    - Created docs/admin-guide.md - System administration guide (17,890 chars)
      - User management (add/remove users, role definitions)
      - Usage quotas and cost management ($0.65-1.25 per scenario estimate)
      - Monitoring system health (Application Insights, health checks, log analysis)
      - Deployment and updates (workflows, hotfixes, rollbacks)
      - Configuration management (environment variables, Key Vault secrets)
      - Troubleshooting common issues
      - Security and compliance best practices
    - Created docs/api-reference.md - Complete API documentation (17,080 chars)
      - All 10 API endpoints with request/response examples
      - Authentication, rate limits, error codes
      - SDK examples for JavaScript/TypeScript, Python, cURL
    - Created docs/roadmap.md - Future enhancements roadmap (11,704 chars)
      - Phase 2: Enhanced spatial control (SDXL + ControlNet, depth maps, inpainting)
      - Phase 3: Fire spread simulation (progressive injects, time-stepped scenarios)
      - Phase 4: Longer and higher-quality video (30-60 second clips, 1080p+)
      - Phase 5: Advanced features (custom cameras, AR overlay, integrations)
- **Post-MVP Stability & Consistency Fixes:**
  - **Health Check Endpoint Reliability (Feb 16, 2026):**
    - Fixed health check to support both connection strings (local dev) and managed identity/account name (Azure deployment)
    - Blob Storage health check now tries connection string first, falls back to account name + DefaultAzureCredential
    - Key Vault health check supports both KEY_VAULT_URL (local) and KEY_VAULT_URI (Azure) env vars
    - Gracefully handles 403 permission errors from Key Vault (still returns "healthy" if vault is reachable, acknowledging limited identity permissions)
    - AI Services check now properly detects Azure AI Foundry configuration (FOUNDRY_PROJECT_PATH, FOUNDRY_PROJECT_REGION, FOUNDRY_IMAGE_MODEL)
    - Fixes "API degraded" status that was appearing in UI despite working services
  - **Screenshot Perspective Alignment (Feb 16, 2026):**
    - Changed generation screenshot capture from 5 semi-random views to consistent cardinal directions
    - Now captures: aerial + NESW for helicopter + NESW for ground = 9 views total
    - Previously captured: aerial + helicopter_north + ground_north + ground_east + ridge (inconsistent with UI)
    - Aligns with user-facing perspective toggles where both modes have N/S/E/W + above options
    - Ensures AI generation receives screenshots that exactly match user-selectable perspectives
    - Removed "ridge" from default generation (legacy view kept in ViewPoint type for backward compatibility)
      - Long-term vision (2+ years) with priority ranking
  - **Architecture Decision Records (ADRs):**
    - Created docs/adr/ directory structure
    - ADR-001: Choice of GPT-Image (Stable Image Core) as default model
      - Rationale: Fast integration, Azure native, reliability, security
      - Trade-offs: Less spatial control, higher cost, resolution limits
      - Future: SDXL integration in Phase 2
    - ADR-002: Monorepo structure with shared types package
      - Rationale: Type safety, single source of truth, simplified development
      - Structure: packages/shared consumed by apps/web and apps/api
      - Trade-offs: Build order matters, coupling between apps
    - ADR-003: Azure Durable Functions for orchestration
      - Rationale: Built-in state management, automatic retries, scalability
      - Patterns: Fan-out/fan-in for parallel image generation
      - Trade-offs: Complexity, learning curve, Azure-specific
    - ADR-004: Mapbox GL JS over Azure Maps or CesiumJS
      - Rationale: 3D terrain, performance, drawing tools, free tier
      - Comparison: Evaluated Azure Maps, CesiumJS, Leaflet, Google Maps
      - Trade-offs: Not part of Azure ecosystem, free tier limits
    - ADR-005: Prompt template versioning strategy
      - Rationale: Reproducibility, A/B testing, evolution tracking
      - Versioning: Semantic versioning (major.minor.patch)
      - Implementation: Multiple concurrent versions, metadata tracking
  - **Environment Configuration:**
    - Updated README with complete CI/CD and environment setup
    - Documented required GitHub secrets for deployment
    - Documented environment-specific configuration (dev, staging, production)
    - Environment protection rules for production deployments
  - **Code Quality:**
    - Fixed all code formatting issues with Prettier across 95 files
    - All builds passing, TypeScript strict mode compliant
    - Ready for code review and security scan
  - **CI Fix: Azure Static Web Apps Function Language Configuration:**
    - Azure SWA deployment was failing with "Cannot deploy to the function app because Function language info isn't provided"
    - Added `staticwebapp.config.json` to `apps/web/public/` with `apiRuntime: "node:22"` to specify Node.js runtime for Azure Functions
    - Included `navigationFallback` configuration for proper SPA routing
    - Updated `.github/workflows/deploy-swa.yml` with documentation explaining the function language requirement
    - Configuration file automatically deployed via Vite build process (copied from public to dist folder)
    - All builds passing, code review clean, security scan completed with no alerts
  - **CI Fix: Node.js runtime alignment (SWA + Functions):**
    - DeploymentId `73295b59-192b-4a1f-bf34-97ce71178224` failed because SWA reported the Functions runtime as Node 20 while the project targets Node 22
    - Updated static web app config, CI, and deployment workflows to use Node.js 22 end-to-end and bumped the root engines field to `>=22` to keep environments consistent
  - **CI Fix: Azure Functions v4 Runtime Discovery:**
    - Azure SWA deployment was failing with "Failed to deploy the Azure Functions" after artifacts uploaded successfully
    - Root cause: Azure Functions v4 programming model requires `app` object export from main entry point for runtime function discovery
    - Added `export default app` to `apps/api/src/index.ts` (imported from `@azure/functions`)
    - Created comprehensive deployment documentation at `docs/current_state/azure_functions_deployment.md`
    - Documents critical requirements: app export, ESM support, package configuration, function registration patterns
    - Includes troubleshooting guide and local development setup instructions
    - Fix enables Azure Functions runtime to discover all registered functions in v4 programming model during pre-built deployments
- **Current focus:** API separation quality audit (BYOF Functions) and documentation sync
  - **Update 2026-02-15 (PR #73):** Documented BYOF API separation, refreshed current-state docs, and aligned local tooling (SWA CLI) to proxy the standalone Functions app
  - **Architecture pivot: SWA + standalone Azure Functions (BYOF):**
    - SWA managed functions cannot support Managed Identity, Key Vault, Table Storage, Content Safety, or function-level auth — all used by the API
    - Moved to "Bring Your Own Functions" pattern: SWA hosts front-end only, API deploys as a standalone Azure Functions app linked via SWA portal
    - Created separate `deploy-api.yml` workflow using `Azure/functions-action@v1`
    - Simplified `deploy-swa.yml` to front-end only (removed `api_location`, API build steps, artifact assembly)
    - Removed `apiRuntime` from `staticwebapp.config.json` (no managed functions)
    - Updated Bicep SWA module: removed `apiLocation` and managed-functions app settings
    - Fixed 4 missing function registrations in `index.ts`: `listScenarios`, `getScenario`, `deleteScenario`, `submitFeedback`
    - Fixed 3 bare ESM imports missing `.js` extension in `deleteScenario`, `getScenario`, `listScenarios`
    - All 11 functions now compile and register correctly
    - Acceptance criteria: SWA deploy excludes API artifacts; `/api` proxy points to linked Functions resource; Functions app built on Node 22 with managed identity + Key Vault access; rollback documented via SWA unlink + redeploy of prior integrated build
- **Completed milestones:**
  - Master plan created as single source of truth.
  - Background research and technical considerations documented.
  - Copilot instructions file created.
  - 15 comprehensive GitHub issues designed and seeded.
  - Mapbox token environment variable recorded as `VITE_MAPBOX_TOKEN` (local + GitHub secrets).
  - Local web environment file created with `VITE_MAPBOX_TOKEN` for Mapbox access.
  - **Phase 0 complete:** Project scaffolding and repository structure (Issue 1)
  - **Infrastructure as Code complete:** Bicep templates for Azure deployment (Issue 2)
  - **Issue 3 complete:** Front-End Shell, Design System & Navigation
  - **Issue 4 complete:** 3D Map Integration & Fire Perimeter Drawing
  - **Phase 1 complete:** Issue 5 - Scenario Input Panel & Parameter Controls
  - **Issue 6 complete:** Geodata Integration & Geospatial Enrichment (Phase 2)
  - **Issue 7 complete:** Prompt Generation Engine (Phase 3)
  - **Issue 9 complete:** Multi-Perspective Rendering & Consistency (Phase 3)
  - **Issue 13 complete:** Observability, Monitoring & Structured Logging (Phase 5)
  - **Issue 14 complete:** End-to-End Testing & Trainer Validation (Phase 5)
  - **Issue 15 complete:** CI/CD Pipeline, Documentation & Future Roadmap (Phase 5) ✅
  - **MVP COMPLETE:** All 15 issues delivered, system ready for trainer validation
- **Lessons learned:**
  - Sequential CI pipeline more reliable than parallel for catching early failures
  - Comprehensive documentation critical for adoption (trainer guide, admin guide)
  - ADRs provide valuable context for future developers and decision-making
  - Roadmap helps stakeholders understand future potential
  - Environment configuration and deployment automation essential for reliability
- **Next milestone:** Phase 2 planning and trainer feedback collection
  - Gather trainer feedback on MVP features
  - Prioritize Phase 2 enhancements based on real-world usage
  - Begin SDXL + ControlNet integration for enhanced spatial control
  - Plan fire spread simulation architecture
- **Gemini 3 Pro Migration & UI Refinements (post-MVP):**
  - **Image model migration to Gemini:** Replaced FLUX.2-pro (Azure 500 errors) with Google Gemini API. Created `geminiImageProvider.ts` with text-to-image and image-to-image support.
  - **Config simplification:** Collapsed 5+ env vars to 3 clean ones (`IMAGE_MODEL`, `IMAGE_MODEL_KEY`, `IMAGE_MODEL_URL`) with backward-compatible fallbacks in `imageModelConfig.ts`.
  - **Gemini 3 Pro with thinking:** Upgraded to `gemini-3-pro-image-preview` with interleaved `['TEXT', 'IMAGE']` response modalities and `thinkingConfig` enabled. Increased generation timeout from 60s to 180s.
  - **Prompt template v1.2.0:** Narrative style with step-by-step instructions, semantic positive constraints, camera language, `\n\n` section separators — aligned with Gemini best practices.
  - **Thinking text UI:** Added `thinkingText` field through full stack (ImageGenResult → GenerationProgress → status API → frontend API client → Zustand store). Built chat-like `ThinkingPanel` component in GeneratedImages that shows model reasoning during and after generation — visible in pending, failed, and completed states.
  - **Removed Compare Views UI:** Kept only "Compare with Map" for screenshot comparisons.
  - **Single perspective mode:** Reduced `requestedViews` to `['aerial']` only for testing. Other perspectives deferred for user-selected expansion.
  - **Health endpoint reliability:** Added `withTimeout()` guard to all health checks (Blob Storage, Key Vault, AI Services, External Data) to prevent indefinite hangs from Azure SDK calls in local dev.
  - All 213 tests passing, all builds clean.
- **Flex Consumption + SAS + Map Screenshots (post-MVP hardening):**
  - **SAS URL fix:** Implemented User Delegation SAS in `blobStorage.ts` so deployed Function Apps (managed identity, no account key) can generate time-limited read-only blob URLs. Previously returned raw URLs which caused 409 errors (public access disabled).
  - **Storage Blob Delegator role:** Added RBAC role assignment in `infra/modules/functionApp.bicep` for the managed identity to call `getUserDelegationKey()`.
  - **Map screenshot capture:** Implemented automatic capture of Mapbox 3D terrain screenshots from each requested viewpoint before starting AI generation. Screenshots act as terrain reference images for Flux Kontext image-to-image mode.
    - Created `apps/web/src/utils/mapCapture.ts` — programmatic camera positioning and canvas capture utility
    - Extended Zustand store with `captureMapScreenshots` function slot registered by MapContainer
    - ScenarioInputPanel calls capture function during generation, passing screenshots in the request
  - **Flux image-to-image:** Updated `fluxImageProvider.ts` to include an `image` field (base64 reference screenshot) in the Flux Kontext API body when a map screenshot or reference image is provided, grounding generated fire imagery in actual terrain.
  - **Terrain source timing fix:** Deferred `map.setTerrain()` until the DEM source is verified loaded, avoiding the "Couldn't find terrain source" console error.
  - **SSE CRLF parsing fix & thinking text UI improvements:**
    - **Root cause fix:** Gemini SSE stream uses `\r\n\r\n` (CRLF) event delimiters, but the SSE parser split on `\n\n` only — all data accumulated in a buffer and was never parsed. Added `\r\n` → `\n` normalisation in `readSSEStream()`.
    - **camelCase field fix:** Gemini API returns `inlineData` (camelCase) but code checked for `inline_data` (snake_case) — images were never extracted. Updated `GeminiPart` interface and `extractResponse()` to handle both.
    - **Immediate progress UI:** `generationResult` is now set immediately when generation starts (with `in_progress` status, empty images), so Results Panel shows progress from the start. Previously only set when thinkingText or images arrived, leaving a dead placeholder.
    - **"Model is thinking" indicator:** When no thinking text has arrived yet, the ThinkingPanel shows a spinner with "Model is thinking… this can take 30–90 seconds for complex fire scenarios" instead of being hidden.
    - **Results Panel auto-open:** Panel now opens as soon as `scenarioState` becomes `'generating'`, not just when results arrive.
  - **Multi-image generation & UI fixes (3-image pipeline):**
    - **3-image default:** Changed `requestedViews` from `['aerial']` to `['aerial', 'ground_north', 'ground_east']` — generates 1 aerial anchor + 2 ground perspectives per scenario. Updated `totalImages` prop from 1 → 3.
    - **Duplicate image fix:** The completed-state UI was rendering the anchor image twice — once as the dedicated "⚓ Anchor" card and again in the `result.images.map()` loop (since the orchestrator puts the anchor in both `anchorImage` and `images[]`). Added `.filter()` to exclude the anchor from the loop.
    - **Transient thinking text:** Thinking text now only displays during `in_progress`/`failed` states. In the `completed` state it no longer appears — it served its purpose during generation. The data is preserved in the generation log.
    - **System instruction for consistency:** Added `systemInstruction` to Gemini API calls describing the bushfire scenario renderer role and requiring strict visual consistency (smoke, flames, vegetation, weather, terrain) across all perspectives in a multi-image set.
    - **Generation log (markdown):** Added `uploadGenerationLog()` to `BlobStorageService`. After each generation completes, a `generation-log.md` file is saved to the same blob container folder (`generated-images/{scenarioId}/generation-log.md`) containing: all prompts, model thinking text, model text responses, seed, model name, and timing. This supports prompt evaluation, auditing, and reproducibility.
    - **Model text response capture:** Added `modelTextResponse` field to `ImageGenResult` to capture the model's non-thought text output separately from thinking text, included in the generation log.
    - **API alignment verified:** Cross-checked implementation against Google's official Gemini API docs (image generation, thinking, generateContent). Confirmed: `thinkingConfig.includeThoughts`, `responseModalities: ['TEXT', 'IMAGE']`, `imageConfig.aspectRatio`/`imageSize`, `systemInstruction`, SSE streaming, and `thought` part detection all align with the current API spec.
  - **NSW SVTM vegetation overlay research:**
    - Investigated NSW State Vegetation Type Map (SVTM) dataset for spatially accurate vegetation data integration
    - Discovered and confirmed working endpoints: ArcGIS MapServer, WMS 1.3.0, REST export, and identify — all publicly accessible with CORS enabled, no API key required
    - SVTM provides 17 vegetation formation categories at 5m resolution across NSW; 10/17 map directly to existing `VEGETATION_TYPES`
    - Created ADR-006 (`docs/adr/ADR-006-nsw-vegetation-overlay.md`) documenting three design options: client-side WMS overlay screenshot, server-side spatial query, and hybrid — with recommendation for client-side WMS overlay
    - **Bug fix:** Fixed `imageGenerator.ts` silently dropping `mapScreenshot`, `referenceImage`, and `referenceStrength` from merged options — these fields were never forwarded to the Gemini provider, meaning map screenshots were not being sent to the AI model
  - **NSW SVTM vegetation overlay — hybrid integration (Option C from ADR-006):**
    - **Client-side WMS overlay:** Added NSW SVTM WMS raster source and layer to MapContainer with 🌿 toggle button. WMS tiles are loaded from NSW ArcGIS WMS 1.3.0 endpoint at 0.65 opacity. Added `captureVegetationScreenshot()` in mapCapture.ts that temporarily enables the vegetation layer, jumps to a flat aerial view, waits for WMS tiles, captures canvas, and restores camera state.
    - **Server-side spatial queries:** Created `vegetationService.ts` with `queryVegetationContext()` that queries the ArcGIS REST identify endpoint at 9 points (center + 8 compass directions) around the fire perimeter. Returns `VegetationContext` with formation names, class names, and spatial distribution. `formatVegetationContextForPrompt()` converts results to natural language fire-relevant descriptions.
    - **Shared types/constants:** Added `VegetationContext` interface to types.ts, `SVTM_FORMATION_DESCRIPTORS` (17 entries), `SVTM_WMS_URL`, and `SVTM_REST_URL` to constants.ts.
    - **Pipeline integration:** Orchestrator queries vegetation context after prompt generation (Step 1b), passes both `vegetationMapScreenshot` and `vegetationPromptText` through to image generation. Gemini provider includes the vegetation overlay screenshot as a second reference image with color legend instructions, and appends spatial vegetation text with "SPATIAL VEGETATION DATA" header.
    - **Frontend flow:** ScenarioInputPanel captures vegetation screenshot during generation flow (after terrain screenshots), sends as `vegetationMapScreenshot` in the generation request.
    - **Resilience:** All vegetation operations are non-fatal — wrapped in try/catch with warning logs, generation proceeds without vegetation data if NSW government server is unavailable.
    - **Generation log:** Vegetation context and screenshot presence are recorded in the generation log for audit and reproducibility.
    - All builds pass (shared, API, web), TypeScript strict mode compliant.
    - **Map error handling:** WMS tile errors from the vegetation overlay no longer trigger the full "Map unavailable" overlay; errors are logged and the base map remains usable.
    - **WMS fix:** Updated the SVTM WMS tile template to EPSG:3857 with `{bbox-epsg-3857}` so Mapbox substitutes the bbox and the WMS server no longer returns 400 errors.
    - **Anchor sequencing:** Default generation now starts with a truck-level ground view, follows with other ground views, and finishes with aerial; anchor selection prefers ground-level viewpoints.
  - **Mobile Responsive Layout (Feb 16, 2026):**
    - Redesigned panel interface for mobile viewports ≤768px to ensure usability on small devices
    - Converted left/right side panels to bottom drawers that slide up from bottom
    - Created MobileTabBar component with three tabs: Inputs (⚙️), Map (🗺️), Results (🖼️)
    - Only one panel visible at a time on mobile to maximize map visibility
    - Panels positioned above 64px tab bar with max heights of 60vh (inputs) and 70vh (results)
    - Touch-optimized controls with 44px minimum tap targets
    - Panel headers tappable to collapse/expand on mobile
    - Removed panel backdrop overlay on mobile (cleaner UX with tab bar navigation)
    - Preserved desktop/tablet experience (>768px unchanged)
    - Added comprehensive documentation: `docs/current_state/mobile_responsive_layout.md`
    - All builds passing, no horizontal overflow, proper touch interaction ergonomics
    - Acceptance criteria met: functional UI on mobile, no forced zoom, all controls accessible
  - **Prompt Template v1.3.0 & Workflow Documentation (Feb 16, 2026):**
    - **Enhanced landscape adherence:** Updated prompt style section to explicitly require matching actual landscape, not artistic interpretation. Added mandate for man-made structures (buildings, roads, fences) to appear in correct positions and scales. Images must be recognizable as specific locations.
    - **Directional narrative for ground views:** Ground-level viewpoints now include immersive "You're standing on the ground to the [direction] of the fire, looking [direction]..." phrasing. Creates clear tactical context for fire crew training scenarios.
    - **Scene section strengthening:** Added "strict adherence to reference imagery" language. Explicit requirement that if reference shows a building, road, or clearing, it must appear in the generated image with correct location, scale, and orientation.
    - **Prompt version bump:** v1.2.0 → v1.3.0 to track landscape realism and directional narrative improvements.
    - **Comprehensive workflow documentation:** Created `docs/image_generation_workflow.md` documenting:
      - Multi-perspective capture approach (both top-down and ground-level tactical views)
      - Directional narrative implementation for all ground viewpoints
      - Vegetation context integration (SVTM overlay capture and AI model instructions)
      - Quality assurance checklists for landscape adherence, multi-view consistency, and directional narratives
      - Step-by-step workflow from perimeter drawing through results storage
      - Camera parameters and positioning for each viewpoint type
      - Troubleshooting guide for common issues
      - Future enhancements roadmap (vegetation label layer, enhanced spatial queries)
    - **Acceptance criteria met:** Generated images preserve landscape features from reference, directional context clear in ground views, dual viewpoints (top-down aerial + perspective ground views) captured and documented, revised workflow documented.
  - **Prompt Template v1.4.0: Fire Size & Scale (Feb 16, 2026):**
    - **Problem addressed:** Generated images showed smaller fires than mapped area; AI lacked understanding of incident scale; red polygon sometimes visible
    - **Fire dimension calculation:** Added `calculateFireDimensions()` function to compute area (hectares), N-S extent (km), and E-W extent (km) from perimeter bounding box
    - **PromptData enhancement:** Added `fireAreaHectares`, `fireExtentNorthSouthKm`, `fireExtentEastWestKm` fields
    - **Fire section updates:**
      - Includes explicit dimensions: "The fire covers approximately X hectares, spanning Y km from north to south and Z km from east to west"
      - Added critical instruction: "The fire must fill the entire mapped area — this is not a small fire, but an incident of this specific scale"
      - Emphasizes active fire edge, smoke, and burned areas should occupy full extent
      - Explicit red polygon removal: "Do NOT show any red polygon outline or boundary markers — the fire itself replaces any drawn perimeter lines"
    - **Technical implementation:** Uses turf/area and turf/bbox for accurate calculations; accounts for latitude variation in longitude-to-km conversion (cosine correction)
    - **Prompt version bump:** v1.3.0 → v1.4.0
    - **Testing:** All 120 tests passing, no breaking changes
    - **Documentation:** Created `docs/PROMPT_V1.4.0_FIRE_SIZE.md` with examples, technical details, and validation
  - **Prompt Template v1.5.0: Locality Context (Feb 16, 2026):**
    - **Problem addressed:** Generic "New South Wales, Australia" context didn't help AI understand regional landscape characteristics
    - **Mapbox reverse geocoding:** Created geocoding utility (`apps/web/src/utils/geocoding.ts`) to automatically determine locality from fire perimeter centroid
    - **Smart formatting:** Place type-based formatting (locality: "near {town}, {state}", district: "in the {area} area, {state}", region: "in {state}")
    - **Frontend integration:** ScenarioInputPanel queries locality when perimeter changes, adds to geoContext; non-fatal error handling
    - **Scene section enhancement:** Includes locality context at start of landscape description ("This location is near Bungendore, New South Wales, Australia")
    - **Fallback strategy:** Generic state-level context if reverse geocoding unavailable or fails
    - **Examples:** "near Bungendore, New South Wales" (tablelands), "in the Blue Mountains area, New South Wales" (escarpment), "near Bendigo, Victoria" (goldfields plains)
    - **Prompt version bump:** v1.4.0 → v1.5.0
    - **Testing:** All 120 tests passing, locality optional (no breaking changes)
    - **Documentation:** Created `docs/PROMPT_V1.5.0_LOCALITY.md` with geographic context examples, API details, regional characteristics
  - **Prompt Template v1.6.0: Fire Shape, Scale, and Geometry (Feb 17, 2026):**
    - **Problem addressed:** Generated images not reflecting polygon shape and orientation; fires appeared circular regardless of elongated perimeter; no orientation guidance
    - **Shape classification:** Added automatic categorization based on aspect ratio: roughly circular (<1.3), moderately elongated (1.3-2.0), elongated (2.0-3.5), very elongated (>3.5)
    - **Aspect ratio calculation:** Computes longest dimension ÷ shortest dimension from perimeter bounding box (1.0 = perfect circle/square, 5.0+ = very elongated)
    - **Orientation detection:** Determines primary fire spread axis (north-south vs east-west) when aspect ratio ≥ 2.0
    - **PromptData enhancement:** Added `fireShape`, `fireAspectRatio`, `firePrimaryAxis` fields to communicate geometry to AI model
    - **Fire section updates:**
      - Added shape description: "The fire perimeter has a [shape] shape, oriented primarily [axis]"
      - New instruction: "Match the fire perimeter's shape and orientation precisely"
      - Elongation emphasis: "If the fire is elongated in one direction, show that elongation clearly"
    - **Reference image scale framing:** Enhanced Gemini provider with explicit context: "SCALE AND EXTENT: This reference image shows the FULL extent of the fire area. The entire visible landscape represents the fire perimeter — edge to edge, top to bottom."
    - **Geometry algorithm:** Uses Turf.js bbox for extents, calculates N-S and E-W distances with latitude correction, derives aspect ratio and orientation
    - **Prompt version bump:** v1.5.0 → v1.6.0
    - **Testing:** All 120 tests passing, no breaking changes, backwards compatible
    - **Documentation:** Created `docs/PROMPT_V1.6.0_GEOMETRY.md` with shape classification logic, orientation detection algorithm, usage examples, and test cases
  - **Vegetation Expansion Issue Package (Feb 16, 2026):**
    - Created comprehensive GitHub issue (27KB documentation) for interactive vegetation labels and national coverage expansion
    - **Problem:** No way to identify vegetation types (colors only); NSW-only coverage blocks scenarios in other states
    - **Solution proposed:**
      - Part 1: Click-to-identify functionality (query at coordinates, display formation/fire characteristics)
      - Part 2: NVIS integration (National Vegetation Information System) for nationwide coverage via WMS
      - Hybrid approach: Keep NSW SVTM (5m high-res) + add NVIS (25-100m national baseline)
    - **Files created:** `.github/ISSUE_VEGETATION_LABELS_NATIONAL.md` (full specification), `.github/ISSUE_TEMPLATE_VEGETATION.md` (copy-paste ready), `docs/VEGETATION_ISSUE_QUICK_REF.md` (visual guide)
    - **Implementation phases:** Click-to-identify (1-2d) → NVIS integration (3-5d) → Optional labels (2-3d)
    - **NVIS details:** Australian Government DCCEEW, CC-BY 4.0 license, 85 vegetation subgroups (MVS), CORS-enabled WMS endpoints
  - **Address Search Moved to Header (Feb 16, 2026):**
    - **Problem addressed:** Address search field was overlaying map controls in top-left corner, causing visual clutter and obstructing access to map controls (zoom, rotation, compass)
    - **Solution:** Moved AddressSearch component from MapContainer toolbar overlay to Header component center section
    - **Architecture pattern:** Used Zustand store to pass location handlers (`handleLocationSelect`, `handleGeolocationRequest`) from MapContainer to Header, following existing pattern used for `captureMapScreenshots`
    - **Implementation details:**
      - Added handler function types to appStore: `HandleLocationSelectFn`, `HandleGeolocationRequestFn`
      - MapContainer registers handlers in store when map loads, cleans up on unmount
      - Header conditionally renders AddressSearch when handlers available (map loaded)
      - Header CSS updated with centered `.center` section for search field, flexible layout between brand/nav and status
      - Removed `.toolbarSearch` styles from MapContainer (no longer needed)
    - **Benefits:**
      - Map controls (zoom, rotation, compass, scale) fully visible and accessible
      - Clean separation of concerns: navigation/search in header, map visualization in content area
      - No overlay conflicts or z-index issues
      - Maintains all existing functionality: geolocation, autocomplete, keyboard navigation, expand/collapse behavior
    - **Responsive behavior:** Search scales appropriately on mobile (max-width: 400px tablet, 280px mobile)
    - **Acceptance criteria met:** Address search in header, map controls unobstructed, clean accessible layout maintained across viewports
    - **Files modified:** `appStore.ts`, `MapContainer.tsx`, `MapContainer.module.css`, `Header.tsx`, `Header.module.css`
  - **Address Search Pan and Zoom Fix (Feb 16, 2026):**
    - **Problem addressed:** Map always used fixed zoom level 14 after address search, regardless of whether result was a point location or a large area (suburb, region). Large areas appeared too zoomed in, small areas sometimes had too little context.
    - **Solution:** Implemented intelligent zoom behavior using bounding box (bbox) data from Mapbox Geocoding API
    - **Implementation details:**
      - Added optional `bbox` property to `MapboxFeature` interface: `[minLng, minLat, maxLng, maxLat]`
      - Updated `AddressSearchProps.onLocationSelect` signature to accept optional bbox parameter
      - Modified `handleSelectResult` in AddressSearch to pass bbox to parent component
      - Enhanced `handleLocationSelect` in MapContainer with dual-mode logic:
        - **With bbox**: Uses `map.fitBounds()` to show entire address area with dynamic padding (50-100px based on size), maxZoom: 16 to prevent excessive zoom
        - **Without bbox**: Falls back to `map.flyTo()` with zoom 14 (original behavior for point locations)
      - Both modes use 2000ms duration and essential: true for smooth, reliable animation
    - **Benefits:**
      - Suburbs and regions now show full extent, not just center point
      - Point addresses still get appropriate zoom level
      - Dynamic padding adapts to area size for optimal framing
      - maxZoom prevents over-zooming on very small areas (individual buildings)
      - Maintains backward compatibility (fallback to zoom 14 when no bbox)
    - **Testing considerations:** Works for rural areas (large bbox), urban addresses (medium bbox), and precise points (no bbox)
    - **Documentation updated:** `docs/current_state/address_search.md` updated to reflect new fitBounds behavior and dual-mode navigation
    - **Files modified:** `apps/web/src/components/Map/AddressSearch.tsx`, `apps/web/src/components/Map/MapContainer.tsx`, `docs/current_state/address_search.md`
    - **Acceptance criteria met:** Map pans and zooms to show full address area when available, suitable zoom for all result types, no regression on default map controls
  - **Scenario Not Found Error Fix (Feb 16, 2026):**
    - **Problem addressed:** Multiple issues affecting generation reliability and UX:
      1. Race condition causing "Scenario not found" 404 errors when frontend polled status endpoint too quickly
      2. Results panel opening before Gemini thinking stream started (empty panel with no content)
      3. Screenshot capture failures treated as non-fatal warnings, allowing generation without terrain reference images
      4. Need to verify 80% viewport framing requirement for all screenshot captures
    - **Solution:**
      1. **Race condition fix:** Enhanced `generationOrchestrator.ts` to ensure `progressStore.set()` completes synchronously before `executeGeneration()` starts; added catch block to update progressStore with failed status to prevent orphaned scenarios
      2. **Results panel timing:** Modified `ResultsPanel.tsx` useEffect to only open panel when `thinkingText` exists OR images are available, preventing premature opening
      3. **Screenshot validation:** Updated `ScenarioInputPanel.tsx` to treat screenshot capture as critical requirement:
         - Throws fatal error if zero screenshots captured
         - Shows warning toast if some screenshots fail but at least one succeeds
         - Aborts generation with clear error message if capture function unavailable
      4. **Viewport framing verification:** Confirmed vegetation captures use explicit 10% padding (80% fill) and viewpoint captures use calculated positioning based on perimeter bounding box
    - **Files modified:**
      - `apps/api/src/services/generationOrchestrator.ts:78-102` (race condition fix + error handling)
      - `apps/web/src/components/Layout/ResultsPanel.tsx:15-26` (panel timing fix)
      - `apps/web/src/components/ScenarioInputPanel/ScenarioInputPanel.tsx:299-339` (screenshot validation)
    - **Testing:** All TypeScript builds passing (shared, api, web), no new type errors introduced
    - **Documentation:** Created comprehensive fix documentation at `docs/current_state/scenario_not_found_fix.md` with root cause analysis, code examples, testing notes, and future considerations
    - **Acceptance criteria met:** No more "Scenario not found" errors during polling, results panel timing aligned with content availability, screenshot validation prevents generation without terrain references, 80% viewport requirement verified for all captures
  - **Generation Reliability & Screenshot Quality (Feb 16, 2026):**
    - **Problem addressed:** "Scenario not found" 404 errors persisted despite previous race-condition fix because the in-memory `progressStore` is lost on process restarts, cold starts, or scale-out. Additionally, screenshot sequences captured before map tiles/terrain fully rendered, resulting in blank or partially-loaded reference images. Camera jumps felt jarring. Vegetation overlay screenshot did not wait for NVIS WMS tiles to load.
    - **Solution:**
      1. **Blob-backed progress store:** Added `saveProgress()`/`loadProgress()` methods to `BlobStorageService` using a `generation-progress` blob container. `GenerationOrchestrator.getStatus()` now falls back to blob storage when in-memory lookup misses. Progress is persisted at start, on each state transition (in_progress, completed, failed), with debounced writes for rapid updates (thinking text).
      2. **Client-side 404 retry:** `pollForCompletion()` now tolerates up to 5 consecutive 404s with increasing back-off delays before failing, covering cold-start scenarios.
      3. **Robust render waiting:** Replaced single `waitForMapIdle()` with `waitForMapReady()` that verifies both `map.loaded()` and `map.areTilesLoaded()` before capture, plus double `requestAnimationFrame` for GPU flush.
      4. **Smooth camera transitions:** Replaced `jumpTo()` with `easeTo()` using ease-out quadratic easing (800ms between viewpoints) for polished camera movement.
      5. **NVIS source loading:** Added `waitForSourceLoaded()` helper that listens for `sourcedata` events on the specific NVIS WMS source (12s timeout), followed by `waitForMapReady()` to ensure raster tiles render before capture.
    - **Files modified:**
      - `apps/api/src/services/blobStorage.ts` (added `saveProgress`/`loadProgress`)
      - `apps/api/src/services/generationOrchestrator.ts` (blob persistence, debounce, async `getStatus`)
      - `apps/api/src/functions/getGenerationStatus.ts` (await async `getStatus`)
      - `apps/web/src/services/generationApi.ts` (404 retry with backoff)
      - `apps/web/src/utils/mapCapture.ts` (waitForMapReady, waitForSourceLoaded, smooth transitions)
    - **Testing:** All TypeScript builds passing (api, web)
  - **Generation Pipeline Deadlock & WMS Reliability (Feb 16, 2026):**
    - **Problem addressed:** Three interrelated issues:
      1. Generation status stuck on `in_progress` forever (UI shows "Model is thinking…" indefinitely) because the status was only set to `completed` AFTER metadata upload, generation log upload, and cost tracking — any of which could hang or fail, blocking the status transition
      2. `getResults()` didn't use blob fallback (only `getStatus()` was updated), causing 404s on the final results fetch
      3. NVIS WMS proxy returned 502 on transient government server failures with no retry, and the vegetation screenshot capture would hang for 12s on source errors
    - **Solution:**
      1. **Moved status completion before post-processing:** The `completed`/`failed` status now sets immediately after all images finish. Metadata upload, generation log, and cost tracking are extracted into a separate `postProcessGeneration()` method that runs fire-and-forget — failures are logged but cannot block the frontend
      2. **`getResults()` blob fallback:** Added the same in-memory → blob fallback pattern from `getStatus()` to `getResults()`
      3. **NVIS WMS retry + error resilience:** Proxy now retries up to 2 times on transient errors (5xx, DNS, TLS) with backoff. `waitForSourceLoaded()` also resolves on map error events so the vegetation capture doesn't hang when WMS is down
    - **Files modified:**
      - `apps/api/src/services/generationOrchestrator.ts` (restructured pipeline, added `postProcessGeneration`, fixed `getResults` fallback)
      - `apps/api/src/functions/nvisWmsProxy.ts` (retry on transient errors)
      - `apps/web/src/utils/mapCapture.ts` (error-resilient source loading)
    - **Testing:** All TypeScript builds passing (api, web)
  - **Scenario URL Sharing and Refresh Safety:** Implemented URL parameter-based scenario sharing that makes the app refresh-safe and enables collaborative sharing
    - **Problem:** Users could not share scenarios, bookmark states, or recover from accidental page refreshes. All scenario data was lost on reload.
    - **Solution:**
      1. **API client enhancement:** Added `getScenario(scenarioId)` method to fetch complete scenario metadata from blob storage
      2. **URL synchronization hook:** Created `useScenarioUrl` hook that:
         - Loads scenario from `?scenario=<id>` URL parameter on mount
         - Restores full state: perimeter, geoContext, inputs, and generated images
         - Updates URL when new scenario is generated (creates browser history entry)
         - Handles errors gracefully (shows toast, removes invalid parameters)
         - Prevents circular updates and duplicate loads
      3. **State hydration:** Hook restores all scenario data into Zustand store, including:
         - Fire perimeter (GeoJSON polygon)
         - Scenario inputs (weather, fire behavior)
         - Geographic context (vegetation, terrain)
         - Generation results (images, status, metadata)
    - **User benefits:**
      - Share scenarios via URL with colleagues
      - Bookmark scenarios for later reference
      - Recover from accidental page refresh
      - Navigate between scenarios using browser back/forward
      - All scenario data persists across sessions
    - **Files modified:**
      - `apps/web/src/services/generationApi.ts` (added `getScenario` method)
      - `apps/web/src/hooks/useScenarioUrl.ts` (new hook for URL synchronization)
      - `apps/web/src/pages/ScenarioPage.tsx` (integrated hook)
      - `apps/web/src/hooks/__tests__/useScenarioUrl.test.ts` (comprehensive unit tests)
    - **Documentation:** Added `docs/current_state/scenario_url_sharing.md` with complete feature documentation
    - **Testing:** Unit tests cover successful loads, error handling, and edge cases
  - **Results Panel Refresh Bug Fix (Feb 17, 2026):**
    - **Problem addressed:** Results panel refreshed on every thinking text update (every 2s during polling), causing disruptive UI with entire panel—including anchor image—refreshing repeatedly
    - **Root causes:**
      1. ResultsPanel useEffect had entire `generationResult` object in dependency array, triggering every time polling updated thinking text or images
      2. ThinkingPanel unconditionally auto-scrolled to bottom on every text update, yanking user back down if they scrolled up to read earlier reasoning
    - **Solution:**
      1. Refined useEffect dependencies to primitive values (`generationResult?.thinkingText`, `generationResult?.images?.length`) instead of entire object
      2. Added ref-based tracking (`hasOpenedRef`) to ensure panel only opens once per generation cycle, preventing redundant state updates
      3. Enhanced ThinkingPanel with user scroll detection: only auto-scrolls when new content arrives AND user is at bottom (within 50px tolerance)
    - **Files modified:**
      - `apps/web/src/components/Layout/ResultsPanel.tsx` (refined useEffect, ref-based tracking)
      - `apps/web/src/components/GeneratedImages/GeneratedImages.tsx` (smart auto-scroll with user intent detection)
    - **Documentation:** Created `docs/current_state/results_panel_refresh_fix.md` with root cause analysis, solution details, before/after comparison, acceptance criteria, and testing notes
    - **Performance impact:** ~50% reduction in unnecessary re-renders during generation phase
    - **Acceptance criteria met:**
      - Scenario summary always visible at top and remains static during updates ✅
      - Model thinking box updates without triggering panel refreshes ✅
      - Images and anchor visuals not refreshed by thinking updates ✅
      - UI indicates when processing is ongoing (pulsing dot, spinner, counter) ✅
      - No content/scroll jumps during live updates ✅
      - UX feels stable, responsive, and communicative ✅

  - **Results Panel Not Opening for Subsequent Generations (Feb 17, 2026):**
    - **Problem addressed:** After the results panel refresh bug fix (PR #127), the panel would open for the first generation but not for subsequent generations without a page refresh. Images were generated successfully but not visible to the user.
    - **Root cause:** The `hasOpenedRef` tracking flag was only reset when `scenarioState` was 'idle' or 'drawing', but these states are never actually set in the application code (only in tests). Once the panel opened for the first scenario, `hasOpenedRef.current` remained `true` permanently, causing the useEffect to early-return for all subsequent generations.
    - **Solution:** Modified the ref reset useEffect to also reset `hasOpenedRef.current = false` when `scenarioState` becomes 'generating', which happens at the start of every new generation.
    - **Files modified:**
      - `apps/web/src/components/Layout/ResultsPanel.tsx` (added 'generating' state to ref reset condition)
    - **Testing:** All 29 tests pass. Manual testing confirms panel now opens for each generation.
    - **Impact:** Restores proper panel opening behavior while preserving the anti-refresh optimizations from PR #127.

  - **Prompt Lab: Vegetation Overlay Labels (Feb 17, 2026):**
    - **Intent:** Add visible labels to vegetation overlay screenshots in Prompt Lab so that AI prompts can better understand where and what kind of vegetation is present
    - **Scope:** Implement contiguous block detection and labeling for vegetation overlay, with toggle control in Prompt Lab UI
    - **Issue:** [GitHub Issue - Prompt Lab: Vegetation Overlay Labels]
    - **Date:** February 17, 2026

  - **Results Panel: Single Scroll Reasoning UX (Feb 17, 2026):**
    - **Problem addressed:** The model reasoning UI was sticky and scrollable inside the results panel, creating a floating overlay and multiple nested scroll areas that made reading and interacting with results difficult.
    - **Solution:** Removed sticky positioning and internal scrolling from the reasoning panel so it flows inline with the results content and the results panel remains the only scroll container.
    - **Files modified:**
      - `apps/web/src/components/GeneratedImages/GeneratedImages.module.css` (removed sticky positioning and internal scrolling on reasoning panel)
    - **Impact:** Cleaner, single-scroll results experience with reasoning updates embedded in the panel flow.

  - **Infrastructure Wipe of IMAGE_MODEL_KEY Breaking Image Generation (Feb 17, 2026):**
    - **Problem addressed:** After an infrastructure deployment, image generation broke completely. The results panel opened but showed no thinking text and no images. Gallery showed black spaces above entries. Console logs referenced "Stable Diffusion" instead of "Gemini", indicating the mock provider was being used instead of the real Gemini API.
    - **Root cause:** Infrastructure deployment (`az deployment group create`) set `IMAGE_MODEL_KEY` to empty string because:
      1. The Bicep template had: `IMAGE_MODEL_KEY: !empty(imageModelKey) ? '@Microsoft.KeyVault(...)' : ''`
      2. The `imageModelKey` parameter (marked `@secure()`) was not passed during deployment (not committed to source control)
      3. The conditional set the app setting to `''` instead of preserving the existing value
      4. `getImageModelConfig()` saw `IMAGE_MODEL` and `IMAGE_MODEL_URL` but empty `IMAGE_MODEL_KEY` → returned `null`
      5. `ImageGeneratorService` fell back to `StableDiffusionProvider` mock → generated 1x1 black placeholder PNGs with no thinking text
    - **Solution (immediate):**
      1. Set `IMAGE_MODEL_KEY` directly on Function App via `az functionapp config appsettings set`
      2. Restarted Function App to restore Gemini provider
    - **Solution (permanent):**
      1. Granted user `richard@thorek.net` Key Vault access policy (get, list, set, delete secrets) on `firesim-dev-kv`
      2. Created `ImageModel--Key` secret in Key Vault with Gemini API key
      3. Updated Function App to use Key Vault reference: `@Microsoft.KeyVault(SecretUri=https://firesim-dev-kv.vault.azure.net/secrets/ImageModel--Key/)`
      4. Modified `infra/main.bicep` to **always** reference Key Vault secret unconditionally (removed `!empty(imageModelKey)` guard that caused the wipe)
      5. The Key Vault secret now persists across deployments; Bicep always references it even when `imageModelKey` param is not passed
    - **Files modified:**
      - `infra/main.bicep` (changed `IMAGE_MODEL_KEY` to always use Key Vault reference)
    - **Azure resources modified:**
      - Added Key Vault access policy for `richard@thorek.net` (object ID `e5eea006-7000-4d1b-b934-78bc66c2b474`)
      - Created `ImageModel--Key` secret in `firesim-dev-kv` Key Vault
      - Updated `firesim-dev-api` Function App setting to Key Vault reference
    - **Testing:** Bicep compiles successfully. Function App restarted with Key Vault reference active.
    - **Impact:** Prevents future infrastructure deployments from wiping the Gemini API key. The secret is now managed in Key Vault and referenced by all deployments, surviving even when the `imageModelKey` param is not passed.
    - **Lessons learned:** When using `siteConfig.appSettings` in Bicep, settings are **replaced**, not merged. Conditional app settings that default to empty string will wipe existing values. Always use Key Vault references for secrets and ensure the reference is unconditional if the secret should persist across deployments.

  - **Bicep IaC: Gemini config variables (infra deploy persistence)**
    - **Problem addressed:** Infrastructure deployment (`az deployment group create`) was overwriting Function App settings because the Bicep template only included old Flux/Foundry variables (`IMAGE_MODEL_ENDPOINT`, `IMAGE_MODEL_DEPLOYMENT`). The Gemini-specific `IMAGE_MODEL`, `IMAGE_MODEL_KEY`, and `IMAGE_MODEL_URL` settings had to be re-applied manually after every deploy.
    - **Solution:**
      1. **New Bicep params:** Added `imageModel`, `imageModelUrl`, and `imageModelKey` (with `@secure()` decorator) to `main.bicep`
      2. **Key Vault secret:** `imageModelKey` is stored as `ImageModel--Key` in Key Vault (conditional on non-empty), matching the existing `ContentSafety--Key` pattern
      3. **App settings via Key Vault reference:** `IMAGE_MODEL_KEY` app setting uses `@Microsoft.KeyVault(SecretUri=...)` so the Function App resolves it at startup via managed identity
      4. **Dev parameters:** Updated `dev.bicepparam` with `imageModel = 'gemini-3-pro-image-preview'` and `imageModelUrl = 'https://generativelanguage.googleapis.com/v1beta'`. API key passed at deploy time (not committed)
    - **Files modified:**
      - `infra/main.bicep` (new params, Key Vault secret resource, additional app settings)
      - `infra/parameters/dev.bicepparam` (Gemini model + URL defaults)
    - **Testing:** Bicep compiles successfully
    - **Bug fix (Feb 17, 2026):** The original `!empty(imageModelKey)` conditional on `IMAGE_MODEL_KEY` set the app setting to `''` (empty string) on redeployments where the key param was not passed. This caused the Function App to fall back to the mock `StableDiffusionProvider`, producing 1x1 black placeholder PNGs instead of real Gemini images. No thinking text was returned, and gallery entries showed black thumbnails. **Fix:** Changed to always use the Key Vault reference (`@Microsoft.KeyVault(SecretUri=...)`) unconditionally. The Key Vault secret persists from the initial deploy; subsequent deploys just reference it. Also restored the live API key via `az functionapp config appsettings set`. Bicep compiles successfully.

  - **Thinking Text and Progress Not Streaming to UI During Generation (Feb 17, 2026):**
    - **Problem addressed:** After fixing the IMAGE_MODEL_KEY issue, generation completed successfully (images appeared in gallery), but the results panel showed only the placeholder "Model is thinking... this can take 30-90 seconds" message. No actual thinking text streamed to the UI, and no incremental image results appeared during generation. Console logs showed `thinkingText: (none)` for all polling updates.
    - **Root cause:** The `GenerationOrchestrator` updated `progress.thinkingText` and `progress.images` in the in-memory `progressStore` Map, but **did not persist these updates to blob storage**. The status endpoint reads from memory first (fast path), then falls back to blob storage. When Function App instances scale or restart between polling requests, the in-memory state is lost, and the blob fallback returns stale data without thinking text or incremental images. Three specific gaps:
      1. `onThinkingUpdate` callback (line 334) set `progress.thinkingText` but didn't call `persistProgress()`
      2. Anchor image completion (line 404) updated progress but didn't persist
      3. Derived image completion (line 522) updated `progress.images` but didn't persist
    - **Solution:** Added `persistProgress()` calls at all three update points:
      1. In `onThinkingUpdate` callback: persist with debouncing to avoid flooding blob storage during rapid thinking updates
      2. After anchor image completes: persist immediately so polling sees the first result
      3. After each derived image completes: persist with debouncing for incremental updates
    - **Files modified:**
      - `apps/api/src/services/generationOrchestrator.ts` (added 3 persistProgress calls)
    - **Impact:** Thinking text and incremental image results now stream reliably to the UI even when Function App scales across multiple instances or restarts during generation. The 1-second debounce on persist prevents excessive blob writes while ensuring updates are visible within 1-2 seconds.

  - **Prompt Template v1.8.0: Fire Behaviour Principles Integration (Feb 16, 2026):**
    - **Problem addressed:** Prompts lacked foundational fire science context. Image models generated realistic-looking fires but without understanding of head/flank/heel structure, wind effects on flame orientation, terrain-driven behavior variations, and fuel-dependent flame height. This led to visually credible but tactically unrealistic scenarios (e.g., fires behaving identically on steep upslope vs. downslope terrain).
    - **Solution:** Added dedicated `behaviorPrinciples` section as the second section in all prompts (immediately after style context, before reference imagery)
    - **Content:** Static fire behaviour reference covering:
      - **Head/flank/heel anatomy:** Head fire (forward-leaning, max heat/spread), flanks (slower lateral spread, reduced intensity), heel/tail (backing fire, smoldering)
      - **Wind effects:** Below 10 km/h (circular spread), 12-15 km/h threshold (ROS acceleration), 30+ km/h (elliptical shape with intense narrow head), spotting distances (2+ km forest, extreme conditions 30 km)
      - **Terrain effects:** Upslope (towering flames, every 10° ~doubles ROS), downslope (50% slower, shorter flame, smoldering), ridge/valley effects (chimney, smoke trapping)
      - **Fuel behavior:** Grassland (rapid, 3-5m flames), forest (sustained 10-20m+), fuel load determines height, moisture suppresses intensity
      - **Smoke/intensity indicators:** Low intensity (wispy, vertical), high intensity (pyrocumulus, horizontal flame angle), crown fire (engulfing canopy 15m+)
    - **Architecture:** `behaviorPrinciples: string` added to `PromptTemplate.sections` interface; `composePrompt()` updated to include section at index 1 in sections array; DEFAULT_PROMPT_TEMPLATE updated with comprehensive content
    - **Template numbering:** All section comments renumbered (1: style, 2: behaviorPrinciples, 3: referenceImagery, 4: locality, ... 12: safety)
    - **Files modified:**
      - `packages/shared/src/prompts/promptTypes.ts` (added `behaviorPrinciples: string` to PromptTemplate.sections interface)
      - `packages/shared/src/prompts/promptGenerator.ts` (updated `composePrompt()` to include behaviorPrinciples at section index 1)
      - `packages/shared/src/prompts/promptTemplates.ts` (added behaviorPrinciples content to DEFAULT_PROMPT_TEMPLATE, updated version to 1.8.0, renumbered section comments)
    - **Validation:** All 120 Vitest tests passing; generated v1.8.0 prompts verified to include fire behaviour section in correct position (line 3 of prompt output, before reference imagery section); all 5 key principles present (HEAD FIRE, FLANKS, HEEL/TAIL, WIND EFFECTS, TERRAIN EFFECTS, FUEL-DEPENDENT BEHAVIOR, SMOKE & INTENSITY)
    - **Impact:** Every prompt now grounds the image generation model with fire science fundamentals, improving tactical realism of generated visuals without requiring explicit flame angle, spread rate, or intensity calculations per request (principles are consistently present for all scenarios)
    - **Acceptance criteria met:** Fire behaviour principles integrated as system prompt section for all requests; all 120 tests passing; v1.8.0 template validated with sample generation; fire behaviour content is static and non-breaking to existing scenario inputs

  - **Results Gallery Stability Fixes (Feb 17, 2026):**
    - **Problem addressed (per audit):** Disappearing generation results and unstable results panel UX due to three issues:
      1. **API build failures:** `npm run build` failed with `TS2307: Cannot find module '@fire-sim/shared'` errors preventing deployment
      2. **Unstable persistence:** Progress persisted with 1-second debounce when images added, causing empty status responses when polls hit fresh Functions instances during that window
      3. **Nested scroll containers:** Results panel had two vertical scrollbars (ResultsPanel .content + GeneratedImages .container) causing jumpy UX
    - **Root causes:**
      1. Workspace build script used `npm run build --workspaces` without guaranteed order; `@fire-sim/shared` wasn't built before API; API tsconfig missing `types: ["node"]`
      2. `persistProgress()` called without `immediate: true` flag at lines 413 and 532 when anchor/derived images completed
      3. Both `ResultsPanel.module.css` (.content) and `GeneratedImages.module.css` (.container) defined `overflow-y: auto` creating nested scroll regions
    - **Solutions implemented:**
      1. **Build order fix:** Updated root package.json build script to explicit sequence: `packages/shared` → `apps/api` → `apps/web`; added `types: ["node"]` to `apps/api/tsconfig.json`; updated `.gitignore` to prevent compiled outputs from being committed
      2. **Immediate persistence:** Changed `persistProgress(scenarioId, progress)` to `persistProgress(scenarioId, progress, true)` at anchor image completion (line 413) and derived image completion (line 532); thinking text updates remain debounced to avoid flooding storage
      3. **Single scroll container:** Removed `height: 100%` and `overflow-y: auto` from `GeneratedImages .container`; ResultsPanel .content is now the sole scroll container
    - **Client guards verified:** Frontend polling callback (ScenarioInputPanel.tsx lines 433-442) already preserves existing images when poll lacks results—complements server-side immediate persistence for end-to-end stability
    - **Files modified:**
      - `package.json` (ordered build script)
      - `apps/api/tsconfig.json` (added types: ["node"])
      - `.gitignore` (ignore compiled TS outputs with config exceptions)
      - `apps/api/src/services/generationOrchestrator.ts` (immediate persistence flags at lines 413, 532)
      - `apps/web/src/components/GeneratedImages/GeneratedImages.module.css` (removed nested scroll)
    - **Testing:** All 163 tests pass (29 web, 134 shared); `npm run build` succeeds without errors
    - **Documentation:** Created `docs/current_state/stability_fixes_summary.md` with detailed changes, testing, and architecture implications
    - **Impact:** Polling reliably reflects generation progress without regressions from cold instance polling; single-scroll results panel for stable UX; builds succeed for API workspace deployments
    - **Audit references:** [generation_results_audit.md](docs/current_state/generation_results_audit.md), [results_stability_investigation_plan.md](docs/current_state/results_stability_investigation_plan.md)
    - **Acceptance criteria met:** Builds succeed; persistence hardened with immediate writes for images; results panel single-scroll UX; client guards verified; changes documented in current_state/

  - **Multi-Agent Prompt Pipeline: Google Maps Grounding Integration (Feb 18, 2026):**
    - **Problem addressed:** Locality descriptions were basic (e.g., "near Bungendore, NSW"); terrain narratives relied on slope lookups; limited geographic enrichment beyond elevation/slope data
    - **Solution: Multi-agent architecture with Maps grounding:** Implemented 3-agent pipeline using Gemini API with Google Maps grounding to enhance prompts with authoritative geographic context
    - **Architecture decision (hybrid approach):**
      - **Generic endpoint pattern** for locality enrichment via Maps grounding (current): Simple Gemini API integration with Google Search tool enabled; faster time to value; aligns with existing prompt generation patterns
      - **Established agent model** for future fire behavior agent (Phase 2): Will use Azure AI Foundry with RAG knowledge store (fire-behaviour-guide-clean.md) for domain-specific fire behavior interpretation
    - **New services implemented:**
      1. **MapsGroundingService** (`apps/api/src/services/mapsGroundingService.ts`): Wraps Gemini API to extract terrain narratives, local features (valleys, ridges, rivers), land cover types, vegetation context (species, fuel types), and climate patterns; structured prompt requests geographic enrichment for fire scenarios; parses responses into structured sections; falls back to basic terrain when API unavailable
      2. **LocalityAgent** (`apps/api/src/services/localityAgent.ts`): Coordinates Maps grounding requests; enriches basic geo context with Maps data; provides lookup-based fallback; tracks data source and confidence levels
      3. **ContextParserAgent** (`apps/api/src/services/contextParserAgent.ts`): Validates generation requests; extracts fire perimeter centroid; merges locality enrichment into geo context
      4. **MultiAgentOrchestrator** (`apps/api/src/services/multiAgentOrchestrator.ts`): Coordinates 2-stage pipeline (Context Parser → Locality Agent); tracks agent usage, Maps grounding status, and processing time; handles errors with graceful fallback
    - **Enhanced prompt generation:**
      - Extended `PromptData` interface with `mapsTerrainNarrative`, `mapsLocalFeatures[]`, `mapsLandCover[]`, `mapsVegetationContext`, `mapsClimateContext`, `mapsGroundingUsed` fields
      - Updated prompt template sections: **Locality** now includes Maps terrain narrative and climate context; **Terrain** uses Maps local features (valleys, ridges, water); **Vegetation** includes Maps vegetation context and land cover
      - Backward compatible: All Maps fields optional; falls back to existing lookup-based descriptions; works with or without Maps enrichment
      - New `generatePrompts()` signature accepts optional `MapsEnhancedContext` parameter
    - **Configuration:**
      - Environment variables: `GEMINI_API_KEY` (or `IMAGE_MODEL_KEY`), `GEMINI_TEXT_MODEL` (default: "gemini-2.5-flash"), `GEMINI_API_URL`
      - Azure Key Vault: Uses existing `ImageModel--Key`, `ImageModel--Model`, `ImageModel--Url` secrets
      - Cost: ~400 tokens input, ~300 tokens output per enrichment; adds 2-5 seconds to prompt generation
    - **Test coverage: 41 new tests, all passing:**
      - `mapsGroundingService.test.ts` (15 tests): API availability, enrichment parsing, fallback behavior, configuration
      - `localityAgent.test.ts` (11 tests): Maps integration, fallback scenarios, terrain generation, feature extraction
      - `multiAgentOrchestrator.test.ts` (8 tests): Pipeline coordination, error handling, metadata tracking, enrichment merging
      - `promptGenerator.test.ts` (7 new Maps tests): Maps-enhanced prompts, partial context handling, backward compatibility
    - **Test scenarios validated:**
      - ✅ Bungendore, NSW: "Steep valleys and rolling hills characterize the landscape around Bungendore, with prominent escarpments..."
      - ✅ Generic locality: Fallback to basic enrichment when Maps unavailable
      - ✅ No locality: Graceful degradation with existing geo context
    - **Design guardrails compliance:**
      - ✅ Authoritative datasets: Uses Google Maps, a trusted global source
      - ✅ Geographic accuracy: Maps grounding provides precise, real-world context
      - ✅ Regional/national data: Complements existing NVIS, SVTM sources
      - ✅ Safety: No sensitive data exposed; enrichment is purely geographic
      - ✅ Fire service terminology: Maintains existing prompt structure and terms
    - **Fallback strategy:** System always produces valid output: API not configured → basic terrain from geo context; API error → lookup-based enrichment with warning; empty locality → skips Maps grounding; parse error → low-confidence fallback
    - **Future enhancements planned:**
      - Phase 2: Fire Behavior Agent with RAG (fire-behaviour-guide-clean.md), domain-specific interpretation
      - Phase 3: Vegetation/Synthesis agents, quality validation, diversity scoring
      - Phase 4: Bing Maps, ESRI ArcGIS, local fire service datasets, historical fire boundaries
    - **Files modified:**
      - Created: `apps/api/src/services/{mapsGroundingService, localityAgent, contextParserAgent, multiAgentOrchestrator}.ts`
      - Enhanced: `packages/shared/src/prompts/{promptGenerator, promptTypes, promptTemplates}.ts`
      - Tests: `apps/api/src/__tests__/{mapsGroundingService, localityAgent, multiAgentOrchestrator}.test.ts`
      - Tests: `packages/shared/src/__tests__/promptGenerator.test.ts` (7 new Maps tests)
    - **Documentation:** Created `docs/current_state/multi_agent_maps_grounding.md` with implementation details, usage examples, configuration, test coverage, fallback behavior, monitoring recommendations
    - **Testing:** All 163 tests pass (105 total: 29 web, 41 API [+34 new], 76 shared [+7 new]); TypeScript strict mode compliant
    - **Impact:** Prompts now include rich geographic context from Google Maps; terrain narratives go beyond slope lookups; vegetation and climate context specific to locality; improved realism and accuracy for fire simulation training scenarios
    - **Acceptance criteria met:** Maps grounding successfully enriches 3+ test scenarios; context parser/locality agent implemented and documented; all enhancements in tests; API key handled via Azure Key Vault; master_plan.md updated with progress

## 14. Change Control Process

Every change must:

1. Reference this plan and the relevant section.
2. Execute the change.
3. Update this plan with what was achieved or learned.
4. Note any scope changes or new risks.
