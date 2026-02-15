# Issue 9 Implementation Summary: Authentication, RBAC, Content Safety & Quotas

## Status: IN PROGRESS

This document summarizes the implementation of external authentication, role-based access control, content safety checks, usage quotas, and audit logging for the Fire Simulation Inject Tool.

## Completed Work

### 1. Core Types & Infrastructure (✅ COMPLETE)

#### Shared Types Package
- **User & Authentication Types** (`packages/shared/src/types.ts`):
  - `UserRole`: 'trainer' | 'admin'
  - `User`: User identity with roles and auth method
  - `AuthState`: Authentication state and token info
  
- **Quota Types**:
  - `QuotaConfig`: Daily limits per role
  - `UsageTracking`: Current usage counters
  - `QuotaStatus`: Limits, usage, and remaining quota
  
- **Content Safety Types**:
  - `ContentSafetyResult`: Safety check results with category scores
  - `ContentSafetyConfig`: Configurable safety thresholds
  
- **Audit Logging Types**:
  - `AuditAction`: All logged action types
  - `AuditLogEntry`: Structured log entry with user identity

#### Infrastructure (Bicep)
- **Application Insights Module** (`infra/modules/applicationInsights.bicep`):
  - Log Analytics workspace
  - Application Insights resource
  - 90-day retention (dev) / 365-day retention (prod)
  
- **Content Safety Module** (`infra/modules/contentSafety.bicep`):
  - Azure AI Content Safety resource
  - S0 (standard) SKU
  - Endpoint and API key outputs
  
- **Main Template Updates** (`infra/main.bicep`):
  - Integrated Application Insights and Content Safety modules
  - Stored credentials in Key Vault
  - Added Application Insights connection string to Static Web App settings
  - Updated parameter files for dev and prod environments

### 2. API Services (✅ COMPLETE)

#### Audit Logging Service (`apps/api/src/services/auditLog.ts`)
- Application Insights telemetry integration
- Structured event logging with custom properties
- User identity tracking (userId, email, auth method)
- Action result tracking (success/failure)
- Console fallback for development
- Functions:
  - `initializeAuditLogging()`: Initialize with connection string
  - `logAuditEvent()`: Log user action with context
  - `queryAuditLogs()`: Query recent logs (admin only)
  - `shutdownAuditLogging()`: Flush and close connection

#### Quota Service (`apps/api/src/services/quotaService.ts`)
- Azure Table Storage integration for usage tracking
- Per-user, per-day quota tracking (AEST timezone)
- Default quotas by role:
  - Trainer: 20 scenarios, 100 images, 5 videos per day
  - Admin: Unlimited
- Functions:
  - `initializeQuotaService()`: Initialize with storage credentials
  - `getUserUsage()`: Get current day's usage
  - `getQuotaStatus()`: Get limits, usage, and remaining quota
  - `incrementUsage()`: Update usage counters
  - `checkQuotaExceeded()`: Check if user has exceeded limits

#### Content Safety Service (`apps/api/src/services/contentSafety.ts`)
- Azure AI Content Safety client integration
- Text and image safety checking
- Tuned thresholds for fire scenarios:
  - Violence: 0.7 (higher for legitimate fire imagery)
  - Hate/Self-Harm/Sexual: 0.3 (standard)
- Fail-open strategy (allows content if service unavailable)
- Functions:
  - `initializeContentSafety()`: Initialize with endpoint and key
  - `checkTextSafety()`: Check prompts for safety issues
  - `checkImageSafety()`: Check generated images
  - `updateContentSafetyConfig()`: Update thresholds (admin)
  - `getContentSafetyConfig()`: Get current configuration

### 3. Authentication & Authorization Middleware (✅ COMPLETE)

#### Auth Middleware (`apps/api/src/middleware/auth.ts`)
- JWT bearer token validation
- Azure Static Web Apps Easy Auth integration
- X-MS-CLIENT-PRINCIPAL header parsing
- Role extraction from claims
- Mock user support for development
- Functions:
  - `initializeAuth()`: Configure auth mode and secrets
  - `authenticateRequest()`: Extract and validate user from request
  - `withAuth()`: HOF wrapper for authenticated handlers
  - `createUnauthorizedResponse()`: Generate 401 response

#### RBAC Middleware (`apps/api/src/middleware/rbac.ts`)
- Role-based permission checks
- Pre-defined permission functions
- Functions:
  - `hasRole()`, `hasAnyRole()`, `hasAllRoles()`: Role checks
  - `isAdmin()`, `isTrainer()`: Convenience checks
  - `requireRole()`, `requireAnyRole()`, `requireAdmin()`: Enforce permissions
  - `Permissions`: Object with permission functions for all actions
  - `checkPermission()`: Generic permission check
  - `createForbiddenResponse()`: Generate 403 response

