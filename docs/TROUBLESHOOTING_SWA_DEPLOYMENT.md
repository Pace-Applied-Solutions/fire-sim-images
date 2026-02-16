# Troubleshooting Azure Static Web App Deployment

This guide covers common Azure Static Web App (SWA) deployment issues and their resolution.

## Issue: ContainerNotFound Error During Deployment

### Symptoms

The GitHub Actions workflow `Deploy Static Web App` fails with an error message like:

```
Uploading failed. Error message: The specified container does not exist.
RequestId:440e1e92-b01e-0052-46e7-9efe19000000
Status: 404 (The specified container does not exist.)
ErrorCode: ContainerNotFound
```

**Recent Occurrence:** This error occurred after infrastructure redeployment at 2026-02-16 01:38Z, suggesting the deployment token may have been regenerated.

### Root Cause

Azure Static Web Apps uses an internal blob storage container to receive and process deployment artifacts. This error typically occurs when:

1. **The deployment token in GitHub secrets is stale or invalid** (most common after infrastructure redeployment)
2. The SWA resource's backing storage was not properly initialized during creation
3. The deployment token belongs to a different or deleted SWA instance

### Resolution

#### Option 1: Update Deployment Token (Recommended - Quickest Fix)

After infrastructure redeployment, the deployment token may have changed. Update the GitHub secret with the current token.

1. **Get the current SWA deployment token:**
   ```bash
   az staticwebapp secrets list \
     --name firesim-dev-web \
     --resource-group firesim-rg-dev \
     --query "properties.apiKey" \
     --output tsv
   ```

2. **Update the GitHub secret:**
   - Go to: https://github.com/richardthorek/fire-sim-images/settings/secrets/actions
   - Edit `AZURE_STATIC_WEB_APPS_API_TOKEN`
   - Paste the token from step 1
   - **Save**

3. **Retry the deployment:**
   - Navigate to: https://github.com/richardthorek/fire-sim-images/actions/workflows/deploy-swa.yml
   - Click "Run workflow"
   - Select branch: `main`
   - Click "Run workflow"
   
   OR make a minor change and push to `main` to trigger automatic deployment

#### Option 2: Redeploy Infrastructure (Recommended)

If Option 1 doesn't work, redeploy the entire infrastructure to ensure all resources are properly configured.

1. **Navigate to the infra directory:**
   ```bash
   cd infra
   ```

2. **Run the deployment script:**
   ```bash
   ./deploy.sh -g firesim-rg-dev -e dev
   ```

3. **Capture the new deployment token:**
   ```bash
   az staticwebapp secrets list \
     --name firesim-dev-web \
     --resource-group firesim-rg-dev \
     --query "properties.apiKey" \
     --output tsv
   ```

4. **Update GitHub secrets** (as in Option 1, step 2)

5. **Link the Functions app to the SWA** (if not already done):
   - Go to: https://portal.azure.com
   - Navigate to the Static Web App resource (`firesim-dev-web`)
   - Go to "APIs" in the left menu
   - Click "Link"
   - Select "Function App" and choose `firesim-dev-api`
   - Save

6. **Retry the deployment** (as in Option 1, step 3)

#### Option 3: Delete and Recreate SWA (Last Resort)

If the SWA resource is corrupted, delete and recreate it.

**⚠️ Warning:** This will change the SWA URL and require updating any external references.

1. **Delete the existing SWA:**
   ```bash
   az staticwebapp delete \
     --name firesim-dev-web \
     --resource-group firesim-rg-dev \
     --yes
   ```

2. **Redeploy infrastructure:**
   ```bash
   cd infra
   ./deploy.sh -g firesim-rg-dev -e dev
   ```

3. **Follow steps 3-6 from Option 2**

### Verification

After applying any of the above fixes, verify the deployment:

1. **Check the SWA resource status:**
   ```bash
   az staticwebapp show \
     --name firesim-dev-web \
     --resource-group firesim-rg-dev \
     --query "{name:name, status:properties.status, url:properties.defaultHostname}"
   ```

2. **Trigger a test deployment:**
   - Make a minor change to `apps/web/` (e.g., update a comment)
   - Commit and push to `main`
   - Monitor the workflow: https://github.com/richardthorek/fire-sim-images/actions/workflows/deploy-swa.yml

3. **Verify the deployed site:**
   - Visit: https://gentle-mushroom-01c18080f.4.azurestaticapps.net
   - Inspect the page source for `<meta name="app-version" content="<commit-sha>">`
   - Confirm the commit SHA matches the latest deployment

## Prevention

To prevent this issue from recurring:

1. **Never manually delete SWA storage resources** — Always use `az staticwebapp delete` or the Azure portal to delete SWAs

2. **Rotate deployment tokens carefully** — When rotating tokens, ensure the new token is updated in GitHub secrets before any workflows run

3. **Monitor deployment health** — Set up alerts for failed deployments:
   ```bash
   # Example: Create an alert rule for failed deployments
   az monitor metrics alert create \
     --name "swa-deployment-failures" \
     --resource-group firesim-rg-dev \
     --scopes $(az staticwebapp show --name firesim-dev-web --resource-group firesim-rg-dev --query id -o tsv) \
     --condition "count > 0" \
     --description "Alert when SWA deployment fails"
   ```

4. **Use infrastructure-as-code consistently** — Always deploy/update SWA resources via Bicep templates to ensure proper configuration

## Related Issues

- GitHub issue auto-created by failed deployment workflow
- Azure Static Web Apps known issues: https://github.com/Azure/static-web-apps/issues
- Deployment Action issues: https://github.com/Azure/static-web-apps-deploy/issues

## Support

If none of the above resolutions work:

1. Check Azure Service Health: https://status.azure.com/
2. Review Azure Static Web Apps logs in the Azure portal
3. Contact Azure Support with the RequestId from the error message
4. File an issue with Azure Static Web Apps: https://github.com/Azure/static-web-apps/issues
