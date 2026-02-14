#!/bin/bash

# Fire Simulation Infrastructure Deployment Script
# Deploys Azure resources using Bicep templates

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="dev"
DEFAULT_RESOURCE_GROUP_DEV="firesim-rg-dev"
DEFAULT_RESOURCE_GROUP_PROD="firesim-rg-prod"
RESOURCE_GROUP=""
LOCATION="eastus2"
VALIDATE_ONLY=false
AUTO_APPROVE=false
CLEANUP_MODE=false



# Function to print usage
print_usage() {
    echo "Usage: ./deploy.sh [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --environment   Environment name (dev or prod). Default: dev"
    echo "  -g, --group         Resource group name (default: firesim-rg-dev or firesim-rg-prod)"
    echo "  -l, --location      Azure region. Default: eastus2"
    echo "  -v, --validate      Validate only, do not deploy"
    echo "  -y, --yes           Auto-approve deployment (skip confirmation)"
    echo "  -c, --complete      Use complete mode (delete resources not in template)"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./deploy.sh -e dev"
    echo "  ./deploy.sh -e prod -v"
    echo "  ./deploy.sh -g firesim-rg-dev -e dev -y"
    echo "  ./deploy.sh -e dev -y -c"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -g|--group)
            RESOURCE_GROUP="$2"
            shift 2
            ;;
        -l|--location)
            LOCATION="$2"
            shift 2
            ;;
        -v|--validate)
            VALIDATE_ONLY=true
            shift
            ;;
        -y|--yes)
            AUTO_APPROVE=true
            shift
            ;;
        -c|--complete)
            CLEANUP_MODE=true
            shift
            ;;
        -h|--help)
            print_usage
            exit 0
            ;;
        *)
            echo -e "${RED}Error: Unknown option $1${NC}"
            print_usage
            exit 1
            ;;
    esac
done

if [ "$ENVIRONMENT" != "dev" ] && [ "$ENVIRONMENT" != "prod" ]; then
    echo -e "${RED}Error: Environment must be 'dev' or 'prod'${NC}"
    exit 1
fi

if [ -z "$RESOURCE_GROUP" ]; then
    if [ "$ENVIRONMENT" = "prod" ]; then
        RESOURCE_GROUP="$DEFAULT_RESOURCE_GROUP_PROD"
    else
        RESOURCE_GROUP="$DEFAULT_RESOURCE_GROUP_DEV"
    fi
fi

PARAM_FILE="parameters/${ENVIRONMENT}.bicepparam"

if [ ! -f "$PARAM_FILE" ]; then
    echo -e "${RED}Error: Parameter file not found: $PARAM_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}=== Fire Simulation Infrastructure Deployment ===${NC}"
echo "Environment: $ENVIRONMENT"
echo "Resource Group: $RESOURCE_GROUP"
echo "Location: $LOCATION"
echo "Parameter File: $PARAM_FILE"
echo ""

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}Error: Azure CLI is not installed${NC}"
    echo "Please install Azure CLI: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check if logged in to Azure
if ! az account show &> /dev/null; then
    echo -e "${RED}Error: Not logged in to Azure${NC}"
    echo "Please run: az login"
    exit 1
fi

# Get current subscription
SUBSCRIPTION=$(az account show --query name -o tsv)
echo -e "${YELLOW}Current subscription: $SUBSCRIPTION${NC}"

if [ "$AUTO_APPROVE" = false ]; then
    read -p "Continue with this subscription? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled"
        exit 0
    fi
else
    echo "Auto-approve enabled, continuing with deployment..."
fi

# Create resource group if it doesn't exist
if ! az group show --name "$RESOURCE_GROUP" &> /dev/null; then
    echo -e "${YELLOW}Creating resource group: $RESOURCE_GROUP${NC}"
    az group create --name "$RESOURCE_GROUP" --location "$LOCATION"
else
    echo -e "${GREEN}Resource group already exists: $RESOURCE_GROUP${NC}"
fi

echo -e "${YELLOW}Validating deployment in ${LOCATION}...${NC}"
VALIDATION_RESULT=$(az deployment group validate \
    --resource-group "$RESOURCE_GROUP" \
    --template-file main.bicep \
    --parameters "$PARAM_FILE" \
    --parameters location="$LOCATION" \
    --query "properties.provisioningState" \
    -o tsv 2>/tmp/firesim-validate.err)

if [ "$VALIDATION_RESULT" != "Succeeded" ]; then
    VALIDATION_ERROR=$(cat /tmp/firesim-validate.err)
    echo -e "${RED}Validation failed${NC}"
    if [ -n "$VALIDATION_ERROR" ]; then
        echo -e "${RED}${VALIDATION_ERROR}${NC}"
    fi
    exit 1
fi

# Exit if validate only
if [ "$VALIDATE_ONLY" = true ]; then
    echo -e "${GREEN}Validation complete. Skipping deployment.${NC}"
    exit 0
fi

# Deploy infrastructure
echo -e "${YELLOW}Starting deployment...${NC}"
DEPLOYMENT_NAME="firesim-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S)"
MODE_ARGS=""
if [ "$CLEANUP_MODE" = true ]; then
    MODE_ARGS="--mode Complete"
fi

echo -e "${YELLOW}Deploying in ${LOCATION}...${NC}"
if ! az deployment group create \
    --resource-group "$RESOURCE_GROUP" \
    --template-file main.bicep \
    --parameters "$PARAM_FILE" \
    --parameters location="$LOCATION" \
    --name "$DEPLOYMENT_NAME" \
    $MODE_ARGS \
    --verbose; then
    echo -e "${RED}Deployment failed${NC}"
    exit 1
fi

echo -e "${GREEN}Deployment completed successfully${NC}"
echo ""
echo "Deployment outputs:"
az deployment group show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$DEPLOYMENT_NAME" \
    --query properties.outputs \
    -o json

echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