### 4. Documentation (✅ COMPLETE)

#### Authentication Setup Guide (`docs/AUTHENTICATION_SETUP.md`)
- Step-by-step CIAM tenant setup
- App registration configuration
- Role assignment procedures
- Static Web App auth configuration
- Content Safety setup
- Quota configuration
- Audit logging queries
- Development mode setup
- Security best practices
- Troubleshooting guide

## Remaining Work

### 1. API Function Updates (⏳ IN PROGRESS)

#### Apply Auth Middleware to Existing Functions
- [ ] `generateScenario.ts`: Add auth, RBAC, quota check, audit log
- [ ] `getGenerationStatus.ts`: Add auth and audit log
- [ ] `getGenerationResults.ts`: Add auth and audit log
- [ ] `geodata.ts`: Add auth (open to all authenticated users)
- [ ] `prompts.ts`: Add auth (open to all authenticated users)
- [ ] `healthCheck.ts`: Keep anonymous (monitoring)

#### New Admin Endpoints
- [ ] `GET /api/settings/quotas`: Get quota configuration (admin only)
- [ ] `POST /api/settings/quotas`: Update quota limits (admin only)
- [ ] `GET /api/settings/content-safety`: Get content safety config (admin only)
- [ ] `POST /api/settings/content-safety`: Update safety thresholds (admin only)
- [ ] `GET /api/settings/usage`: Get usage summary for all users (admin only)
- [ ] `GET /api/settings/audit-logs`: Query recent audit logs (admin only)
- [ ] `GET /api/user/quota`: Get current user's quota status (authenticated)

### 2. Content Safety Integration (⏳ IN PROGRESS)

#### Prompt Safety
- [ ] Check prompts before sending to AI model
- [ ] Log flagged prompts with user info
- [ ] Return error if prompt fails safety check

#### Image Safety
- [ ] Check generated images before storage/display
- [ ] Replace flagged images with placeholder
- [ ] Log flagged images (hash, categories, user)
- [ ] Allow regeneration of flagged viewpoints

#### Configuration
- [ ] Admin UI for adjusting thresholds
- [ ] Per-category enable/disable toggles
- [ ] Strictness level presets (low/medium/high)

### 3. Frontend Authentication (🔜 NOT STARTED)

#### MSAL Integration
- [ ] Install `@azure/msal-browser` package
- [ ] Create MSAL configuration
- [ ] Create auth context provider
- [ ] Create auth hooks (`useAuth`, `useUser`, `useIsAuthenticated`)
- [ ] Handle token acquisition and refresh
- [ ] Handle login/logout flows

#### App Store Updates
- [ ] Add user state to Zustand store
- [ ] Add quota state to store
- [ ] Create actions for updating auth state
- [ ] Persist auth state to session storage

#### API Client Updates
- [ ] Add bearer token to all API requests
- [ ] Handle 401 (redirect to login)
- [ ] Handle 403 (show permission error)
- [ ] Handle 429 (show quota exceeded message)

### 4. Frontend UI Updates (🔜 NOT STARTED)

#### Header Component
- [ ] Display user name and email
- [ ] Display authentication method (email/SSO)
- [ ] Display user role (admin/trainer)
- [ ] Add sign-out button
- [ ] Show quota status indicator
- [ ] Show remaining quota on hover

#### Settings Page (Admin Only)
- [ ] Create `/settings` route
- [ ] Quota configuration panel
- [ ] Content safety configuration panel
- [ ] Usage analytics dashboard
- [ ] Audit log viewer
- [ ] User role-based rendering (hide from trainers)

#### Quota Display
- [ ] Add quota status bar to header or sidebar
- [ ] Show scenarios/images/videos remaining
- [ ] Show reset time (midnight AEST)
- [ ] Disable "Generate" button when quota exceeded
- [ ] Show quota exceeded modal with reset info

#### Error Handling
- [ ] 401: Redirect to login
- [ ] 403: Show "Permission denied" modal
- [ ] 429: Show "Quota exceeded" modal with reset time
- [ ] Content safety flagged: Show placeholder with regenerate option

### 5. Static Web App Configuration (🔜 NOT STARTED)

#### staticwebapp.config.json
- [ ] Create or update configuration file
- [ ] Configure Azure AD as identity provider
- [ ] Set route authentication rules
- [ ] Configure 401 redirect
- [ ] Add navigation fallback for SPA routing

