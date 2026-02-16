#!/usr/bin/env bash
# verify-swa-health.sh
# Verifies that the Azure Static Web App is healthy and ready for deployment
# Usage: ./scripts/verify-swa-health.sh [swa-name] [resource-group]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
SWA_NAME="${1:-firesim-dev-web}"
RESOURCE_GROUP="${2:-firesim-rg-dev}"

echo "🔍 Verifying Azure Static Web App health..."
echo "   - Name: $SWA_NAME"
echo "   - Resource Group: $RESOURCE_GROUP"
echo ""

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}❌ Azure CLI is not installed${NC}"
    echo "   Install from: https://docs.microsoft.com/cli/azure/install-azure-cli"
    exit 1
fi

# Check if logged in
if ! az account show &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Azure CLI${NC}"
    echo "   Run: az login"
    exit 1
fi

echo -e "${GREEN}✅ Azure CLI authenticated${NC}"

# Check if SWA exists
echo ""
echo "Checking if Static Web App exists..."
if ! az staticwebapp show \
    --name "$SWA_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --output none 2>/dev/null; then
    echo -e "${RED}❌ Static Web App '$SWA_NAME' not found in resource group '$RESOURCE_GROUP'${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Static Web App exists${NC}"

# Get SWA details
echo ""
echo "Fetching Static Web App details..."
SWA_DETAILS=$(az staticwebapp show \
    --name "$SWA_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --output json)

SWA_URL=$(echo "$SWA_DETAILS" | jq -r '.properties.defaultHostname')
SWA_STATUS=$(echo "$SWA_DETAILS" | jq -r '.properties.status // "Unknown"')
SWA_PROVIDER=$(echo "$SWA_DETAILS" | jq -r '.properties.provider // "Unknown"')

echo "   - URL: https://$SWA_URL"
echo "   - Status: $SWA_STATUS"
echo "   - Provider: $SWA_PROVIDER"

if [ "$SWA_STATUS" != "Ready" ]; then
    echo -e "${YELLOW}⚠️  Static Web App status is not 'Ready': $SWA_STATUS${NC}"
fi

# Check if deployment token is available
echo ""
echo "Checking deployment token..."
if ! DEPLOYMENT_TOKEN=$(az staticwebapp secrets list \
    --name "$SWA_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query "properties.apiKey" \
    --output tsv 2>/dev/null); then
    echo -e "${RED}❌ Failed to retrieve deployment token${NC}"
    exit 1
fi

if [ -z "$DEPLOYMENT_TOKEN" ] || [ "$DEPLOYMENT_TOKEN" = "null" ]; then
    echo -e "${RED}❌ Deployment token is empty or null${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Deployment token retrieved successfully${NC}"
echo "   - Token length: ${#DEPLOYMENT_TOKEN} characters"
echo "   - Token prefix: ${DEPLOYMENT_TOKEN:0:20}..."

# Check if site is accessible
echo ""
echo "Checking if site is accessible..."
if curl -sf -o /dev/null -m 10 "https://$SWA_URL" 2>/dev/null; then
    echo -e "${GREEN}✅ Site is accessible at https://$SWA_URL${NC}"
else
    echo -e "${YELLOW}⚠️  Site may not be accessible or is still deploying${NC}"
    echo "   This is normal for new deployments or during maintenance"
fi

# Final summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Static Web App appears healthy and ready for deployment${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "1. Ensure the GitHub secret 'AZURE_STATIC_WEB_APPS_API_TOKEN' matches the current token"
echo "2. Run deployment workflow: https://github.com/richardthorek/fire-sim-images/actions/workflows/deploy-swa.yml"
echo ""
echo "To update the GitHub secret with the current token:"
echo "   gh secret set AZURE_STATIC_WEB_APPS_API_TOKEN --body \"$DEPLOYMENT_TOKEN\""
echo ""
