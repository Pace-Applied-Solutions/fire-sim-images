# Infrastructure as Code

This directory contains Bicep templates for deploying the NSW RFS Fire Simulation Inject Tool infrastructure to Azure.

## Architecture

The infrastructure consists of the following Azure resources:

- **Static Web App** — Hosts the React front-end and embedded Azure Functions API at `/api`
- **Storage Account** — Blob storage for generated images, videos, and scenario data
- **Key Vault** — Secure storage for API keys and secrets
- **Azure OpenAI** — Image generation service with DALL-E 3 model deployment

All resources use managed identities and are deployed to Australia East by default.

## Structure

```
infra/
├── main.bicep                 # Main orchestrator template
├── modules/                   # Resource-specific modules
│   ├── staticWebApp.bicep     # Static Web App with embedded API
│   ├── storage.bicep          # Blob Storage with containers and lifecycle
│   ├── keyVault.bicep         # Key Vault with access policies
│   └── openai.bicep           # Azure OpenAI with model deployment
├── parameters/                # Environment-specific parameters
│   ├── dev.bicepparam         # Development environment
│   └── prod.bicepparam        # Production environment
├── deploy.sh                  # Deployment script
└── README.md                  # This file
```

## Prerequisites

Before deploying, ensure you have:

1. **Azure CLI** installed and configured
   ```bash
   # Install Azure CLI
   curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
   
   # Or on macOS
   brew install azure-cli
   ```

2. **Azure subscription** with appropriate permissions
   - Contributor role on the subscription or resource group
   - Permission to create role assignments for managed identities

3. **Azure login**
   ```bash
   az login
   ```

4. **Select subscription** (if you have multiple)
   ```bash
   az account set --subscription "Your Subscription Name"
   ```

## Deployment

### Using the deployment script (Recommended)

The `deploy.sh` script provides a simple way to validate and deploy the infrastructure.

**Development environment:**
```bash
./deploy.sh -g firesim-rg-dev -e dev
```

**Production environment:**
```bash
./deploy.sh -g firesim-rg-prod -e prod
```

**Validate only (no deployment):**
```bash
./deploy.sh -g firesim-rg-dev -e dev -v
```

**Options:**
- `-e, --environment` — Environment name (dev or prod). Default: dev
- `-g, --group` — Resource group name (required)
- `-l, --location` — Azure region. Default: australiaeast
- `-v, --validate` — Validate only, do not deploy
- `-h, --help` — Show help message

### Using Azure CLI directly

**Create resource group:**
```bash
az group create \
  --name firesim-rg-dev \
  --location australiaeast
```

**Validate deployment:**
```bash
az deployment group validate \
  --resource-group firesim-rg-dev \
  --template-file main.bicep \
  --parameters parameters/dev.bicepparam
```

**Deploy infrastructure:**
```bash
az deployment group create \
  --resource-group firesim-rg-dev \
  --template-file main.bicep \
  --parameters parameters/dev.bicepparam \
  --name firesim-dev-$(date +%Y%m%d-%H%M%S)
```

**View deployment outputs:**
```bash
az deployment group show \
  --resource-group firesim-rg-dev \
  --name <deployment-name> \
  --query properties.outputs
```

### Using GitHub Actions

A workflow stub is provided at `.github/workflows/deploy-infra.yml` for automated deployments.

**Setup:**

1. Create GitHub secrets:
   - `AZURE_CREDENTIALS` — Service principal credentials (JSON format)
   - `AZURE_RESOURCE_GROUP` — Target resource group name

2. Create service principal:
   ```bash
   az ad sp create-for-rbac \
     --name "firesim-github-deploy" \
     --role contributor \
     --scopes /subscriptions/{subscription-id}/resourceGroups/{resource-group} \
     --sdk-auth
   ```

3. Copy the JSON output and add it as the `AZURE_CREDENTIALS` secret in GitHub

**Trigger deployment:**
- Navigate to Actions → Deploy Infrastructure → Run workflow
- Select environment (dev or prod)
- Choose whether to validate only or deploy

## Parameters

### Development (`dev.bicepparam`)

Optimized for cost and development speed:
- Static Web App: Free tier
- Storage: Locally redundant (LRS)
- Key Vault: Standard tier
- Azure OpenAI: S0 tier with single capacity unit
- Region: Australia East

### Production (`prod.bicepparam`)

Optimized for reliability and performance:
- Static Web App: Standard tier (with staging environments)
- Storage: Read-access geo-redundant (RAGRS)
- Key Vault: Premium tier (HSM-backed keys)
- Azure OpenAI: S0 tier with higher capacity
- Region: Australia East

## Resource Configuration

### Static Web App

The Static Web App is configured with:
- System-assigned managed identity for secure access to other Azure services
- Embedded Azure Functions API at `/api` (Node.js 20, TypeScript)
- Build configuration:
  - App location: `apps/web`
  - API location: `api`
  - Output location: `dist`

### Storage Account

Three blob containers are created:
- `generated-images` — Stores generated bushfire images
- `generated-videos` — Stores generated video clips
- `scenario-data` — Stores scenario metadata and configurations

