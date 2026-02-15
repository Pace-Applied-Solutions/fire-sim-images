# Admin Guide: Fire Simulation Inject Tool

This guide covers system administration, user management, deployment, monitoring, and troubleshooting for the Fire Simulation Inject Tool.

## Table of Contents

- [System Overview](#system-overview)
- [User Management](#user-management)
- [Usage Quotas and Cost Management](#usage-quotas-and-cost-management)
- [Monitoring System Health](#monitoring-system-health)
- [Deployment and Updates](#deployment-and-updates)
- [Configuration Management](#configuration-management)
- [Troubleshooting](#troubleshooting)
- [Security and Compliance](#security-and-compliance)

## System Overview

### Architecture Components

The Fire Simulation Inject Tool consists of:

1. **Azure Static Web App**
   - Hosts the React front-end
   - Embedded Azure Functions API at `/api`
   - CDN-distributed for global performance

2. **Azure Functions API**
   - Handles generation requests
   - Orchestrates geospatial lookups
   - Manages AI model integration
   - Provides health and admin endpoints

3. **Azure Blob Storage**
   - Stores generated images, videos, and scenarios
   - Three containers: `images`, `videos`, `scenarios`
   - Lifecycle management for old content

4. **Azure Key Vault**
   - Manages API keys (Mapbox, Azure OpenAI)
   - Stores connection strings and secrets
   - Accessed via managed identities

5. **Azure OpenAI Service**
   - DALL-E 3 model for image generation
   - Region-specific deployment
   - Quota and rate limit management

6. **Application Insights**
   - Telemetry and performance monitoring
   - Error tracking and diagnostics
   - Usage analytics

### Resource Naming Convention

Resources follow the pattern: `firesim-{env}-{resource-type}-{suffix}`

Example:
- `firesim-prod-swa-eastaus` (Static Web App)
- `firesim-prod-func-eastaus` (Function App)
- `firesim-prod-storage-eastaus` (Storage Account)
- `firesim-prod-kv-eastaus` (Key Vault)

## User Management

### Adding Users

The system uses Azure AD authentication. To add new users:

**Option 1: Azure Portal**
1. Navigate to **Azure Portal** > **Azure Active Directory**
2. Go to **Enterprise Applications**
3. Find the Fire Simulation Inject Tool app registration
4. Click **Users and groups**
5. Click **Add user/group**
6. Search for the user by name or email
7. Assign the appropriate role:
   - **Trainer** — Can create and manage scenarios
   - **Admin** — Full system access including usage reports
8. Click **Assign**

**Option 2: Azure CLI**
```bash
# Add user to the application
az ad app permission grant \
  --id <app-id> \
  --api <api-id> \
  --scope User.Read

# Assign role to user
az role assignment create \
  --assignee <user-email> \
  --role "Trainer" \
  --scope "/subscriptions/<subscription-id>/resourceGroups/<rg-name>"
```

### Removing Users

**Azure Portal:**
1. Navigate to **Enterprise Applications** > Fire Simulation Inject Tool
2. Click **Users and groups**
3. Select the user
4. Click **Remove**

**Azure CLI:**
```bash
az role assignment delete \
  --assignee <user-email> \
  --role "Trainer" \
  --scope "/subscriptions/<subscription-id>/resourceGroups/<rg-name>"
```

### Role Definitions

| Role | Permissions |
|------|-------------|
| **Trainer** | Create scenarios, view own scenarios, generate images/videos, access Gallery |
| **Admin** | All Trainer permissions + user management, usage reports, system configuration, cost monitoring |

### User Provisioning Best Practices

- Use Azure AD groups for bulk user management
- Assign roles at the group level, not individual level
- Use Conditional Access policies for additional security (MFA, IP restrictions)
- Regularly audit user access (quarterly review recommended)
- Remove access immediately when staff leave

## Usage Quotas and Cost Management

### Understanding Costs

Main cost drivers:
1. **Azure OpenAI API calls** — $0.04-0.08 per image (DALL-E 3)
2. **Storage** — ~$0.02/GB/month for images and videos
3. **Compute** — Azure Functions consumption plan (~$0.20/million executions)
4. **Bandwidth** — Egress charges for downloads
5. **Mapbox** — Free tier: 50,000 map loads/month, then $5/1000 loads

**Estimated cost per scenario:**
- 10-12 image perspectives: ~$0.50-1.00
- Video generation: ~$0.10-0.20
- Storage and compute: ~$0.05
- **Total: $0.65-1.25 per complete scenario**

### Setting Usage Quotas

**Per-user quota (recommended):**
- Trainers: 50-100 scenarios per month
- Admins: 200 scenarios per month

**Implementation:**
Quotas are managed via Azure API Management or custom middleware in the Functions API.

**To adjust quotas:**
1. Edit `apps/api/src/middleware/quotaCheck.ts`
2. Update `MAX_SCENARIOS_PER_USER_PER_MONTH` constant
3. Deploy updated API (see [Deployment](#deployment-and-updates))

**To check current usage:**
```bash
# Via API endpoint (requires admin token)
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://your-api-url/api/admin/usage-summary
```

Response includes:
- Total scenarios generated
- Cost estimates
- Per-user breakdown
- Quota utilization

### Cost Alerts

**Set up Azure Cost Management alerts:**
1. Navigate to **Azure Portal** > **Cost Management + Billing**
2. Click **Cost alerts** > **Add**
3. Configure threshold (e.g., $500/month)
4. Add email recipients (admins)
5. Save alert

**Recommended thresholds:**
- Dev environment: $100/month
- Staging environment: $250/month
- Production environment: $1000/month (adjust based on user count)

### Reducing Costs

**Strategies:**
1. **Limit perspectives**: Reduce default views from 12 to 6 most-used
2. **Cache results**: Store common scenarios for reuse
3. **Lifecycle policies**: Auto-delete scenarios older than 90 days
4. **Batch generation**: Group requests to reduce overhead
5. **Model selection**: Use standard resolution instead of HD when acceptable

**Storage lifecycle policy (already configured):**
- Move to cool tier after 30 days
- Delete scenarios after 90 days (configurable in Bicep parameters)

## Monitoring System Health

### Application Insights Dashboard

Access at: **Azure Portal** > **Application Insights** > `firesim-{env}-appinsights`

**Key metrics to monitor:**

| Metric | Healthy Range | Action if Outside Range |
|--------|---------------|-------------------------|
| API Response Time | <2 seconds | Investigate slow endpoints |
| Error Rate | <1% | Check logs for errors |
| Generation Success Rate | >95% | Review failed generations |
| Active Users | Track trend | Capacity planning |
| Storage Usage | Track trend | Clean up old scenarios |

### Health Check Endpoint

The API provides a health check endpoint: `/api/health`

**Manual check:**
```bash
curl https://your-api-url/api/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-15T07:30:00Z",
  "checks": {
    "storage": "healthy",
    "keyVault": "healthy",
    "openai": "healthy"
  }
}
```

**Automated monitoring:**
Set up Azure Application Insights Availability Test:
1. Go to **Application Insights** > **Availability**
2. Click **Add Standard test**
3. Configure:
   - URL: `https://your-api-url/api/health`
   - Test frequency: 5 minutes
   - Alert threshold: 2 failures in 5 minutes
4. Add notification email

### Log Analysis

**View logs in Application Insights:**
1. Navigate to **Application Insights** > **Logs**
2. Run KQL queries:

```kusto
// Recent errors
traces
| where severityLevel >= 3
| where timestamp > ago(1h)
| order by timestamp desc
| take 50

// Failed generation requests
requests
| where name contains "generate"
| where success == false
| where timestamp > ago(24h)
| project timestamp, name, resultCode, duration, customDimensions

// Usage by user
customEvents
| where name == "ScenarioGenerated"
| where timestamp > ago(7d)
| summarize count() by tostring(customDimensions.userId)
| order by count_ desc
```

### Performance Monitoring

**Key performance indicators:**
- **P50/P95/P99 latency**: Generation should complete in <5 minutes (P95)
- **Success rate**: >95% of generations should succeed
- **Queue depth**: Monitor for backlog during peak hours
- **Throttling events**: Track rate limit hits on Azure OpenAI

**Configure alerts:**
1. Go to **Application Insights** > **Alerts**
2. Create alert rules for:
   - Response time >10 seconds
   - Error rate >5%
   - Failed dependency calls (OpenAI, Storage)

## Deployment and Updates

### Deployment Workflows

The system uses GitHub Actions for CI/CD:

1. **CI Pipeline** (`.github/workflows/ci.yml`)
   - Runs on every push/PR
   - Lints, type-checks, and tests code
   - Fails if any check fails

2. **Deploy Web** (`.github/workflows/deploy-web.yml`)
   - Deploys front-end on merge to `main`
   - Builds and uploads to Azure Static Web Apps
   - Automatic for staging, manual approval for production

3. **Deploy API** (`.github/workflows/deploy-api.yml`)
   - Deploys Azure Functions on merge to `main`
   - Runs smoke test after deployment
   - Automatic for staging, manual approval for production

4. **Deploy Infrastructure** (`.github/workflows/deploy-infra.yml`)
   - Manual trigger only
   - Validates Bicep templates
   - Deploys Azure resources
   - Requires approval for production

### Deploying a Hotfix

1. Create a hotfix branch from `main`:
   ```bash
   git checkout main
   git pull
   git checkout -b hotfix/fix-description
   ```

2. Make your changes and commit:
   ```bash
   git add .
   git commit -m "Fix: description of fix"
   ```

3. Push and create PR:
   ```bash
   git push origin hotfix/fix-description
   ```

4. Wait for CI to pass, then merge to `main`

5. Monitor deployment via GitHub Actions tab

6. Verify fix in production:
   ```bash
   curl https://your-production-url/api/health
   ```

### Rolling Back a Deployment

**Web App (Static Web Apps):**
1. Go to **Azure Portal** > **Static Web Apps** > Your app
2. Click **Deployments** under Settings
3. Find the previous working deployment
4. Click **Activate** to roll back

**API (Azure Functions):**
1. Go to **Azure Portal** > **Function App** > Your app
2. Click **Deployment slots** > **Swap**
3. Or re-deploy previous version from GitHub Actions:
   - Go to **Actions** tab
   - Find the last working deployment run
   - Click **Re-run all jobs**

**Infrastructure:**
- Infrastructure changes should be tested in dev first
- Use `validateOnly: true` parameter to validate before deploying
- Keep previous Bicep templates in version control for rollback

### Deployment Best Practices

- ✅ Test in dev environment first
- ✅ Deploy to staging and validate before production
- ✅ Deploy during low-usage periods (evenings/weekends)
- ✅ Monitor logs for 30 minutes after deployment
- ✅ Have rollback plan ready
- ✅ Communicate maintenance windows to users
- ❌ Never deploy breaking changes without migration plan
- ❌ Never deploy directly to production without testing

## Configuration Management

### Environment Variables

**Required secrets in GitHub:**

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `AZURE_CREDENTIALS` | Service principal JSON | `{"clientId": "...", ...}` |
| `AZURE_RESOURCE_GROUP` | Resource group name | `firesim-prod-rg` |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID | `12345678-...` |
| `VITE_MAPBOX_TOKEN` | Mapbox API token | `pk.eyJ1...` |
| `VITE_API_BASE_URL` | API base URL | `https://your-api-url` |
| `VITE_APPINSIGHTS_CONNECTION_STRING` | Application Insights connection | `InstrumentationKey=...` |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | SWA deployment token | Auto-generated |
| `AZURE_FUNCTION_APP_NAME` | Function app name | `firesim-prod-func` |
| `AZURE_FUNCTION_APP_URL` | Function app URL | `https://your-api-url` |

**To add/update secrets:**
1. Go to **GitHub repository** > **Settings** > **Secrets and variables** > **Actions**
2. Click **New repository secret**
3. Enter name and value
4. Click **Add secret**

**Environment-specific secrets:**
- Use GitHub Environments (dev, staging, production)
- Each environment has its own secret values
- Configure protection rules for production

### Key Vault Management

**To add a new secret to Key Vault:**
```bash
az keyvault secret set \
  --vault-name firesim-prod-kv-eastaus \
  --name "OpenAIApiKey" \
  --value "sk-..."
```

**To rotate secrets:**
1. Generate new secret in source system (e.g., Azure OpenAI)
2. Add new secret to Key Vault with version suffix
3. Update application configuration to use new secret
4. Deploy updated configuration
5. Verify application uses new secret
6. Delete old secret after 24 hours

**Access policies:**
- Managed identity has `Get` and `List` permissions
- Admin service principal has `Get`, `List`, `Set`, `Delete`
- Never grant `purge` permission in production

## Troubleshooting

### Common Issues

#### Issue: Users can't sign in

**Symptoms:** Login page appears but authentication fails

**Diagnosis:**
1. Check Azure AD app registration is configured correctly
2. Verify redirect URIs include your app URL
3. Check user has been assigned to the application

**Resolution:**
1. Go to **Azure AD** > **App registrations** > Your app
2. Check **Authentication** > **Redirect URIs**
3. Ensure user is assigned in **Enterprise applications**

#### Issue: Map doesn't load

**Symptoms:** Grey screen where map should be, or error overlay

**Diagnosis:**
1. Check browser console for errors (F12)
2. Verify Mapbox token is configured
3. Check token hasn't exceeded free tier limits

**Resolution:**
1. Verify `VITE_MAPBOX_TOKEN` is set in environment
2. Check token at https://account.mapbox.com/
3. Generate new token if needed
4. Update GitHub secret and redeploy

#### Issue: Image generation fails

**Symptoms:** "Generation failed" error, or request times out

**Diagnosis:**
1. Check Application Insights for error logs
2. Verify Azure OpenAI service is running
3. Check quota limits haven't been exceeded
4. Verify Key Vault secrets are accessible

**Resolution:**
1. Review error logs in Application Insights:
   ```kusto
   traces | where message contains "generation" and severityLevel >= 3
   ```
2. Check Azure OpenAI quota in Azure Portal
3. Verify managed identity has Key Vault access
4. Test health endpoint: `/api/health`

#### Issue: Slow performance

**Symptoms:** Long wait times, timeouts

**Diagnosis:**
1. Check Application Insights performance metrics
2. Monitor Azure OpenAI throttling
3. Check Function App scaling

**Resolution:**
1. Review API response times in Application Insights
2. Increase Azure OpenAI quota if throttled
3. Enable Function App premium plan for faster cold starts
4. Add caching for common geospatial lookups

#### Issue: Storage quota exceeded

**Symptoms:** Upload failures, storage errors

**Diagnosis:**
1. Check storage account metrics in Azure Portal
2. Review lifecycle policy is working
3. Calculate total scenario count

**Resolution:**
1. Increase storage quota if justified
2. Reduce lifecycle policy retention (90 days → 60 days)
3. Manually clean up old scenarios:
   ```bash
   az storage blob delete-batch \
     --account-name firesimprodstorageeastaus \
     --source scenarios \
     --pattern "*" \
     --if-unmodified-since "2025-11-15"
   ```

### Getting Support

**Internal support escalation:**
1. Check this guide and documentation
2. Review Application Insights logs
3. Contact Azure support for platform issues
4. Contact development team for application bugs

**Reporting bugs:**
1. Capture error message and timestamp
2. Note user account and scenario details
3. Export relevant logs from Application Insights
4. Create GitHub issue with reproduction steps

## Security and Compliance

### Security Best Practices

1. **Access Control**
   - Use Azure AD for authentication
   - Implement role-based access control (RBAC)
   - Enable MFA for all admin accounts
   - Use Conditional Access policies

2. **Secrets Management**
   - Store all secrets in Key Vault
   - Rotate secrets quarterly
   - Use managed identities, not connection strings
   - Never commit secrets to version control

3. **Network Security**
   - Enable HTTPS only
   - Use Azure Front Door or Application Gateway for WAF
   - Implement IP restrictions if required
   - Enable DDoS protection

4. **Data Protection**
   - Enable encryption at rest (default in Azure)
   - Enable encryption in transit (HTTPS)
   - Implement blob soft delete (30-day retention)
   - Regular backups of critical data

5. **Monitoring and Auditing**
   - Enable Azure Activity Log
   - Monitor failed authentication attempts
   - Review access logs monthly
   - Set up security alerts

### Compliance Considerations

**Data residency:**
- All data stays within configured Azure region
- No data sent to third-party services (except Mapbox for tiles)
- Generated content owned by your organization

**Retention policies:**
- Images/videos: 90 days (configurable)
- Logs: 30 days (Application Insights)
- Audit logs: 1 year (Azure Activity Log)

**User privacy:**
- Minimal personal data collected (Azure AD user ID)
- No PII in generated content
- Users can delete their own scenarios

### Incident Response

**In case of security incident:**
1. Isolate affected systems
2. Disable compromised accounts
3. Rotate all secrets immediately
4. Review audit logs
5. Notify users if data breach occurred
6. Document incident and lessons learned

**Emergency contacts:**
- Azure Support: https://portal.azure.com (Support request)
- Security team: [Your organization's security contact]
- Development team: [Your team contact]

---

## Additional Resources

- [Trainer Guide](trainer-guide.md) — End-user documentation
- [API Reference](api-reference.md) — Complete API documentation
- [Master Plan](master_plan.md) — Project architecture and roadmap
- [Infrastructure README](../infra/README.md) — Bicep templates and deployment

For technical support, contact your development team or open a GitHub issue.
