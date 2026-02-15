# Authentication & Security Configuration Guide

This guide covers setting up Microsoft Entra External ID (CIAM) authentication, content safety, quotas, and audit logging for the Fire Simulation Inject Tool.

## Table of Contents

1. [Microsoft Entra External ID (CIAM) Setup](#microsoft-entra-external-id-ciam-setup)
2. [Azure Static Web App Authentication](#azure-static-web-app-authentication)
3. [Content Safety Configuration](#content-safety-configuration)
4. [Quota and Usage Tracking](#quota-and-usage-tracking)
5. [Audit Logging](#audit-logging)
6. [Development Mode](#development-mode)

## Microsoft Entra External ID (CIAM) Setup

### 1. Create Entra External ID Tenant

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Microsoft Entra ID** → **External Identities**
3. Click **Create new tenant** → Select **Customer (CIAM)** tenant type
4. Configure tenant:
   - Tenant name: `firesim-external` (or your preferred name)
   - Domain name: `firesim.onmicrosoft.com`
   - Region: Select appropriate region

### 2. Register Application

1. In your CIAM tenant, go to **App registrations** → **New registration**
2. Configure application:
   - Name: `Fire Simulation Inject Tool`
   - Supported account types: **Accounts in this organizational directory only**
   - Redirect URI: Select **Web** and enter your Static Web App URL
     - Example: `https://firesim-prod-web.azurestaticapps.net/.auth/login/aad/callback`

3. After registration, note:
   - **Application (client) ID**
   - **Directory (tenant) ID**

### 3. Configure Authentication

#### API Permissions

1. Go to **API permissions** → **Add a permission**
2. Select **Microsoft Graph**
3. Add permissions:
   - `User.Read` (Delegated) - Read user profile
   - `offline_access` (Delegated) - Maintain access to data

#### Authentication Settings

1. Go to **Authentication**
2. Under **Implicit grant and hybrid flows**:
   - ✅ ID tokens (used for implicit and hybrid flows)
3. Under **Advanced settings**:
   - Allow public client flows: **No**

### 4. Configure User Attributes

1. Go to **Token configuration** → **Add optional claim**
2. Select **ID** token type
3. Add claims:
   - `email`
   - `name`
   - `preferred_username`

### 5. Create Client Secret

1. Go to **Certificates & secrets** → **New client secret**
2. Description: `Fire Simulation API Access`
3. Expires: Select appropriate duration (12 or 24 months)
4. **Copy the secret value immediately** - store in Key Vault

### 6. Define Custom Roles

#### Option A: Using App Roles (Recommended)

1. Go to **App roles** → **Create app role**
2. Create **Admin** role:
   - Display name: `Admin`
   - Allowed member types: **Users/Groups**
   - Value: `admin`
   - Description: `Administrators with full access to settings, quotas, and analytics`
   - Enable this app role: **Yes**

3. Create **Trainer** role:
   - Display name: `Trainer`
   - Allowed member types: **Users/Groups**
   - Value: `trainer`
   - Description: `Trainers can create scenarios and generate images/videos`
   - Enable this app role: **Yes**

#### Option B: Using Custom User Attributes

1. Go to **User attributes** → **Add custom attribute**
2. Attribute name: `UserRole`
3. Data type: **String**
4. Values: `trainer`, `admin`

### 7. Configure Email-Based Sign-In (Passwordless)

1. Go to **User flows** → **New user flow**
2. Select **Sign up and sign in**
3. Configure:
   - Name: `B2C_1_signin_email`
   - Identity providers: **Email one-time passcode**
   - User attributes: Collect `Email`, `Display Name`
   - Application claims: Return `Email`, `Display Name`, `User's Object ID`, `Roles`

### 8. Assign Users and Roles

1. Go to **Enterprise applications** → Find your app
2. Go to **Users and groups** → **Add user/group**
3. Assign users:
   - Select user
   - Select role (Admin or Trainer)
   - Click **Assign**

## Azure Static Web App Authentication

### 1. Configure Built-In Authentication

Azure Static Web Apps has built-in authentication that integrates with Entra ID.

1. Go to your Static Web App in Azure Portal
2. Navigate to **Configuration** → **Authentication providers**
3. Add **Azure Active Directory** provider:
   - Client ID: `<Your App Client ID>`
   - Client Secret Reference: `@Microsoft.KeyVault(SecretUri=<Your Key Vault Secret URI>)`
   - Tenant ID: `<Your CIAM Tenant ID>`

### 2. Configure staticwebapp.config.json

Create or update `apps/web/public/staticwebapp.config.json`:

```json
{
  "auth": {
    "identityProviders": {
      "azureActiveDirectory": {
        "registration": {
          "openIdIssuer": "https://login.microsoftonline.com/<TENANT_ID>/v2.0",
          "clientIdSettingName": "AAD_CLIENT_ID",
          "clientSecretSettingName": "AAD_CLIENT_SECRET"
        },
        "login": {
          "loginParameters": ["scope=openid profile email offline_access"]
        }
      }
    }
  },
  "routes": [
    {
      "route": "/.auth/login/aad",
      "allowedRoles": ["anonymous"]
    },
    {
      "route": "/api/*",
      "allowedRoles": ["authenticated"]
    },
    {
      "route": "/*",
      "allowedRoles": ["authenticated"]
    }
  ],
  "responseOverrides": {
    "401": {
      "redirect": "/.auth/login/aad",
      "statusCode": 302
    }
  },
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/api/*", "/.auth/*", "/assets/*"]
  }
}
```

### 3. Store Secrets in Key Vault

```bash
# Set client ID
az keyvault secret set \
  --vault-name <your-keyvault-name> \
  --name AAD-CLIENT-ID \
  --value <your-client-id>

# Set client secret
az keyvault secret set \
  --vault-name <your-keyvault-name> \
  --name AAD-CLIENT-SECRET \
  --value <your-client-secret>
```

## Content Safety Configuration

### 1. Provision Azure AI Content Safety

The Content Safety resource is created by the Bicep deployment. Ensure it's deployed:

```bash
cd infra
./deploy.sh dev
```

### 2. Configure Thresholds

Content safety thresholds are tuned for fire scenarios:

- **Violence**: 0.7 (Higher threshold - fire scenes are inherently violent)
- **Hate**: 0.3 (Standard threshold)
- **Self-Harm**: 0.3 (Standard threshold)
- **Sexual**: 0.3 (Standard threshold)

These can be adjusted via the admin settings page.

### 3. Credentials

Credentials are automatically stored in Key Vault during deployment:

- `ContentSafety--Endpoint`
- `ContentSafety--Key`

## Quota and Usage Tracking

### 1. Azure Table Storage

Quotas are tracked in Azure Table Storage. The table is created automatically on first use.

### 2. Default Quotas

| Role    | Scenarios/Day | Images/Day | Videos/Day |
| ------- | ------------- | ---------- | ---------- |
| Trainer | 20            | 100        | 5          |
| Admin   | Unlimited     | Unlimited  | Unlimited  |

### 3. Quota Reset

Quotas reset daily at **midnight AEST (UTC+11)**.

### 4. Cost Estimation

Usage cost is estimated based on:

- Scenario generation: $0.01
- Image generation (DALL-E 3): $0.04 per image
- Video generation: $0.10 per video

## Audit Logging

### 1. Application Insights

All user actions are logged to Application Insights with:

- User ID and email
- Authentication method
- Action type
- Resource ID
- Timestamp
- Result (success/failure)

### 2. Logged Actions

- `user.login` - User signs in
- `user.logout` - User signs out
- `scenario.created` - Scenario created
- `scenario.deleted` - Scenario deleted
- `image.generated` - Image generated
- `video.generated` - Video generated
- `content_safety.triggered` - Content flagged
- `quota.exceeded` - Quota limit reached
- `settings.updated` - Settings changed

### 3. Query Logs

Admins can query logs via the Settings page or directly in Application Insights:

```kusto
customEvents
| where name == "AuditLog"
| extend userId = tostring(customDimensions.userId),
         action = tostring(customDimensions.action),
         result = tostring(customDimensions.result)
| where timestamp > ago(7d)
| order by timestamp desc
```

## Development Mode

### 1. Mock Authentication

For local development, authentication can be disabled:

```typescript
// apps/api/src/index.ts
import { initializeAuth } from './middleware/auth.js';

initializeAuth({
  enabled: false, // Disable for dev
  mockUser: {
    id: 'dev-user-123',
    email: 'trainer@example.com',
    name: 'Development Trainer',
    roles: ['trainer'],
    authMethod: 'email',
  },
});
```

### 2. Environment Variables

Create `.env` file:

```bash
# Authentication (optional for dev)
AAD_CLIENT_ID=<your-client-id>
AAD_TENANT_ID=<your-tenant-id>

# Content Safety (optional - will skip checks if not provided)
CONTENT_SAFETY_ENDPOINT=<your-endpoint>
CONTENT_SAFETY_KEY=<your-key>

# Storage (optional - quotas disabled if not provided)
STORAGE_ACCOUNT_NAME=<your-storage-account>
STORAGE_ACCOUNT_KEY=<your-key>

# Application Insights (optional - logs to console if not provided)
APPLICATIONINSIGHTS_CONNECTION_STRING=<your-connection-string>
```

### 3. Testing with Real Auth

To test with real authentication locally:

1. Run the Static Web App CLI:

   ```bash
   npm install -g @azure/static-web-apps-cli
   swa start apps/web/dist --api-location apps/api
   ```

2. Configure authentication in `swa-cli.config.json`

## Security Best Practices

1. **Never commit secrets** - Use Key Vault for all credentials
2. **Use managed identities** - Prefer managed identities over keys where possible
3. **Rotate secrets regularly** - Set expiration on client secrets
4. **Monitor audit logs** - Review suspicious activity regularly
5. **Test RBAC** - Verify permissions are enforced correctly
6. **Validate tokens** - Always validate bearer tokens on API calls
7. **Limit quota** - Set appropriate daily limits to control costs
8. **Content safety** - Tune thresholds for your use case

## Troubleshooting

### Authentication Issues

1. **401 Unauthorized**:
   - Check token is being sent in Authorization header
   - Verify token hasn't expired
   - Check tenant ID and client ID match

2. **403 Forbidden**:
   - Verify user has been assigned correct role
   - Check app roles are configured in manifest
   - Ensure role claims are returned in token

### Content Safety Issues

1. **All images flagged**:
   - Check violence threshold (should be ~0.7 for fire scenes)
   - Review Content Safety service health
   - Verify API key is correct

### Quota Issues

1. **Quota not tracking**:
   - Verify Table Storage credentials
   - Check table exists and is accessible
   - Review quota service logs

For additional support, see:

- [Azure Static Web Apps Authentication](https://learn.microsoft.com/en-us/azure/static-web-apps/authentication-authorization)
- [Microsoft Entra External ID Documentation](https://learn.microsoft.com/en-us/entra/external-id/)
- [Azure AI Content Safety](https://learn.microsoft.com/en-us/azure/ai-services/content-safety/)