**Features:**
- CORS enabled for Static Web App origin
- Lifecycle management: Moves blobs to cool tier after 30 days
- TLS 1.2+ required
- Public access disabled (access via managed identity)

### Key Vault

Configured for secure secrets management:
- Soft delete enabled (90-day retention)
- Purge protection enabled
- Access granted to Static Web App managed identity (Get and List secrets)
- Stores:
  - Azure OpenAI API key
  - Mapbox access token
  - Other third-party API keys

### Azure OpenAI

Deployed with DALL-E 3 model for image generation:
- Model: `dall-e-3`
- Version: `3.0`
- Capacity: 1 unit (dev), 2 units (prod)
- Content filtering: Default policy

**Note:** Azure OpenAI availability varies by region. If not available in Australia East, consider deploying to East US 2 as a fallback.

## Post-Deployment Configuration

After deployment, you'll need to:

1. **Add secrets to Key Vault:**
   ```bash
   # Azure OpenAI API key
   az keyvault secret set \
     --vault-name <key-vault-name> \
     --name "AzureOpenAI--ApiKey" \
     --value "<api-key>"
   
   # Mapbox access token (if using Mapbox)
   az keyvault secret set \
     --vault-name <key-vault-name> \
     --name "Mapbox--AccessToken" \
     --value "<token>"
   ```

2. **Configure Static Web App deployment:**
   - Link your GitHub repository to the Static Web App
   - Configure the deployment token as a GitHub secret
   - Update the Static Web App configuration with the correct branch

3. **Grant additional access** (if needed):
   - Add developers or deployment pipelines to Key Vault access policies
   - Configure network restrictions if required

## Validation

To validate that all resources are deployed correctly:

```bash
# List all resources in the resource group
az resource list \
  --resource-group firesim-rg-dev \
  --output table

# Check Static Web App status
az staticwebapp show \
  --name <static-web-app-name> \
  --query "{name:name, url:defaultHostname, identity:identity.principalId}"

# Check Storage Account containers
az storage container list \
  --account-name <storage-account-name> \
  --auth-mode login \
  --output table

# Check Key Vault access policies
az keyvault show \
  --name <key-vault-name> \
  --query "properties.accessPolicies[].{principal:objectId, permissions:permissions.secrets}"

# Check Azure OpenAI deployments
az cognitiveservices account deployment list \
  --name <openai-name> \
  --resource-group firesim-rg-dev \
  --output table
```

## Troubleshooting

### Deployment fails with "Resource not available in region"

Azure OpenAI is not available in all regions. If deployment fails:
1. Check Azure OpenAI region availability: https://aka.ms/oai/models
2. Update the `location` parameter to a supported region (e.g., `eastus2`)
3. Redeploy

### Key Vault access denied

If the Static Web App cannot access Key Vault:
1. Verify the managed identity is enabled: `az staticwebapp show --name <name> --query identity`
2. Check access policies: `az keyvault show --name <name> --query properties.accessPolicies`
3. Manually grant access: `az keyvault set-policy --name <kv-name> --object-id <principal-id> --secret-permissions get list`

### Storage CORS errors

If CORS errors occur:
1. Verify the Static Web App URL is in the allowed origins
2. Update CORS rules: `az storage cors add --services b --methods GET POST PUT --origins <url> --account-name <name>`

## Cleanup

To remove all resources:

```bash
# Delete the resource group (removes all resources)
az group delete --name firesim-rg-dev --yes
```

**Warning:** This action is irreversible. Ensure you have backups of any important data before deleting.

## Security Considerations

- All secrets are stored in Key Vault, never in code or configuration files
- Managed identities are used for service-to-service authentication
- Public access is disabled on Storage Account
- TLS 1.2+ is required for all connections
- Soft delete and purge protection prevent accidental data loss
- Network restrictions can be applied for production environments

## Cost Management

**Development environment (approximate monthly costs):**
- Static Web App (Free): $0
- Storage Account (LRS, 10GB): ~$0.25
- Key Vault (Standard): ~$0.03 per 10K operations
- Azure OpenAI (DALL-E 3): Pay-per-use (~$0.04 per image)

**Production environment:**
- Static Web App (Standard): ~$9/month
- Storage Account (RAGRS, 100GB): ~$5
- Key Vault (Premium): ~$0.03 per 10K operations + HSM costs
- Azure OpenAI: Pay-per-use (higher capacity for concurrent requests)

Monitor costs in the Azure portal and set up budget alerts.

## References

- [Azure Static Web Apps documentation](https://docs.microsoft.com/azure/static-web-apps/)
- [Azure Functions on Static Web Apps](https://docs.microsoft.com/azure/static-web-apps/apis-functions)
- [Azure Bicep documentation](https://docs.microsoft.com/azure/azure-resource-manager/bicep/)
- [Azure OpenAI Service documentation](https://docs.microsoft.com/azure/cognitive-services/openai/)
- [Master Plan](../docs/master_plan.md)
