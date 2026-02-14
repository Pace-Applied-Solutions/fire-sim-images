#!/bin/bash

# NSW RFS Fire Simulation Infrastructure Deployment Script
# Deploys Azure resources using Bicep templates

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="dev"
RESOURCE_GROUP=""
LOCATION="australiaeast"
VALIDATE_ONLY=false
AUTO_APPROVE=false

# Function to print usage
print_usage() {
    echo "Usage: ./deploy.sh [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --environment   Environment name (dev or prod). Default: dev"
    echo "  -g, --group         Resource group name (required)"
    echo "  -l, --location      Azure region. Default: australiaeast"
    echo "  -v, --validate      Validate only, do not deploy"
    echo "  -y, --yes           Auto-approve deployment (skip confirmation)"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./deploy.sh -g firesim-rg-dev -e dev"
    echo "  ./deploy.sh -g firesim-rg-prod -e prod -v"
    echo "  ./deploy.sh -g firesim-rg-dev -e dev -y"
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

# Validate required parameters
if [ -z "$RESOURCE_GROUP" ]; then
    echo -e "${RED}Error: Resource group name is required${NC}"
    print_usage
    exit 1
fi

if [ "$ENVIRONMENT" != "dev" ] && [ "$ENVIRONMENT" != "prod" ]; then
    echo -e "${RED}Error: Environment must be 'dev' or 'prod'${NC}"
    exit 1
fi

PARAM_FILE="parameters/${ENVIRONMENT}.bicepparam"

if [ ! -f "$PARAM_FILE" ]; then
    echo -e "${RED}Error: Parameter file not found: $PARAM_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}=== NSW RFS Fire Simulation Infrastructure Deployment ===${NC}"
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

# Validate deployment
echo -e "${YELLOW}Validating deployment...${NC}"
VALIDATION_RESULT=$(az deployment group validate \
    --resource-group "$RESOURCE_GROUP" \
    --template-file main.bicep \
    --parameters "$PARAM_FILE" \
    --query "properties.provisioningState" \
    -o tsv)

if [ "$VALIDATION_RESULT" != "Succeeded" ]; then
    echo -e "${RED}Validation failed${NC}"
    az deployment group validate \
        --resource-group "$RESOURCE_GROUP" \
        --template-file main.bicep \
        --parameters "$PARAM_FILE"
    exit 1
fi

echo -e "${GREEN}Validation succeeded${NC}"

# Exit if validate only
if [ "$VALIDATE_ONLY" = true ]; then
    echo -e "${GREEN}Validation complete. Skipping deployment.${NC}"
    exit 0
fi

# Deploy infrastructure
echo -e "${YELLOW}Starting deployment...${NC}"
DEPLOYMENT_NAME="firesim-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S)"

az deployment group create \
    --resource-group "$RESOURCE_GROUP" \
    --template-file main.bicep \
    --parameters "$PARAM_FILE" \
    --name "$DEPLOYMENT_NAME" \
    --verbose

# Check deployment status
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Deployment completed successfully${NC}"
    echo ""
    echo "Deployment outputs:"
    az deployment group show \
        --resource-group "$RESOURCE_GROUP" \
        --name "$DEPLOYMENT_NAME" \
        --query properties.outputs \
        -o json
else
    echo -e "${RED}Deployment failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