#### Deployment Updates
- [ ] Update deployment workflow with auth settings
- [ ] Store client ID and secret in GitHub secrets
- [ ] Configure Key Vault references in Static Web App

### 6. Service Initialization (⏳ IN PROGRESS)

#### API Index File
- [ ] Initialize audit logging on startup
- [ ] Initialize quota service on startup
- [ ] Initialize content safety on startup
- [ ] Initialize auth middleware on startup
- [ ] Load configuration from Key Vault and environment
- [ ] Add graceful shutdown handlers

### 7. Testing (🔜 NOT STARTED)

#### Unit Tests
- [ ] Auth middleware tests (mock tokens)
- [ ] RBAC middleware tests (permission checks)
- [ ] Quota service tests (usage tracking)
- [ ] Content safety service tests (mocked API)
- [ ] Audit logging tests (event structure)

#### Integration Tests
- [ ] End-to-end auth flow
- [ ] Quota enforcement (create scenarios until limit)
- [ ] Content safety (flagged prompts/images)
- [ ] Audit log entries (verify all actions logged)
- [ ] Admin vs trainer permission differences

#### Manual Testing
- [ ] Login with external user
- [ ] Create scenarios (track quota)
- [ ] Generate images (check content safety)
- [ ] Access settings page (admin vs trainer)
- [ ] View audit logs
- [ ] Exceed quota (verify 429 response)
- [ ] Flagged content (verify placeholder display)

### 8. Documentation Updates (⏳ IN PROGRESS)

- [ ] Update README with authentication setup steps
- [ ] Update infra README with CIAM instructions
- [ ] Create developer guide for testing with auth
- [ ] Document admin workflows
- [ ] Update master plan progress tracking

## Key Implementation Notes

### Authentication Flow

1. User visits app → Redirected to CIAM login
2. User authenticates → CIAM issues JWT token
3. Static Web App validates token → Sets `X-MS-CLIENT-PRINCIPAL` header
4. API functions read principal → Extract user and roles
5. Middleware checks permissions → Allow or deny action

### Quota Enforcement

1. User creates scenario → Check current usage
2. If within limits → Allow, increment counter
3. If exceeded → Return 429 with reset time
4. Quota resets daily at midnight AEST

### Content Safety

1. Prompt generated → Check text safety
2. If unsafe → Log and return error
3. If safe → Send to AI model
4. Image generated → Check image safety
5. If unsafe → Replace with placeholder, log, allow regeneration
6. If safe → Store and display

### RBAC Rules

**Trainer Role:**
- Create scenarios
- Generate images/videos
- View own scenarios in gallery
- Download outputs
- View remaining quota

**Admin Role:**
- All trainer permissions
- View all users' scenarios
- Delete any scenario
- Access settings page
- View usage analytics
- Manage quotas
- View audit logs
- Update content safety config

## Dependencies

- Issue 2: Infrastructure deployment (partially complete - needs CIAM setup)
- Issue 3: Frontend shell and navigation (complete)
- Issue 7: Prompt generation (complete)
- Issue 8: Image generation pipeline (needs content safety integration)

## Estimated Remaining Work

- API updates and admin endpoints: 4-6 hours
- Content safety integration: 3-4 hours
- Frontend authentication (MSAL): 4-6 hours
- Frontend UI updates: 6-8 hours
- Static Web App config: 1-2 hours
- Testing and validation: 4-6 hours
- **Total**: 22-32 hours

## Blockers & Risks

1. **CIAM Tenant Creation**: Requires Azure subscription with appropriate permissions
2. **Static Web App Auth**: Requires Standard SKU (not Free tier)
3. **Content Safety Availability**: Service may not be available in all regions
4. **Testing External Auth Locally**: Requires Static Web App CLI and configuration
5. **Token Validation**: Need to test with real Entra ID tokens

## Next Steps (Priority Order)

1. Update existing API functions with auth middleware
2. Create new admin endpoints
3. Integrate content safety into image generation pipeline
4. Add frontend MSAL authentication
5. Update UI components (Header, Settings page)
6. Configure Static Web App authentication
7. Test end-to-end authentication flow
8. Run security scan and code review

## Related Documents

- [Authentication Setup Guide](./AUTHENTICATION_SETUP.md)
- [Master Plan](./master_plan.md) - Section 4 (Security and compliance)
- [Issue #58](https://github.com/richardthorek/fire-sim-images/issues/58)
- [PR #59](https://github.com/richardthorek/fire-sim-images/pull/59)
