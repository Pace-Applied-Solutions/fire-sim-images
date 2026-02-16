// Development environment parameters
using '../main.bicep'

// Environment configuration
param environmentName = 'dev'
param location = 'eastus2'

// Static Web App
param staticWebAppSku = 'Standard'

// Storage Account
param storageSku = 'Standard_LRS'

// Key Vault
param keyVaultSku = 'standard'

// Azure AI Foundry
param foundryProjectPath = 'firesimdevai/firesim-dev-project'
param foundryProjectRegion = 'eastus'
param foundryImageModel = 'stable-image-core'
param foundrySku = 'S0'
param foundryDeploymentCapacity = 1
param foundryDeploymentName = 'stable-image-core'
param foundryModelVersion = '1.0'
param foundryModelFormat = 'OpenAI'
param foundryModelPublisher = 'stabilityai'
param deployFoundry = false

// Image Model (generic — works with FLUX, GPT-image, DALL-E, etc.)
// Endpoint and API key are stored in Key Vault as ImageModel--Endpoint and ImageModel--ApiKey
param imageModelEndpoint = 'https://firesim-fh-dev.cognitiveservices.azure.com'
param imageModelDeployment = 'FLUX.1-Kontext-pro'

// Content Safety
param contentSafetySku = 'S0'

// Application Insights
param appInsightsRetentionDays = 90

// Function App (Flex Consumption)
param functionAppMaxInstanceCount = 40
param functionAppInstanceMemoryMB = 2048

// Tags
param tags = {
  Project: 'NSW RFS Fire Simulation'
  Environment: 'Development'
  ManagedBy: 'Bicep'
  CostCenter: 'Training'
}
